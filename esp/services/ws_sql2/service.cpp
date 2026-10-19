#include "service.hpp"
#include "metadata.hpp"
#include "fileview.hpp"
#include "thorcommon.hpp"

#include "seclib.hpp"
#include "jstring.hpp"
#include "jptree.hpp"

#include <algorithm>
#include <optional>
#include <openssl/rand.h>

static std::string queryUserId(IEspContext& context)
{
    StringBuffer userId;
    context.getUserID(userId);
    return userId.str();
}

static Owned<IUserDescriptor> createRequestUser(IEspContext& context)
{
    StringBuffer userId;
    context.getUserID(userId);
    Owned<IUserDescriptor> user;
    if (!userId.isEmpty())
    {
        user.setown(createUserDescriptor());
        user->set(userId, context.queryPassword(), context.querySignature());
    }
    return user;
}

CWsSQL2Ex::~CWsSQL2Ex()
{
    {
        std::lock_guard<std::mutex> lock(cursorRegistryMutex);
        stopCursorCleanup = true;
    }
    cursorCleanupCondition.notify_all();
    if (cursorCleanupThread.joinable())
        cursorCleanupThread.join();

    std::unordered_map<std::string, std::shared_ptr<CActiveResultSet>> remainingCursors;
    {
        std::lock_guard<std::mutex> lock(cursorRegistryMutex);
        remainingCursors.swap(activeResultSets);
    }
    remainingCursors.clear();

}

static unsigned readUnsignedSetting(IPropertyTree* config, const char* name, unsigned defaultValue)
{
    const __int64 value = config->getPropInt64(name, defaultValue);
    if (value < 0 || value >(__int64)UINT_MAX)
        throw makeStringExceptionV(-1, "ws_sql2: configuration setting %s must be between 0 and %u (got %" I64F "d)", name + 1, UINT_MAX, value);
    return static_cast<unsigned>(value);
}

static unsigned readPositiveSetting(IPropertyTree* config, const char* name, unsigned defaultValue)
{
    const unsigned value = readUnsignedSetting(config, name, defaultValue);
    if (!value)
        throw makeStringExceptionV(-1, "ws_sql2: configuration setting %s must be greater than 0", name + 1);
    return value;
}

void CWsSQL2Ex::init(IPropertyTree* cfg, const char* process, const char* service)
{
    CWsSQL2::init(cfg, process, service);
    if (cfg && !isEmptyString(process) && !isEmptyString(service))
    {
        VStringBuffer xpath("Software/EspProcess[@name=\"%s\"]/EspService[@name=\"%s\"]", process, service);
        IPropertyTree* serviceConfig = cfg->queryPropTree(xpath);
        if (serviceConfig)
        {
            engineOptions.memoryLimit = serviceConfig->queryProp("@memoryLimit", "");
            engineOptions.threads = readUnsignedSetting(serviceConfig, "@threads", 0);
            engineOptions.tempDirectory = serviceConfig->queryProp("@tempDirectory", "");
            engineOptions.maxTempDirectorySize = serviceConfig->queryProp("@maxTempDirectorySize", "");
            engineOptions.allowLongFormScan = serviceConfig->getPropBool("@allowLongFormScan", false);
            maxByteLimit = readUnsignedSetting(serviceConfig, "@maxByteLimit", maxByteLimit);
            defaultFetchSize = readPositiveSetting(serviceConfig, "@defaultFetchSize", defaultFetchSize);
            maxFetchSize = readPositiveSetting(serviceConfig, "@maxFetchSize", maxFetchSize);
            maxActiveCursors = readPositiveSetting(serviceConfig, "@maxActiveCursors", maxActiveCursors);
            maxCursorsPerUser = readPositiveSetting(serviceConfig, "@maxCursorsPerUser", maxCursorsPerUser);
            cursorIdleTimeoutSeconds = readPositiveSetting(serviceConfig, "@cursorIdleTimeoutSeconds", cursorIdleTimeoutSeconds);
            cursorMaxLifetimeSeconds = readPositiveSetting(serviceConfig, "@cursorMaxLifetimeSeconds", cursorMaxLifetimeSeconds);
            leakCheckThresholdBytes = readUnsignedSetting(serviceConfig, "@leakCheckThresholdBytes", leakCheckThresholdBytes);
        }
    }
    if (defaultFetchSize > maxFetchSize)
        throw makeStringException(-1, "ws_sql2: defaultFetchSize must not exceed maxFetchSize");
    if (cursorMaxLifetimeSeconds < cursorIdleTimeoutSeconds)
        throw makeStringException(-1, "ws_sql2: cursorMaxLifetimeSeconds must be at least cursorIdleTimeoutSeconds");
    // Built once, after engineOptions is fully populated, so every request shares one memory/thread/spill budget
    // instead of each request creating (and bounding) its own DuckDB instance.
    sharedQueryDatabase = std::make_unique<CSharedQueryDatabase>(engineOptions);
    try
    {
        cursorCleanupThread = std::thread(&CWsSQL2Ex::cursorCleanupLoop, this);
    }
    catch (const std::exception& exception)
    {
        throw makeStringExceptionV(-1, "ws_sql2: unable to start result cursor cleanup thread: %s", exception.what());
    }
}

