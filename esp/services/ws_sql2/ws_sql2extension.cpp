#include "ws_sql2extension.hpp"

#include "ws_sql2metadata.hpp"

#include "duckdb/main/extension/extension_loader.hpp"

namespace
{
class CHpccScanBindData : public duckdb::TableFunctionData
{
public:
    CHpccScanBindData(std::string _logicalName, IDistributedFile* _file)
        : logicalName(std::move(_logicalName)), file(_file)
    {
    }

    std::string logicalName;
    Owned<IDistributedFile> file;
};

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
        returnTypes.push_back(duckdb::LogicalType::VARCHAR);
        names.emplace_back("value");
        return duckdb::make_uniq<CHpccScanBindData>(logicalName, file.getClear());
    }
    catch (IException* exception)
    {
        StringBuffer message;
        exception->errorMessage(message);
        exception->Release();
        throw duckdb::BinderException(message.str());
    }

}

void executeHpccScan(duckdb::ClientContext&, duckdb::TableFunctionInput&, duckdb::DataChunk& output)
{
    output.SetCardinality(0);
}
}

void CWsSql2Extension::Load(duckdb::ExtensionLoader& loader)
{
    loader.SetDescription("HPCC logical-file scan extension");
    loader.RegisterFunction(duckdb::TableFunction("hpcc_scan", {duckdb::LogicalType::VARCHAR}, executeHpccScan, bindHpccScan));
}

std::string CWsSql2Extension::Name()
{
    return "hpcc_scan";
}

std::string CWsSql2Extension::Version() const
{
    return "0.1.0";
}
