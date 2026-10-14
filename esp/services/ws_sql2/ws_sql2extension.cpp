#include "ws_sql2extension.hpp"

#include "ws_sql2metadata.hpp"
#include "ws_sql2typemapping.hpp"

#include "thorcommon.hpp"
#include "thorfile.hpp"
#include "thorread.hpp"
#include "nbcd.hpp"
#include "jhtree.hpp"
#include "rtldynfield.hpp"

#include "duckdb/main/extension/extension_loader.hpp"
#include "duckdb/main/config.hpp"
#include "duckdb/optimizer/optimizer_extension.hpp"
#include "duckdb/planner/expression/bound_comparison_expression.hpp"
#include "duckdb/planner/expression/bound_columnref_expression.hpp"
#include "duckdb/planner/expression/bound_constant_expression.hpp"
#include "duckdb/planner/expression/bound_reference_expression.hpp"
#include "duckdb/planner/expression/bound_conjunction_expression.hpp"
#include "duckdb/common/enums/expression_type.hpp"
#include "duckdb/planner/filter/constant_filter.hpp"
#include "duckdb/planner/filter/conjunction_filter.hpp"
#include "duckdb/planner/filter/in_filter.hpp"
#include "duckdb/planner/operator/logical_get.hpp"
#include "duckdb/planner/operator/logical_filter.hpp"
#include "duckdb/planner/operator/logical_limit.hpp"
#include "duckdb/planner/operator/logical_projection.hpp"

namespace
{
class CHpccScanBindData : public duckdb::TableFunctionData
{
public:
    CHpccScanBindData(std::string _logicalName, IDistributedFile* _file, IOutputMetaData* _expectedMetadata,
        IOutputMetaData* _actualMetadata, std::vector<CWsSql2FieldDescriptor> _fields)
                : logicalName(std::move(_logicalName)), file(_file), actualMetadata(_actualMetadata),
                    expectedMetadata(_expectedMetadata), fields(std::move(_fields))
    {
        if (actualMetadata)
        {
            const RtlRecord& actualRecord = actualMetadata->queryRecordAccessor(true);
            for (const auto& field : fields)
            {
                const RtlFieldInfo* actualField = actualRecord.queryOriginalField(field.fieldPath.c_str());
                if (!actualField)
                {
                    expectedFields.clear();
                    break;
                }
                expectedFields.push_back(actualField);
            }
            if (!expectedFields.empty())
            {
                expectedFields.push_back(nullptr);
                expectedType = std::make_unique<RtlRecordTypeInfo>(type_record, 0, expectedFields.data());
                expectedMetadata.setown(new CDynamicOutputMetaData(*expectedType));
                expectedRecord = std::make_unique<RtlRecord>(expectedFields.data(), true);
            }
        }
    }