unsigned CWsSQL2Ex::resolveFetchSize(int requested) const
{
    if (requested < 0)
        throw makeStringException(-1, "FetchSize must not be negative");
    unsigned fetchSize = requested ? static_cast<unsigned>(requested) : defaultFetchSize;
    fetchSize = std::min(fetchSize, maxFetchSize);
    if (!fetchSize)
        throw makeStringException(-1, "Effective FetchSize must be greater than zero");
    return fetchSize;
}

void CWsSQL2Ex::removeExpiredCursors()
{
    std::vector<std::shared_ptr<CActiveResultSet>> expired;
    const auto now = std::chrono::steady_clock::now();
    {
        std::lock_guard<std::mutex> lock(cursorRegistryMutex);
        for (auto cursor = activeResultSets.begin(); cursor != activeResultSets.end();)
        {
            const auto& resultSet = cursor->second;
            const bool expiredByIdle = now - resultSet->lastAccess >= std::chrono::seconds(cursorIdleTimeoutSeconds);
            const bool expiredByLifetime = now - resultSet->created >= std::chrono::seconds(cursorMaxLifetimeSeconds);
            if ((expiredByIdle || expiredByLifetime) && resultSet->operationMutex.try_lock())
            {
                resultSet->operationMutex.unlock();
                expired.emplace_back(resultSet);
                cursor = activeResultSets.erase(cursor);
            }
            else
                ++cursor;
        }
    }
}

void CWsSQL2Ex::cursorCleanupLoop()
{
    std::unique_lock<std::mutex> lock(cursorRegistryMutex);
    while (!stopCursorCleanup)
    {
        cursorCleanupCondition.wait_for(lock, std::chrono::seconds(10), [this] { return stopCursorCleanup; });
        if (stopCursorCleanup)
            break;
        lock.unlock();
        removeExpiredCursors();
        lock.lock();
    }
}

static std::string createOpaqueCursorId()
{
    unsigned char randomBytes[32];
    if (RAND_bytes(randomBytes, sizeof(randomBytes)) != 1)
        throw makeStringException(-1, "Unable to generate a secure result cursor identifier");
    static constexpr char hex[] = "0123456789abcdef";
    std::string cursorId;
    cursorId.reserve(sizeof(randomBytes) * 2);
    for (unsigned char value : randomBytes)
    {
        cursorId.push_back(hex[value >> 4]);
        cursorId.push_back(hex[value & 0x0f]);
    }
    return cursorId;
}

static void setResultSetMetadata(IArrayOf<IEspResultSetColumn>& resultColumns, const std::vector<CQueryResultColumnMetadata>& resultMetadata)
{
    for (const CQueryResultColumnMetadata& column : resultMetadata)
    {
        Owned<IEspResultSetColumn> resultColumn = createResultSetColumn();
        resultColumn->setColumnLabel(column.name.c_str());
        resultColumn->setColumnTypeName(column.typeName.c_str());
        resultColumn->setPrecision(column.precision);
        resultColumn->setScale(column.scale);
        resultColumns.append(*resultColumn.getClear());
    }
}

static __int64 memoryDelta(unsigned __int64 after, unsigned __int64 before)
{
    return static_cast<__int64>(after) - static_cast<__int64>(before);
}

