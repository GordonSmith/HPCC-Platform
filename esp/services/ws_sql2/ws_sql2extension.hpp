#ifndef _ESP_WS_SQL2_EXTENSION_HPP_
#define _ESP_WS_SQL2_EXTENSION_HPP_

#include "duckdb/main/extension.hpp"
#include "duckdb/main/client_context_state.hpp"
#include "duckdb/function/table_function.hpp"

#include "daclient.hpp"

class CWsSql2AccessContext : public duckdb::ClientContextState
{
    Linked<IUserDescriptor> user;

public:
    explicit CWsSql2AccessContext(IUserDescriptor* requestUser)
    {
        user.set(requestUser);
    }

    IUserDescriptor* queryUser() const
    {
        return user.get();
    }
};

class CWsSql2Extension : public duckdb::Extension
{
public:
    void Load(duckdb::ExtensionLoader& loader) override;
    std::string Name() override;
    std::string Version() const override;
};

#endif
