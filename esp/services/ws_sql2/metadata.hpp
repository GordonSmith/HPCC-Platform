#ifndef _ESP_WS_SQL2_METADATA_HPP_
#define _ESP_WS_SQL2_METADATA_HPP_

#include "daclient.hpp"
#include "dadfs.hpp"
#include "fileview.hpp"
#include "rtldynfield.hpp"

#include <cstdint>
#include <optional>
#include <string>

IOutputMetaData* createWsSql2OutputMetaDataFromEcl(const char* ecl, const char* kind, bool grouped);

struct CScanDescriptor
{
    std::string logicalName;
    std::string parts;
    std::string options;
    std::string sqlSchema;
    std::string eclRecordDefinition;
    std::string sampleSql;
    std::optional<uint64_t> recordCount;
};

class CMetadataResolver
{
public:
    static bool isValidLogicalName(const char* logicalName);
    static Owned<IDistributedFile> resolveLogicalFile(const char* logicalName, IUserDescriptor* user);
    static void buildScanDescriptor(IDistributedFile& file, CScanDescriptor& descriptor, bool includePhysicalPaths, const char* recordDefinitionOverride);
};

#endif