static void setMemoryUsage(IEspMemoryUsage& target, const CEngineMemoryUsage& usage)
{
    target.setDuckDBUsedBytes(usage.duckdbUsedBytes);
    target.setDuckDBTempBytes(usage.duckdbTempBytes);
    if (usage.heapAvailable)
        target.setHeapInUseBytes(usage.heapInUseBytes);
    target.setResidentBytes(usage.residentBytes);
    target.setPeakResidentBytes(usage.peakResidentBytes);
}

static void setMemoryDelta(IEspMemoryUsage& target, const CEngineMemoryUsage& after, const CEngineMemoryUsage& before)
{
    target.setDuckDBUsedBytes(memoryDelta(after.duckdbUsedBytes, before.duckdbUsedBytes));
    target.setDuckDBTempBytes(memoryDelta(after.duckdbTempBytes, before.duckdbTempBytes));
    if (after.heapAvailable && before.heapAvailable)
        target.setHeapInUseBytes(memoryDelta(after.heapInUseBytes, before.heapInUseBytes));
    target.setResidentBytes(memoryDelta(after.residentBytes, before.residentBytes));
    target.setPeakResidentBytes(memoryDelta(after.peakResidentBytes, before.peakResidentBytes));
}

#ifdef _DEBUG
static void setScanObjectCounts(IEspScanObjectCounts& target, const CEngineScanObjectCounts& counts)
{
    target.setBindData(counts.bindData);
    target.setGlobalStates(counts.globalStates);
    target.setLocalStates(counts.localStates);
}
#endif

// start is captured before the request's engine is created, current while it is still alive, and released (only
// once the cursor is exhausted) after it has been destroyed.
struct CDebugReport
{
    CEngineMemoryUsage start;
    CEngineMemoryUsage current;
    std::optional<CEngineMemoryUsage> released;
    __int64 leakThresholdBytes = 0;
    // Bytes of rows and graphs copied into the response, which is still held when released is captured.
    unsigned __int64 responseBytes = 0;
#ifdef _DEBUG
    CScanObjectAudit scanObjects;
#endif
};

// Returns the memory leak verdict. Memory still held at release relative to start is reported as Retained.
static const char* checkRetainedMemory(const CDebugReport& report, StringBuffer& detail)
{
    const CEngineMemoryUsage& start = report.start;
    const CEngineMemoryUsage& released = *report.released;
    // Every figure is instance- or process-wide, so the check is only meaningful when no other engine existed at
    // any point between the start and release snapshots (this request's engine is the only one created).
    const unsigned __int64 enginesCreated = released.createdEngines - start.createdEngines;
    if (start.liveEngines || released.liveEngines || enginesCreated != 1)
    {
        detail.appendf("Other queries were active during the measurement window (%u engine(s) live at start, %u live at release, %" I64F "u created), so retained memory cannot be attributed to this query",
            start.liveEngines, released.liveEngines, enginesCreated);
        return "Inconclusive";
    }

    StringBuffer suspects;
    const __int64 duckdbRetained = memoryDelta(released.duckdbUsedBytes, start.duckdbUsedBytes);
    if (duckdbRetained > report.leakThresholdBytes)
        suspects.appendf("DuckDB buffer memory grew by %" I64F "d bytes", duckdbRetained);
    if (released.heapAvailable && start.heapAvailable)
    {
        const __int64 heapRetained = memoryDelta(released.heapInUseBytes, start.heapInUseBytes) - static_cast<__int64>(report.responseBytes);
        if (heapRetained > report.leakThresholdBytes)
        {
            if (suspects.length())
                suspects.append("; ");
            suspects.appendf("process heap in use grew by %" I64F "d bytes (excluding the %" I64F "u byte response)", heapRetained, report.responseBytes);
        }
    }

    if (suspects.length())
    {
        detail.append(suspects).appendf(" after the query was released (threshold %" I64F "d bytes). One-time initialization can account for growth on first use; repeat the query to confirm", report.leakThresholdBytes);
        return "PossibleLeak";
    }
    detail.appendf("Memory returned to within %" I64F "d bytes of its starting level after the query was released (excluding the %" I64F "u byte response)", report.leakThresholdBytes, report.responseBytes);
    return "Passed";
}

