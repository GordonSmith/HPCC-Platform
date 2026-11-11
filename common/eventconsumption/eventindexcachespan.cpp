/*##############################################################################

    Copyright (C) 2026 HPCC Systems®.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
############################################################################## */

#include "eventindexcachespan.h"
#include "eventindex.hpp"
#include "eventutility.hpp"
#include "jlog.hpp"
#include <algorithm>
#include <array>
#include <memory>
#include <optional>
#include <unordered_map>
#include <utility>

namespace
{
enum class CacheSpanState : unsigned
{
    Open,
    Missed = 0x01,
    Hit = 0x02,
    Evicted = 0x04,
};
BITMASK_ENUM(CacheSpanState);
// Alternative to macro-defined hasMask, which tests if any bit of 'r' is set in 'l',
// by checking if all bits in 'r' are set in 'l'.
inline bool hasMasks(CacheSpanState l, CacheSpanState r) { return (l & r) == r; }

constexpr CacheSpanState spanComplete = CacheSpanState::Missed | CacheSpanState::Evicted;
constexpr unsigned spanStateCount = unsigned(spanComplete | CacheSpanState::Hit) + 1;

// Event timestamps are nanoseconds. Evictions within 10 us of a miss are treated as
// delayed reports for the previous span, before the new load could have completed.
constexpr __uint64 delayedEvictionWindowNs = 10000;

using AccessGapRange = std::pair<__uint64, __uint64>;

class SpanMetric
{
public:
    __uint64 count{0};
    __uint64 min{0};
    __uint64 max{0};
    __uint64 sum{0};

    void accumulate(__uint64 value)
    {
        if (0 == count || value < min)
            min = value;
        if (0 == count || value > max)
            max = value;
        sum += value;
        count++;
    }

    double average() const
    {
        return count ? (double)sum / count : 0;
    }
};

class AverageMetric
{
public:
    double sum{0};
    __uint64 count{0};

    void accumulate(double value)
    {
        sum += value;
        count++;
    }

    double average() const
    {
        return count ? sum / count : 0;
    }
};

struct CacheSpanRecord
{
    __uint64 id{0};
    CacheSpanState state{CacheSpanState::Open};
    CEvent representative;
    EventFileProperties properties;
    __uint64 liveElapsed{0};
    __uint64 deadElapsed{0};
    bool hasDeadElapsed{false};
    std::optional<__uint64> unresolvedElapsed;
    __uint64 accesses{0};
    AccessGapRange accessGaps;
};

class CacheSpanStats
{
public:
    __uint64 spans{0};
    SpanMetric liveElapsed;
    SpanMetric deadElapsed;
    SpanMetric unresolvedElapsed;
    SpanMetric completeElapsed;
    SpanMetric accessCount;
    AccessGapRange accessGaps;
    __uint64 accessGapCount{0};
    __uint64 accessGapSum{0};
    AverageMetric accessGapSpanAverage;

    void accumulate(const CacheSpanRecord& span)
    {
        __uint64 spanGapCount = span.accesses > 1 ? span.accesses - 1 : 0;
        bool hasAccessGaps = accessGapCount != 0;
        spans++;
        accessCount.accumulate(span.accesses);
        if (span.accesses)
            liveElapsed.accumulate(span.liveElapsed);
        if (hasMasks(span.state, CacheSpanState::Evicted) && span.hasDeadElapsed)
            deadElapsed.accumulate(span.deadElapsed);
        if (span.unresolvedElapsed)
            unresolvedElapsed.accumulate(*span.unresolvedElapsed);
        if (hasMasks(span.state, spanComplete))
            completeElapsed.accumulate(span.liveElapsed + span.deadElapsed);
        if (spanGapCount)
        {
            accessGapCount += spanGapCount;
            accessGapSum += span.liveElapsed;
            accessGapSpanAverage.accumulate((double)span.liveElapsed / spanGapCount);
            if (!hasAccessGaps)
                accessGaps = span.accessGaps;
            else
            {
                accessGaps.first = std::min(accessGaps.first, span.accessGaps.first);
                accessGaps.second = std::max(accessGaps.second, span.accessGaps.second);
            }
        }
    }
};

class CacheSpanAccumulator
{
public:
    std::array<CacheSpanStats, spanStateCount> states;
    CacheSpanStats allSpans;

    void accumulate(const CacheSpanRecord& span)
    {
        states[unsigned(span.state)].accumulate(span);
        allSpans.accumulate(span);
    }
};

// Test implementations capture completed spans for direct visitor assertions.
class ICacheSpanRowSink
{
public:
    virtual ~ICacheSpanRowSink() = default;
    virtual void emit(const CacheSpanRecord& span) = 0;
};

class CCacheSpanGroupNode
{
public:
    CacheSpanAccumulator subTotal;
    std::unordered_multimap<__uint64, std::unique_ptr<CCacheSpanGroupNode>> children;
    std::vector<std::string> groupValues;
    std::optional<CacheSpanAccumulator> leafSummary;

    void process(const CacheSpanRecord& span, const CMetaInfoState* metaState, const std::vector<std::vector<GroupAttribute>>& hierarchy, size_t currentLevel)
    {
        subTotal.accumulate(span);

        if (currentLevel >= hierarchy.size())
        {
            if (!leafSummary)
                leafSummary.emplace();
            leafSummary->accumulate(span);
            return;
        }

        __uint64 hash = GroupAttributeExtractor::getHash(hierarchy[currentLevel], span.representative, metaState, &span.properties);
        auto range = children.equal_range(hash);
        auto it = range.first;
        for (; it != range.second; ++it)
        {
            if (GroupAttributeExtractor::isEqual(hierarchy[currentLevel], span.representative, metaState, it->second->groupValues, &span.properties))
                break;
        }

        if (it == range.second)
        {
            auto child = std::make_unique<CCacheSpanGroupNode>();
            for (const GroupAttribute& attr : hierarchy[currentLevel])
                child->groupValues.push_back(GroupAttributeExtractor::getValue(attr, span.representative, metaState, &span.properties));
            it = children.emplace(hash, std::move(child));
        }

        it->second->process(span, metaState, hierarchy, currentLevel + 1);
    }

    template <typename Formatter>
    void render(Formatter& formatter, const std::vector<std::string>& parentValues, const std::vector<std::vector<GroupAttribute>>& hierarchy, size_t currentLevel, bool isRoot, bool includeComplete, bool includeIncomplete) const
    {
        if (isRoot && hierarchy.empty())
        {
            formatter.outputSummary(parentValues, subTotal, includeComplete, includeIncomplete);
            return;
        }

        std::vector<std::string> allValues(parentValues);
        if (!isRoot)
        {
            for (size_t i = 0; i < groupValues.size() && currentLevel != 0 && i < hierarchy[currentLevel - 1].size(); ++i)
                allValues.push_back(GroupAttributeExtractor::formatValue(hierarchy[currentLevel - 1][i], groupValues[i]));
        }

        std::vector<const CCacheSpanGroupNode*> orderedChildren;
        orderedChildren.reserve(children.size());
        for (const auto& child : children)
            orderedChildren.push_back(child.second.get());

        std::sort(orderedChildren.begin(), orderedChildren.end(),
            [](const CCacheSpanGroupNode* left, const CCacheSpanGroupNode* right)
            {
                return left->groupValues < right->groupValues;
            });

        for (const CCacheSpanGroupNode* child : orderedChildren)
            child->render(formatter, allValues, hierarchy, currentLevel + 1, false, includeComplete, includeIncomplete);

        if (leafSummary)
            formatter.outputSummary(allValues, *leafSummary, includeComplete, includeIncomplete);

        if (!children.empty() || isRoot)
            formatter.outputSummary(isRoot ? parentValues : allValues, subTotal, includeComplete, includeIncomplete);
    }
};

class CCacheSpanCsvFormatter
{
public:
    CCacheSpanCsvFormatter(IBufferedSerialOutputStream& _out, const std::vector<std::vector<std::string>>& _groupAttributes)
        : out(_out), groupAttributes(_groupAttributes)
    {
    }

