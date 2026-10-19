#ifndef _ESP_DUCKDB_HPCC_TYPE_MAPPING_HPP_
#define _ESP_DUCKDB_HPCC_TYPE_MAPPING_HPP_

#include <string>
#include <vector>

#include "deffield.hpp"

namespace duckdb
{
namespace hpcc
{

struct Warning
{
    std::string code;
    std::string fieldPath;
    std::string message;
};

struct FieldDescriptor
{
    std::string fieldPath;
    std::string sourceType;
    std::string duckdbType;
    bool fallback = false;
    std::vector<FieldDescriptor> children;
};

class TypeMapper
{
public:
    FieldDescriptor mapField(const char* fieldPath, const char* sourceType, std::vector<Warning>& warnings) const;
    FieldDescriptor mapField(const char* fieldPath, ITypeInfo* sourceType, std::vector<Warning>& warnings) const;
    void mapRecord(const IDefRecordElement* record, const char* prefix, std::vector<FieldDescriptor>& fields, std::vector<Warning>& warnings) const;
    void mapEclRecordDefinition(const char* definition, std::vector<FieldDescriptor>& fields, std::vector<Warning>& warnings) const;
};

} // namespace hpcc
} // namespace duckdb

#endif