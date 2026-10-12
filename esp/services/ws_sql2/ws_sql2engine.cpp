#include "ws_sql2engine.hpp"
#include "ws_sql2extension.hpp"

static constexpr const char* accessContextKey = "ws_sql2.access_context";

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

bool CWsSql2QueryEngine::executeQuery(const char* sql, std::string& errorMessage)
{
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
    errorMessage.clear();
    return true;
}

IFieldFilter* CWsSql2QueryEngine::deserializeFilter(unsigned fieldId, const RtlTypeInfo& type, const char* expression) const
{
    if (isEmptyString(expression))
        return createEmptyFieldFilter(fieldId, type);
    return deserializeFieldFilter(fieldId, type, expression);
}