    void begin()
    {
        StringBuffer line;
        for (const auto& group : groupAttributes)
        {
            for (const auto& column : group)
                appendHeaderColumn(line, column.c_str());
        }
        appendHeaderColumn(line, "Missed");
        appendHeaderColumn(line, "Hit");
        appendHeaderColumn(line, "Evicted");
        appendHeaderColumn(line, "Spans");
        appendHeaderColumn(line, "LiveElapsedMin");
        appendHeaderColumn(line, "LiveElapsedMax");
        appendHeaderColumn(line, "LiveElapsedAvg");
        appendHeaderColumn(line, "DeadElapsedMin");
        appendHeaderColumn(line, "DeadElapsedMax");
        appendHeaderColumn(line, "DeadElapsedAvg");
        appendHeaderColumn(line, "LiveDeadRatio");
        appendHeaderColumn(line, "CompleteElapsedMin");
        appendHeaderColumn(line, "CompleteElapsedMax");
        appendHeaderColumn(line, "CompleteElapsedAvg");
        appendHeaderColumn(line, "AccessesMin");
        appendHeaderColumn(line, "AccessesMax");
        appendHeaderColumn(line, "AccessesAvg");
        appendHeaderColumn(line, "AccessGapMin");
        appendHeaderColumn(line, "AccessGapMax");
        appendHeaderColumn(line, "AccessGapWeightedAvg");
        appendHeaderColumn(line, "AccessGapSpanAvg");
        appendHeaderColumn(line, "UnresolvedElapsedMin");
        appendHeaderColumn(line, "UnresolvedElapsedMax");
        appendHeaderColumn(line, "UnresolvedElapsedAvg");
        line.append('\n');
        out.put(line.length(), line.str());
    }

    void outputSummary(const std::vector<std::string>& groupValues, const CacheSpanAccumulator& accumulator, bool includeComplete, bool includeIncomplete)
    {
        for (unsigned stateValue = 0; stateValue < spanStateCount; stateValue++)
        {
            CacheSpanState state = static_cast<CacheSpanState>(stateValue);
            const CacheSpanStats& stats = accumulator.states[stateValue];
            if (0 == stats.spans)
                continue;
            bool complete = hasMasks(state, spanComplete);
            if ((complete && !includeComplete) || (!complete && !includeIncomplete))
                continue;
            outputRow(groupValues, stats, state);
        }
        if (accumulator.allSpans.spans)
            outputRow(groupValues, accumulator.allSpans, std::nullopt);
    }

private:
    void outputRow(const std::vector<std::string>& groupValues, const CacheSpanStats& stats, std::optional<CacheSpanState> state)
    {
        StringBuffer line;
        size_t expected = groupColumnCount();
        for (size_t idx = 0; idx < expected; ++idx)
        {
            if (idx != 0)
                line.append(',');
            if (idx < groupValues.size() && !groupValues[idx].empty())
                encodeCSVColumn(line, groupValues[idx].c_str());
        }
        appendMetricColumns(line, stats, state, expected != 0);
        line.append('\n');
        out.put(line.length(), line.str());
    }

    size_t groupColumnCount() const
    {
        size_t count = 0;
        for (const auto& group : groupAttributes)
            count += group.size();
        return count;
    }

    static void appendCSVColumn(StringBuffer& line, const char* value)
    {
        if (!line.isEmpty())
            line.append(',');
        if (!isEmptyString(value))
            encodeCSVColumn(line, value);
    }

    static void appendHeaderColumn(StringBuffer& line, const char* value)
    {
        if (!line.isEmpty())
            line.append(',');
        if (!isEmptyString(value))
            line.append(value);
    }

    static void appendCSVColumn(StringBuffer& line, __uint64 value)
    {
        if (!line.isEmpty())
            line.append(',');
        line.append(value);
    }

    static void appendCSVColumn(StringBuffer& line, double value)
    {
        if (!line.isEmpty())
            line.append(',');
        line.appendf("%.3f", value);
    }

    static void appendCSVColumn(StringBuffer& line, bool value, bool groupColumnsPrecedeStats)
    {
        if (line.isEmpty())
        {
            if (groupColumnsPrecedeStats)
                line.append(',');
        }
        else
            line.append(',');
        encodeCSVColumn(line, value ? "true" : "false");
    }

    static void appendStat(StringBuffer& line, const SpanMetric& stat)
    {
        if (stat.count == 0)
        {
            appendCSVColumn(line, "");
            appendCSVColumn(line, "");
            appendCSVColumn(line, "");
        }
        else
        {
            appendCSVColumn(line, stat.min);
            appendCSVColumn(line, stat.max);
            appendCSVColumn(line, stat.average());
        }
    }

    static void appendAccessGaps(StringBuffer& line, const CacheSpanStats& stats)
    {
        if (0 == stats.accessGapCount)
        {
            appendCSVColumn(line, "");
            appendCSVColumn(line, "");
            appendCSVColumn(line, "");
            appendCSVColumn(line, "");
        }
        else
        {
            appendCSVColumn(line, stats.accessGaps.first);
            appendCSVColumn(line, stats.accessGaps.second);
            appendCSVColumn(line, (double)stats.accessGapSum / stats.accessGapCount);
            appendCSVColumn(line, stats.accessGapSpanAverage.average());
        }
    }

    static void appendLiveDeadRatio(StringBuffer& line, const CacheSpanStats& stats)
    {
        if (0 == stats.deadElapsed.count || 0 == stats.deadElapsed.sum)
            appendCSVColumn(line, "");
        else
            appendCSVColumn(line, (double)stats.liveElapsed.sum / stats.deadElapsed.sum);
    }

    static void appendMetricColumns(StringBuffer& line, const CacheSpanStats& stats, std::optional<CacheSpanState> state, bool groupColumnsPrecedeStats)
    {
        if (state)
        {
            appendCSVColumn(line, hasMask(*state, CacheSpanState::Missed), groupColumnsPrecedeStats);
            appendCSVColumn(line, hasMask(*state, CacheSpanState::Hit), false);
            appendCSVColumn(line, hasMask(*state, CacheSpanState::Evicted), false);
        }
        else
        {
            if (line.isEmpty())
                line.append(groupColumnsPrecedeStats ? ",,," : ",,");
            else
                line.append(",,,");
        }
        appendCSVColumn(line, stats.spans);
        appendStat(line, stats.liveElapsed);
        appendStat(line, stats.deadElapsed);
        appendLiveDeadRatio(line, stats);
        appendStat(line, stats.completeElapsed);
        appendStat(line, stats.accessCount);
        appendAccessGaps(line, stats);
        appendStat(line, stats.unresolvedElapsed);
    }

private:
    IBufferedSerialOutputStream& out;
    const std::vector<std::vector<std::string>>& groupAttributes;
};

class CCacheSpanGroupingSink : public ICacheSpanRowSink
{
public:
    CCacheSpanGroupingSink(CMetaInfoState& _metaState, const std::vector<std::vector<GroupAttribute>>& _groupAttributeIds, bool _includeComplete = false, bool _includeIncomplete = false)
        : metaState(_metaState), groupAttributeIds(_groupAttributeIds)
        , includeComplete(_includeComplete), includeIncomplete(_includeIncomplete)
    {
    }

    virtual void emit(const CacheSpanRecord& span) override
    {
        root.process(span, &metaState, groupAttributeIds, 0);
    }

    void render(CCacheSpanCsvFormatter& formatter) const
    {
        std::vector<std::string> rootValues;
        root.render(formatter, rootValues, groupAttributeIds, 0, true, includeComplete, includeIncomplete);
    }

    const CCacheSpanGroupNode& queryRoot() const { return root; }

private:
    CMetaInfoState& metaState;
    const std::vector<std::vector<GroupAttribute>>& groupAttributeIds;
    bool includeComplete;
    bool includeIncomplete;
    CCacheSpanGroupNode root;
};

// The input stream must be chronological; access gaps and eviction delays rely on this ordering.
class CIndexCacheSpanVisitor : public CInterfaceOf<IEventVisitor>
{
    struct LiveNode
    {
        CacheSpanState state{CacheSpanState::Open};
        CEvent firstEvent;
        EventFileProperties properties;
        __uint64 firstAccessTimestamp{0};
        __uint64 lastAccessTimestamp{0};
        __uint64 lastMissTimestamp{0};
        std::optional<__uint64> pendingLastHitTimestamp;
        __uint64 gaps{0};
        AccessGapRange accessGaps;
    };

public:
    CIndexCacheSpanVisitor(ICacheSpanRowSink& _sink) : sink(_sink)
    {
    }

