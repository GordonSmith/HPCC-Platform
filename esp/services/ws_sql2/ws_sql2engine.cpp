#include "ws_sql2engine.hpp"
#include "ws_sql2extension.hpp"

#include "duckdb/main/materialized_query_result.hpp"

static constexpr const char* accessContextKey = "ws_sql2.access_context";
static constexpr size_t resultJsonSuffixReserve = 128;

static void appendJsonString(std::string& output, const std::string& value)
{
    StringBuffer encoded;
    encodeJSON(encoded, static_cast<unsigned>(value.size()), value.data());
    output.push_back('"');
    output.append(encoded.str(), encoded.length());
    output.push_back('"');
}

static void appendDuckDBValue(StringBuffer& output, const char* name, const duckdb::Value& value)
{
    if (value.IsNull())
    {
        appendJSONNameOrDelimit(output, name).append("null");
        return;
    }

    const auto type = value.type().id();
    if (type == duckdb::LogicalTypeId::LIST || type == duckdb::LogicalTypeId::ARRAY)
    {
        appendJSONNameOrDelimit(output, name).append('[');
        const auto& children = type == duckdb::LogicalTypeId::LIST
            ? duckdb::ListValue::GetChildren(value)
            : duckdb::ArrayValue::GetChildren(value);
        for (const auto& child : children)
            appendDuckDBValue(output, nullptr, child);
        output.append(']');
        return;
    }
    if (type == duckdb::LogicalTypeId::STRUCT)
    {
        appendJSONNameOrDelimit(output, name).append('{');
        const auto& children = duckdb::StructValue::GetChildren(value);
        for (duckdb::idx_t index = 0; index < children.size(); ++index)
            appendDuckDBValue(output, duckdb::StructType::GetChildName(value.type(), index).c_str(), children[index]);
        output.append('}');
        return;
    }
    if (type == duckdb::LogicalTypeId::MAP)
    {
        appendJSONNameOrDelimit(output, name).append('{');
        for (const auto& entry : duckdb::MapValue::GetChildren(value))
        {
            const auto& pair = duckdb::StructValue::GetChildren(entry);
            if (pair.size() == 2 && !pair[0].IsNull())
                appendDuckDBValue(output, pair[0].ToString().c_str(), pair[1]);
        }
        output.append('}');
        return;
    }

    if (type == duckdb::LogicalTypeId::VARCHAR || type == duckdb::LogicalTypeId::DATE
        || type == duckdb::LogicalTypeId::TIME || type == duckdb::LogicalTypeId::TIMESTAMP
        || type == duckdb::LogicalTypeId::TIMESTAMP_TZ || type == duckdb::LogicalTypeId::UUID
        || type == duckdb::LogicalTypeId::INTERVAL)
    {
        const std::string text = value.ToString();
        appendJSONStringValue(output, name, static_cast<unsigned>(text.size()), text.data(), true);
        return;
    }
    if (type == duckdb::LogicalTypeId::BLOB)
    {
        const std::string& data = duckdb::StringValue::Get(value);
        appendJSONDataValue(output, name, static_cast<unsigned>(data.size()), data.data());
        return;
    }
    if (type == duckdb::LogicalTypeId::BOOLEAN)
    {
        appendJSONValue(output, name, value.GetValue<bool>());
        return;
    }
    if (type == duckdb::LogicalTypeId::FLOAT)
    {
        appendJSONRealValue(output, name, duckdb::FloatValue::Get(value));
        return;
    }
    if (type == duckdb::LogicalTypeId::DOUBLE)
    {
        appendJSONRealValue(output, name, duckdb::DoubleValue::Get(value));
        return;
    }
    appendJSONNameOrDelimit(output, name).append(value.ToString());
}

