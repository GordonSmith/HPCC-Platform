#include "ws_sql2engine.hpp"
#include "rtlfield.hpp"
#include "daclient.hpp"
#include "fileview.hpp"
#include "fverror.hpp"

#include <cassert>
#include <atomic>
#include <string>
#include <thread>
#include <vector>

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
    assert(queryError == "Only a single SELECT statement is supported");
    assert(!contextualEngine.executeQuery("SELECT 1; SELECT 2", 0, 0, queryResult, queryError));
    assert(queryError == "Only a single SELECT statement is supported");
    assert(contextualEngine.executeQuery("SELECT * FROM range(1000000);", 1, 0, queryResult, queryError));
    assert(queryResult.find("\"returnedRowCount\":1") != std::string::npos);
    assert(queryResult.find("\"truncated\":true") != std::string::npos);
    assert(contextualEngine.executeQuery("SELECT * FROM range(10000);", 0, 0, queryResult, queryError));
    assert(queryResult.size() > 65536);
    Owned<IPropertyTree> unboundedJson = createPTreeFromJSONString(queryResult.c_str());
    assert(unboundedJson && !unboundedJson->getPropBool("truncated"));
    assert(contextualEngine.executeQuery("SELECT * FROM range(1000000);", 0, 1024, queryResult, queryError));
    assert(queryResult.size() <= 1024);
    Owned<IPropertyTree> limitedJson = createPTreeFromJSONString(queryResult.c_str());
    assert(limitedJson && limitedJson->getPropBool("truncated"));
    std::string planText;
    std::string planJson;
    StringArray projectedColumns;
    StringArray residualFilters;
    assert(contextualEngine.explainQuery("SELECT * FROM range(10) LIMIT 2", planText, planJson,
        projectedColumns, residualFilters, queryError));
    assert(!planText.empty());
    assert(!planJson.empty() && planJson.front() == '[' && planJson.back() == ']');
    assert(contextualEngine.executeQuery(
        "SELECT [1, 2] AS items, {'name': 'x', 'control': chr(1)} AS details", 0, 0,
        queryResult, queryError));
    Owned<IPropertyTree> nestedJson = createPTreeFromJSONString(queryResult.c_str());
    assert(nestedJson);

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
    Owned<IFieldFilter> invertedFilter = engine.deserializeFilter(3, integerType, "!=[7]");
    assert(invertedFilter);
    assert(invertedFilter->queryFieldIndex() == 3);
    assert(!invertedFilter->isEmpty());
    assert(!invertedFilter->isSingleValue());
    Owned<IFieldFilter> upperRange = engine.deserializeFilter(0, integerType, "=(,3)");
    assert(upperRange);
    StringBuffer upperDescription;
    upperRange->describe(upperDescription);
    assert(upperDescription.length() > 0);
    Owned<IFieldFilter> lowerRange = engine.deserializeFilter(0, integerType, "=[5,)");
    assert(lowerRange);
    StringBuffer lowerDescription;
    lowerRange->describe(lowerDescription);
    assert(lowerDescription.length() > 0);
    CWsSql2PushdownPlan translatedPlan;
    Owned<IFieldFilter> keyedFilter = engine.deserializeFilter(0, integerType, "=[7]");
    translatedPlan.addTranslatedFilter(keyedFilter.getClear(), 1, "id", "=[7]");
    Owned<IFieldFilter> postFilter = engine.deserializeFilter(3, integerType, "=[7]");
    translatedPlan.addTranslatedFilter(postFilter.getClear(), 1, "payload", "=[7]");
    assert(translatedPlan.numKeyedFilters() == 1);
    assert(translatedPlan.numPostFilters() == 1);
    CWsSql2PushdownPlan contiguousPlan;
    UnsignedArray keyOrder;
    keyOrder.append(0);
    keyOrder.append(3);
    Owned<IFieldFilter> nonLeading = engine.deserializeFilter(3, integerType, "=[7]");
    contiguousPlan.addTranslatedFilter(nonLeading.getClear(), keyOrder, "payload", "=[7]");
    assert(contiguousPlan.numKeyedFilters() == 0);
    assert(contiguousPlan.numPostFilters() == 1);
    Owned<IFieldFilter> leading = engine.deserializeFilter(0, integerType, "=[7]");
    contiguousPlan.addTranslatedFilter(leading.getClear(), keyOrder, "id", "=[7]");
    Owned<IFieldFilter> nowLeading = engine.deserializeFilter(3, integerType, "=[7]");
    contiguousPlan.addTranslatedFilter(nowLeading.getClear(), keyOrder, "payload", "=[7]");
    assert(contiguousPlan.numKeyedFilters() == 2);
    plan.addKeyedFilter(filter.getClear(), "id", "=[7,12]");
    assert(plan.queryKeyedFilters().ordinality() == 1);
    assert(plan.queryKeyedFilters().item(0).queryFieldIndex() == 3);
    assert(plan.numKeyedFilters() == 2);

    // Malformed compile requests must be rejected before parsing ECL, touching Dali or creating a helper workunit.
    auto compiledLayoutError = [](const char* logicalName, const char* recordEcl, const char* cluster, unsigned timeoutMs)
    {
        try
        {
            Owned<IFvCompiledDiskLayout> layout = createCompiledDiskLayout(logicalName, recordEcl,
                cluster, "user", "secret", timeoutMs);
        }
        catch (IException* exception)
        {
            const int code = exception->errorCode();
            StringBuffer message;
            exception->errorMessage(message);
            exception->Release();
            assert(!strstr(message.str(), "secret"));
            return code;
        }
        return 0;
    };
    const char* validName = "regress::single::dg_var";
    const char* tinyEcl = "RECORD unsigned4 id; END;";
    std::string oversizedEcl(0x100001, ' ');
    assert(compiledLayoutError(nullptr, tinyEcl, "hthor", 1000) == FVERR_CouldNotResolveX);
    assert(compiledLayoutError("", tinyEcl, "hthor", 1000) == FVERR_CouldNotResolveX);
    assert(compiledLayoutError("regress::::dg_var", tinyEcl, "hthor", 1000) == FVERR_CouldNotResolveX);
    assert(compiledLayoutError("file::127.0.0.1::tmp::dg_var", tinyEcl, "hthor", 1000) == FVERR_CouldNotResolveX);
    assert(compiledLayoutError(validName, "", "hthor", 1000) == FVERR_NoRecordDescription);
    assert(compiledLayoutError(validName, nullptr, "hthor", 1000) == FVERR_NoRecordDescription);
    assert(compiledLayoutError(validName, oversizedEcl.c_str(), "hthor", 1000) == FVERR_BadRecordDesc);
    assert(compiledLayoutError(validName, tinyEcl, "hthor", 0) == FVERR_CompileLayoutFailed);
    assert(compiledLayoutError(validName, tinyEcl, "hthor", 10 * 60 * 1000 + 1) == FVERR_CompileLayoutFailed);
    assert(compiledLayoutError(validName, tinyEcl, "hthor'] | //*[@name='x", 1000) == FVERR_CompileLayoutFailed);
    assert(compiledLayoutError(validName, tinyEcl, "thor 1", 1000) == FVERR_CompileLayoutFailed);

    // Concurrent rejected requests must stay thread safe and never populate the shared layout cache.
    std::atomic<unsigned> unexpectedRejections{0};
    std::vector<std::thread> rejectionThreads;
    for (unsigned thread = 0; thread < 8; thread++)
    {
        rejectionThreads.emplace_back([&, thread]()
        {
            for (unsigned i = 0; i < 200; i++)
            {
                const bool badTimeout = ((i + thread) % 2) == 0;
                const int expected = badTimeout ? FVERR_CompileLayoutFailed : FVERR_NoRecordDescription;
                if (compiledLayoutError(validName, badTimeout ? tinyEcl : "", "hthor", badTimeout ? 0 : 1000) != expected)
                    unexpectedRejections++;
                if ((i % 50) == 0)
                    clearCompiledDiskLayoutCache();
            }
        });
    }
    for (auto& rejectionThread : rejectionThreads)
        rejectionThread.join();
    assert(unexpectedRejections == 0);
    assert(clearCompiledDiskLayoutCache() == 0);

    runWsSql2TypeMappingTests();
    return 0;
}