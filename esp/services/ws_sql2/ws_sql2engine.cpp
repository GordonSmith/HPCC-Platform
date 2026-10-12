#include "ws_sql2engine.hpp"

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
}

bool CWsSql2QueryEngine::isInitialized() const
{
    return true;
}