#include "ws_sql2engine.hpp"
#include "ws_sql2extension.hpp"

#include "duckdb/main/materialized_query_result.hpp"

static constexpr const char* accessContextKey = "ws_sql2.access_context";

static void appendJsonString(std::string& output, const std::string& value)
{
    output.push_back('"');
    for (char character : value)
    {
        switch (character)
        {
        case '"': output.append("\\\""); break;
        case '\\': output.append("\\\\"); break;
        case '\n': output.append("\\n"); break;
        case '\r': output.append("\\r"); break;
        case '\t': output.append("\\t"); break;
        default: output.push_back(character); break;
        }
    }
    output.push_back('"');
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
            std::string rowText = "[";
            for (duckdb::idx_t column = 0; column < columnCount; ++column)
            {
                if (column)
                    rowText.push_back(',');
                duckdb::Value value = chunk->GetValue(column, row);
                if (value.IsNull())
                {
                    rowText.append("null");
                    continue;
                }
                const auto type = value.type().id();
                const std::string text = value.ToString();
                if (type == duckdb::LogicalTypeId::VARCHAR || type == duckdb::LogicalTypeId::BLOB
                    || type == duckdb::LogicalTypeId::DATE || type == duckdb::LogicalTypeId::TIME
                    || type == duckdb::LogicalTypeId::TIMESTAMP)
                    appendJsonString(rowText, text);
                else
                    rowText.append(text);
            }
            rowText.push_back(']');
            if (byteLimit && output.size() + (firstRow ? 0 : 1) + rowText.size() + 32 > byteLimit)
            {
                truncated = true;
                break;
            }
            if (!firstRow)
                output.push_back(',');
            firstRow = false;
            output.append(rowText);
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
    std::string statement = sql ? sql : "";
    const size_t firstToken = statement.find_first_not_of(" \t\r\n");
    std::string keyword = firstToken == std::string::npos ? "" : statement.substr(firstToken, 6);
    std::transform(keyword.begin(), keyword.end(), keyword.begin(), [](unsigned char character)
    {
        return static_cast<char>(std::toupper(character));
    });
    if (keyword != "SELECT")
    {
        errorMessage = "Only SELECT statements are supported";
        return false;
    }

    auto result = connection.Query(sql ? sql : "");
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
    if (resultText.size() > 65536)
        resultText.resize(65536);
    errorMessage.clear();
    return true;
}

IFieldFilter* CWsSql2QueryEngine::deserializeFilter(unsigned fieldId, const RtlTypeInfo& type, const char* expression) const
{
    if (isEmptyString(expression))
        return createEmptyFieldFilter(fieldId, type);
    return deserializeFieldFilter(fieldId, type, expression);
}