static void setDebugInfo(IEspDebugInfo& debugInfo, const CDebugReport& report)
{
    setMemoryUsage(debugInfo.updateStart(), report.start);
    setMemoryUsage(debugInfo.updateCurrent(), report.current);
#ifdef _DEBUG
    CEngineScanObjectCounts liveScanObjects;
    if (report.scanObjects.isValid())
    {
        liveScanObjects = report.scanObjects.queryLive();
        setScanObjectCounts(debugInfo.updateScanObjectsCreated(), report.scanObjects.queryCreated());
        setScanObjectCounts(debugInfo.updateScanObjectsLive(), liveScanObjects);
    }
#endif
    if (!report.released)
    {
        debugInfo.setLeakCheck("Pending");
        debugInfo.setLeakCheckDetail("The leak check runs once the result cursor is exhausted; it is reported by the final FetchResultSet");
        return;
    }

    setMemoryUsage(debugInfo.updateReleased(), *report.released);
    setMemoryDelta(debugInfo.updateRetained(), *report.released, report.start);

#ifdef _DEBUG
    // Unlike the memory figures, these counts belong to this query alone, so a non-zero count is a definite leak
    // even while other queries are running.
    if (liveScanObjects.total())
    {
        VStringBuffer detail("hpcc_scan objects created by this query outlived it: %" I64F "u bind data, %" I64F "u global scan state(s), %" I64F "u local scan state(s)",
            liveScanObjects.bindData, liveScanObjects.globalStates, liveScanObjects.localStates);
        debugInfo.setLeakCheck("Leaked");
        debugInfo.setLeakCheckDetail(detail.str());
        return;
    }
#endif

    StringBuffer detail;
    const char* verdict = checkRetainedMemory(report, detail);
#ifdef _DEBUG
    if (report.scanObjects.isValid())
        detail.appendf(". All %" I64F "u hpcc_scan objects created by this query were destroyed", report.scanObjects.queryCreated().total());
#endif
    debugInfo.setLeakCheck(verdict);
    debugInfo.setLeakCheckDetail(detail.str());
}

// The response holds its own copy of these, so free the originals before the leak check measures the heap. Returns
// the size of the copies, which are freed once the response has been sent.
static unsigned __int64 releaseResponsePayload(std::string& rowsJson, std::string& executionGraphJson, std::string& executionGraph, bool graphsReturned)
{
    unsigned __int64 responseBytes = rowsJson.size();
    if (graphsReturned)
        responseBytes += executionGraphJson.size() + executionGraph.size();
    std::string().swap(rowsJson);
    std::string().swap(executionGraphJson);
    std::string().swap(executionGraph);
    return responseBytes;
}

// Must be called after the cursor's engine has been released when complete is true.
void CWsSQL2Ex::reportDebugInfo(IEspDebugInfo& debugInfo, const CActiveResultSet& resultSet, const CEngineMemoryUsage& current, bool complete, unsigned __int64 responseBytes)
{
    CDebugReport report;
    report.start = resultSet.debugStart;
    report.current = current;
    if (complete)
        report.released = sharedQueryDatabase->captureMemoryUsage();
    report.leakThresholdBytes = leakCheckThresholdBytes;
    report.responseBytes = responseBytes;
#ifdef _DEBUG
    report.scanObjects = resultSet.scanObjectAudit;
#endif
    setDebugInfo(debugInfo, report);
}