    std::string logicalName;
    Owned<IDistributedFile> file;
    Owned<IOutputMetaData> actualMetadata;
    std::vector<const RtlFieldInfo*> expectedFields;
    std::unique_ptr<RtlRecordTypeInfo> expectedType;
    Owned<IOutputMetaData> expectedMetadata;
    std::unique_ptr<RtlRecord> expectedRecord;
    std::vector<CWsSql2FieldDescriptor> fields;
    FieldFilterArray pushedFilters;
    std::vector<std::string> keyedFilterDescriptions;
    std::vector<std::string> postFilterDescriptions;
    std::vector<std::string> residualFilterDescriptions;
    std::vector<std::string> readerProjectionDescriptions;
    bool filterLayoutTranslated = false;
    int64_t limit = -1;
    int64_t offset = 0;
};

static bool supportsHpccScanPushdownType(const duckdb::FunctionData& functionData, duckdb::idx_t fieldIndex);

static const RtlTypeInfo* queryFilterValueType(const RtlTypeInfo* type)
{
    if (type && type->getType() == type_keyedint && type->queryChildType())
        return type->queryChildType();
    return type;
}

static std::string joinDescriptions(const std::vector<std::string>& descriptions)
{
    std::string result;
    for (const auto& description : descriptions)
    {
        if (!result.empty())
            result.push_back('\n');
        result.append(description);
    }
    return result;
}

static unsigned findActualField(const CHpccScanBindData& bindData, unsigned expectedIndex)
{
    if (!bindData.actualMetadata || expectedIndex >= bindData.fields.size())
        return static_cast<unsigned>(-1);
    const RtlRecord& actualRecord = bindData.actualMetadata->queryRecordAccessor(true);
    const char* fieldPath = bindData.fields[expectedIndex].fieldPath.c_str();
    for (unsigned actualIndex = 0; actualIndex < actualRecord.getNumFields(); ++actualIndex)
    {
        if (streq(actualRecord.queryName(actualIndex), fieldPath))
            return actualIndex;
    }
    return static_cast<unsigned>(-1);
}

static void recordHpccScanFilterDecisions(duckdb::LogicalGet& get)
{
    auto& bindData = get.bind_data->Cast<CHpccScanBindData>();
    bindData.keyedFilterDescriptions.clear();
    bindData.postFilterDescriptions.clear();
    bindData.filterLayoutTranslated = false;
    bindData.readerProjectionDescriptions.clear();
    const auto& columnIds = get.GetColumnIds();
    if (get.projection_ids.empty())
    {
        for (const auto& columnId : columnIds)
        {
            const unsigned fieldIndex = static_cast<unsigned>(columnId.GetPrimaryIndex());
            if (fieldIndex < bindData.fields.size())
                bindData.readerProjectionDescriptions.push_back(bindData.fields[fieldIndex].fieldPath);
        }
    }
    else
    {
        for (duckdb::idx_t projection : get.projection_ids)
        {
            if (projection >= columnIds.size())
                continue;
            const unsigned fieldIndex = static_cast<unsigned>(columnIds[projection].GetPrimaryIndex());
            if (fieldIndex < bindData.fields.size())
                bindData.readerProjectionDescriptions.push_back(bindData.fields[fieldIndex].fieldPath);
        }
    }
    if (!bindData.actualMetadata)
        return;

    const RtlRecord& actualRecord = bindData.actualMetadata->queryRecordAccessor(true);
    if (bindData.expectedRecord)
    {
        try
        {
            Owned<const IKeyTranslator> translator = createKeyTranslator(actualRecord, *bindData.expectedRecord);
            bindData.filterLayoutTranslated = translator && translator->needsTranslate();
        }
        catch (IException* exception)
        {
            exception->Release();
        }
    }
    const unsigned keyedFields = actualRecord.getNumKeyedFields();
    std::vector<bool> constrained(keyedFields, false);
    for (const auto& entry : get.table_filters.filters)
    {
        if (entry.first >= bindData.fields.size())
            continue;
        const unsigned expectedIndex = static_cast<unsigned>(entry.first);
        if (!supportsHpccScanPushdownType(bindData, expectedIndex))
            continue;
        const unsigned actualIndex = findActualField(bindData, expectedIndex);
        if (actualIndex < keyedFields)
            constrained[actualIndex] = true;
    }
    ForEachItemIn(pushedIndex, bindData.pushedFilters)
    {
        const unsigned expectedIndex = bindData.pushedFilters.item(pushedIndex).queryFieldIndex();
        const unsigned actualIndex = findActualField(bindData, expectedIndex);
        if (actualIndex < keyedFields)
            constrained[actualIndex] = true;
    }
    for (const auto& entry : get.table_filters.filters)
    {
        if (entry.first >= bindData.fields.size())
            continue;
        const unsigned expectedIndex = static_cast<unsigned>(entry.first);
        if (!supportsHpccScanPushdownType(bindData, expectedIndex))
            continue;
        const unsigned actualIndex = findActualField(bindData, expectedIndex);
        if (actualIndex == static_cast<unsigned>(-1))
            continue;
        bool contiguousKeyed = actualIndex < keyedFields;
        for (unsigned preceding = 0; contiguousKeyed && preceding < actualIndex; ++preceding)
            contiguousKeyed = constrained[preceding];
        const std::string description = entry.second->ToString(bindData.fields[expectedIndex].fieldPath);
        (contiguousKeyed ? bindData.keyedFilterDescriptions : bindData.postFilterDescriptions).push_back(description);
    }
    ForEachItemIn(decisionIndex, bindData.pushedFilters)
    {
        const IFieldFilter& filter = bindData.pushedFilters.item(decisionIndex);
        const unsigned expectedIndex = filter.queryFieldIndex();
        const unsigned actualIndex = findActualField(bindData, expectedIndex);
        if (actualIndex == static_cast<unsigned>(-1) || expectedIndex >= bindData.fields.size())
            continue;
        bool contiguousKeyed = actualIndex < keyedFields;
        for (unsigned preceding = 0; contiguousKeyed && preceding < actualIndex; ++preceding)
            contiguousKeyed = constrained[preceding];
        StringBuffer serialized;
        filter.serialize(serialized);
        const char* comparison = strchr(serialized.str(), '=');
        const std::string description = bindData.fields[expectedIndex].fieldPath + (comparison ? comparison : serialized.str());
        (contiguousKeyed ? bindData.keyedFilterDescriptions : bindData.postFilterDescriptions).push_back(description);
    }
}

static CHpccScanBindData* findHpccScanThroughProjections(duckdb::LogicalOperator& operation)
{
    duckdb::LogicalOperator* current = &operation;
    while (current->type == duckdb::LogicalOperatorType::LOGICAL_PROJECTION)
    {
        if (current->children.size() != 1)
            return nullptr;
        current = current->children[0].get();
    }
    if (current->type != duckdb::LogicalOperatorType::LOGICAL_GET)
        return nullptr;
    auto& get = current->Cast<duckdb::LogicalGet>();
    if (get.function.name != "hpcc_scan" || !get.bind_data)
        return nullptr;
    return &get.bind_data->Cast<CHpccScanBindData>();
}

static void recordHpccScanFilters(duckdb::LogicalOperator& operation)
{
    if (operation.type == duckdb::LogicalOperatorType::LOGICAL_GET)
    {
        auto& get = operation.Cast<duckdb::LogicalGet>();
        if (get.function.name == "hpcc_scan" && get.bind_data)
        {
            get.bind_data->Cast<CHpccScanBindData>().residualFilterDescriptions.clear();
            recordHpccScanFilterDecisions(get);
        }
    }
    for (auto& child : operation.children)
        recordHpccScanFilters(*child);
    if (operation.type == duckdb::LogicalOperatorType::LOGICAL_FILTER && operation.children.size() == 1)
    {
        CHpccScanBindData* bindData = findHpccScanThroughProjections(*operation.children[0]);
        if (bindData)
        {
            for (const auto& expression : operation.expressions)
                bindData->residualFilterDescriptions.push_back(expression->ToString());
        }
    }
}

static void pushdownHpccScanLimit(duckdb::unique_ptr<duckdb::LogicalOperator>& operation)
{
    if (operation->type != duckdb::LogicalOperatorType::LOGICAL_LIMIT)
    {
        for (auto& child : operation->children)
            pushdownHpccScanLimit(child);
        return;
    }

    auto& limitOperation = operation->Cast<duckdb::LogicalLimit>();
    duckdb::reference<duckdb::LogicalOperator> child = *operation->children[0];
    while (child.get().type == duckdb::LogicalOperatorType::LOGICAL_PROJECTION)
    {
        if (child.get().children.empty())
            return;
        child = *child.get().children[0];
    }
    if (child.get().type != duckdb::LogicalOperatorType::LOGICAL_GET)
        return;

    auto& get = child.get().Cast<duckdb::LogicalGet>();
    if (get.function.name != "hpcc_scan" || !get.bind_data)
        return;
    if (limitOperation.limit_val.Type() != duckdb::LimitNodeType::CONSTANT_VALUE
        && limitOperation.limit_val.Type() != duckdb::LimitNodeType::UNSET)
        return;
    if (limitOperation.offset_val.Type() != duckdb::LimitNodeType::CONSTANT_VALUE
        && limitOperation.offset_val.Type() != duckdb::LimitNodeType::UNSET)
        return;

    auto& bindData = get.bind_data->Cast<CHpccScanBindData>();
    bindData.limit = limitOperation.limit_val.Type() == duckdb::LimitNodeType::CONSTANT_VALUE
        ? static_cast<int64_t>(limitOperation.limit_val.GetConstantValue()) : -1;
    bindData.offset = limitOperation.offset_val.Type() == duckdb::LimitNodeType::CONSTANT_VALUE
        ? static_cast<int64_t>(limitOperation.offset_val.GetConstantValue()) : 0;
    operation = std::move(operation->children[0]);
}

static void optimizeHpccScan(duckdb::OptimizerExtensionInput&, duckdb::unique_ptr<duckdb::LogicalOperator>& plan)
{
    pushdownHpccScanLimit(plan);
    recordHpccScanFilters(*plan);
}

static duckdb::InsertionOrderPreservingMap<std::string> describeHpccScan(duckdb::TableFunctionToStringInput& input)
{
    duckdb::InsertionOrderPreservingMap<std::string> description;
    const auto& bindData = input.bind_data->Cast<CHpccScanBindData>();
    if (bindData.limit >= 0)
        description["Pushed Limit"] = std::to_string(bindData.limit);
    if (bindData.offset > 0)
        description["Pushed Offset"] = std::to_string(bindData.offset);
    if (!bindData.keyedFilterDescriptions.empty())
        description["Keyed Filters"] = joinDescriptions(bindData.keyedFilterDescriptions);
    if (!bindData.postFilterDescriptions.empty())
        description["Post Filters"] = joinDescriptions(bindData.postFilterDescriptions);
    if (!bindData.residualFilterDescriptions.empty())
        description["Residual Filters"] = joinDescriptions(bindData.residualFilterDescriptions);
    if (bindData.filterLayoutTranslated)
        description["Filter Layout Translation"] = "expected-to-actual";
    if (!bindData.readerProjectionDescriptions.empty())
        description["Reader Projection"] = joinDescriptions(bindData.readerProjectionDescriptions);
    return description;
}

static bool formatFilterValue(unsigned fieldIndex, const duckdb::Value& constant, const RtlRecord& record,
    std::string& value)
{
    if (fieldIndex >= record.getNumFields())
        return false;
    const auto type = constant.type().id();
    if (type == duckdb::LogicalTypeId::TINYINT || type == duckdb::LogicalTypeId::SMALLINT
        || type == duckdb::LogicalTypeId::INTEGER || type == duckdb::LogicalTypeId::BIGINT)
    {
        value = constant.ToString();
        return true;
    }
    if (type != duckdb::LogicalTypeId::VARCHAR)
        return false;

    const RtlTypeInfo* fieldType = queryFilterValueType(record.queryType(fieldIndex));
    const std::string text = constant.ToString();
    if (fieldType->getType() == type_string)
    {
        if (fieldType->isFixedSize() && text.size() != fieldType->length)
            return false;
    }
    else if (fieldType->getType() != type_varstring)
        return false;

    StringBuffer escaped;
    escaped.append('\'');
    appendUtf8AsECL(escaped, static_cast<unsigned>(text.size()), text.c_str());
    escaped.append('\'');
    value = escaped.str();
    return true;
}

static bool buildValueSet(unsigned fieldIndex, duckdb::ExpressionType comparisonType, const duckdb::Value& constant,
    const RtlRecord& record, Owned<IValueSet>& values)
{
    std::string value;
    if (!formatFilterValue(fieldIndex, constant, record, value))
        return false;
    std::string expression;
    bool invert = false;
    switch (comparisonType)
    {
    case duckdb::ExpressionType::COMPARE_EQUAL: expression = "[" + value + "]"; break;
    case duckdb::ExpressionType::COMPARE_NOTEQUAL:
        expression = "[" + value + "]";
        invert = true;
        break;
    case duckdb::ExpressionType::COMPARE_LESSTHAN: expression = "(," + value + ")"; break;
    case duckdb::ExpressionType::COMPARE_LESSTHANOREQUALTO: expression = "(," + value + "]"; break;
    case duckdb::ExpressionType::COMPARE_GREATERTHAN: expression = "(" + value + ",)"; break;
    case duckdb::ExpressionType::COMPARE_GREATERTHANOREQUALTO: expression = "[" + value + ",)"; break;
    default: return false;
    }
    values.setown(createValueSet(*record.queryType(fieldIndex)));
    deserializeSet(*values, expression.c_str());
    if (invert)
        values->invertSet();
    return true;
}

static bool buildScalarFilter(unsigned fieldIndex, duckdb::ExpressionType comparisonType, const duckdb::Value& constant,
    const RtlRecord& record, IFieldFilter*& filter)
{
    Owned<IValueSet> values;
    if (!buildValueSet(fieldIndex, comparisonType, constant, record, values))
        return false;
    filter = createFieldFilter(fieldIndex, values);
    return filter != nullptr;
}

static bool buildScalarFilter(const duckdb::BoundComparisonExpression& comparison, const duckdb::LogicalGet& get,
    const RtlRecord& record, IFieldFilter*& filter)
{
    const auto* constant = dynamic_cast<const duckdb::BoundConstantExpression*>(comparison.right.get());
    if (!constant)
        return false;
    duckdb::idx_t projectionIndex = duckdb::DConstants::INVALID_INDEX;
    if (const auto* reference = dynamic_cast<const duckdb::BoundReferenceExpression*>(comparison.left.get()))
        projectionIndex = reference->index;
    else if (const auto* column = dynamic_cast<const duckdb::BoundColumnRefExpression*>(comparison.left.get()))
        projectionIndex = column->binding.column_index;
    if (projectionIndex >= get.GetColumnIds().size())
        return false;
    const unsigned fieldIndex = static_cast<unsigned>(get.GetColumnIds()[projectionIndex].GetPrimaryIndex());
    return buildScalarFilter(fieldIndex, comparison.type, constant->value, record, filter);
}

static bool supportsHpccScanPushdownType(const duckdb::FunctionData& functionData, duckdb::idx_t fieldIndex)
{
    const auto& bindData = functionData.Cast<CHpccScanBindData>();
    if (!bindData.expectedRecord || fieldIndex >= bindData.expectedRecord->getNumFields())
        return false;
    const RtlTypeInfo* type = queryFilterValueType(
        bindData.expectedRecord->queryType(static_cast<unsigned>(fieldIndex)));
    switch (type->getType())
    {
    case type_int:
    case type_swapint:
    case type_packedint:
    case type_filepos:
    case type_keyedint:
        return true;
    default:
        return false;
    }
}

static bool buildTableFilter(const duckdb::TableFilter& tableFilter, unsigned fieldIndex, const RtlRecord& record,
    std::vector<IFieldFilter*>& staged)
{
    if (tableFilter.filter_type == duckdb::TableFilterType::CONSTANT_COMPARISON)
    {
        const auto& constantFilter = tableFilter.Cast<duckdb::ConstantFilter>();
        IFieldFilter* filter = nullptr;
        if (!buildScalarFilter(fieldIndex, constantFilter.comparison_type, constantFilter.constant, record, filter))
            return false;
        staged.push_back(filter);
        return true;
    }

    if (tableFilter.filter_type == duckdb::TableFilterType::IN_FILTER)
    {
        const auto& inFilter = tableFilter.Cast<duckdb::InFilter>();
        Owned<IValueSet> values;
        for (const auto& value : inFilter.values)
        {
            Owned<IValueSet> itemValues;
            if (!buildValueSet(fieldIndex, duckdb::ExpressionType::COMPARE_EQUAL, value, record, itemValues))
                return false;
            if (values)
                values->unionSet(itemValues);
            else
                values.setown(itemValues.getClear());
        }
        if (!values)
            return false;
        staged.push_back(createFieldFilter(fieldIndex, values));
        return true;
    }

    if (tableFilter.filter_type == duckdb::TableFilterType::CONJUNCTION_AND)
    {
        const auto& conjunction = tableFilter.Cast<duckdb::ConjunctionAndFilter>();
        Owned<IValueSet> values;
        for (const auto& child : conjunction.child_filters)
        {
            if (child->filter_type != duckdb::TableFilterType::CONSTANT_COMPARISON)
                return false;
            const auto& constantFilter = child->Cast<duckdb::ConstantFilter>();
            Owned<IValueSet> childValues;
            if (!buildValueSet(fieldIndex, constantFilter.comparison_type, constantFilter.constant, record, childValues))
                return false;
            if (values)
                values->intersectSet(childValues);
            else
                values.setown(childValues.getClear());
        }
        if (!values)
            return false;
        staged.push_back(createFieldFilter(fieldIndex, values));
        return true;
    }
    return false;
}

static void pushdownHpccScanFilters(duckdb::ClientContext&, duckdb::LogicalGet& get, duckdb::FunctionData* functionData,
    duckdb::vector<duckdb::unique_ptr<duckdb::Expression>>& filters)
{
    auto& bindData = functionData->Cast<CHpccScanBindData>();
    if (!bindData.expectedRecord)
        return;
    const RtlRecord& record = *bindData.expectedRecord;
    for (auto iterator = filters.begin(); iterator != filters.end(); )
    {
        const auto* conjunction = dynamic_cast<const duckdb::BoundConjunctionExpression*>(iterator->get());
        if (conjunction && conjunction->type == duckdb::ExpressionType::CONJUNCTION_AND)
        {
            bool allSupported = true;
            std::vector<IFieldFilter*> staged;
            try
            {
                for (const auto& child : conjunction->children)
                {
                    const auto* comparison = dynamic_cast<const duckdb::BoundComparisonExpression*>(child.get());
                    IFieldFilter* filter = nullptr;
                    if (!comparison || !buildScalarFilter(*comparison, get, record, filter))
                    {
                        allSupported = false;
                        break;
                    }
                    staged.push_back(filter);
                }
            }
            catch (IException* exception)
            {
                exception->Release();
                allSupported = false;
            }
            if (allSupported)
            {
                for (auto* filter : staged)
                    bindData.pushedFilters.append(*filter);
                iterator = filters.erase(iterator);
                continue;
            }
            for (auto* filter : staged)
                filter->Release();
            ++iterator;
            continue;
        }
        const auto* comparison = dynamic_cast<const duckdb::BoundComparisonExpression*>(iterator->get());
        if (!comparison)
        {
            ++iterator;
            continue;
        }
        IFieldFilter* filter = nullptr;
        try
        {
            if (buildScalarFilter(*comparison, get, record, filter))
            {
                bindData.pushedFilters.append(*filter);
                iterator = filters.erase(iterator);
                continue;
            }
        }
        catch (IException* exception)
        {
            exception->Release();
        }
        ++iterator;
    }
}

class CHpccScanGlobalState : public duckdb::GlobalTableFunctionState
{
public:
    FileAccessOptions accessOptions;
    Owned<IOutputMetaData> actualMetadata;
    std::vector<const RtlFieldInfo*> projectedFields;
    std::unique_ptr<RtlRecordTypeInfo> projectedType;
    Owned<IOutputMetaData> projectedMetadata;
    Owned<IRowReadFormatMapping> mapping;
    Owned<IDiskRowReader> reader;
    Owned<ILogicalRowStream> stream;
    Owned<IKeyManager> keyManager;
    Owned<IIndexLookup> keyLookup;
    FieldFilterArray filters;
    RowFilter postFilters;
    std::vector<unsigned> projectedColumns;
    std::vector<CWsSql2FieldDescriptor> projectedDescriptors;
    int64_t limit = -1;
    int64_t offset = 0;
    int64_t rowsReturned = 0;
    int64_t rowsSkipped = 0;
};

static duckdb::Value materializeScalarValue(const RtlTypeInfo& type, const void* value, IBlobProvider* blobProvider);

class CHpccScanFieldProcessor : implements IFieldProcessor, public CInterface
{
    struct NestedFrame
    {
        bool collection;
        const CWsSql2FieldDescriptor* descriptor;
        unsigned nextChild = 0;
        std::vector<duckdb::Value> values;
    };

