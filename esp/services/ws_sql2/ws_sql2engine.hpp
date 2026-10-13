#ifndef _ESP_WS_SQL2_ENGINE_HPP_
#define _ESP_WS_SQL2_ENGINE_HPP_

#include "jlib.hpp"
#include "duckdb.hpp"
#include "rtlkey.hpp"

#include <string>
#include <vector>

interface IUserDescriptor;

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

enum class CWsSql2FilterDisposition
{
    Keyed,
    Post,
    Residual
};

struct CWsSql2FilterDecision
{
    CWsSql2FilterDisposition disposition;
    std::string fieldPath;
    std::string description;
};

class CWsSql2PushdownPlan
{
    std::vector<CWsSql2FilterDecision> decisions;
    IConstArrayOf<IFieldFilter> keyedFilters;
    IConstArrayOf<IFieldFilter> postFilters;

public:
    void addKeyedFilter(const char* fieldPath, const char* description);
    void addKeyedFilter(IFieldFilter* filter, const char* fieldPath, const char* description);
    void addPostFilter(const char* fieldPath, const char* description);
    void addPostFilter(IFieldFilter* filter, const char* fieldPath, const char* description);
    void addTranslatedFilter(IFieldFilter* filter, unsigned leadingKeyFields, const char* fieldPath, const char* description);
    void addTranslatedFilter(IFieldFilter* filter, const UnsignedArray& keyOrder, const char* fieldPath, const char* description);
    void addResidualFilter(const char* fieldPath, const char* description);
    unsigned numKeyedFilters() const;
    unsigned numPostFilters() const;
    unsigned numResidualFilters() const;
    const CWsSql2FilterDecision& queryDecision(unsigned index) const;
    const IConstArrayOf<IFieldFilter>& queryKeyedFilters() const;
    const IConstArrayOf<IFieldFilter>& queryPostFilters() const;
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
    explicit CWsSql2QueryEngine(IUserDescriptor* requestUser);

    bool isInitialized();
    bool rejectsInvalidHpccScan();
    bool executeQuery(const char* sql, unsigned rowLimit, unsigned byteLimit, std::string& resultText, std::string& errorMessage);
    bool explainQuery(const char* sql, std::string& planText, std::string& planJson,
        StringArray& projectedColumns, StringArray& residualFilters, std::string& errorMessage);
    IFieldFilter* deserializeFilter(unsigned fieldId, const RtlTypeInfo& type, const char* expression) const;
};

#endif