bool CWsSQL2Ex::onLogicalFileMeta(IEspContext& context, IEspLogicalFileMetaRequest& req, IEspLogicalFileMetaResponse& resp)
{
    Owned<IUserDescriptor> user = createRequestUser(context);

    Owned<IDistributedFile> file = CMetadataResolver::resolveLogicalFile(req.getLogicalName(), user);
    CScanDescriptor descriptor;
    CMetadataResolver::buildScanDescriptor(*file, descriptor, true, nullptr);

    Owned<IPropertyTree> options = createPTreeFromJSONString(descriptor.options.c_str());
    if (!options)
        throw makeStringException(-1, "Unable to parse serialized logical-file scan options");

    IEspLogicalFileMeta& logicalFileMeta = resp.updateLogicalFileMeta();
    logicalFileMeta.setVersion(options->getPropInt("@version", 0));
    logicalFileMeta.setLogicalName(options->queryProp("@logicalName", ""));
    logicalFileMeta.setKind(options->queryProp("@kind", ""));
    logicalFileMeta.setFormat(options->queryProp("@format", ""));
    logicalFileMeta.setGrouped(options->getPropBool("@grouped", false));
    logicalFileMeta.setFormatCrc(options->getPropInt("@formatCrc", 0));
    logicalFileMeta.setRecordTranslationMode(options->getPropInt("@recordTranslationMode", 0));
    logicalFileMeta.setModified(options->getPropInt64("@modified", 0));
    if (descriptor.recordCount)
    {
        const std::string recordCount = std::to_string(*descriptor.recordCount);
        logicalFileMeta.setRecordCount(recordCount.c_str());
    }

    Owned<IPropertyTree> formatOptions = options->getPropTree("formatOptions");
    StringBuffer formatOptionsJson;
    if (formatOptions)
        toJSON(formatOptions.get(), formatOptionsJson, 0, 0);
    logicalFileMeta.setFormatOptions(formatOptionsJson.str());

    Owned<IPropertyTree> providerOptions = options->getPropTree("providerOptions");
    StringBuffer providerOptionsJson;
    if (providerOptions)
        toJSON(providerOptions.get(), providerOptionsJson, 0, 0);
    logicalFileMeta.setProviderOptions(providerOptionsJson.str());
    logicalFileMeta.setEclRecord(descriptor.eclRecordDefinition.c_str());
    logicalFileMeta.setFileParts(descriptor.parts.c_str());
    logicalFileMeta.setSampleSQL(descriptor.sampleSql.c_str());
    return true;
}

bool CWsSQL2Ex::onExplainQuery(IEspContext& context, IEspExplainQueryRequest& req, IEspExplainQueryResponse& resp)
{
    Owned<IUserDescriptor> user = createRequestUser(context);
    CQueryEngine engine(*sharedQueryDatabase, user, engineOptions.allowLongFormScan);
    if (!engine.isInitialized())
        throw makeStringException(-1, "Unable to initialize hpcc_scan engine");

    StringArray projectedColumns;
    StringArray residualFilters;
    std::vector<CQueryResultColumnMetadata> resultMetadata;
    std::string planText;
    std::string planJson;
    std::string errorMessage;
    if (!engine.explainQuery(req.getSqlText(), planText, planJson, projectedColumns, residualFilters, resultMetadata, errorMessage))
        throw makeStringException(-1, errorMessage.c_str());
    resp.setExecutionGraph(planText.c_str());
    resp.setExecutionGraphJson(planJson.c_str());
    IArrayOf<IEspResultSetColumn> resultColumns;
    setResultSetMetadata(resultColumns, resultMetadata);
    resp.setResultSetMetadata(resultColumns);
    return true;
}