    duckdb::DataChunk& output;
    const std::vector<CWsSql2FieldDescriptor>& fields;
    IBlobProvider* blobProvider = nullptr;
    unsigned column = 0;
    // HPCC emits nested callbacks in depth-first order; each frame collects one STRUCT or LIST value.
    std::vector<NestedFrame> nested;

    static duckdb::LogicalType mapNestedType(const CWsSql2FieldDescriptor& descriptor);

    void setValue(duckdb::Value value)
    {
        if (nested.empty())
        {
            output.SetValue(column++, 0, value);
            return;
        }
        nested.back().values.push_back(std::move(value));
        if (!nested.back().collection)
            ++nested.back().nextChild;
    }

    const CWsSql2FieldDescriptor& nextNestedDescriptor() const
    {
        if (nested.empty())
            return fields.at(column);
        const auto& parent = nested.back();
        if (parent.collection)
            return *parent.descriptor;
        return parent.descriptor->children.at(parent.nextChild);
    }

    void finishNested(bool collection)
    {
        if (nested.empty() || nested.back().collection != collection)
            throw duckdb::InternalException("hpcc_scan nested metadata callback mismatch");

        NestedFrame frame = std::move(nested.back());
        nested.pop_back();
        if (collection)
        {
            duckdb::LogicalType collectionType = mapNestedType(*frame.descriptor);
            const duckdb::LogicalType elementType = collectionType.id() == duckdb::LogicalTypeId::LIST
                ? duckdb::ListType::GetChildType(collectionType) : collectionType;
            setValue(frame.values.empty() ? duckdb::Value::LIST(elementType, {})
                                          : duckdb::Value::LIST(std::move(frame.values)));
            return;
        }

        duckdb::child_list_t<duckdb::Value> children;
        for (unsigned index = 0; index < frame.values.size(); ++index)
        {
            std::string name = "field" + std::to_string(index);
            if (index < frame.descriptor->children.size())
            {
                const auto& path = frame.descriptor->children[index].fieldPath;
                const size_t separator = path.rfind('.');
                name = separator == std::string::npos ? path : path.substr(separator + 1);
            }
            children.emplace_back(std::move(name), std::move(frame.values[index]));
        }
        setValue(duckdb::Value::STRUCT(std::move(children)));
    }