static std::string materializedResultAsJson(duckdb::MaterializedQueryResult& result, unsigned rowLimit, unsigned byteLimit)
{
    const duckdb::idx_t totalRowCount = result.Collection().Count();
    auto chunk = result.Fetch();
    const duckdb::idx_t columnCount = result.names.empty() && chunk ? chunk->ColumnCount() : result.names.size();
    duckdb::idx_t rowCount = 0;
    bool truncated = false;
    std::string output = "{\"columns\":[";
    for (duckdb::idx_t column = 0; column < columnCount; ++column)
    {
        if (column)
            output.push_back(',');
        appendJsonString(output, result.names.empty() ? ("column" + std::to_string(column)) : result.names[column]);
    }
    output.append("],\"rows\":[");
    bool firstRow = true;
    while (chunk)
    {
        for (duckdb::idx_t row = 0; row < chunk->size(); ++row)
        {
            if (rowLimit && rowCount >= rowLimit)
            {
                truncated = true;
                break;
            }
            StringBuffer rowText("[");
            for (duckdb::idx_t column = 0; column < columnCount; ++column)
                appendDuckDBValue(rowText, nullptr, chunk->GetValue(column, row));
            rowText.append(']');
            if (byteLimit && output.size() + (firstRow ? 0 : 1) + rowText.length() + resultJsonSuffixReserve > byteLimit)
            {
                truncated = true;
                break;
            }
            if (!firstRow)
                output.push_back(',');
            firstRow = false;
            output.append(rowText.str(), rowText.length());
            ++rowCount;
        }
        if (truncated)
            break;
        chunk = result.Fetch();
    }
    output.append("],\"rowCount\":").append(std::to_string(totalRowCount));
    output.append(",\"returnedRowCount\":").append(std::to_string(rowCount));
    output.append(",\"truncated\":").append(truncated ? "true}" : "false}");
    return output;
}

static void registerAccessContext(duckdb::Connection& connection, IUserDescriptor* requestUser)
{
    auto accessContext = duckdb::make_shared_ptr<CWsSql2AccessContext>(requestUser);
    connection.context->registered_state->Insert(accessContextKey, std::move(accessContext));
}

static void addFilterDecision(std::vector<CWsSql2FilterDecision>& decisions, CWsSql2FilterDisposition disposition,
    const char* fieldPath, const char* description)
{
    decisions.push_back({disposition, fieldPath ? fieldPath : "", description ? description : ""});
}

void CWsSql2PushdownPlan::addKeyedFilter(const char* fieldPath, const char* description)
{
    addFilterDecision(decisions, CWsSql2FilterDisposition::Keyed, fieldPath, description);
}

void CWsSql2PushdownPlan::addKeyedFilter(IFieldFilter* filter, const char* fieldPath, const char* description)
{
    if (!filter)
        return;
    keyedFilters.append(*filter);
    addKeyedFilter(fieldPath, description);
}

void CWsSql2PushdownPlan::addPostFilter(const char* fieldPath, const char* description)
{
    addFilterDecision(decisions, CWsSql2FilterDisposition::Post, fieldPath, description);
}

void CWsSql2PushdownPlan::addPostFilter(IFieldFilter* filter, const char* fieldPath, const char* description)
{
    if (!filter)
        return;
    postFilters.append(*filter);
    addPostFilter(fieldPath, description);
}

void CWsSql2PushdownPlan::addTranslatedFilter(IFieldFilter* filter, unsigned leadingKeyFields, const char* fieldPath, const char* description)
{
    if (!filter)
        return;
    if (filter->queryFieldIndex() < leadingKeyFields)
        addKeyedFilter(filter, fieldPath, description);
    else
        addPostFilter(filter, fieldPath, description);
}

void CWsSql2PushdownPlan::addTranslatedFilter(IFieldFilter* filter, const UnsignedArray& keyOrder,
    const char* fieldPath, const char* description)
{
    if (!filter)
        return;

    unsigned keyPosition = NotFound;
    for (unsigned index = 0; index < keyOrder.ordinality(); ++index)
    {
        if (keyOrder.item(index) == filter->queryFieldIndex())
        {
            keyPosition = index;
            break;
        }
    }
    if (keyPosition == NotFound)
    {
        addPostFilter(filter, fieldPath, description);
        return;
    }

    for (unsigned index = 0; index < keyPosition; ++index)
    {
        bool precedingFieldConstrained = false;
        ForEachItemIn(keyedIndex, keyedFilters)
        {
            if (keyedFilters.item(keyedIndex).queryFieldIndex() == keyOrder.item(index))
            {
                precedingFieldConstrained = true;
                break;
            }
        }
        if (!precedingFieldConstrained)
        {
            addPostFilter(filter, fieldPath, description);
            return;
        }
    }
    addKeyedFilter(filter, fieldPath, description);
}

void CWsSql2PushdownPlan::addResidualFilter(const char* fieldPath, const char* description)
{
    addFilterDecision(decisions, CWsSql2FilterDisposition::Residual, fieldPath, description);
}

