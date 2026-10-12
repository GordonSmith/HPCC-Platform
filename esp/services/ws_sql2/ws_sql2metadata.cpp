#include "ws_sql2metadata.hpp"

#include "fileview.hpp"
#include "dasess.hpp"
#include "jlib.hpp"
#include "seclib.hpp"

bool CWsSql2MetadataResolver::isValidLogicalName(const char* logicalName)
{
    if (isEmptyString(logicalName) || logicalName[0] == ':' || logicalName[strlen(logicalName) - 1] == ':')
        return false;

    const char* scopeSeparator = strstr(logicalName, "::");
    if (!scopeSeparator || scopeSeparator == logicalName || !scopeSeparator[2] || scopeSeparator[2] == ':')
        return false;

    for (const char* current = logicalName; *current; ++current)
    {
        if (isspace(static_cast<unsigned char>(*current)))
            return false;
        if (*current == ':')
        {
            if (current[1] != ':')
                return false;
            ++current;
        }
    }
    return true;
}

Owned<IDistributedFile> CWsSql2MetadataResolver::resolveLogicalFile(const char* logicalName, IUserDescriptor* user)
{
    if (!isValidLogicalName(logicalName))
        throw makeStringException(-1, "A valid scoped logical file name is required");

    Owned<IDistributedFile> file = queryDistributedFileDirectory().lookup(
        logicalName, user, AccessMode::readRandom, false, false, nullptr, defaultNonPrivilegedUser);
    if (!file)
        throw makeStringExceptionV(-1, "Unable to resolve logical file '%s'", logicalName);
    return file;
}