    virtual bool visitFile(const EventFileProperties& properties) override
    {
        fileStartTimestamp = properties.startTimestamp;
        hasFileStartTimestamp = properties.startTimestamp != 0;
        return true;
    }

    virtual bool visitEvent(CEvent& event, const EventFileProperties& properties) override
    {
        switch (event.queryType())
        {
        case EventIndexCacheMiss:
            onAccess(event, properties, CacheSpanState::Missed);
            break;
        case EventIndexCacheHit:
            onAccess(event, properties, CacheSpanState::Hit);
            break;
        case EventIndexEviction:
            onEviction(event, properties);
            break;
        default:
            break;
        }
        return true;
    }

    virtual void departFile(const EventFileProperties& properties) override
    {
        for (auto& item : liveNodes)
        {
            reportPendingTransition(item.second, std::nullopt);
            emitSpan(item.second, CacheSpanState::Open, properties.endTimestamp, properties.endTimestamp != 0);
        }
        liveNodes.clear();
        fileStartTimestamp = 0;
        hasFileStartTimestamp = false;
    }

private:
    bool canUseEvent(const CEvent& event) const
    {
        return event.isComplete() && event.hasAttribute(EvAttrEventTimestamp)
            && event.hasAttribute(EvAttrFileId) && event.hasAttribute(EvAttrFileOffset);
    }

    FileIdFileOffsetKey queryKey(const CEvent& event) const
    {
        return { event.queryNumericValue(EvAttrFileId), event.queryNumericValue(EvAttrFileOffset) };
    }

    CacheSpanRecord createSpan(CacheSpanState state, const CEvent& representative, const EventFileProperties& properties)
    {
        CacheSpanRecord span;
        span.id = nextSpanId++;
        span.state = state;
        span.representative = representative;
        span.properties = properties;
        return span;
    }

    void reportPendingTransition(LiveNode& node, std::optional<__uint64> evictionTimestamp)
    {
        if (!node.pendingLastHitTimestamp)
            return;
        StringBuffer lastHitText;
        StringBuffer missText;
        StringBuffer evictionText;
        DBGLOG("Index cache span hit followed by miss: FileId=%llu FileOffset=%llu LastHit=%s Miss=%s Eviction=%s",
            node.firstEvent.queryNumericValue(EvAttrFileId), node.firstEvent.queryNumericValue(EvAttrFileOffset),
            formatTimestampNsText(lastHitText, *node.pendingLastHitTimestamp),
            formatTimestampNsText(missText, node.lastMissTimestamp),
            evictionTimestamp ? formatTimestampNsText(evictionText, *evictionTimestamp) : "no eviction");
        node.pendingLastHitTimestamp.reset();
    }

    void onAccess(const CEvent& event, const EventFileProperties& properties, CacheSpanState accessState)
    {
        if (!canUseEvent(event))
            return;
        // EventTimestamp is in nanoseconds, as are all stored timestamps and elapsed times.
        __uint64 timestamp = event.queryNumericValue(EvAttrEventTimestamp);
        auto [it, startsNewSpan] = liveNodes.try_emplace(queryKey(event));
        LiveNode& node = it->second;
        std::optional<__uint64> lastHitTimestamp;
        if (!startsNewSpan)
        {
            reportPendingTransition(node, std::nullopt);
            if (accessState == CacheSpanState::Missed && hasMask(node.state, CacheSpanState::Hit))
            {
                lastHitTimestamp = node.lastAccessTimestamp;
                emitSpan(node, CacheSpanState::Evicted, timestamp, true);
                startsNewSpan = true;
            }
        }

        if (startsNewSpan)
        {
            bool hasPriorAccessEstimate = accessState == CacheSpanState::Hit && hasFileStartTimestamp
                && timestamp >= fileStartTimestamp;
            node.state = accessState;
            node.firstEvent = event;
            node.properties = properties;
            node.pendingLastHitTimestamp = lastHitTimestamp;
            node.firstAccessTimestamp = hasPriorAccessEstimate ? fileStartTimestamp : timestamp;
            node.lastAccessTimestamp = timestamp;
            node.lastMissTimestamp = accessState == CacheSpanState::Missed ? timestamp : 0;
            node.gaps = hasPriorAccessEstimate ? 1 : 0;
            __uint64 initialGap = hasPriorAccessEstimate ? timestamp - fileStartTimestamp : 0;
            node.accessGaps = { initialGap, initialGap };
        }
        else
        {
            node.state |= accessState;
            if (accessState == CacheSpanState::Missed)
                node.lastMissTimestamp = timestamp;
            __uint64 elapsed = timestamp - node.lastAccessTimestamp;
            if (0 == node.gaps)
                node.accessGaps = { elapsed, elapsed };
            else
            {
                node.accessGaps.first = std::min(node.accessGaps.first, elapsed);
                node.accessGaps.second = std::max(node.accessGaps.second, elapsed);
            }
            node.lastAccessTimestamp = timestamp;
            node.gaps++;
        }
    }

    void onEviction(const CEvent& event, const EventFileProperties& properties)
    {
        if (!canUseEvent(event))
            return;
        FileIdFileOffsetKey key = queryKey(event);
        __uint64 timestamp = event.queryNumericValue(EvAttrEventTimestamp);
        auto existing = liveNodes.find(key);
        if (existing == liveNodes.end())
        {
            CacheSpanRecord span = createSpan(CacheSpanState::Evicted, event, properties);
            if (hasFileStartTimestamp && timestamp >= fileStartTimestamp)
            {
                span.deadElapsed = timestamp - fileStartTimestamp;
                span.hasDeadElapsed = true;
            }
            sink.emit(span);
            return;
        }

        LiveNode& node = existing->second;
        reportPendingTransition(node, timestamp);
        // A new load cannot complete this quickly; the eviction belongs to the previous span.
        if (hasMask(node.state, CacheSpanState::Missed) && timestamp - node.lastMissTimestamp <= delayedEvictionWindowNs)
            return;
        emitSpan(node, CacheSpanState::Evicted, timestamp, true);
        liveNodes.erase(existing);
    }

    void emitSpan(const LiveNode& node, CacheSpanState endState, __uint64 endTimestamp, bool hasEndTimestamp)
    {
        CacheSpanRecord span = createSpan(node.state | endState, node.firstEvent, node.properties);
        span.accesses = node.gaps + 1;
        span.liveElapsed = node.lastAccessTimestamp >= node.firstAccessTimestamp
            ? node.lastAccessTimestamp - node.firstAccessTimestamp : 0;
        span.accessGaps = node.accessGaps;
        if (hasEndTimestamp && endTimestamp >= node.lastAccessTimestamp)
        {
            if (endState == CacheSpanState::Evicted)
            {
                span.deadElapsed = endTimestamp - node.lastAccessTimestamp;
                span.hasDeadElapsed = true;
            }
            else
                span.unresolvedElapsed = endTimestamp - node.lastAccessTimestamp;
        }
        sink.emit(span);
    }

private:
    ICacheSpanRowSink& sink;
    std::unordered_map<FileIdFileOffsetKey, LiveNode, FileIdFileOffsetKeyHash> liveNodes;
    __uint64 nextSpanId{1};
    __uint64 fileStartTimestamp{0};
    bool hasFileStartTimestamp{false};
};

} // namespace

bool CIndexCacheSpanOp::ready() const
{
    return CEventConsumingOp::ready();
}

bool CIndexCacheSpanOp::preScanRequired() const
{
    if (CEventConsumingOp::preScanRequired())
        return true;
    for (const auto& groupIds : groupAttributeIds)
    {
        for (const auto& id : groupIds)
        {
            if (id.attrId == EvAttrServiceName)
                return true;
        }
    }
    return false;
}

bool CIndexCacheSpanOp::doOp()
{
    CCacheSpanGroupingSink sink(queryMetaInfoState(), groupAttributeIds, includeComplete, includeIncomplete);
    Owned<CIndexCacheSpanVisitor> visitor = new CIndexCacheSpanVisitor(sink);
    bool result = traverseEvents(*visitor);
    CCacheSpanCsvFormatter formatter(*out, groupAttributes);
    formatter.begin();
    sink.render(formatter);
    return result;
}

