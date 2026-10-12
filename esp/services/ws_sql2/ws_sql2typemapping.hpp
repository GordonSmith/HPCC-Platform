#ifndef _ESP_WS_SQL2_TYPE_MAPPING_HPP_
#define _ESP_WS_SQL2_TYPE_MAPPING_HPP_

#include <string>
#include <vector>

#include "deffield.hpp"

struct CWsSql2Warning
{
    std::string code;
    std::string fieldPath;
    std::string message;
};

struct CWsSql2FieldDescriptor
{
    std::string fieldPath;
    std::string sourceType;
    std::string duckdbType;
    bool fallback = false;
    std::vector<CWsSql2FieldDescriptor> children;
};

class CWsSql2TypeMapper
{
public:
    CWsSql2FieldDescriptor mapField(const char* fieldPath, const char* sourceType, std::vector<CWsSql2Warning>& warnings) const;
    CWsSql2FieldDescriptor mapField(const char* fieldPath, ITypeInfo* sourceType, std::vector<CWsSql2Warning>& warnings) const;
    void mapRecord(const IDefRecordElement* record, const char* prefix, std::vector<CWsSql2FieldDescriptor>& fields, std::vector<CWsSql2Warning>& warnings) const;
    void mapEclRecordDefinition(const char* definition, std::vector<CWsSql2FieldDescriptor>& fields, std::vector<CWsSql2Warning>& warnings) const;
};

#endif