    [[noreturn]] void unsupported(const char* kind)
    {
        throw duckdb::NotImplementedException("hpcc_scan does not yet convert %s fields", kind);
    }

    unsigned decimalWidth() const
    {
        const std::string& sourceType = fields.at(column).sourceType;
        size_t start = sourceType.find("DECIMAL");
        if (start == std::string::npos)
            start = sourceType.find("UDECIMAL");
        if (start == std::string::npos)
            return 0;
        start = sourceType.find_first_of("0123456789", start);
        if (start == std::string::npos)
            return 0;
        return static_cast<unsigned>(std::strtoul(sourceType.c_str() + start, nullptr, 10));
    }

public:
    IMPLEMENT_IINTERFACE;

    CHpccScanFieldProcessor(duckdb::DataChunk& _output, const std::vector<CWsSql2FieldDescriptor>& _fields,
        IBlobProvider* _blobProvider = nullptr)
        : output(_output), fields(_fields), blobProvider(_blobProvider)
    {
    }

    void processString(unsigned len, const char* value, const RtlFieldInfo*) override
    {
        setValue(duckdb::Value(std::string(value, len)));
    }
    void processBool(bool value, const RtlFieldInfo*) override { setValue(duckdb::Value::BOOLEAN(value)); }
    void processData(unsigned len, const void* value, const RtlFieldInfo*) override
    {
        setValue(duckdb::Value::BLOB(static_cast<const unsigned char*>(value), len));
    }
    void processInt(__int64 value, const RtlFieldInfo* field) override
    {
        if (blobProvider && field && field->type && field->type->getType() == type_blob)
        {
            const byte* blob = nullptr;
            try
            {
                blob = blobProvider->lookupBlob(static_cast<unsigned __int64>(value));
            }
            catch (IException* exception)
            {
                StringBuffer message;
                exception->errorMessage(message);
                exception->Release();
                throw duckdb::IOException("hpcc_scan could not load nested KEY blob: %s", message.str());
            }
            if (!blob)
                setValue(duckdb::Value());
            else if (field->type->queryChildType())
            {
                const CWsSql2FieldDescriptor& descriptor = fields.at(column);
                if (descriptor.children.empty())
                    setValue(materializeScalarValue(*field->type->queryChildType(), blob, blobProvider));
                else
                    field->type->queryChildType()->process(blob, blob, field, *this);
            }
            return;
        }
        setValue(duckdb::Value::BIGINT(value));
    }
    void processUInt(unsigned __int64 value, const RtlFieldInfo*) override
    {
        if (value > static_cast<unsigned __int64>(INT64_MAX))
            unsupported("unsigned integer");
        setValue(duckdb::Value::BIGINT(static_cast<__int64>(value)));
    }
    void processReal(double value, const RtlFieldInfo*) override { setValue(duckdb::Value::DOUBLE(value)); }
    void processDecimal(const void* value, unsigned length, unsigned precision, const RtlFieldInfo* field) override
    {
        unsigned width = field && field->type ? field->type->getDecimalDigits() : decimalWidth();
        if (!width || width > 18 || precision > width)
            unsupported("decimal");
        Decimal decimal;
        decimal.setDecimal(static_cast<byte>(length), static_cast<byte>(precision), value);
        setValue(duckdb::Value::DECIMAL(static_cast<int64_t>(decimal.getInt64()), static_cast<uint8_t>(width), static_cast<uint8_t>(precision)));
    }
    void processUDecimal(const void* value, unsigned length, unsigned precision, const RtlFieldInfo* field) override
    {
        unsigned width = field && field->type ? field->type->getDecimalDigits() : decimalWidth();
        if (!width || width > 18 || precision > width)
            unsupported("unsigned decimal");
        Decimal decimal;
        decimal.setUDecimal(static_cast<byte>(length), static_cast<byte>(precision), value);
        unsigned __int64 integer = decimal.getUInt64();
        if (integer > static_cast<unsigned __int64>(INT64_MAX))
            unsupported("unsigned decimal");
        setValue(duckdb::Value::DECIMAL(static_cast<int64_t>(integer), static_cast<uint8_t>(width), static_cast<uint8_t>(precision)));
    }
    void processUnicode(unsigned len, const UChar* value, const RtlFieldInfo*) override
    {
        unsigned utf8Length = 0;
        char* utf8Value = nullptr;
        rtlUnicodeToUtf8X(utf8Length, utf8Value, len, value);
        setValue(duckdb::Value(std::string(utf8Value, utf8Length)));
        rtlFree(utf8Value);
    }
    void processQString(unsigned len, const char* value, const RtlFieldInfo*) override
    {
        setValue(duckdb::Value(std::string(value, len)));
    }
    void processUtf8(unsigned len, const char* value, const RtlFieldInfo*) override
    {
        setValue(duckdb::Value(std::string(value, len)));
    }

