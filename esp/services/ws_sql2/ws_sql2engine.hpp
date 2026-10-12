#ifndef _ESP_WS_SQL2_ENGINE_HPP_
#define _ESP_WS_SQL2_ENGINE_HPP_

#include "duckdb.hpp"

enum class CWsSql2RequestPhase
{
    Created,
    Validated,
    Initialized,
    Executing,
    Completed,
    Cancelled,
    Failed
};

class CWsSql2RequestState
{
    CWsSql2RequestPhase phase = CWsSql2RequestPhase::Created;

public:
    bool validate();
    bool initialize();
    bool beginExecution();
    void cancel();
    bool canExecute() const;
    CWsSql2RequestPhase queryPhase() const;
};

class CWsSql2QueryEngine
{
    duckdb::DuckDB database;
    duckdb::Connection connection;

public:
    CWsSql2QueryEngine();

    bool isInitialized() const;
};

#endif