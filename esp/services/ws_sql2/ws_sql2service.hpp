#ifndef _ESP_WS_SQL2_SERVICE_HPP_
#define _ESP_WS_SQL2_SERVICE_HPP_

#include "ws_sql2_esp.ipp"

class Cwssql2Ex : public Cwssql2
{
public:
    IMPLEMENT_IINTERFACE;

    ~Cwssql2Ex();
    void init(IPropertyTree* cfg, const char* process, const char* service) override;
    bool onDescribeFile(IEspContext& context, IEspDescribeFileRequest& req, IEspDescribeFileResponse& resp);
    bool onExecuteSQL(IEspContext& context, IEspExecuteSQLRequest& req, IEspExecuteSQLResponse& resp);
    bool onExplainScan(IEspContext& context, IEspExplainScanRequest& req, IEspExplainScanResponse& resp);
    bool onDebugDev(IEspContext& context, IEspDebugDevRequest& req, IEspDebugDevResponse& resp);
    bool onListFiles(IEspContext& context, IEspListFilesRequest& req, IEspListFilesResponse& resp);
};

class Cwssql2SoapBindingEx : public Cwssql2SoapBinding
{
public:
    Cwssql2SoapBindingEx(http_soap_log_level level = hsl_none) : Cwssql2SoapBinding(level) { }
    Cwssql2SoapBindingEx(IPropertyTree* cfg, const char* bindName, const char* procName, http_soap_log_level level = hsl_none)
        : Cwssql2SoapBinding(cfg, bindName, procName, level) { }
};

#endif