    bool processBeginSet(const RtlFieldInfo*, unsigned, bool isAll, const byte*) override
    {
        if (isAll)
            unsupported("unbounded set");
        nested.push_back({true, &nextNestedDescriptor()});
        return true;
    }
    bool processBeginDataset(const RtlFieldInfo*, unsigned) override
    {
        nested.push_back({true, &nextNestedDescriptor()});
        return true;
    }
    bool processBeginRow(const RtlFieldInfo*) override
    {
        nested.push_back({false, &nextNestedDescriptor()});
        return true;
    }
    void processEndSet(const RtlFieldInfo*) override { finishNested(true); }
    void processEndDataset(const RtlFieldInfo*) override { finishNested(true); }
    void processEndRow(const RtlFieldInfo*) override { finishNested(false); }
};

duckdb::LogicalType CHpccScanFieldProcessor::mapNestedType(const CWsSql2FieldDescriptor& descriptor)
{
    if (descriptor.duckdbType == "STRUCT")
    {
        duckdb::child_list_t<duckdb::LogicalType> children;
        for (const auto& child : descriptor.children)
        {
            const size_t separator = child.fieldPath.rfind('.');
            const std::string name = separator == std::string::npos ? child.fieldPath : child.fieldPath.substr(separator + 1);
            children.emplace_back(name, mapNestedType(child));
        }
        return duckdb::LogicalType::STRUCT(std::move(children));
    }
    if (descriptor.duckdbType == "LIST" || descriptor.duckdbType == "MAP")
    {
        if (descriptor.children.size() == 1)
            return duckdb::LogicalType::LIST(mapNestedType(descriptor.children.front()));
        duckdb::child_list_t<duckdb::LogicalType> children;
        for (const auto& child : descriptor.children)
        {
            const size_t separator = child.fieldPath.rfind('.');
            const std::string name = separator == std::string::npos ? child.fieldPath : child.fieldPath.substr(separator + 1);
            children.emplace_back(name, mapNestedType(child));
        }
        return duckdb::LogicalType::LIST(children.empty() ? duckdb::LogicalType::VARCHAR : duckdb::LogicalType::STRUCT(std::move(children)));
    }
    if (descriptor.duckdbType == "BIGINT")
        return duckdb::LogicalType::BIGINT;
    if (descriptor.duckdbType == "DOUBLE")
        return duckdb::LogicalType::DOUBLE;
    if (descriptor.duckdbType == "BOOLEAN")
        return duckdb::LogicalType::BOOLEAN;
    if (descriptor.duckdbType == "BLOB")
        return duckdb::LogicalType::BLOB;
    if (descriptor.duckdbType == "DECIMAL")
    {
        const size_t start = descriptor.sourceType.find_first_of("0123456789");
        if (start != std::string::npos)
        {
            const unsigned width = static_cast<unsigned>(std::strtoul(descriptor.sourceType.c_str() + start, nullptr, 10));
            const size_t separator = descriptor.sourceType.find('_', start);
            const unsigned precision = separator == std::string::npos
                ? 0 : static_cast<unsigned>(std::strtoul(descriptor.sourceType.c_str() + separator + 1, nullptr, 10));
            if (width && width <= 18 && precision <= width)
                return duckdb::LogicalType::DECIMAL(width, precision);
        }
        return duckdb::LogicalType::DECIMAL(18, 3);
    }
    return duckdb::LogicalType::VARCHAR;
}

static duckdb::LogicalType mapDuckDBType(const CWsSql2FieldDescriptor& descriptor)
{
    const std::string& type = descriptor.duckdbType;
    if (type == "BOOLEAN")
        return duckdb::LogicalType::BOOLEAN;
    if (type == "BIGINT")
        return duckdb::LogicalType::BIGINT;
    if (type == "DOUBLE")
        return duckdb::LogicalType::DOUBLE;
    if (type == "BLOB")
        return duckdb::LogicalType::BLOB;
    if (type == "DATE")
        return duckdb::LogicalType::DATE;
    if (type == "TIME")
        return duckdb::LogicalType::TIME;
    if (type == "TIMESTAMP")
        return duckdb::LogicalType::TIMESTAMP;
    if (type == "STRUCT")
    {
        duckdb::child_list_t<duckdb::LogicalType> children;
        for (const auto& child : descriptor.children)
        {
            const size_t separator = child.fieldPath.rfind('.');
            const std::string name = separator == std::string::npos ? child.fieldPath : child.fieldPath.substr(separator + 1);
            children.emplace_back(name, mapDuckDBType(child));
        }
        return duckdb::LogicalType::STRUCT(std::move(children));
    }
    if (type == "LIST")
    {
        if (descriptor.children.size() == 1)
            return duckdb::LogicalType::LIST(mapDuckDBType(descriptor.children.front()));
        if (!descriptor.children.empty())
        {
            duckdb::child_list_t<duckdb::LogicalType> rowChildren;
            for (const auto& child : descriptor.children)
            {
                const size_t separator = child.fieldPath.rfind('.');
                const std::string name = separator == std::string::npos ? child.fieldPath : child.fieldPath.substr(separator + 1);
                rowChildren.emplace_back(name, mapDuckDBType(child));
            }
            return duckdb::LogicalType::LIST(duckdb::LogicalType::STRUCT(std::move(rowChildren)));
        }
        return duckdb::LogicalType::LIST(duckdb::LogicalType::VARCHAR);
    }
    if (type == "MAP")
    {
        duckdb::child_list_t<duckdb::LogicalType> children;
        for (const auto& child : descriptor.children)
        {
            const size_t separator = child.fieldPath.rfind('.');
            const std::string name = separator == std::string::npos ? child.fieldPath : child.fieldPath.substr(separator + 1);
            children.emplace_back(name, mapDuckDBType(child));
        }
        return duckdb::LogicalType::LIST(children.empty() ? duckdb::LogicalType::VARCHAR : duckdb::LogicalType::STRUCT(std::move(children)));
    }
    if (type == "DECIMAL")
    {
        size_t start = descriptor.sourceType.find_first_of("0123456789");
        if (start != std::string::npos)
        {
            unsigned width = static_cast<unsigned>(std::strtoul(descriptor.sourceType.c_str() + start, nullptr, 10));
            size_t separator = descriptor.sourceType.find('_', start);
            unsigned precision = separator == std::string::npos ? 0 : static_cast<unsigned>(std::strtoul(descriptor.sourceType.c_str() + separator + 1, nullptr, 10));
            if (width && width <= 18 && precision <= width)
                return duckdb::LogicalType::DECIMAL(width, precision);
        }
        return duckdb::LogicalType::DECIMAL(18, 3);
    }
    return duckdb::LogicalType::VARCHAR;
}

static CWsSql2FieldDescriptor mapRtlField(const RtlFieldInfo& field, const char* prefix)
{
    CWsSql2FieldDescriptor descriptor;
    descriptor.fieldPath = prefix ? std::string(prefix) + "." + (field.name ? field.name : "field")
                                  : (field.name ? field.name : "field");
    const RtlTypeInfo& type = *field.type;
    switch (type.getType())
    {
    case type_record:
    case type_row:
        descriptor.duckdbType = "STRUCT";
        break;
    case type_set:
    case type_table:
    case type_groupedtable:
        descriptor.duckdbType = "LIST";
        break;
    case type_boolean:
        descriptor.duckdbType = "BOOLEAN";
        break;
    case type_int:
    case type_swapint:
    case type_packedint:
    case type_filepos:
    case type_keyedint:
        descriptor.duckdbType = "BIGINT";
        break;
    case type_real:
        descriptor.duckdbType = "DOUBLE";
        break;
    case type_data:
    case type_blob:
        descriptor.duckdbType = "BLOB";
        break;
    case type_date:
        descriptor.duckdbType = "DATE";
        break;
    case type_string:
    case type_varstring:
    case type_qstring:
    case type_unicode:
    case type_varunicode:
    case type_utf8:
        descriptor.duckdbType = "VARCHAR";
        break;
    case type_decimal:
        descriptor.duckdbType = "DECIMAL";
        descriptor.sourceType = "DECIMAL" + std::to_string(type.getDecimalDigits()) + "_" + std::to_string(type.getDecimalPrecision());
        break;
    default:
        descriptor.duckdbType = "VARCHAR";
        descriptor.fallback = true;
        break;
    }
    const RtlTypeInfo* childType = type.queryChildType();
    const RtlFieldInfo* const* childFields = childType ? childType->queryFields() : nullptr;
    if (childFields)
    {
        for (unsigned index = 0; childFields[index]; ++index)
            descriptor.children.push_back(mapRtlField(*childFields[index], descriptor.fieldPath.c_str()));
    }
    return descriptor;
}

static std::vector<CWsSql2FieldDescriptor> appendScanColumns(IDistributedFile& file,
    IOutputMetaData* layoutMetadata, duckdb::vector<duckdb::LogicalType>& returnTypes,
    duckdb::vector<std::string>& names)
{
    std::vector<CWsSql2FieldDescriptor> descriptors;
    std::vector<CWsSql2Warning> warnings;
    MemoryBuffer serializedMetadata;
    const IPropertyTree& attributes = file.queryAttributes();
    if (attributes.getPropBin("ECLbin", serializedMetadata))
    {
        Owned<IDefRecordMeta> recordMeta = deserializeRecordMeta(serializedMetadata, true);
        if (recordMeta)
        {
            CWsSql2TypeMapper mapper;
            mapper.mapRecord(recordMeta->queryRecord(), nullptr, descriptors, warnings);
        }
    }
    if (descriptors.empty())
    {
        CWsSql2TypeMapper mapper;
        mapper.mapEclRecordDefinition(attributes.queryProp("ECL", ""), descriptors, warnings);
    }
    if (descriptors.empty())
        throw duckdb::BinderException("hpcc_scan could not determine a record layout");

    if (layoutMetadata)
    {
        const RtlRecord& record = layoutMetadata->queryRecordAccessor(true);
        bool hasNestedPhysicalField = false;
        for (unsigned index = 0; index < record.getNumFields(); ++index)
        {
            const RtlTypeInfo* type = record.queryType(index);
            if (type && (type->getType() == type_record || type->getType() == type_row || type->getType() == type_set
                || type->getType() == type_table || type->getType() == type_groupedtable))
            {
                hasNestedPhysicalField = true;
                break;
            }
        }
        if (hasNestedPhysicalField)
        {
            descriptors.clear();
            for (unsigned index = 0; index < record.getNumFields(); ++index)
                descriptors.push_back(mapRtlField(*record.queryOriginalField(index), nullptr));
        }
    }

    for (const auto& descriptor : descriptors)
    {
        returnTypes.push_back(mapDuckDBType(descriptor));
        names.emplace_back(descriptor.fieldPath);
    }
    return descriptors;
}