unsigned CWsSql2PushdownPlan::numKeyedFilters() const
{
    return std::count_if(decisions.begin(), decisions.end(), [](const CWsSql2FilterDecision& decision)
    {
        return decision.disposition == CWsSql2FilterDisposition::Keyed;
    });
}

unsigned CWsSql2PushdownPlan::numPostFilters() const
{
    return std::count_if(decisions.begin(), decisions.end(), [](const CWsSql2FilterDecision& decision)
    {
        return decision.disposition == CWsSql2FilterDisposition::Post;
    });
}

unsigned CWsSql2PushdownPlan::numResidualFilters() const
{
    return std::count_if(decisions.begin(), decisions.end(), [](const CWsSql2FilterDecision& decision)
    {
        return decision.disposition == CWsSql2FilterDisposition::Residual;
    });
}

const CWsSql2FilterDecision& CWsSql2PushdownPlan::queryDecision(unsigned index) const
{
    return decisions.at(index);
}

const IConstArrayOf<IFieldFilter>& CWsSql2PushdownPlan::queryKeyedFilters() const
{
    return keyedFilters;
}

const IConstArrayOf<IFieldFilter>& CWsSql2PushdownPlan::queryPostFilters() const
{
    return postFilters;
}

bool CWsSql2RequestState::validate()
{
    if (phase != CWsSql2RequestPhase::Created)
        return false;
    phase = CWsSql2RequestPhase::Validated;
    return true;
}

bool CWsSql2RequestState::initialize()
{
    if (phase != CWsSql2RequestPhase::Validated)
        return false;
    phase = CWsSql2RequestPhase::Initialized;
    return true;
}

bool CWsSql2RequestState::beginExecution()
{
    if (phase != CWsSql2RequestPhase::Initialized)
        return false;
    phase = CWsSql2RequestPhase::Executing;
    return true;
}

void CWsSql2RequestState::cancel()
{
    phase = CWsSql2RequestPhase::Cancelled;
}

bool CWsSql2RequestState::canExecute() const
{
    return phase == CWsSql2RequestPhase::Initialized || phase == CWsSql2RequestPhase::Executing;
}

CWsSql2RequestPhase CWsSql2RequestState::queryPhase() const
{
    return phase;
}

CWsSql2QueryEngine::CWsSql2QueryEngine()
    : database(nullptr), connection(database)
{
    database.LoadStaticExtension<CWsSql2Extension>();
}

CWsSql2QueryEngine::CWsSql2QueryEngine(IUserDescriptor* requestUser)
    : database(nullptr), connection(database)
{
    database.LoadStaticExtension<CWsSql2Extension>();
    registerAccessContext(connection, requestUser);
}

bool CWsSql2QueryEngine::isInitialized()
{
    return database.ExtensionIsLoaded("hpcc_scan");
}

bool CWsSql2QueryEngine::rejectsInvalidHpccScan()
{
    auto result = connection.Query("select * from hpcc_scan('invalid')");
    return result && result->HasError();
}

bool CWsSql2QueryEngine::executeQuery(const char* sql, unsigned rowLimit, unsigned byteLimit, std::string& resultText, std::string& errorMessage)
{
    std::string queryText;
    try
    {
        auto statements = connection.ExtractStatements(sql ? sql : "");
        if (statements.size() != 1 || statements.front()->type != duckdb::StatementType::SELECT_STATEMENT)
        {
            errorMessage = "Only a single SELECT statement is supported";
            return false;
        }
        queryText = statements.front()->ToString();
        if (rowLimit)
        {
            const uint64_t executionLimit = static_cast<uint64_t>(rowLimit) + 1;
            queryText = "SELECT * FROM (" + queryText + ") AS ws_sql2_request LIMIT " + std::to_string(executionLimit);
        }
    }
    catch (const std::exception& exception)
    {
        errorMessage = exception.what();
        return false;
    }

    auto result = connection.Query(queryText);
    if (!result)
    {
        errorMessage = "DuckDB returned no query result";
        return false;
    }
    if (result->HasError())
    {
        errorMessage = result->GetError();
        return false;
    }
    if (result->type == duckdb::QueryResultType::MATERIALIZED_RESULT)
        resultText = materializedResultAsJson(result->Cast<duckdb::MaterializedQueryResult>(), rowLimit, byteLimit);
    else
        resultText = result->ToString();
    errorMessage.clear();
    return true;
}

