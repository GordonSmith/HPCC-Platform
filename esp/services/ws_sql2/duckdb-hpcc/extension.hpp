#ifndef _ESP_DUCKDB_HPCC_EXTENSION_HPP_
#define _ESP_DUCKDB_HPCC_EXTENSION_HPP_

#include "duckdb/main/extension.hpp"
#include "duckdb/main/client_context_state.hpp"
#include "duckdb/function/table_function.hpp"

#include <cstdint>
#include <optional>
#include <string>
#ifdef _DEBUG
#include <atomic>
#include <memory>
#endif
namespace duckdb
{
namespace hpcc
{

#ifdef _DEBUG
enum class ScanObjectKind : unsigned
{
    BindData,
    GlobalState,
    LocalState,
    Max
};

// Debug builds only: created and live counts of the hpcc_scan objects (bind data and global/local scan states) that
// the scans bound through one connection create. A host that keeps a reference can confirm, after the connection is
// destroyed, that every object was destroyed with it.
struct ScanObjectCounters
{
    std::atomic<uint64_t> created[static_cast<unsigned>(ScanObjectKind::Max)] {};
    std::atomic<uint64_t> live[static_cast<unsigned>(ScanObjectKind::Max)] {};
};
#endif

struct ScanMetadata
{
    std::string recordDefinition;
    std::string parts;
    std::string options;
    std::optional<uint64_t> recordCount;
};

// Registered per connection by the host. hpcc_scan(logicalName) resolves logical files through
// resolveScanMetadata(), which must enforce the requesting user's file permissions.
// hpcc_scan(record, parts, options) opens caller-supplied physical paths without any authorization. The host
// decides whether it is available through allowsLongFormScan(); it is always available when no provider is
// registered. WsSQL2 disables it unless the service setting allowLongFormScan is true.
class ScanMetadataProvider : public duckdb::ClientContextState
{
public:
    static constexpr const char* stateKey = "ws_sql2.scan_metadata_provider";
    virtual void resolveScanMetadata(const std::string& logicalName, ScanMetadata& metadata) = 0;
    virtual bool allowsLongFormScan() const = 0;
#ifdef _DEBUG
    // Set by the host to count the scan objects created through this connection; scans are not counted when null.
    std::shared_ptr<ScanObjectCounters> scanObjectCounters;
#endif
};

class Extension : public duckdb::Extension
{
public:
    void Load(duckdb::ExtensionLoader& loader) override;
    std::string Name() override;
    std::string Version() const override;
};

} // namespace hpcc
} // namespace duckdb

#endif