    static duckdb::Value materializeScalarValue(const RtlTypeInfo& type, const void* value, IBlobProvider* blobProvider)
    {
        switch (type.getType())
        {
        case type_boolean:
            return duckdb::Value::BOOLEAN(type.getInt(value) != 0);
        case type_int:
        case type_swapint:
        case type_packedint:
        case type_filepos:
        case type_keyedint:
            return duckdb::Value::BIGINT(type.getInt(value));
        case type_real:
            return duckdb::Value::DOUBLE(type.getReal(value));
        case type_decimal:
        {
            const unsigned width = type.getDecimalDigits();
            const unsigned scale = type.getDecimalPrecision();
            if (!width || width > 18 || scale > width)
                throw duckdb::NotImplementedException("hpcc_scan supports DECIMAL widths from 1 through 18");
            const size32_t size = type.size(static_cast<const byte*>(value), static_cast<const byte*>(value));
            Decimal decimal;
            int64_t unscaled = 0;
            if (type.isUnsigned())
            {
                decimal.setUDecimal(static_cast<byte>(size), static_cast<byte>(scale), value);
                const unsigned __int64 integer = decimal.getUInt64();
                if (integer > static_cast<unsigned __int64>(INT64_MAX))
                    throw duckdb::OutOfRangeException("hpcc_scan unsigned DECIMAL exceeds DuckDB DECIMAL(18) range");
                unscaled = static_cast<int64_t>(integer);
            }
            else
            {
                decimal.setDecimal(static_cast<byte>(size), static_cast<byte>(scale), value);
                unscaled = static_cast<int64_t>(decimal.getInt64());
            }
            return duckdb::Value::DECIMAL(unscaled, static_cast<uint8_t>(width), static_cast<uint8_t>(scale));
        }
        case type_string:
        case type_varstring:
        case type_qstring:
        case type_unicode:
        case type_varunicode:
        case type_utf8:
        {
            size32_t length = 0;
            char* text = nullptr;
            type.getString(length, text, value);
            duckdb::Value result(std::string(text, length));
            rtlFree(text);
            return result;
        }
        case type_data:
        {
            size32_t length = 0;
            char* data = nullptr;
            type.getString(length, data, value);
            duckdb::Value result = duckdb::Value::BLOB(reinterpret_cast<const unsigned char*>(data), length);
            rtlFree(data);
            return result;
        }
        case type_blob:
        {
            if (!blobProvider)
                throw duckdb::NotImplementedException("hpcc_scan cannot resolve a blob without a KEY blob provider");
            const byte* blob = nullptr;
            try
            {
                blob = blobProvider->lookupBlob(static_cast<unsigned __int64>(type.getInt(value)));
            }
            catch (IException* exception)
            {
                StringBuffer message;
                exception->errorMessage(message);
                exception->Release();
                throw duckdb::IOException("hpcc_scan could not load KEY blob: %s", message.str());
            }
            if (!blob)
                return duckdb::Value();
            return materializeScalarValue(*type.queryChildType(), blob, blobProvider);
        }
        default:
            throw duckdb::NotImplementedException("hpcc_scan direct conversion does not support nested or decimal fields");
        }
    }

