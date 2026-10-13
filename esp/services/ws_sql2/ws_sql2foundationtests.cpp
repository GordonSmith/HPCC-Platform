#include "ws_sql2engine.hpp"
#include "rtlfield.hpp"
#include "daclient.hpp"

#include <cassert>

void runWsSql2TypeMappingTests();

int main()
{
    CWsSql2QueryEngine engine;
    assert(engine.isInitialized());
    assert(engine.rejectsInvalidHpccScan());

    Owned<IUserDescriptor> requestUser = createUserDescriptor();
    CWsSql2QueryEngine contextualEngine(requestUser);
    assert(contextualEngine.isInitialized());

    std::string queryResult;
    std::string queryError;
    assert(!contextualEngine.executeQuery("CREATE TABLE blocked(value INTEGER)", 0, 0, queryResult, queryError));
    assert(queryError == "Only SELECT statements are supported");

    CWsSql2RequestState state;
    assert(!state.canExecute());
    assert(state.validate());
    assert(state.initialize());
    assert(state.canExecute());
    assert(state.beginExecution());
    state.cancel();
    assert(!state.canExecute());
    assert(!state.beginExecution());

    CWsSql2PushdownPlan plan;
    plan.addKeyedFilter("id", "id = 7");
    plan.addPostFilter("status", "status = 'active'");
    plan.addResidualFilter("name", "lower(name) = 'sam'");
    assert(plan.numKeyedFilters() == 1);
    assert(plan.numPostFilters() == 1);
    assert(plan.numResidualFilters() == 1);
    assert(plan.queryDecision(2).disposition == CWsSql2FilterDisposition::Residual);
    assert(plan.queryDecision(2).description == "lower(name) = 'sam'");

    RtlIntTypeInfo integerType(type_int, sizeof(__int32));
    Owned<IFieldFilter> filter = engine.deserializeFilter(3, integerType, "=[7,12]");
    assert(filter);
    assert(filter->queryFieldIndex() == 3);
    assert(!filter->isEmpty());
    assert(!filter->isWild());
    plan.addKeyedFilter(filter.getClear(), "id", "=[7,12]");
    assert(plan.queryKeyedFilters().ordinality() == 1);
    assert(plan.queryKeyedFilters().item(0).queryFieldIndex() == 3);
    assert(plan.numKeyedFilters() == 2);

    runWsSql2TypeMappingTests();
    return 0;
}