void CIndexCacheSpanOp::addGroupAttribute(const std::vector<std::string>& attrs)
{
    std::vector<std::string> strippedAttrs;
    std::vector<GroupAttribute> ids;
    for (const auto& attrName : attrs)
    {
        GroupAttribute parsed = GroupAttributeExtractor::parseAttribute(attrName.c_str());
        const char* canonicalName = GroupAttributeExtractor::queryCanonicalName(parsed.attrId);
        if (!canonicalName)
            throw makeStringExceptionV(0, "Unsupported grouping attribute '%s' (id=%u). Use a recognized grouping attribute or derived canonical name.", attrName.c_str(), parsed.attrId);
        strippedAttrs.emplace_back(canonicalName);
        ids.push_back(parsed);
    }
    groupAttributes.push_back(std::move(strippedAttrs));
    groupAttributeIds.push_back(std::move(ids));
}

#ifdef _USE_CPPUNIT

#include "eventunittests.hpp"
#include "jstream.hpp"

namespace
{

class CCollectingCacheSpanSink : public ICacheSpanRowSink
{
public:
    virtual void emit(const CacheSpanRecord& span) override
    {
        spans.push_back(span);
    }

    CacheSpanAccumulator summarize() const
    {
        CacheSpanAccumulator totals;
        for (const auto& span : spans)
            totals.accumulate(span);
        return totals;
    }

    std::vector<CacheSpanRecord> spans;
};

void renderGroupedCacheSpans(StringBuffer& output, const CCacheSpanGroupingSink& grouping, const std::vector<std::vector<std::string>>& groupNames)
{
    Owned<IBufferedSerialOutputStream> stream = createBufferedSerialOutputStream(output);
    CCacheSpanCsvFormatter formatter(*stream, groupNames);
    formatter.begin();
    grouping.render(formatter);
}

CEvent makeIndexCacheEvent(EventType type, __uint64 timestamp, __uint64 fileId, offset_t offset, NodeKind nodeKind)
{
    CEvent event;
    event.reset(type);
    event.setValue(EvAttrEventTimestamp, timestamp);
    event.setValue(EvAttrFileId, fileId);
    event.setValue(EvAttrFileOffset, offset);
    event.setValue(EvAttrNodeKind, __uint64(nodeKind));
    event.setValue(EvAttrSearchFlags, __uint64(0));
    if (type != EventIndexCacheMiss)
        event.setValue(EvAttrInMemorySize, __uint64(8192));
    if (EventIndexLoad == type)
    {
        event.setValue(EvAttrExpandTime, __uint64(0));
        event.setValue(EvAttrReadTime, __uint64(0));
    }
    if (EventIndexCacheHit == type)
        event.setValue(EvAttrExpandTime, __uint64(0));
    return event;
}

void visitIndexCacheEvent(IEventVisitor& visitor, const EventFileProperties& properties, EventType type, __uint64 timestamp, __uint64 fileId, offset_t offset, NodeKind nodeKind)
{
    CEvent event = makeIndexCacheEvent(type, timestamp, fileId, offset, nodeKind);
    visitor.visitEvent(event, properties);
}

void visitIndexCacheEvent(IEventVisitor& visitor, EventType type, __uint64 timestampUs, __uint64 fileId, offset_t offset, NodeKind nodeKind)
{
    // Test shorthand accepts microseconds; the event stream uses nanoseconds.
    visitIndexCacheEvent(visitor, queryTestEventFileProperties(), type, timestampUs * 1000, fileId, offset, nodeKind);
}

} // namespace

class EventIndexCacheSpanTest : public CppUnit::TestFixture
{
    CPPUNIT_TEST_SUITE(EventIndexCacheSpanTest);
    CPPUNIT_TEST(testCompleteSpan);
    CPPUNIT_TEST(testMissCanBeLastAccess);
    CPPUNIT_TEST(testFirstHitIsAmbiguous);
    CPPUNIT_TEST(testFirstEvictionIsAmbiguous);
    CPPUNIT_TEST(testNoMissIncludesFirstEviction);
    CPPUNIT_TEST(testOpenMissedNodeIsIncomplete);
    CPPUNIT_TEST(testGroupingDoesNotSkewCompleteStats);
    CPPUNIT_TEST(testCsvOutputUsesGroupColumnsThenStats);
    CPPUNIT_TEST(testAccessGapAveragesUseDifferentWeights);
    CPPUNIT_TEST(testAccessGapsIncludeEvictionOnlySpans);
    CPPUNIT_TEST(testSpecialCasesCanBeIncluded);
    CPPUNIT_TEST(testNoGroupKeyEmitsRootSubtotalOnly);
    CPPUNIT_TEST(testGroupsUseDeterministicOrder);
    CPPUNIT_TEST(testMissAfterHitUsesEvictionProxy);
    CPPUNIT_TEST(testDeferredTransitionDiagnostics);
    CPPUNIT_TEST(testDelayedEvictionWindow);
    CPPUNIT_TEST(testConsecutiveMissesAreContention);
    CPPUNIT_TEST(testLoadsAreIgnored);
    CPPUNIT_TEST(testRecordingBoundaries);
    CPPUNIT_TEST(testZeroTimestampAccesses);
    CPPUNIT_TEST(testInputFileNameGrouping);
    CPPUNIT_TEST(testRepeatedSpanResets);
    CPPUNIT_TEST(testNestedCsvOutput);
    CPPUNIT_TEST(testCsvWithoutGapsOrDeadTime);
    CPPUNIT_TEST_SUITE_END();

public:
    void testCompleteSpan()
    {
        START_TEST
        CCollectingCacheSpanSink sink;
        CIndexCacheSpanVisitor visitor(sink);

        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 100, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 130, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 180, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 250, 1, 4096, LeafNode);