    static void materializeScalarRow(const RtlRecord& record, const byte* row,
        const std::vector<unsigned>& projectedColumns, duckdb::DataChunk& output, IBlobProvider* blobProvider = nullptr)
    {
        for (unsigned outputIndex = 0; outputIndex < projectedColumns.size(); ++outputIndex)
        {
            const unsigned fieldIndex = projectedColumns[outputIndex];
            const RtlTypeInfo* type = record.queryType(fieldIndex);
            const void* value = row + record.calculateOffset(row, fieldIndex);
            output.SetValue(outputIndex, 0, materializeScalarValue(*type, value, blobProvider));
        }
    }

duckdb::unique_ptr<duckdb::FunctionData> bindHpccScan(duckdb::ClientContext& context, duckdb::TableFunctionBindInput& input,
    duckdb::vector<duckdb::LogicalType>& returnTypes, duckdb::vector<std::string>& names)
{
    if (input.inputs.size() != 1 || input.inputs[0].IsNull() || input.inputs[0].ToString().empty())
        throw duckdb::BinderException("hpcc_scan requires one logical file name");

    const std::string logicalName = input.inputs[0].ToString();
    if (!CWsSql2MetadataResolver::isValidLogicalName(logicalName.c_str()))
        throw duckdb::BinderException("hpcc_scan requires a valid scoped logical file name");
    auto accessContext = context.registered_state->Get<CWsSql2AccessContext>("ws_sql2.access_context");
    if (!accessContext)
        throw duckdb::BinderException("hpcc_scan requires a request access context");

    try
    {
        Owned<IDistributedFile> file = CWsSql2MetadataResolver::resolveLogicalFile(logicalName.c_str(), accessContext->queryUser());
        Owned<IOutputMetaData> expectedMetadata = getDaliLayoutInfo(file->queryAttributes());
        FileAccessOptions accessOptions;
        accessOptions.updateFromFile(file);
        Owned<IOutputMetaData> actualMetadata = accessOptions.actualDiskMeta.getLink();
        if (!actualMetadata && expectedMetadata)
            actualMetadata.set(expectedMetadata);
        auto fields = appendScanColumns(*file, actualMetadata ? actualMetadata.get() : expectedMetadata.get(),
            returnTypes, names);
        return duckdb::make_uniq<CHpccScanBindData>(logicalName, file.getClear(), expectedMetadata.getClear(),
            actualMetadata.getClear(), std::move(fields));
    }
    catch (IException* exception)
    {
        StringBuffer message;
        exception->errorMessage(message);
        exception->Release();
        throw duckdb::BinderException(message.str());
    }

}

void executeHpccScan(duckdb::ClientContext&, duckdb::TableFunctionInput& input, duckdb::DataChunk& output)
{
    auto& state = input.global_state->Cast<CHpccScanGlobalState>();
    const auto& bindData = input.bind_data->Cast<CHpccScanBindData>();
    if (state.limit >= 0 && state.rowsReturned >= state.limit)
    {
        output.SetCardinality(0);
        return;
    }

    auto nextRow = [&state]() -> const byte*
    {
        if (state.keyLookup)
        {
            for (;;)
            {
                const byte* row = nullptr;
                try
                {
                    row = static_cast<const byte*>(state.keyLookup->nextKey());
                }
                catch (IException* exception)
                {
                    StringBuffer message;
                    exception->errorMessage(message);
                    exception->Release();
                    throw duckdb::IOException("hpcc_scan KEY lookup failed: %s", message.str());
                }
                if (!row || !state.postFilters.numFilterFields())
                    return row;

                const RtlRecord& record = state.actualMetadata->queryRecordAccessor(true);
                const unsigned numOffsets = record.getNumVarFields() + 1;
                std::vector<size_t> variableOffsets(numOffsets);
                RtlRow rtlRow(record, nullptr, numOffsets, variableOffsets.data());
                rtlRow.setRow(row, 0);
                if (state.postFilters.matches(rtlRow))
                    return row;
            }
        }

        size32_t rowSize = 0;
        const byte* row = static_cast<const byte*>(state.stream->prefetchRow(rowSize));
        if (isEndOfFile(row))
            return nullptr;
        if (isSpecialRow(row))
            throw duckdb::NotImplementedException("hpcc_scan encountered a grouped row boundary");
        return row;
    };

    while (state.rowsSkipped < state.offset)
    {
        if (!nextRow())
        {
            output.SetCardinality(0);
            return;
        }
        ++state.rowsSkipped;
    }

    const byte* row = nextRow();
    if (!row)
    {
        output.SetCardinality(0);
        return;
    }

    const RtlRecord& outputRecord = state.projectedMetadata
        ? state.projectedMetadata->queryRecordAccessor(true)
        : state.actualMetadata->queryRecordAccessor(true);
    bool hasNestedProjection = false;
    for (const auto& descriptor : state.projectedDescriptors)
    {
        if (!descriptor.children.empty())
        {
            hasNestedProjection = true;
            break;
        }
    }
    if (!hasNestedProjection)
    {
        if (state.keyManager)
        {
            KLBlobProviderAdapter blobProvider(state.keyManager, nullptr);
            materializeScalarRow(outputRecord, row, state.projectedColumns, output, &blobProvider);
        }
        else
            materializeScalarRow(outputRecord, row, state.projectedColumns, output);
    }
    else
    {
        auto processNestedProjection = [&](IBlobProvider* blobProvider)
        {
            CHpccScanFieldProcessor processor(output, state.projectedDescriptors, blobProvider);
            for (unsigned index = 0; index < state.projectedColumns.size(); ++index)
            {
                const RtlFieldInfo* field = outputRecord.queryOriginalField(state.projectedColumns[index]);
                if (!field)
                    throw duckdb::InternalException("hpcc_scan could not resolve a projected field");
                const byte* fieldValue = row + outputRecord.calculateOffset(row, state.projectedColumns[index]);
                field->process(fieldValue, row, processor);
            }
        };
        if (state.keyManager)
        {
            KLBlobProviderAdapter blobProvider(state.keyManager, nullptr);
            processNestedProjection(&blobProvider);
        }
        else
            processNestedProjection(nullptr);
    }
    ++state.rowsReturned;
    output.SetCardinality(1);
}

duckdb::unique_ptr<duckdb::GlobalTableFunctionState> initializeHpccScan(duckdb::ClientContext&,
    duckdb::TableFunctionInitInput& input)
{
    const auto& bindData = input.bind_data->Cast<CHpccScanBindData>();
    const bool isKey = strieq(bindData.file->queryAttributes().queryProp("@kind", ""), "key");
    if (!isKey && bindData.file->numParts() != 1)
        throw duckdb::NotImplementedException("hpcc_scan currently supports one file part");

    auto state = duckdb::make_uniq<CHpccScanGlobalState>();
    state->limit = bindData.limit;
    state->offset = bindData.offset;
    state->accessOptions.updateFromFile(bindData.file);
    if (state->accessOptions.formatOptions && state->accessOptions.formatOptions->getPropBool("@grouped", false))
        throw duckdb::NotImplementedException("hpcc_scan currently does not support grouped files");

    state->actualMetadata.setown(state->accessOptions.actualDiskMeta.getLink());
    if (!state->actualMetadata)
        state->actualMetadata.setown(getDaliLayoutInfo(bindData.file->queryAttributes()));
    if (!state->actualMetadata || (!isKey && !state->accessOptions.formatCrc))
        throw duckdb::BinderException("hpcc_scan could not initialize the published record layout");

    if (input.filters)
    {
        const RtlRecord& record = bindData.expectedRecord
            ? *bindData.expectedRecord
            : state->actualMetadata->queryRecordAccessor(true);
        std::vector<IFieldFilter*> stagedFilters;
        for (const auto& entry : input.filters->filters)
        {
            if (entry.first >= input.column_ids.size())
                throw duckdb::BinderException("hpcc_scan filter references an unknown projected column");
            const unsigned expectedIndex = static_cast<unsigned>(input.column_ids[entry.first]);
            if (!buildTableFilter(*entry.second, expectedIndex, record, stagedFilters))
            {
                for (auto* filter : stagedFilters)
                    filter->Release();
                throw duckdb::NotImplementedException("hpcc_scan filter cannot be pushed down safely");
            }
        }
        for (auto* filter : stagedFilters)
            state->filters.append(*filter);
    }
    if (!input.projection_ids.empty())
    {
        for (auto projection : input.projection_ids)
            state->projectedColumns.push_back(static_cast<unsigned>(input.column_ids.at(projection)));
    }
    else if (input.column_ids.empty())
    {
        for (unsigned index = 0; index < bindData.fields.size(); ++index)
            state->projectedColumns.push_back(index);
    }
    else
    {
        for (auto column : input.column_ids)
            state->projectedColumns.push_back(static_cast<unsigned>(column));
    }
    for (unsigned projectedColumn : state->projectedColumns)
        state->projectedDescriptors.push_back(bindData.fields.at(projectedColumn));
    ForEachItemIn(pushedIndex, bindData.pushedFilters)
        state->filters.append(OLINK(bindData.pushedFilters.item(pushedIndex)));

    if (!isKey)
    {
        IOutputMetaData* expectedMetadata = bindData.expectedMetadata ? bindData.expectedMetadata.get() : state->actualMetadata.get();
        const RtlRecord& expectedRecord = expectedMetadata->queryRecordAccessor(true);
        for (unsigned projectedColumn : state->projectedColumns)
        {
            if (projectedColumn >= expectedRecord.getNumFields())
                throw duckdb::BinderException("hpcc_scan projection references an unknown field");
            state->projectedFields.push_back(expectedRecord.queryOriginalField(projectedColumn));
        }
        state->projectedFields.push_back(nullptr);
        state->projectedType = std::make_unique<RtlRecordTypeInfo>(type_record, 0, state->projectedFields.data());
        state->projectedMetadata.setown(new CDynamicOutputMetaData(*state->projectedType));
        const unsigned expectedCrc = state->accessOptions.formatCrc;
        try
        {
            state->mapping.setown(createRowReadFormatMapping(
                state->accessOptions.recordTranslationMode,
                state->accessOptions.format,
                state->accessOptions.formatCrc, *state->actualMetadata,
                expectedCrc, *expectedMetadata,
                0, *state->projectedMetadata,
                state->accessOptions.formatOptions));
        }
        catch (IException* exception)
        {
            StringBuffer message;
            exception->errorMessage(message);
            exception->Release();
            throw duckdb::IOException("hpcc_scan could not create projected row mapping: %s", message.str());
        }
        state->projectedColumns.clear();
        for (unsigned index = 0; index + 1 < state->projectedFields.size(); ++index)
            state->projectedColumns.push_back(index);
    }

    if (isKey)
    {
        const RtlRecord& actualRecord = state->actualMetadata->queryRecordAccessor(true);
        std::vector<unsigned> actualColumns(bindData.fields.size(), actualRecord.getNumFields());
        for (unsigned fieldIndex = 0; fieldIndex < bindData.fields.size(); ++fieldIndex)
        {
            const char* fieldPath = bindData.fields[fieldIndex].fieldPath.c_str();
            for (unsigned actualIndex = 0; actualIndex < actualRecord.getNumFields(); ++actualIndex)
            {
                if (streq(actualRecord.queryName(actualIndex), fieldPath))
                {
                    actualColumns[fieldIndex] = actualIndex;
                    break;
                }
            }
            if (actualColumns[fieldIndex] == actualRecord.getNumFields())
                throw duckdb::BinderException("hpcc_scan could not map KEY field %s to the actual key layout", fieldPath);
        }

        for (auto& projectedColumn : state->projectedColumns)
            projectedColumn = actualColumns.at(projectedColumn);

        if (bindData.expectedRecord)
        {
            try
            {
                RowFilter actualFilters;
                Owned<const IKeyTranslator> translator = createKeyTranslator(actualRecord, *bindData.expectedRecord);
                if (translator && translator->needsTranslate())
                    translator->translate(actualFilters, state->filters);
                else
                    actualFilters.appendFilters(state->filters);
                state->filters.kill();
                for (unsigned filterIndex = 0; filterIndex < actualFilters.numFilterFields(); ++filterIndex)
                    state->filters.append(OLINK(actualFilters.queryFilter(filterIndex)));
            }
            catch (IException* exception)
            {
                StringBuffer message;
                exception->errorMessage(message);
                exception->Release();
                throw duckdb::BinderException("hpcc_scan could not translate KEY filters: %s", message.str());
            }
        }
        else
        {
            for (unsigned filterIndex = 0; filterIndex < state->filters.ordinality(); ++filterIndex)
            {
                const unsigned publishedIndex = state->filters.item(filterIndex).queryFieldIndex();
                if (publishedIndex >= actualColumns.size())
                    throw duckdb::BinderException("hpcc_scan KEY filter references an unknown field");
                const unsigned actualIndex = actualColumns[publishedIndex];
                if (publishedIndex != actualIndex)
                {
                    Owned<IFieldFilter> remapped = state->filters.item(filterIndex).remap(actualIndex);
                    state->filters.replace(*remapped.getClear(), filterIndex);
                }
            }
        }

        Owned<IKeyIndexSet> keyIndexes = createKeyIndexSet();
        for (unsigned partIndex = 0; partIndex < bindData.file->numParts(); ++partIndex)
        {
            Owned<IDistributedFilePart> part = bindData.file->getPart(partIndex);
            if (isPartTLK(part->queryAttributes()))
                continue;
            Owned<IKeyIndex> keyIndex = openKeyFile(*part);
            if (!keyIndex->isTopLevelKey())
                keyIndexes->addIndex(keyIndex.getClear());
        }
        if (!keyIndexes->numParts())
            throw duckdb::IOException("hpcc_scan found no data parts in KEY file %s", bindData.logicalName);
        if (keyIndexes->numParts() == 1)
            state->keyManager.setown(createLocalKeyManager(
                state->actualMetadata->queryRecordAccessor(true), keyIndexes->queryPart(0), nullptr, true, false));
        else
            state->keyManager.setown(createKeyMerger(
                state->actualMetadata->queryRecordAccessor(true), keyIndexes, 0, nullptr, true, false));
        const unsigned keyedFields = actualRecord.getNumKeyedFields();
        RowFilter keyedFilters;
        std::vector<bool> constrained(keyedFields, false);
        ForEachItemIn(filterIndex, state->filters)
        {
            const unsigned fieldIndex = state->filters.item(filterIndex).queryFieldIndex();
            if (fieldIndex < keyedFields)
                constrained[fieldIndex] = true;
        }
        ForEachItemIn(applyIndex, state->filters)
        {
            const IFieldFilter& filter = state->filters.item(applyIndex);
            const unsigned fieldIndex = filter.queryFieldIndex();
            bool contiguousKeyed = fieldIndex < keyedFields;
            for (unsigned preceding = 0; contiguousKeyed && preceding < fieldIndex; ++preceding)
                contiguousKeyed = constrained[preceding];
            if (contiguousKeyed)
                keyedFilters.addFilter(OLINK(filter));
            else
                state->postFilters.addFilter(OLINK(filter));
        }
        StringBuffer keyedFieldIndexes;
        for (unsigned filterIndex = 0; filterIndex < keyedFilters.numFilterFields(); ++filterIndex)
        {
            if (filterIndex)
                keyedFieldIndexes.append(',');
            keyedFieldIndexes.append(keyedFilters.queryFilter(filterIndex).queryFieldIndex());
        }
        try
        {
            keyedFilters.sortByFieldOrder();
            keyedFilters.createSegmentMonitors(state->keyManager);
            state->keyManager->finishSegmentMonitors();
            state->keyManager->reset();
        }
        catch (IException* exception)
        {
            StringBuffer message;
            exception->errorMessage(message);
            exception->Release();
            throw duckdb::IOException("hpcc_scan could not initialize KEY filters [%s]: %s",
                keyedFieldIndexes.str(), message.str());
        }
        state->keyLookup.setown(createIndexLookup(state->keyManager));
        state->keyLookup->ensureAvailable();
        return state;
    }

    state->reader.setown(createDiskReader(state->accessOptions.format, false, state->mapping,
        state->accessOptions.providerOptions, nullptr));

    Owned<IDistributedFilePart> part = bindData.file->getPart(0);
    RemoteFilename filename;
    part->getFilename(filename, 0);
    if (!state->reader->setInputFile(filename, bindData.file->queryLogicalName(), 0, 0, state->filters))
        throw duckdb::IOException("hpcc_scan could not open the file part");
    state->stream.setown(state->reader->queryAllocatedRowStream());
    return state;
}
}

void CWsSql2Extension::Load(duckdb::ExtensionLoader& loader)
{
    loader.SetDescription("HPCC logical-file scan extension");
    auto function = duckdb::TableFunction("hpcc_scan", {duckdb::LogicalType::VARCHAR}, executeHpccScan,
        bindHpccScan, initializeHpccScan);
    function.pushdown_complex_filter = pushdownHpccScanFilters;
    function.supports_pushdown_type = supportsHpccScanPushdownType;
    function.projection_pushdown = true;
    function.filter_pushdown = true;
    function.filter_prune = true;
    function.to_string = describeHpccScan;
    loader.RegisterFunction(function);

    duckdb::OptimizerExtension optimizer;
    optimizer.optimize_function = optimizeHpccScan;
    duckdb::OptimizerExtension::Register(duckdb::DBConfig::GetConfig(loader.GetDatabaseInstance()), std::move(optimizer));
}

std::string CWsSql2Extension::Name()
{
    return "hpcc_scan";
}

std::string CWsSql2Extension::Version() const
{
    return "0.1.0";
}
