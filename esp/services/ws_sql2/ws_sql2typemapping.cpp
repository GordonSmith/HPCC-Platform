#include "ws_sql2typemapping.hpp"

#include <algorithm>
#include <cctype>
#include <functional>
#include <sstream>
#include <unordered_set>

static std::string appendFieldPath(const char* prefix, const char* name)
{
    std::string path = prefix ? prefix : "";
    if (!path.empty())
        path.append(".");
    path.append(name ? name : "field");
    return path;
}

static std::string makeUniqueFieldPath(const std::string& proposedPath, const std::vector<CWsSql2FieldDescriptor>& fields)
{
    auto pathExists = [&fields](const std::string& path)
    {
        return std::any_of(fields.begin(), fields.end(), [&path](const CWsSql2FieldDescriptor& field)
        {
            return field.fieldPath == path;
        });
    };

    if (!pathExists(proposedPath))
        return proposedPath;

    for (unsigned suffix = 2; ; ++suffix)
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
    {
        return static_cast<char>(std::toupper(value));
    });
    return normalized;
}

static std::string typeDescription(ITypeInfo* sourceType)
{
    StringBuffer description;
    if (sourceType)
        sourceType->getDescriptiveType(description);
    return description.str();
}

static size_t findKeywordInsensitive(const std::string& text, const char* keyword, size_t start)
{
    const std::string normalizedText = normalizeType(text.c_str());
    return normalizedText.find(normalizeType(keyword), start);
}

CWsSql2FieldDescriptor CWsSql2TypeMapper::mapField(const char* fieldPath, const char* sourceType, std::vector<CWsSql2Warning>& warnings) const
{
    CWsSql2FieldDescriptor descriptor;
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
    else if (normalizedType == "INTEGER" || normalizedType == "UNSIGNED INTEGER" || normalizedType == "BIGINT" || normalizedType == "UNSIGNED BIGINT" || normalizedType == "INTEGER1" || normalizedType == "INTEGER2" || normalizedType == "INTEGER4" || normalizedType == "INTEGER8" || normalizedType == "UNSIGNED1" || normalizedType == "UNSIGNED2" || normalizedType == "UNSIGNED4" || normalizedType == "UNSIGNED8")
        descriptor.duckdbType = "BIGINT";
    else if (normalizedType == "REAL" || normalizedType == "REAL8" || normalizedType == "DOUBLE")
        descriptor.duckdbType = "DOUBLE";
    else if (normalizedType.rfind("STRING", 0) == 0 || normalizedType.rfind("VARSTRING", 0) == 0
        || normalizedType.rfind("UNICODE", 0) == 0 || normalizedType.rfind("VARUNICODE", 0) == 0
        || normalizedType.rfind("UTF8", 0) == 0)
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
        warnings.push_back({"UNSUPPORTED_FIELD_TYPE", descriptor.fieldPath, "Unsupported HPCC field type mapped to JSON"});
    }
    return descriptor;
}

