#include "ws_sql2engine.hpp"

#include <cassert>

void runWsSql2TypeMappingTests();

int main()
{
    CWsSql2QueryEngine engine;
    assert(engine.isInitialized());

    CWsSql2RequestState state;
    assert(!state.canExecute());
    assert(state.validate());
    assert(state.initialize());
    assert(state.canExecute());
    assert(state.beginExecution());
    state.cancel();
    assert(!state.canExecute());
    assert(!state.beginExecution());
    runWsSql2TypeMappingTests();
    return 0;
}