bool CWsSQL2Ex::onExecuteQuery(IEspContext& context, IEspExecuteQueryRequest& req, IEspExecuteQueryResponse& resp)
{
    if (isEmptyString(req.getSqlText()))
        throw makeStringException(-1, "SqlText is required");

    const unsigned fetchSize = resolveFetchSize(req.getFetchSize());
    Owned<IUserDescriptor> user = createRequestUser(context);
    const std::string owner = queryUserId(context);
    const bool includeDebug = req.getIncludeDebug();
    CEngineMemoryUsage debugStart;
    if (includeDebug)
        debugStart = sharedQueryDatabase->captureMemoryUsage();
    CCycleTimer timer;
    std::unique_ptr<CQueryEngine> engine(new CQueryEngine(*sharedQueryDatabase, user, engineOptions.allowLongFormScan));
    if (!engine->isInitialized())
        throw makeStringException(-1, "Unable to initialize hpcc_scan engine");
    const double engineInitMs = timer.elapsedNs() / 1000000.0;

    auto activeResultSet = std::make_shared<CActiveResultSet>();
    activeResultSet->engine = std::move(engine);
    activeResultSet->owner = owner;
    activeResultSet->created = std::chrono::steady_clock::now();
    activeResultSet->lastAccess = activeResultSet->created;
    activeResultSet->includeMetrics = req.getIncludeMetrics();
    activeResultSet->includeDebug = includeDebug;
    activeResultSet->debugStart = debugStart;
#ifdef _DEBUG
    if (includeDebug)
        activeResultSet->scanObjectAudit = activeResultSet->engine->queryScanObjectAudit();
#endif
    const std::string cursorId = createOpaqueCursorId();
    removeExpiredCursors();
    {
        std::lock_guard<std::mutex> lock(cursorRegistryMutex);
        unsigned userCursorCount = 0;
        for (const auto& cursor : activeResultSets)
        {
            if (cursor.second->owner == owner)
                ++userCursorCount;
        }
        if (activeResultSets.size() >= maxActiveCursors)
            throw makeStringException(-1, "Maximum active result cursor limit reached");
        if (userCursorCount >= maxCursorsPerUser)
            throw makeStringException(-1, "Maximum active result cursor limit reached for this user");
        if (activeResultSets.find(cursorId) != activeResultSets.end())
            throw makeStringException(-1, "Unable to allocate a unique result cursor identifier");
        activeResultSets.emplace(cursorId, activeResultSet);
    }

    std::unique_lock<std::mutex> operationLock(activeResultSet->operationMutex);
    std::string errorMessage;
    std::vector<CQueryResultColumnMetadata> resultMetadata;
    CQueryTimings startTimings;
    if (!activeResultSet->engine->startCursorQuery(req.getSqlText(), req.getIncludeMetrics(), req.getIncludeResultSetMetadata() ? &resultMetadata : nullptr, errorMessage, &startTimings))
    {
        {
            std::lock_guard<std::mutex> lock(cursorRegistryMutex);
            activeResultSets.erase(cursorId);
        }
        throw makeStringException(-1, errorMessage.c_str());
    }
    const double prepareMs = startTimings.prepareMs;

    std::string rowsJson;
    std::string executionGraphJson;
    std::string executionGraph;
    bool complete = false;
    const double executeStartedMs = timer.elapsedNs() / 1000000.0;
    if (!activeResultSet->engine->fetchCursorBatch(fetchSize, maxByteLimit, rowsJson, complete, errorMessage, &executionGraphJson, &executionGraph))
    {
        {
            std::lock_guard<std::mutex> lock(cursorRegistryMutex);
            activeResultSets.erase(cursorId);
        }
        throw makeStringException(-1, errorMessage.c_str());
    }
    const double executeMs = startTimings.executeMs + timer.elapsedNs() / 1000000.0 - executeStartedMs;
    CEngineMemoryUsage debugCurrent;
    if (includeDebug)
        debugCurrent = activeResultSet->engine->captureMemoryUsage();

    {
        std::lock_guard<std::mutex> lock(cursorRegistryMutex);
        const auto cursor = activeResultSets.find(cursorId);
        if (cursor == activeResultSets.end() || cursor->second != activeResultSet)
            throw makeStringException(-1, "Result cursor was closed or expired");
        if (complete)
            activeResultSets.erase(cursor);
        else
            activeResultSet->lastAccess = std::chrono::steady_clock::now();
    }
    // Release the engine (and its DuckDB connection) now rather than when the last reference goes away, so the
    // memory it held is returned before the response is built and can be measured by the leak check. The operation
    // lock is still held, and any request that obtained this result set earlier re-checks the registry before use.
    if (complete)
        activeResultSet->engine.reset();

    resp.setRows(rowsJson.c_str());
    if (!complete)
        resp.setCursorId(cursorId.c_str());
    if (req.getIncludeResultSetMetadata())
    {
        IArrayOf<IEspResultSetColumn> resultColumns;
        setResultSetMetadata(resultColumns, resultMetadata);
        resp.setResultSetMetadata(resultColumns);
    }
    if (complete && req.getIncludeMetrics())
    {
        resp.setExecutionGraph(executionGraph.c_str());
        resp.setExecutionGraphJson(executionGraphJson.c_str());
    }
    resp.setInitMs(engineInitMs);
    resp.setPrepareMs(prepareMs);
    resp.setExecuteMs(executeMs);
    if (includeDebug)
    {
        const unsigned __int64 responseBytes = releaseResponsePayload(rowsJson, executionGraphJson, executionGraph, complete && req.getIncludeMetrics());
        reportDebugInfo(resp.updateDebugInfo(), *activeResultSet, debugCurrent, complete, responseBytes);
    }
    return true;
}