CWsSql2FieldDescriptor CWsSql2TypeMapper::mapField(const char* fieldPath, ITypeInfo* sourceType, std::vector<CWsSql2Warning>& warnings) const
{
    CWsSql2FieldDescriptor descriptor;
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

void CWsSql2TypeMapper::mapRecord(const IDefRecordElement* record, const char* prefix, std::vector<CWsSql2FieldDescriptor>& fields, std::vector<CWsSql2Warning>& warnings) const
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
        if (childType && (childType->getTypeCode() == type_record || childType->getTypeCode() == type_set || childType->getTypeCode() == type_table
            || childType->getTypeCode() == type_groupedtable || childType->getTypeCode() == type_row
            || childType->getTypeCode() == type_dictionary))
        {
            const std::string uniqueFieldPath = makeUniqueFieldPath(fieldPath, fields);
            CWsSql2FieldDescriptor descriptor = mapField(uniqueFieldPath.c_str(), childType, warnings);
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

void CWsSql2TypeMapper::mapEclRecordDefinition(const char* definition, std::vector<CWsSql2FieldDescriptor>& fields, std::vector<CWsSql2Warning>& warnings) const
{
    if (isEmptyString(definition))
        return;

    std::string text(definition);
    size_t recordStart = findKeywordInsensitive(text, "RECORD", 0);
    for (;;)
    {
        const size_t nextRecord = findKeywordInsensitive(text, "RECORD", recordStart == std::string::npos ? 0 : recordStart + 6);
        if (nextRecord == std::string::npos)
            break;
        recordStart = nextRecord;
    }
    const size_t recordEnd = findKeywordInsensitive(text, "END", recordStart == std::string::npos ? 0 : recordStart + 6);
    if (recordStart == std::string::npos || recordEnd == std::string::npos || recordEnd <= recordStart)
        return;

    std::function<void(const std::string&, const char*, std::vector<CWsSql2FieldDescriptor>&, std::unordered_set<std::string>&)> parseBody;
    parseBody = [&](const std::string& body, const char* prefix, std::vector<CWsSql2FieldDescriptor>& target,
        std::unordered_set<std::string>& activeAliases)
    {
        size_t start = 0;
        while (start < body.size())
        {
            const size_t end = body.find(';', start);
            const std::string declaration = body.substr(start, end == std::string::npos ? std::string::npos : end - start);
            std::istringstream tokens(declaration);
            std::string sourceType;
            std::string fieldName;
            tokens >> sourceType;
            const std::string normalizedSourceType = normalizeType(sourceType.c_str());
            std::string alias;
            if (normalizedSourceType.rfind("DATASET(", 0) == 0)
            {
                const size_t close = sourceType.find(')');
                alias = close == std::string::npos ? "" : sourceType.substr(8, close - 8);
                sourceType = "LIST OF " + alias;
                tokens >> fieldName;
            }
            else if (normalizedSourceType == "SET" || normalizedSourceType == "LIST"
                || normalizedSourceType == "DICTIONARY" || normalizedSourceType == "MAP"
                || normalizedSourceType == "ROW" || normalizedSourceType == "STRUCT")
            {
                std::string of;
                std::string itemType;
                tokens >> of >> itemType >> fieldName;
                if (normalizeType(of.c_str()) == "OF")
                {
                    sourceType.append(" of ").append(itemType);
                    alias = itemType;
                }
            }
            else
                tokens >> fieldName;
            const size_t attributeStart = fieldName.find('{');
            if (attributeStart != std::string::npos)
                fieldName.resize(attributeStart);
            if (!sourceType.empty() && !fieldName.empty())
            {
                const std::string path = appendFieldPath(prefix, fieldName.c_str());
                const std::string uniquePath = makeUniqueFieldPath(path, target);
                CWsSql2FieldDescriptor descriptor = mapField(uniquePath.c_str(), sourceType.c_str(), warnings);
                if (!alias.empty() && activeAliases.insert(normalizeType(alias.c_str())).second)
                {
                    const std::string aliasDeclaration = alias + " := RECORD";
                    const size_t aliasRecord = findKeywordInsensitive(text, aliasDeclaration.c_str(), 0);
                    const size_t aliasEnd = aliasRecord == std::string::npos ? std::string::npos
                        : findKeywordInsensitive(text, "END", aliasRecord + aliasDeclaration.size());
                    if (aliasRecord != std::string::npos && aliasEnd != std::string::npos)
                        parseBody(text.substr(aliasRecord + aliasDeclaration.size(), aliasEnd - aliasRecord - aliasDeclaration.size()), descriptor.fieldPath.c_str(),
                            descriptor.children, activeAliases);
                    activeAliases.erase(normalizeType(alias.c_str()));
                }
                target.push_back(std::move(descriptor));
            }
            if (end == std::string::npos)
                break;
            start = end + 1;
        }
    };
    std::unordered_set<std::string> activeAliases;
    parseBody(text.substr(recordStart + 6, recordEnd - (recordStart + 6)), nullptr, fields, activeAliases);
}