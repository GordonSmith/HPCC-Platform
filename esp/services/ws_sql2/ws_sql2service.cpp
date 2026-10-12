#include "ws_sql2service.hpp"

void Cwssql2Ex::init(IPropertyTree* cfg, const char* process, const char* service)
{
    Cwssql2::init(cfg, process, service);
}

bool Cwssql2Ex::onDescribeFile(IEspContext& context, IEspDescribeFileRequest& req, IEspDescribeFileResponse& resp)
{
    return false;
}

bool Cwssql2Ex::onExecuteSQL(IEspContext& context, IEspExecuteSQLRequest& req, IEspExecuteSQLResponse& resp)
{
    return false;
}

bool Cwssql2Ex::onExplainScan(IEspContext& context, IEspExplainScanRequest& req, IEspExplainScanResponse& resp)
{
    return false;
}

bool Cwssql2Ex::onListFiles(IEspContext& context, IEspListFilesRequest& req, IEspListFilesResponse& resp)
{
    return false;
}