bool CWsSQL2Ex::onFetchResultSet(IEspContext& context, IEspFetchResultSetRequest& req, IEspFetchResultSetResponse& resp)
{
    const char* requestedCursorId = req.getCursorId();
    const std::string cursorId = isEmptyString(requestedCursorId) ? "" : requestedCursorId;
    const std::string owner = queryUserId(context);
    const unsigned fetchSize = resolveFetchSize(req.getFetchSize());
    removeExpiredCursors();

    std::shared_ptr<CActiveResultSet> activeResultSet;
    {
        std::lock_guard<std::mutex> lock(cursorRegistryMutex);
        const auto cursor = activeResultSets.find(cursorId);
        if (cursor != activeResultSets.end() && cursor->second->owner == owner)
            activeResultSet = cursor->second;
    }
    if (!activeResultSet)
        throw makeStringException(-1, "Result cursor not found, expired, or not owned by caller");

    std::unique_lock<std::mutex> operationLock(activeResultSet->operationMutex);
    {
        std::lock_guard<std::mutex> lock(cursorRegistryMutex);
        const auto cursor = activeResultSets.find(cursorId);
        if (cursor == activeResultSets.end() || cursor->second != activeResultSet || activeResultSet->owner != owner)
            throw makeStringException(-1, "Result cursor not found, expired, or not owned by caller");
    }

    std::string rowsJson;
    std::string errorMessage;
    std::string executionGraphJson;
    std::string executionGraph;
    bool complete = false;
    if (!activeResultSet->engine->fetchCursorBatch(fetchSize, maxByteLimit, rowsJson, complete, errorMessage, &executionGraphJson, &executionGraph))
    {
        {
            std::lock_guard<std::mutex> lock(cursorRegistryMutex);
            const auto cursor = activeResultSets.find(cursorId);
            if (cursor != activeResultSets.end() && cursor->second == activeResultSet)
                activeResultSets.erase(cursor);
        }
        throw makeStringException(-1, errorMessage.c_str());
    }
    CEngineMemoryUsage debugCurrent;
    if (activeResultSet->includeDebug)
        debugCurrent = activeResultSet->engine->captureMemoryUsage();

    {
        std::lock_guard<std::mutex> lock(cursorRegistryMutex);
        const auto cursor = activeResultSets.find(cursorId);
        if (cursor == activeResultSets.end() || cursor->second != activeResultSet)
            throw makeStringException(-1, "Result cursor not found, expired, or not owned by caller");
        if (complete)
            activeResultSets.erase(cursor);
        else
            activeResultSet->lastAccess = std::chrono::steady_clock::now();
    }
    if (complete)
        activeResultSet->engine.reset();

    resp.setRows(rowsJson.c_str());
    if (!complete)
        resp.setCursorId(cursorId.c_str());
    else if (activeResultSet->includeMetrics)
    {
        resp.setExecutionGraph(executionGraph.c_str());
        resp.setExecutionGraphJson(executionGraphJson.c_str());
    }
    if (activeResultSet->includeDebug)
    {
        const unsigned __int64 responseBytes = releaseResponsePayload(rowsJson, executionGraphJson, executionGraph, complete && activeResultSet->includeMetrics);
        reportDebugInfo(resp.updateDebugInfo(), *activeResultSet, debugCurrent, complete, responseBytes);
    }
    return true;
}

bool CWsSQL2Ex::onCloseResultSet(IEspContext& context, IEspCloseResultSetRequest& req, IEspCloseResultSetResponse& resp)
{
    const char* requestedCursorId = req.getCursorId();
    const std::string cursorId = isEmptyString(requestedCursorId) ? "" : requestedCursorId;
    const std::string owner = queryUserId(context);
    std::shared_ptr<CActiveResultSet> activeResultSet;
    {
        std::lock_guard<std::mutex> lock(cursorRegistryMutex);
        const auto cursor = activeResultSets.find(cursorId);
        if (cursor != activeResultSets.end() && cursor->second->owner == owner)
        {
            activeResultSet = cursor->second;
            activeResultSets.erase(cursor);
        }
    }
    if (activeResultSet)
    {
        std::lock_guard<std::mutex> operationLock(activeResultSet->operationMutex);
        resp.setClosed(true);
    }
    else
        resp.setClosed(false);
    return true;
}
