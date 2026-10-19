#include "typemapping.hpp"

#ifdef _USE_CPPUNIT
#include "unittests.hpp"

#include <string>
#include <vector>
#endif

#include <algorithm>
#include <cctype>
#include <cstring>

namespace duckdb::hpcc
{

static std::string appendFieldPath(const char* prefix, const char* name)
{
    std::string path = prefix ? prefix : "";
    if (!path.empty())
        path.append(".");
    path.append(name ? name : "field");
    return path;
}

static std::string makeUniqueFieldPath(const std::string& proposedPath, const std::vector<FieldDescriptor>& fields)
{
    auto pathExists = [&fields](const std::string& path)
        {
            return std::any_of(fields.begin(), fields.end(), [&path](const FieldDescriptor& field)
                { return field.fieldPath == path; });
        };

    if (!pathExists(proposedPath))
        return proposedPath;

    for (unsigned suffix = 2;; ++suffix)
    {
        std::string candidate = proposedPath;
        candidate.append("_").append(std::to_string(suffix));
        if (!pathExists(candidate))
            return candidate;
    }
}

static std::string normalizeType(const char* sourceType)
{
    std::string normalized = sourceType ? sourceType : "";
    std::transform(normalized.begin(), normalized.end(), normalized.begin(), [](unsigned char value)
        { return static_cast<char>(std::toupper(value)); });
    return normalized;
}

static std::string typeDescription(ITypeInfo* sourceType)
{
    StringBuffer description;
    if (sourceType)
        sourceType->getDescriptiveType(description);
    return description.str();
}

// Matches prefix followed by a single size digit between 1 and maxSize, e.g. INTEGER3 or UNSIGNED7.
static bool isSizedIntegerType(const std::string& normalizedType, const char* prefix, char maxSize)
{
    const size_t prefixLength = strlen(prefix);
    if (normalizedType.size() != prefixLength + 1 || normalizedType.compare(0, prefixLength, prefix) != 0)
        return false;
    const char size = normalizedType[prefixLength];
    return size >= '1' && size <= ('0' + maxSize);
}

FieldDescriptor TypeMapper::mapField(const char* fieldPath, const char* sourceType, std::vector<Warning>& warnings) const
{
    FieldDescriptor descriptor;
    descriptor.fieldPath = fieldPath ? fieldPath : "";
    descriptor.sourceType = sourceType ? sourceType : "";

    const std::string normalizedType = normalizeType(sourceType);
    if (normalizedType.rfind("SET OF", 0) == 0 || normalizedType.rfind("LIST OF", 0) == 0)
        descriptor.duckdbType = "LIST";
    else if (normalizedType.rfind("DICTIONARY OF", 0) == 0 || normalizedType.rfind("MAP OF", 0) == 0)
        descriptor.duckdbType = "MAP";
    else if (normalizedType.rfind("ROW OF", 0) == 0 || normalizedType.rfind("STRUCT OF", 0) == 0)
        descriptor.duckdbType = "STRUCT";
    else if (normalizedType == "BOOLEAN")
        descriptor.duckdbType = "BOOLEAN";
    else if (normalizedType == "UNSIGNED" || normalizedType == "UNSIGNED INTEGER" || normalizedType == "UNSIGNED BIGINT" || normalizedType == "UNSIGNED8" || normalizedType == "UNSIGNED INTEGER8")
        descriptor.duckdbType = "UBIGINT"; // Unsigned 64-bit values can exceed BIGINT.
    else if (normalizedType == "INTEGER" || normalizedType == "BIGINT" || isSizedIntegerType(normalizedType, "INTEGER", 8) || isSizedIntegerType(normalizedType, "UNSIGNED", 7))
        descriptor.duckdbType = "BIGINT";
    else if (normalizedType == "REAL" || normalizedType == "REAL4" || normalizedType == "REAL8" || normalizedType == "DOUBLE")
        descriptor.duckdbType = "DOUBLE";
    else if (normalizedType.rfind("STRING", 0) == 0 || normalizedType.rfind("VARSTRING", 0) == 0 || normalizedType.rfind("UNICODE", 0) == 0 || normalizedType.rfind("VARUNICODE", 0) == 0 || normalizedType.rfind("UTF8", 0) == 0)
        descriptor.duckdbType = "VARCHAR";
    else if (normalizedType.rfind("DATA", 0) == 0 || normalizedType.rfind("BLOB", 0) == 0)
        descriptor.duckdbType = "BLOB";
    else if (normalizedType == "DATE")
        descriptor.duckdbType = "DATE";
    else if (normalizedType == "TIME")
        descriptor.duckdbType = "TIME";
    else if (normalizedType == "DATETIME" || normalizedType == "TIMESTAMP")
        descriptor.duckdbType = "TIMESTAMP";
    else if (normalizedType.find("DECIMAL") == 0 || normalizedType.find("UDECIMAL") == 0)
        descriptor.duckdbType = "DECIMAL";
    else
    {
        descriptor.duckdbType = "JSON";
        descriptor.fallback = true;
        warnings.push_back({ "UNSUPPORTED_FIELD_TYPE", descriptor.fieldPath, "Unsupported HPCC field type mapped to JSON" });
    }
    return descriptor;
}

FieldDescriptor TypeMapper::mapField(const char* fieldPath, ITypeInfo* sourceType, std::vector<Warning>& warnings) const
{
    FieldDescriptor descriptor;
    descriptor.fieldPath = fieldPath ? fieldPath : "";

    if (!sourceType)
        return mapField(fieldPath, "", warnings);

    switch (sourceType->getTypeCode())
    {
    case type_record:
        descriptor.duckdbType = "STRUCT";
        descriptor.sourceType = sourceType->queryTypeName();
        break;
    case type_set:
    case type_table:
    case type_groupedtable:
        descriptor.duckdbType = "LIST";
        descriptor.sourceType = sourceType->queryTypeName();
        break;
    case type_row:
        descriptor.duckdbType = "STRUCT";
        descriptor.sourceType = sourceType->queryTypeName();
        break;
    case type_dictionary:
        descriptor.duckdbType = "MAP";
        descriptor.sourceType = sourceType->queryTypeName();
        break;
    default:
        descriptor.sourceType = typeDescription(sourceType);
        return mapField(fieldPath, descriptor.sourceType.c_str(), warnings);
    }
    return descriptor;
}

void TypeMapper::mapRecord(const IDefRecordElement* record, const char* prefix, std::vector<FieldDescriptor>& fields, std::vector<Warning>& warnings) const
{
    if (!record)
        return;

    for (unsigned index = 0; index < record->numChildren(); ++index)
    {
        const IDefRecordElement* child = record->queryChild(index);
        if (!child)
            continue;

        const char* fieldName = child->queryName() ? str(child->queryName()) : nullptr;
        const std::string fieldPath = appendFieldPath(prefix, fieldName);
        ITypeInfo* childType = child->queryType();
        if (childType && (childType->getTypeCode() == type_record || childType->getTypeCode() == type_set || childType->getTypeCode() == type_table || childType->getTypeCode() == type_groupedtable || childType->getTypeCode() == type_row || childType->getTypeCode() == type_dictionary))
        {
            const std::string uniqueFieldPath = makeUniqueFieldPath(fieldPath, fields);
            FieldDescriptor descriptor = mapField(uniqueFieldPath.c_str(), childType, warnings);
            mapRecord(child, uniqueFieldPath.c_str(), descriptor.children, warnings);
            fields.push_back(std::move(descriptor));
            continue;
        }
        if (child->numChildren() > 0)
        {
            mapRecord(child, fieldPath.c_str(), fields, warnings);
            continue;
        }

        const std::string uniqueFieldPath = makeUniqueFieldPath(fieldPath, fields);
        fields.push_back(mapField(uniqueFieldPath.c_str(), child->queryType(), warnings));
    }
}

#ifdef _USE_CPPUNIT
class WsSql2TypeMappingTests : public CppUnit::TestFixture
{
    CPPUNIT_TEST_SUITE(WsSql2TypeMappingTests);
    CPPUNIT_TEST(testFieldTypeMapping);
    CPPUNIT_TEST(testCommonFieldTypes);
    CPPUNIT_TEST_SUITE_END();

public:
    void testFieldTypeMapping()
    {
        TypeMapper mapper;
        std::vector<Warning> warnings;

        const FieldDescriptor integerField = mapper.mapField("id", "INTEGER", warnings);
        CPPUNIT_ASSERT_EQUAL(std::string("BIGINT"), integerField.duckdbType);
        CPPUNIT_ASSERT(!integerField.fallback);
        CPPUNIT_ASSERT(warnings.empty());
        CPPUNIT_ASSERT_EQUAL(std::string("UBIGINT"), mapper.mapField("big", "unsigned8", warnings).duckdbType);
        CPPUNIT_ASSERT_EQUAL(std::string("BIGINT"), mapper.mapField("small", "unsigned4", warnings).duckdbType);
        CPPUNIT_ASSERT_EQUAL(std::string("BIGINT"), mapper.mapField("odd", "integer3", warnings).duckdbType);
        CPPUNIT_ASSERT_EQUAL(std::string("BIGINT"), mapper.mapField("odd", "unsigned7", warnings).duckdbType);
        CPPUNIT_ASSERT_EQUAL(std::string("DOUBLE"), mapper.mapField("single", "real4", warnings).duckdbType);
        CPPUNIT_ASSERT(warnings.empty());

        const FieldDescriptor unsupportedField = mapper.mapField("payload", "CUSTOM", warnings);
        CPPUNIT_ASSERT_EQUAL(std::string("JSON"), unsupportedField.duckdbType);
        CPPUNIT_ASSERT(unsupportedField.fallback);
        CPPUNIT_ASSERT_EQUAL(size_t{ 1 }, warnings.size());
        CPPUNIT_ASSERT_EQUAL(std::string("UNSUPPORTED_FIELD_TYPE"), warnings.front().code);
        CPPUNIT_ASSERT_EQUAL(std::string("payload"), warnings.front().fieldPath);
    }

    void testCommonFieldTypes()
    {
        TypeMapper mapper;
        std::vector<Warning> warnings;

        CPPUNIT_ASSERT_EQUAL(std::string("DATE"), mapper.mapField("birthDate", "DATE", warnings).duckdbType);
        CPPUNIT_ASSERT_EQUAL(std::string("TIME"), mapper.mapField("startTime", "TIME", warnings).duckdbType);
        CPPUNIT_ASSERT_EQUAL(std::string("TIMESTAMP"), mapper.mapField("created", "DATETIME", warnings).duckdbType);
        CPPUNIT_ASSERT_EQUAL(std::string("VARCHAR"), mapper.mapField("firstName", "STRING10", warnings).duckdbType);
        CPPUNIT_ASSERT_EQUAL(std::string("BLOB"), mapper.mapField("payload", "DATA64", warnings).duckdbType);
    }
};

CPPUNIT_TEST_SUITE_REGISTRATION(WsSql2TypeMappingTests);
#endif // _USE_CPPUNIT

}