static bool extractExplainPlan(duckdb::Connection& connection, const std::string& explainSql,
    std::string& plan, std::string& errorMessage)
{
    auto result = connection.Query(explainSql);
    if (!result)
    {
        errorMessage = "DuckDB returned no explain result";
        return false;
    }
    if (result->HasError())
    {
        errorMessage = result->GetError();
        return false;
    }
    if (result->type != duckdb::QueryResultType::MATERIALIZED_RESULT)
    {
        errorMessage = "DuckDB returned a non-materialized explain result";
        return false;
    }
    auto chunk = result->Cast<duckdb::MaterializedQueryResult>().Fetch();
    if (!chunk || chunk->size() != 1 || chunk->ColumnCount() < 2)
    {
        errorMessage = "DuckDB returned an unexpected explain result";
        return false;
    }
    plan = chunk->GetValue(1, 0).ToString();
    return true;
}

static void appendLeafValues(IPropertyTree& tree, StringArray& values)
{
    if (!tree.hasChildren())
    {
        const char* value = tree.queryProp(nullptr);
        if (!isEmptyString(value) && !values.contains(value))
            values.append(value);
        return;
    }
    Owned<IPropertyTreeIterator> children = tree.getElements("*");
    ForEach(*children)
        appendLeafValues(children->query(), values);
}

static IPropertyTree* queryDirectChild(IPropertyTree& tree, const char* name)
{
    Owned<IPropertyTreeIterator> children = tree.getElements("*");
    ForEach(*children)
    {
        if (streq(children->query().queryName(), name))
            return &children->query();
    }
    return nullptr;
}

static void appendDirectChildValues(IPropertyTree& tree, const char* name, StringArray& values)
{
    Owned<IPropertyTreeIterator> children = tree.getElements("*");
    ForEach(*children)
    {
        if (streq(children->query().queryName(), name))
            appendLeafValues(children->query(), values);
    }
}

static void extractHpccScanPlan(IPropertyTree& node, StringArray& projectedColumns, StringArray& residualFilters)
{
    if (!node.hasChildren())
        return;
    IPropertyTree* name = queryDirectChild(node, "name");
    if (name && streq(name->queryProp(nullptr), "HPCC_SCAN"))
    {
        IPropertyTree* extraInfo = queryDirectChild(node, "extra_info");
        if (extraInfo)
        {
            appendDirectChildValues(*extraInfo, "Reader_sProjection", projectedColumns);
            appendDirectChildValues(*extraInfo, "Residual_sFilters", residualFilters);
        }
    }
    Owned<IPropertyTreeIterator> children = node.getElements("*");
    ForEach(*children)
        extractHpccScanPlan(children->query(), projectedColumns, residualFilters);
}

bool CWsSql2QueryEngine::explainQuery(const char* sql, std::string& planText, std::string& planJson,
    StringArray& projectedColumns, StringArray& residualFilters, std::string& errorMessage)
{
    std::string queryText;
    try
    {
        auto statements = connection.ExtractStatements(sql ? sql : "");
        if (statements.size() != 1 || statements.front()->type != duckdb::StatementType::SELECT_STATEMENT)
        {
            errorMessage = "Only a single SELECT statement is supported";
            return false;
        }
        queryText = statements.front()->ToString();
    }
    catch (const std::exception& exception)
    {
        errorMessage = exception.what();
        return false;
    }

    if (!extractExplainPlan(connection, "EXPLAIN " + queryText, planText, errorMessage))
        return false;
    if (!extractExplainPlan(connection, "EXPLAIN (FORMAT JSON) " + queryText, planJson, errorMessage))
        return false;
    try
    {
        Owned<IPropertyTree> planTree = createPTreeFromJSONString(planJson.c_str());
        Owned<IPropertyTreeIterator> roots = planTree->getElements("*");
        ForEach(*roots)
            extractHpccScanPlan(roots->query(), projectedColumns, residualFilters);
    }
    catch (IException* exception)
    {
        StringBuffer message;
        exception->errorMessage(message);
        exception->Release();
        errorMessage = message.str();
        return false;
    }
    errorMessage.clear();
    return true;
}

IFieldFilter* CWsSql2QueryEngine::deserializeFilter(unsigned fieldId, const RtlTypeInfo& type, const char* expression) const
{
    if (isEmptyString(expression))
        return createEmptyFieldFilter(fieldId, type);
    return deserializeFieldFilter(fieldId, type, expression);
}