        CPPUNIT_ASSERT_EQUAL(size_t(1), sink.spans.size());
        const CacheSpanRecord& span = sink.spans[0];
        CPPUNIT_ASSERT((spanComplete | CacheSpanState::Hit) == span.state);
        CPPUNIT_ASSERT_EQUAL(__uint64(80000), span.liveElapsed);
        CPPUNIT_ASSERT_EQUAL(__uint64(70000), span.deadElapsed);
        CPPUNIT_ASSERT_EQUAL(__uint64(3), span.accesses);
        CPPUNIT_ASSERT_EQUAL(__uint64(30000), span.accessGaps.first);
        CPPUNIT_ASSERT_EQUAL(__uint64(50000), span.accessGaps.second);
        END_TEST
    }

    void testMissCanBeLastAccess()
    {
        START_TEST
        CCollectingCacheSpanSink sink;
        CIndexCacheSpanVisitor visitor(sink);

        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 100, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 250, 1, 4096, LeafNode);

        CPPUNIT_ASSERT_EQUAL(size_t(1), sink.spans.size());
        const CacheSpanRecord& span = sink.spans[0];
        CPPUNIT_ASSERT(spanComplete == span.state);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), span.liveElapsed);
        CPPUNIT_ASSERT_EQUAL(__uint64(150000), span.deadElapsed);
        CPPUNIT_ASSERT_EQUAL(__uint64(1), span.accesses);
        END_TEST
    }

    void testFirstHitIsAmbiguous()
    {
        START_TEST
        CCollectingCacheSpanSink sink;
        CIndexCacheSpanVisitor visitor(sink);

        visitIndexCacheEvent(visitor, EventIndexCacheHit, 100, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 250, 1, 4096, LeafNode);

        CPPUNIT_ASSERT_EQUAL(size_t(1), sink.spans.size());
        CPPUNIT_ASSERT((CacheSpanState::Evicted | CacheSpanState::Hit) == sink.spans[0].state);
        END_TEST
    }

    void testFirstEvictionIsAmbiguous()
    {
        START_TEST
        CCollectingCacheSpanSink sink;
        CIndexCacheSpanVisitor visitor(sink);

        visitIndexCacheEvent(visitor, EventIndexEviction, 250, 1, 4096, LeafNode);

        CPPUNIT_ASSERT_EQUAL(size_t(1), sink.spans.size());
        CPPUNIT_ASSERT(CacheSpanState::Evicted == sink.spans[0].state);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), sink.spans[0].accesses);
        CacheSpanAccumulator totals = sink.summarize();
        CPPUNIT_ASSERT_EQUAL(__uint64(0), totals.allSpans.deadElapsed.count);
        END_TEST
    }

    void testNoMissIncludesFirstEviction()
    {
        START_TEST
        CMetaInfoState metaState;
        std::vector<std::vector<GroupAttribute>> groupAttrs;
        CCacheSpanGroupingSink grouping(metaState, groupAttrs, true, false);
        CIndexCacheSpanVisitor visitor(grouping);

        EventFileProperties properties;
        properties.startTimestamp = 250000;
        visitor.visitFile(properties);
        visitIndexCacheEvent(visitor, properties, EventIndexEviction, 250000, 1, 4096, LeafNode);

        const CacheSpanStats& stats = grouping.queryRoot().subTotal.states[unsigned(CacheSpanState::Evicted)];
        CPPUNIT_ASSERT_EQUAL(__uint64(1), stats.spans);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), stats.accessCount.sum);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), stats.liveElapsed.count);
        CPPUNIT_ASSERT_EQUAL(__uint64(1), stats.deadElapsed.count);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), stats.deadElapsed.sum);
        END_TEST
    }

    void testOpenMissedNodeIsIncomplete()
    {
        START_TEST
        CCollectingCacheSpanSink sink;
        CIndexCacheSpanVisitor visitor(sink);

        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 100, 1, 4096, LeafNode);
        visitor.departFile(queryTestEventFileProperties());

        CPPUNIT_ASSERT_EQUAL(size_t(1), sink.spans.size());
        CPPUNIT_ASSERT(CacheSpanState::Missed == sink.spans[0].state);
        END_TEST
    }

    void testGroupingDoesNotSkewCompleteStats()
    {
        START_TEST
        CMetaInfoState metaState;
        std::vector<std::vector<GroupAttribute>> groupAttrs{{GroupAttributeExtractor::parseAttribute("NodeKind")}};
        CCacheSpanGroupingSink grouping(metaState, groupAttrs, true, false);
        CIndexCacheSpanVisitor visitor(grouping);

        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 100, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 150, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 180, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 200, 2, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 220, 2, 4096, LeafNode);

        const CacheSpanAccumulator& totals = grouping.queryRoot().subTotal;
        CPPUNIT_ASSERT_EQUAL(__uint64(1), totals.states[7].spans);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), totals.states[5].spans);
        CPPUNIT_ASSERT_EQUAL(__uint64(50000), totals.states[7].liveElapsed.sum);
        CPPUNIT_ASSERT_EQUAL(__uint64(30000), totals.states[7].deadElapsed.sum);
        CPPUNIT_ASSERT_EQUAL(__uint64(80000), totals.states[7].completeElapsed.sum);
        CPPUNIT_ASSERT_EQUAL(__uint64(2), totals.states[7].accessCount.sum);
        END_TEST
    }

    void testCsvOutputUsesGroupColumnsThenStats()
    {
        START_TEST
        CMetaInfoState metaState;
        std::vector<std::vector<std::string>> groupNames{{"NodeKind"}};
        std::vector<std::vector<GroupAttribute>> groupAttrs{{GroupAttributeExtractor::parseAttribute("NodeKind")}};
        CCacheSpanGroupingSink grouping(metaState, groupAttrs, true, false);
        CIndexCacheSpanVisitor visitor(grouping);

        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 100, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 150, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 180, 1, 4096, LeafNode);

        StringBuffer output;
        renderGroupedCacheSpans(output, grouping, groupNames);

        const char* expectedHeader = "NodeKind,Missed,Hit,Evicted,Spans,LiveElapsedMin,LiveElapsedMax,LiveElapsedAvg,DeadElapsedMin,DeadElapsedMax,DeadElapsedAvg,LiveDeadRatio,CompleteElapsedMin,CompleteElapsedMax,CompleteElapsedAvg,AccessesMin,AccessesMax,AccessesAvg,AccessGapMin,AccessGapMax,AccessGapWeightedAvg,AccessGapSpanAvg,UnresolvedElapsedMin,UnresolvedElapsedMax,UnresolvedElapsedAvg\n";
        CPPUNIT_ASSERT_EQUAL(std::string(expectedHeader), std::string(output.str(), strlen(expectedHeader)));
        CPPUNIT_ASSERT(nullptr == strstr(output.str(), "RowType"));
        CPPUNIT_ASSERT(nullptr != strstr(output.str(), "\"leaf\",\"true\",\"true\",\"true\",1,50000,50000,50000.000,30000,30000,30000.000,1.667,80000,80000,80000.000,2,2,2.000,50000,50000,50000.000,50000.000,,,\n"));
        CPPUNIT_ASSERT(nullptr != strstr(output.str(), "\n,\"true\",\"true\",\"true\",1,50000,50000,50000.000,30000,30000,30000.000,1.667,80000,80000,80000.000,2,2,2.000,50000,50000,50000.000,50000.000,,,\n"));
        END_TEST
    }

    void testAccessGapAveragesUseDifferentWeights()
    {
        START_TEST
        CMetaInfoState metaState;
        std::vector<std::vector<GroupAttribute>> groupAttrs;
        CCacheSpanGroupingSink grouping(metaState, groupAttrs, true, false);
        CIndexCacheSpanVisitor visitor(grouping);

        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 100, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 200, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 250, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 300, 2, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 301, 2, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 302, 2, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 350, 2, 4096, LeafNode);

        const CacheSpanStats& stats = grouping.queryRoot().subTotal.states[unsigned(spanComplete | CacheSpanState::Hit)];
        CPPUNIT_ASSERT_DOUBLES_EQUAL(34000.0, (double)stats.accessGapSum / stats.accessGapCount, 0.001);
        CPPUNIT_ASSERT_DOUBLES_EQUAL(50500.0, stats.accessGapSpanAverage.average(), 0.001);
        END_TEST
    }

    void testAccessGapsIncludeEvictionOnlySpans()
    {
        START_TEST
        CMetaInfoState metaState;
        std::vector<std::vector<std::string>> groupNames;
        std::vector<std::vector<GroupAttribute>> groupAttrs;
        CCacheSpanGroupingSink grouping(metaState, groupAttrs, true, true);
        CIndexCacheSpanVisitor visitor(grouping);

        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 100, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 110, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 130, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 150, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 200, 2, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 300, 3, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 330, 3, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 360, 3, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 400, 3, 4096, LeafNode);

        StringBuffer output;
        renderGroupedCacheSpans(output, grouping, groupNames);

        CPPUNIT_ASSERT(nullptr != strstr(output.str(), "AccessGapMin,AccessGapMax,AccessGapWeightedAvg,AccessGapSpanAvg"));
        CPPUNIT_ASSERT(nullptr != strstr(output.str(), ",10000,30000,22500.000,22500.000,,,\n"));
        END_TEST
    }

    void testSpecialCasesCanBeIncluded()
    {
        START_TEST
        CMetaInfoState metaState;
        std::vector<std::vector<GroupAttribute>> groupAttrs{{GroupAttributeExtractor::parseAttribute("NodeKind")}};
        CCacheSpanGroupingSink grouping(metaState, groupAttrs, true, true);
        CIndexCacheSpanVisitor visitor(grouping);

        visitIndexCacheEvent(visitor, EventIndexCacheHit, 100, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 150, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 180, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 200, 2, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 250, 3, 4096, LeafNode);
        visitor.departFile(queryTestEventFileProperties());

        const CacheSpanAccumulator& totals = grouping.queryRoot().subTotal;
        CPPUNIT_ASSERT_EQUAL(__uint64(1), totals.states[6].spans);
        CPPUNIT_ASSERT_EQUAL(__uint64(1), totals.states[2].spans);
        CPPUNIT_ASSERT_EQUAL(__uint64(1), totals.states[1].spans);
        CPPUNIT_ASSERT_EQUAL(__uint64(2), totals.states[6].accessCount.sum);
        CPPUNIT_ASSERT_EQUAL(__uint64(1), totals.states[2].accessCount.sum);
        CPPUNIT_ASSERT_EQUAL(__uint64(1), totals.states[1].accessCount.sum);
        CPPUNIT_ASSERT_EQUAL(__uint64(30000), totals.states[6].deadElapsed.sum);
        CPPUNIT_ASSERT_EQUAL(__uint64(50000), totals.states[6].liveElapsed.sum);
        CPPUNIT_ASSERT_EQUAL(__uint64(50000), totals.states[6].accessGaps.first);
        CPPUNIT_ASSERT_EQUAL(__uint64(50000), totals.states[6].accessGaps.second);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), totals.states[2].liveElapsed.sum);
        END_TEST
    }

    void testNoGroupKeyEmitsRootSubtotalOnly()
    {
        START_TEST
        CMetaInfoState metaState;
        std::vector<std::vector<GroupAttribute>> groupAttrs;
        CCacheSpanGroupingSink grouping(metaState, groupAttrs, true, false);
        CIndexCacheSpanVisitor visitor(grouping);

        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 100, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 180, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 200, 2, 4096, LeafNode);
        visitor.departFile(queryTestEventFileProperties());

        StringBuffer output;
        std::vector<std::vector<std::string>> groupNames;
        renderGroupedCacheSpans(output, grouping, groupNames);

        const char* firstNewline = strchr(output.str(), '\n');
        CPPUNIT_ASSERT(firstNewline);
        const char* secondNewline = strchr(firstNewline + 1, '\n');
        CPPUNIT_ASSERT(secondNewline);
        const char* thirdNewline = strchr(secondNewline + 1, '\n');
        CPPUNIT_ASSERT(thirdNewline);
        CPPUNIT_ASSERT(nullptr == strchr(thirdNewline + 1, '\n'));
        CPPUNIT_ASSERT(nullptr != strstr(output.str(), "\"true\",\"false\",\"true\",1,0,0,0.000,80000,80000,80000.000"));
        CPPUNIT_ASSERT(nullptr != strstr(output.str(), "\n,,,2,"));
        CPPUNIT_ASSERT(nullptr != strstr(output.str(), ",1,1,1.000,,,,,,,\n"));
        END_TEST
    }

    void testMissAfterHitUsesEvictionProxy()
    {
        START_TEST
        for (bool startsWithMiss : {false, true})
        {
            CCollectingCacheSpanSink sink;
            CIndexCacheSpanVisitor visitor(sink);
            if (startsWithMiss)
                visitIndexCacheEvent(visitor, EventIndexCacheMiss, 100, 1, 4096, LeafNode);
            visitIndexCacheEvent(visitor, EventIndexCacheHit, 150, 1, 4096, LeafNode);
            visitIndexCacheEvent(visitor, EventIndexCacheMiss, 200, 1, 4096, LeafNode);

            CPPUNIT_ASSERT_EQUAL(size_t(1), sink.spans.size());
            CPPUNIT_ASSERT((CacheSpanState::Hit | CacheSpanState::Evicted
                | (startsWithMiss ? CacheSpanState::Missed : CacheSpanState::Open)) == sink.spans[0].state);
            CPPUNIT_ASSERT_EQUAL(__uint64(50000), sink.spans[0].deadElapsed);
            CPPUNIT_ASSERT_EQUAL(__uint64(startsWithMiss ? 50000 : 0), sink.spans[0].liveElapsed);
            CPPUNIT_ASSERT(!sink.spans[0].unresolvedElapsed);

            visitIndexCacheEvent(visitor, EventIndexEviction, 210, 1, 4096, LeafNode);
            CPPUNIT_ASSERT_EQUAL(size_t(1), sink.spans.size());
            visitIndexCacheEvent(visitor, EventIndexCacheHit, 230, 1, 4096, LeafNode);
            visitIndexCacheEvent(visitor, EventIndexEviction, 250, 1, 4096, LeafNode);
            CPPUNIT_ASSERT_EQUAL(size_t(2), sink.spans.size());
            CPPUNIT_ASSERT((spanComplete | CacheSpanState::Hit) == sink.spans[1].state);
            CPPUNIT_ASSERT_EQUAL(__uint64(30000), sink.spans[1].liveElapsed);
            CPPUNIT_ASSERT_EQUAL(__uint64(20000), sink.spans[1].deadElapsed);
            CPPUNIT_ASSERT_EQUAL(__uint64(2), sink.spans[1].accesses);
            CPPUNIT_ASSERT_EQUAL(EventIndexCacheMiss, sink.spans[1].representative.queryType());

            CacheSpanAccumulator totals = sink.summarize();
            CPPUNIT_ASSERT_EQUAL(__uint64(startsWithMiss ? 2 : 1), totals.allSpans.completeElapsed.count);
            CPPUNIT_ASSERT_EQUAL(__uint64(startsWithMiss ? 150000 : 50000), totals.allSpans.completeElapsed.sum);
        }
        END_TEST
    }

    void testDeferredTransitionDiagnostics()
    {
        START_TEST
        CCollectingCacheSpanSink sink;
        CIndexCacheSpanVisitor visitor(sink);
        for (__uint64 fileId : {901, 902, 903, 904, 905})
        {
            visitIndexCacheEvent(visitor, EventIndexCacheHit, 100, fileId, 4096, LeafNode);
            visitIndexCacheEvent(visitor, EventIndexCacheMiss, 200, fileId, 4096, LeafNode);
        }
        CPPUNIT_ASSERT_EQUAL(size_t(5), sink.spans.size());

        visitIndexCacheEvent(visitor, EventIndexLoad, 201, 901, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 205, 999, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 210, 901, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 220, 902, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 230, 903, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 240, 904, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 250, 903, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 260, 904, 4096, LeafNode);
        CPPUNIT_ASSERT_EQUAL(size_t(9), sink.spans.size());
        visitor.departFile(queryTestEventFileProperties());
        CPPUNIT_ASSERT_EQUAL(size_t(11), sink.spans.size());
        visitor.departFile(queryTestEventFileProperties());
        CPPUNIT_ASSERT_EQUAL(size_t(11), sink.spans.size());
        END_TEST
    }

    void testDelayedEvictionWindow()
    {
        START_TEST
        EventFileProperties properties;
        for (__uint64 gap : {__uint64(0), __uint64(9999), __uint64(10000), __uint64(10001)})
        {
            CCollectingCacheSpanSink sink;
            CIndexCacheSpanVisitor visitor(sink);
            visitIndexCacheEvent(visitor, properties, EventIndexCacheMiss, 100000, 1, 4096, LeafNode);
            visitIndexCacheEvent(visitor, properties, EventIndexEviction, 100000 + gap, 1, 4096, LeafNode);
            bool ignored = gap <= 10000;
            CPPUNIT_ASSERT_EQUAL(size_t(ignored ? 0 : 1), sink.spans.size());
            visitor.departFile(properties);
            CPPUNIT_ASSERT_EQUAL(size_t(1), sink.spans.size());
            CPPUNIT_ASSERT((ignored ? CacheSpanState::Missed : spanComplete) == sink.spans[0].state);
            CPPUNIT_ASSERT_EQUAL(ignored ? __uint64(0) : gap, sink.spans[0].deadElapsed);
        }

        CCollectingCacheSpanSink sink;
        CIndexCacheSpanVisitor visitor(sink);
        visitIndexCacheEvent(visitor, properties, EventIndexCacheMiss, 100000, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, properties, EventIndexCacheMiss, 200000, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, properties, EventIndexEviction, 205000, 2, 4096, LeafNode);
        visitIndexCacheEvent(visitor, properties, EventIndexEviction, 206000, 1, 8192, LeafNode);
        CPPUNIT_ASSERT_EQUAL(size_t(2), sink.spans.size());
        visitIndexCacheEvent(visitor, properties, EventIndexCacheHit, 207000, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, properties, EventIndexEviction, 210000, 1, 4096, LeafNode);
        CPPUNIT_ASSERT_EQUAL(size_t(2), sink.spans.size());
        visitIndexCacheEvent(visitor, properties, EventIndexEviction, 210001, 1, 4096, LeafNode);
        CPPUNIT_ASSERT_EQUAL(size_t(3), sink.spans.size());
        CPPUNIT_ASSERT_EQUAL(__uint64(3), sink.spans[2].accesses);
        CPPUNIT_ASSERT_EQUAL(__uint64(3001), sink.spans[2].deadElapsed);
        END_TEST
    }

    void testConsecutiveMissesAreContention()
    {
        START_TEST
        CCollectingCacheSpanSink sink;
        CIndexCacheSpanVisitor visitor(sink);
        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 0, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 0, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 1000000, 1, 4096, LeafNode);
        CPPUNIT_ASSERT(sink.spans.empty());
        visitIndexCacheEvent(visitor, EventIndexEviction, 1000020, 1, 4096, LeafNode);
        CPPUNIT_ASSERT_EQUAL(size_t(1), sink.spans.size());
        const auto& span = sink.spans[0];
        CPPUNIT_ASSERT(spanComplete == span.state);
        CPPUNIT_ASSERT_EQUAL(__uint64(3), span.accesses);
        CPPUNIT_ASSERT_EQUAL(__uint64(1000000000), span.liveElapsed);
        CPPUNIT_ASSERT_EQUAL(__uint64(20000), span.deadElapsed);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), span.accessGaps.first);
        CPPUNIT_ASSERT_EQUAL(__uint64(1000000000), span.accessGaps.second);
        END_TEST
    }

    void testLoadsAreIgnored()
    {
        START_TEST
        CCollectingCacheSpanSink sink;
        CIndexCacheSpanVisitor visitor(sink);
        visitIndexCacheEvent(visitor, EventIndexLoad, 50, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 100, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexLoad, 120, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 150, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexLoad, 170, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 200, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexLoad, 220, 2, 4096, LeafNode);
        visitor.departFile(queryTestEventFileProperties());
        CPPUNIT_ASSERT_EQUAL(size_t(1), sink.spans.size());
        CPPUNIT_ASSERT((spanComplete | CacheSpanState::Hit) == sink.spans[0].state);
        CPPUNIT_ASSERT_EQUAL(__uint64(2), sink.spans[0].accesses);
        CPPUNIT_ASSERT_EQUAL(__uint64(50000), sink.spans[0].liveElapsed);
        CPPUNIT_ASSERT_EQUAL(__uint64(50000), sink.spans[0].deadElapsed);
        END_TEST
    }

    void testRecordingBoundaries()
    {
        START_TEST
        EventFileProperties properties;
        properties.startTimestamp = 50000;
        properties.endTimestamp = 300000;
        CCollectingCacheSpanSink sink;
        CIndexCacheSpanVisitor visitor(sink);
        visitor.visitFile(properties);
        visitIndexCacheEvent(visitor, properties, EventIndexCacheHit, 100000, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, properties, EventIndexEviction, 200000, 2, 4096, LeafNode);
        visitIndexCacheEvent(visitor, properties, EventIndexCacheMiss, 250000, 3, 4096, LeafNode);
        visitor.departFile(properties);

        CPPUNIT_ASSERT_EQUAL(size_t(3), sink.spans.size());
        CacheSpanAccumulator totals = sink.summarize();
        const auto& evictionStats = totals.states[unsigned(CacheSpanState::Evicted)];
        CPPUNIT_ASSERT_EQUAL(__uint64(150000), evictionStats.deadElapsed.sum);
        CPPUNIT_ASSERT_EQUAL(__uint64(1), evictionStats.deadElapsed.count);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), evictionStats.accessCount.sum);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), evictionStats.liveElapsed.count);
        CPPUNIT_ASSERT_EQUAL(__uint64(1), totals.allSpans.deadElapsed.count);
        CPPUNIT_ASSERT_EQUAL(__uint64(2), totals.allSpans.unresolvedElapsed.count);
        CPPUNIT_ASSERT_EQUAL(__uint64(250000), totals.allSpans.unresolvedElapsed.sum);
        CPPUNIT_ASSERT_EQUAL(__uint64(50000), totals.allSpans.liveElapsed.sum);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), totals.allSpans.completeElapsed.count);
        const auto& hitStats = totals.states[unsigned(CacheSpanState::Hit)];
        CPPUNIT_ASSERT_EQUAL(__uint64(2), hitStats.accessCount.sum);
        CPPUNIT_ASSERT_EQUAL(__uint64(1), hitStats.accessGapCount);
        CPPUNIT_ASSERT_EQUAL(__uint64(50000), hitStats.accessGapSum);
        CPPUNIT_ASSERT_EQUAL(__uint64(50000), hitStats.accessGaps.first);
        CPPUNIT_ASSERT_EQUAL(__uint64(50000), hitStats.accessGaps.second);

        std::vector<std::vector<std::string>> groupNames;
        StringBuffer output;
        Owned<IBufferedSerialOutputStream> stream = createBufferedSerialOutputStream(output);
        CCacheSpanCsvFormatter formatter(*stream, groupNames);
        formatter.begin();
        formatter.outputSummary({}, totals, true, true);
        stream.clear();
        CPPUNIT_ASSERT(strstr(output.str(), "\"true\",\"false\",\"false\",1,0,0,0.000,,,,,,,,1,1,1.000,,,,,50000,50000,50000.000\n"));
        CPPUNIT_ASSERT(strstr(output.str(), ",50000,200000,125000.000\n"));

        EventFileProperties zeroEnd;
        zeroEnd.startTimestamp = 400000;
        zeroEnd.endTimestamp = 400000;
        visitor.visitFile(zeroEnd);
        visitIndexCacheEvent(visitor, zeroEnd, EventIndexCacheHit, 400000, 1, 4096, LeafNode);
        visitor.departFile(zeroEnd);
        CPPUNIT_ASSERT(sink.spans.back().unresolvedElapsed.has_value());
        CPPUNIT_ASSERT_EQUAL(__uint64(0), *sink.spans.back().unresolvedElapsed);
        CacheSpanStats zeroStats;
        zeroStats.accumulate(sink.spans.back());
        CPPUNIT_ASSERT_EQUAL(__uint64(1), zeroStats.unresolvedElapsed.count);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), zeroStats.deadElapsed.count);
        CPPUNIT_ASSERT_EQUAL(__uint64(2), zeroStats.accessCount.sum);
        CPPUNIT_ASSERT_EQUAL(__uint64(1), zeroStats.accessGapCount);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), zeroStats.accessGaps.first);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), zeroStats.accessGaps.second);

        EventFileProperties noBoundaries;
        visitor.visitFile(noBoundaries);
        visitIndexCacheEvent(visitor, noBoundaries, EventIndexCacheHit, 500000, 1, 4096, LeafNode);
        visitor.departFile(noBoundaries);
        CPPUNIT_ASSERT(!sink.spans.back().unresolvedElapsed);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), sink.spans.back().liveElapsed);
        END_TEST
    }

    void testZeroTimestampAccesses()
    {
        START_TEST
        CCollectingCacheSpanSink sink;
        CIndexCacheSpanVisitor visitor(sink);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 0, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 0, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 0, 1, 4096, LeafNode);
        CPPUNIT_ASSERT_EQUAL(size_t(1), sink.spans.size());
        CPPUNIT_ASSERT_EQUAL(__uint64(2), sink.spans[0].accesses);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), sink.spans[0].accessGaps.first);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), sink.spans[0].deadElapsed);
        visitIndexCacheEvent(visitor, EventIndexEviction, 20, 1, 4096, LeafNode);
        CPPUNIT_ASSERT_EQUAL(size_t(2), sink.spans.size());
        CPPUNIT_ASSERT(spanComplete == sink.spans[1].state);
        END_TEST
    }

    void testInputFileNameGrouping()
    {
        START_TEST
        CMetaInfoState metaState;
        std::vector<std::vector<GroupAttribute>> groupAttrs{{GroupAttributeExtractor::parseAttribute("InputFileName")}};
        CCacheSpanGroupingSink grouping(metaState, groupAttrs, true, true);
        CIndexCacheSpanVisitor visitor(grouping);
        EventFileProperties first;
        first.path.set("/events/first.evt");
        EventFileProperties second;
        second.path.set("/events/second.evt");
        visitor.visitFile(first);
        visitIndexCacheEvent(visitor, first, EventIndexCacheHit, 100000, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, first, EventIndexCacheMiss, 150000, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, first, EventIndexEviction, 200000, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, first, EventIndexCacheMiss, 250000, 1, 4096, LeafNode);
        visitor.departFile(first);
        visitor.visitFile(second);
        visitIndexCacheEvent(visitor, second, EventIndexEviction, 300000, 1, 4096, LeafNode);
        visitor.departFile(second);
        CPPUNIT_ASSERT_EQUAL(size_t(2), grouping.queryRoot().children.size());
        for (const auto& child : grouping.queryRoot().children)
        {
            const auto& group = *child.second;
            CPPUNIT_ASSERT_EQUAL(size_t(1), group.groupValues.size());
            if (group.groupValues[0] == "first.evt")
                CPPUNIT_ASSERT_EQUAL(__uint64(3), group.subTotal.allSpans.spans);
            else
            {
                CPPUNIT_ASSERT_EQUAL(std::string("second.evt"), group.groupValues[0]);
                CPPUNIT_ASSERT_EQUAL(__uint64(1), group.subTotal.allSpans.spans);
            }
        }
        END_TEST
    }

    void testRepeatedSpanResets()
    {
        START_TEST
        CCollectingCacheSpanSink sink;
        CIndexCacheSpanVisitor visitor(sink);
        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 100, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 120, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 150, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 200, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 240, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 300, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 310, 1, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 340, 1, 4096, LeafNode);
        CPPUNIT_ASSERT_EQUAL(size_t(3), sink.spans.size());
        const auto& middle = sink.spans[1];
        CPPUNIT_ASSERT((spanComplete | CacheSpanState::Hit) == middle.state);
        CPPUNIT_ASSERT_EQUAL(__uint64(2), middle.accesses);
        CPPUNIT_ASSERT_EQUAL(__uint64(40000), middle.liveElapsed);
        CPPUNIT_ASSERT_EQUAL(__uint64(60000), middle.deadElapsed);
        CPPUNIT_ASSERT_EQUAL(__uint64(40000), middle.accessGaps.first);
        CPPUNIT_ASSERT_EQUAL(__uint64(40000), middle.accessGaps.second);
        const auto& last = sink.spans[2];
        CPPUNIT_ASSERT(spanComplete == last.state);
        CPPUNIT_ASSERT_EQUAL(__uint64(2), last.accesses);
        CPPUNIT_ASSERT_EQUAL(__uint64(10000), last.liveElapsed);
        CPPUNIT_ASSERT_EQUAL(__uint64(30000), last.deadElapsed);
        CPPUNIT_ASSERT_EQUAL(__uint64(10000), last.accessGaps.first);
        CPPUNIT_ASSERT_EQUAL(__uint64(10000), last.accessGaps.second);
        CPPUNIT_ASSERT_EQUAL(__uint64(300000), last.representative.queryNumericValue(EvAttrEventTimestamp));
        CPPUNIT_ASSERT(!last.unresolvedElapsed);
        END_TEST
    }

    void testNestedCsvOutput()
    {
        START_TEST
        CMetaInfoState metaState;
        std::vector<std::vector<std::string>> groupNames{{"NodeKind"}, {"FileId", "FileOffset"}};
        std::vector<std::vector<GroupAttribute>> groupAttrs{
            {GroupAttributeExtractor::parseAttribute("NodeKind")},
            {GroupAttributeExtractor::parseAttribute("FileId"), GroupAttributeExtractor::parseAttribute("FileOffset")}};
        for (bool includeComplete : {false, true})
        {
            for (bool includeIncomplete : {false, true})
            {
                CCacheSpanGroupingSink grouping(metaState, groupAttrs, includeComplete, includeIncomplete);
                CIndexCacheSpanVisitor visitor(grouping);
                StringBuffer emptyOutput;
                renderGroupedCacheSpans(emptyOutput, grouping, groupNames);
                CPPUNIT_ASSERT_EQUAL(std::ptrdiff_t(1), std::count(emptyOutput.str(), emptyOutput.str() + emptyOutput.length(), '\n'));

                visitIndexCacheEvent(visitor, EventIndexCacheMiss, 100, 1, 4096, LeafNode);
                visitIndexCacheEvent(visitor, EventIndexEviction, 150, 1, 4096, LeafNode);
                visitIndexCacheEvent(visitor, EventIndexCacheHit, 200, 2, 8192, LeafNode);
                visitor.departFile(queryTestEventFileProperties());
                StringBuffer output;
                renderGroupedCacheSpans(output, grouping, groupNames);
                const std::string text(output.str());
                const size_t headerEnd = text.find('\n');
                const auto columns = std::count(text.begin(), text.begin() + headerEnd, ',');
                CPPUNIT_ASSERT_EQUAL(std::ptrdiff_t(26), columns);
                size_t rows = 0;
                for (size_t start = headerEnd + 1; start < text.size();)
                {
                    size_t end = text.find('\n', start);
                    CPPUNIT_ASSERT(end != std::string::npos);
                    CPPUNIT_ASSERT_EQUAL(columns, std::count(text.begin() + start, text.begin() + end, ','));
                    rows++;
                    start = end + 1;
                }
                CPPUNIT_ASSERT_EQUAL(size_t(4 + 3 * unsigned(includeComplete) + 3 * unsigned(includeIncomplete)), rows);
                CPPUNIT_ASSERT(strstr(output.str(), "\n,,,,,,2,"));
            }
        }
        END_TEST
    }

    void testCsvWithoutGapsOrDeadTime()
    {
        START_TEST
        CacheSpanRecord span;
        span.state = spanComplete;
        span.accesses = 1;
        span.hasDeadElapsed = true;
        CacheSpanAccumulator totals;
        totals.accumulate(span);
        CPPUNIT_ASSERT_EQUAL(__uint64(1), totals.allSpans.deadElapsed.count);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), totals.allSpans.deadElapsed.sum);
        CPPUNIT_ASSERT_EQUAL(__uint64(0), totals.allSpans.accessGapCount);

        StringBuffer output;
        Owned<IBufferedSerialOutputStream> stream = createBufferedSerialOutputStream(output);
        std::vector<std::vector<std::string>> groupNames;
        CCacheSpanCsvFormatter formatter(*stream, groupNames);
        formatter.outputSummary({}, totals, true, true);
        stream.clear();
        CPPUNIT_ASSERT_EQUAL(std::string(
            "\"true\",\"false\",\"true\",1,0,0,0.000,0,0,0.000,,0,0,0.000,1,1,1.000,,,,,,,\n"
            ",,,1,0,0,0.000,0,0,0.000,,0,0,0.000,1,1,1.000,,,,,,,\n"), std::string(output.str()));
        END_TEST
    }

    void testGroupsUseDeterministicOrder()
    {
        START_TEST
        CMetaInfoState metaState;
        std::vector<std::vector<std::string>> groupNames{{"NodeKind"}};
        std::vector<std::vector<GroupAttribute>> groupAttrs{{GroupAttributeExtractor::parseAttribute("NodeKind")}};
        CCacheSpanGroupingSink grouping(metaState, groupAttrs, true, false);
        CIndexCacheSpanVisitor visitor(grouping);

        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 100, 1, 4096, BranchNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 150, 1, 4096, BranchNode);
        visitIndexCacheEvent(visitor, EventIndexCacheMiss, 200, 2, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexCacheHit, 220, 2, 4096, LeafNode);
        visitIndexCacheEvent(visitor, EventIndexEviction, 250, 2, 4096, LeafNode);

        StringBuffer output;
        renderGroupedCacheSpans(output, grouping, groupNames);

        std::vector<std::string> groupOrder;
        std::string outputText(output.str());
        size_t rowStart = outputText.find('\n') + 1;
        while (rowStart < outputText.size())
        {
            size_t rowEnd = outputText.find('\n', rowStart);
            if (rowEnd == std::string::npos)
                rowEnd = outputText.size();
            std::string row = outputText.substr(rowStart, rowEnd - rowStart);
            size_t separator = row.find(',');
            if (separator != std::string::npos && separator != 0)
            {
                std::string groupValue = row.substr(0, separator);
                if (groupOrder.empty() || groupOrder.back() != groupValue)
                    groupOrder.push_back(std::move(groupValue));
            }
            if (rowEnd == outputText.size())
                break;
            rowStart = rowEnd + 1;
        }
        CPPUNIT_ASSERT_EQUAL(size_t(2), groupOrder.size());
        CPPUNIT_ASSERT_EQUAL(std::string("\"branch\""), groupOrder[0]);
        CPPUNIT_ASSERT_EQUAL(std::string("\"leaf\""), groupOrder[1]);
        END_TEST
    }

};

CPPUNIT_TEST_SUITE_REGISTRATION(EventIndexCacheSpanTest);
CPPUNIT_TEST_SUITE_NAMED_REGISTRATION(EventIndexCacheSpanTest, "eventindexcachespan");

#endif