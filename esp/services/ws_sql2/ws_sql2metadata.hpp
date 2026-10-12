#ifndef _ESP_WS_SQL2_METADATA_HPP_
#define _ESP_WS_SQL2_METADATA_HPP_

#include "daclient.hpp"
#include "dadfs.hpp"
#include "fileview.hpp"

class CWsSql2MetadataResolver
{
public:
    static bool isValidLogicalName(const char* logicalName);
    static Owned<IDistributedFile> resolveLogicalFile(const char* logicalName, IUserDescriptor* user);
};

#endif