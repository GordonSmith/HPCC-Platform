#include "metadata.hpp"

#include "fileview.hpp"
#include "dasess.hpp"
#include "jlib.hpp"
#include "jptree.hpp"
#include "rtldynfield.hpp"
#include "seclib.hpp"
#include "thorcommon.hpp"
#include "thorread.hpp"

#include "duckdb-hpcc/typemapping.hpp"

#ifdef _USE_CPPUNIT
#include "unittests.hpp"
#endif

using namespace duckdb::hpcc;

#include <algorithm>
#include <cctype>
#include <map>
#include <regex>

IOutputMetaData* createWsSql2OutputMetaDataFromEcl(const char* ecl, const char* kind, bool grouped)
{
    if (isEmptyString(ecl))
        return nullptr;
    Owned<IPropertyTree> attributes = createPTree("Attr");
    attributes->setProp("ECL", ecl);
    if (!isEmptyString(kind))
        attributes->setProp("@kind", kind);
    attributes->setPropBool("@grouped", grouped);
    return getDaliLayoutInfo(*attributes);
}

static void appendSqlSchemaField(StringBuffer& schema, const FieldDescriptor& field, bool& first)
{
    if (!first)
        schema.append(", ");
    first = false;
    schema.append('"').append(field.fieldPath.c_str()).append("\" ").append(field.duckdbType.c_str());
}

static FieldDescriptor mapRuntimeField(const RtlFieldInfo& field, const char* prefix)
{
    FieldDescriptor descriptor;
    descriptor.fieldPath = prefix ? std::string(prefix) + "." + (field.name ? field.name : "field") : (field.name ? field.name : "field");
    const RtlTypeInfo& type = *field.type;
    switch (type.getType())
    {
    case type_record:
    case type_row:
        descriptor.duckdbType = "STRUCT";
        break;
    case type_set:
    case type_table:
    case type_groupedtable:
        descriptor.duckdbType = "LIST";
        break;
    case type_boolean:
        descriptor.duckdbType = "BOOLEAN";
        break;
    case type_int:
    case type_swapint:
    case type_packedint:
    case type_filepos:
    case type_keyedint:
    {
        const RtlTypeInfo* valueType = (type.getType() == type_keyedint && type.queryChildType()) ? type.queryChildType() : &type;
        // Unsigned 64-bit values above INT64_MAX do not fit in BIGINT.
        descriptor.duckdbType = (valueType->isUnsigned() && valueType->length == sizeof(unsigned __int64)) ? "UBIGINT" : "BIGINT";
        break;
    }
    case type_real:
        descriptor.duckdbType = "DOUBLE";
        break;
    case type_data:
    case type_blob:
        descriptor.duckdbType = "BLOB";
        break;
    case type_decimal:
        descriptor.duckdbType = "DECIMAL";
        descriptor.sourceType = "DECIMAL" + std::to_string(type.getDecimalDigits()) + "_" + std::to_string(type.getDecimalPrecision());
        break;
    default:
        descriptor.duckdbType = "VARCHAR";
        descriptor.fallback = true;
        break;
    }
    const RtlTypeInfo* childType = type.queryChildType();
    const RtlFieldInfo* const* childFields = childType ? childType->queryFields() : nullptr;
    if (childFields)
        for (unsigned index = 0; childFields[index]; ++index)
            descriptor.children.push_back(mapRuntimeField(*childFields[index], descriptor.fieldPath.c_str()));
    return descriptor;
}

static void appendSqlLiteral(StringBuffer& output, const std::string& value)
{
    output.append('\'');
    for (char character : value)
    {
        if (character == '\'')
            output.append("''");
        else
            output.append(character);
    }
    output.append('\'');
}

static void setPartCrc(IPropertyTree& partTree, bool hasCrc, unsigned crc)
{
    if (hasCrc)
        partTree.setPropInt64("@crc", static_cast<__int64>(crc));
}

static std::optional<uint64_t> queryKnownRecordCount(const IPropertyTree& attributes)
{
    if (!attributes.hasProp("@recordCount"))
        return std::nullopt;
    const int64_t recordCount = attributes.getPropInt64("@recordCount", -1);
    if (recordCount < 0)
        return std::nullopt;
    return static_cast<uint64_t>(recordCount);
}

static std::string serializeParts(IDistributedFile& file, bool includePhysicalPaths)
{
    Owned<IPropertyTree> root = createPTree("parts");
    for (unsigned partIndex = 0; partIndex < file.numParts(); ++partIndex)
    {
        Owned<IDistributedFilePart> part = file.getPart(partIndex);
        IPropertyTree* partTree = root->addPropTree("part", createPTree("part"));
        partTree->setPropBool("@tlk", isPartTLK(part->queryAttributes()));
        unsigned crc = 0;
        const bool hasCrc = part->getCrc(crc);
        setPartCrc(*partTree, hasCrc, crc);
        for (unsigned copyIndex = 0; copyIndex < part->numCopies(); ++copyIndex)
        {
            RemoteFilename filename;
            part->getFilename(filename, copyIndex);
            if (includePhysicalPaths)
            {
                StringBuffer path;
                filename.getRemotePath(path);
                partTree->addProp("copy", path.str());
            }
            else
                partTree->addProp("copy", "REDACTED");
        }
    }
    StringBuffer json;
    toJSON(root, json, 0, 0);
    return json.str();
}

static void expandNestedBlobAliases(const char* ecl, TypeMapper& mapper, std::vector<FieldDescriptor>& fields, std::vector<Warning>& warnings)
{
    if (isEmptyString(ecl))
        return;
    const std::string text(ecl);
    std::map<std::string, std::vector<std::pair<std::string, std::string>>> definitions;
    const std::regex definitionPattern(R"((\w+)\s*:=\s*RECORD([\s\S]*?)END\s*;)");
    const std::regex fieldPattern(R"((\w[\w_]*)\s+(\w[\w_]*)\s*;)");
    for (std::sregex_iterator definition(text.begin(), text.end(), definitionPattern), end; definition != end; ++definition)
    {
        std::vector<std::pair<std::string, std::string>> definitionFields;
        const std::string body = (*definition)[2].str();
        for (std::sregex_iterator field(body.begin(), body.end(), fieldPattern), fieldEnd; field != fieldEnd; ++field)
            definitionFields.emplace_back((*field)[1].str(), (*field)[2].str());
        definitions.emplace((*definition)[1].str(), std::move(definitionFields));
    }

    std::vector<FieldDescriptor> expanded;
    const std::regex blobFieldPattern(R"((\w[\w_]*)\s+(\w[\w_]*)\s*\{\s*blob\s*\})");
    std::map<std::string, std::string> blobAliases;
    for (std::sregex_iterator blob(text.begin(), text.end(), blobFieldPattern), end; blob != end; ++blob)
        blobAliases[(*blob)[2].str()] = (*blob)[1].str();

    for (const auto& field : fields)
    {
        auto alias = blobAliases.find(field.sourceType);
        auto definition = alias == blobAliases.end() ? definitions.end() : definitions.find(alias->second);
        if (field.duckdbType == "JSON" && definition != definitions.end() && definition->second.size() == 1)
        {
            const auto& child = definition->second.front();
            expanded.push_back(mapper.mapField(child.second.c_str(), child.first.c_str(), warnings));
        }
        else
            expanded.push_back(field);
    }
    fields.swap(expanded);
}

static std::string serializeOptions(IDistributedFile& file, const FileAccessOptions& accessOptions)
{
    const IPropertyTree& attributes = file.queryAttributes();
    Owned<IPropertyTree> root = createPTree("options");
    root->setPropInt("@version", 2);
    root->setProp("@logicalName", file.queryLogicalName());
    root->setProp("@kind", attributes.queryProp("@kind", "flat"));
    root->setProp("@format", accessOptions.format);
    root->setPropBool("@grouped", attributes.getPropBool("@grouped", false));
    root->setPropInt("@formatCrc", accessOptions.formatCrc);
    root->setPropInt("@recordTranslationMode", static_cast<unsigned>(accessOptions.recordTranslationMode));
    root->setPropInt64("@modified", attributes.getPropInt64("@modified", 0));
    if (accessOptions.formatOptions)
        root->setPropTree("formatOptions", createPTreeFromIPT(accessOptions.formatOptions));
    Owned<IPropertyTree> providerOptions;
    if (accessOptions.providerOptions)
        providerOptions.setown(createPTreeFromIPT(accessOptions.providerOptions));
    if (!providerOptions)
        providerOptions.setown(createPTree("providerOptions"));
    if (!providerOptions->hasProp("@compressed"))
        providerOptions->setPropBool("@compressed", false);
    root->setPropTree("providerOptions", providerOptions.getClear());
    StringBuffer json;
    toJSON(root, json, 0, 0);
    return json.str();
}

bool CMetadataResolver::isValidLogicalName(const char* logicalName)
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

Owned<IDistributedFile> CMetadataResolver::resolveLogicalFile(const char* logicalName, IUserDescriptor* user)
{
    if (!isValidLogicalName(logicalName))
        throw makeStringException(-1, "A valid scoped logical file name is required");

    Owned<IDistributedFile> file = queryDistributedFileDirectory().lookup(logicalName, user, AccessMode::readRandom, false, false, nullptr, defaultNonPrivilegedUser);
    if (!file)
        throw makeStringExceptionV(-1, "Unable to resolve logical file '%s'", logicalName);
    return file;
}

void CMetadataResolver::buildScanDescriptor(IDistributedFile& file, CScanDescriptor& descriptor, bool includePhysicalPaths, const char* recordDefinitionOverride)
{
    const IPropertyTree& attributes = file.queryAttributes();
    const char* recordDefinition = recordDefinitionOverride ? recordDefinitionOverride : attributes.queryProp("ECL", "");
    Owned<IOutputMetaData> expectedMetadata = getDaliLayoutInfo(attributes);
    if (!expectedMetadata && recordDefinitionOverride)
        expectedMetadata.setown(createWsSql2OutputMetaDataFromEcl(recordDefinition, attributes.queryProp("@kind", "flat"), attributes.getPropBool("@grouped", false)));
    if (!expectedMetadata)
        throw makeStringExceptionV(-1, "Unsupported record layout for '%s': runtime metadata is unavailable", file.queryLogicalName());
    if (expectedMetadata->queryRecordAccessor(true).getNumIfBlocks())
        throw makeStringExceptionV(-1, "Unsupported record layout for '%s': a compiled record helper would be required", file.queryLogicalName());

    FileAccessOptions accessOptions;
    accessOptions.formatOptions->setPropBool("@grouped", attributes.getPropBool("@grouped", false));
    accessOptions.updateFromFile(&file);
    Owned<IOutputMetaData> actualMetadata = accessOptions.actualDiskMeta.getLink();
    if (!actualMetadata)
        actualMetadata.set(expectedMetadata);
    if (actualMetadata->queryRecordAccessor(true).getNumIfBlocks())
        throw makeStringExceptionV(-1, "Unsupported record layout for '%s': a compiled record helper would be required", file.queryLogicalName());
    const bool isCsv = strieq(accessOptions.format.str(), "csv");
    const bool isXml = strieq(accessOptions.format.str(), "xml");
    if ((isCsv || isXml) && !accessOptions.formatCrc && actualMetadata)
    {
        MemoryBuffer serializedLayout;
        if (dumpTypeInfo(serializedLayout, actualMetadata->queryTypeInfo()))
            accessOptions.formatCrc = hashc(serializedLayout.bytes(), serializedLayout.length(), 0) | 1;
    }
    if (isXml && attributes.hasProp("@rowTag") && !accessOptions.formatOptions->hasProp("ActivityOptions/rowTag"))
        ensurePTree(accessOptions.formatOptions, "ActivityOptions")->setProp("rowTag", attributes.queryProp("@rowTag"));
    TypeMapper mapper;
    std::vector<FieldDescriptor> fields;
    std::vector<Warning> warnings;
    MemoryBuffer serializedMetadata;
    if (attributes.getPropBin("ECLbin", serializedMetadata))
    {
        Owned<IDefRecordMeta> recordMeta = deserializeRecordMeta(serializedMetadata, true);
        if (recordMeta)
            mapper.mapRecord(recordMeta->queryRecord(), nullptr, fields, warnings);
    }
    if (fields.empty())
        mapper.mapEclRecordDefinition(recordDefinition, fields, warnings);
    std::string normalizedEcl = recordDefinition;
    std::transform(normalizedEcl.begin(), normalizedEcl.end(), normalizedEcl.begin(), [](unsigned char character) { return static_cast<char>(std::toupper(character)); });
    const bool hasNestedDescriptor = std::any_of(fields.begin(), fields.end(), [](const FieldDescriptor& field) { return !field.children.empty(); });
    if (!hasNestedDescriptor && normalizedEcl.find("DATASET(") != std::string::npos)
    {
        fields.clear();
        mapper.mapEclRecordDefinition(recordDefinition, fields, warnings);
    }
    const RtlRecord& actualRecord = actualMetadata->queryRecordAccessor(true);
    bool hasNestedPhysicalField = false;
    for (unsigned index = 0; index < actualRecord.getNumFields(); ++index)
    {
        const RtlTypeInfo* type = actualRecord.queryType(index);
        if (type && (type->getType() == type_record || type->getType() == type_row || type->getType() == type_set || type->getType() == type_table || type->getType() == type_groupedtable))
        {
            hasNestedPhysicalField = true;
            break;
        }
    }
    if (hasNestedPhysicalField)
    {
        fields.clear();
        for (unsigned index = 0; index < actualRecord.getNumFields(); ++index)
            fields.push_back(mapRuntimeField(*actualRecord.queryOriginalField(index), nullptr));
    }
    expandNestedBlobAliases(recordDefinition, mapper, fields, warnings);
    StringBuffer sqlSchema;
    sqlSchema.append("CREATE TABLE \\\"scan\\\" (");
    bool first = true;
    for (const auto& field : fields)
        appendSqlSchemaField(sqlSchema, field, first);
    sqlSchema.append(");");

    descriptor.logicalName = file.queryLogicalName();
    descriptor.recordCount = queryKnownRecordCount(attributes);
    descriptor.parts = serializeParts(file, includePhysicalPaths);
    descriptor.options = serializeOptions(file, accessOptions);
    descriptor.sqlSchema = sqlSchema.str();
    descriptor.eclRecordDefinition = recordDefinition;
    if (isEmptyString(descriptor.eclRecordDefinition.c_str()))
        throw makeStringExceptionV(-1, "Unable to create a scan descriptor without an ECL record definition for '%s'", file.queryLogicalName());
    StringBuffer sampleSql;
    sampleSql.append("SELECT *\nFROM hpcc_scan(\n    ");
    appendSqlLiteral(sampleSql, descriptor.eclRecordDefinition);
    sampleSql.append(",\n    ");
    appendSqlLiteral(sampleSql, descriptor.parts);
    sampleSql.append(",\n    ");
    appendSqlLiteral(sampleSql, descriptor.options);
    sampleSql.append("\n)");
    descriptor.sampleSql = sampleSql.str();
}

#ifdef _USE_CPPUNIT
class WsSql2MetadataTests : public CppUnit::TestFixture
{
    CPPUNIT_TEST_SUITE(WsSql2MetadataTests);
    CPPUNIT_TEST(testLogicalNameValidation);
    CPPUNIT_TEST(testPartCrcSerialization);
    CPPUNIT_TEST(testKnownRecordCount);
    CPPUNIT_TEST_SUITE_END();

public:
    void testLogicalNameValidation()
    {
        CPPUNIT_ASSERT(CMetadataResolver::isValidLogicalName("scope::file"));
        CPPUNIT_ASSERT(!CMetadataResolver::isValidLogicalName("file"));
        CPPUNIT_ASSERT(!CMetadataResolver::isValidLogicalName("scope::bad name"));
        CPPUNIT_ASSERT(!CMetadataResolver::isValidLogicalName("scope:::file"));
        CPPUNIT_ASSERT(!CMetadataResolver::isValidLogicalName("scope::::file"));
        CPPUNIT_ASSERT(!CMetadataResolver::isValidLogicalName("scope:file"));
    }

    void testPartCrcSerialization()
    {
        Owned<IPropertyTree> root = createPTree("parts");
        IPropertyTree* partWithoutCrc = root->addPropTree("part", createPTree("part"));
        setPartCrc(*partWithoutCrc, false, 0);
        CPPUNIT_ASSERT(!partWithoutCrc->hasProp("@crc"));

        IPropertyTree* partWithCrc = root->addPropTree("part", createPTree("part"));
        setPartCrc(*partWithCrc, true, UINT_MAX);
        CPPUNIT_ASSERT_EQUAL(static_cast<__int64>(UINT_MAX), partWithCrc->getPropInt64("@crc", 0));

        StringBuffer serialized;
        toJSON(root, serialized, 0, 0);
        CPPUNIT_ASSERT(strstr(serialized.str(), "\"@crc\"") != nullptr);
        CPPUNIT_ASSERT(strstr(serialized.str(), "4294967295") != nullptr);
    }

    void testKnownRecordCount()
    {
        Owned<IPropertyTree> attributes = createPTree("Attr");
        CPPUNIT_ASSERT(!queryKnownRecordCount(*attributes));
        attributes->setPropInt64("@recordCount", 123456789);
        CPPUNIT_ASSERT_EQUAL(uint64_t(123456789), queryKnownRecordCount(*attributes).value());
        attributes->setPropInt64("@recordCount", -2);
        CPPUNIT_ASSERT(!queryKnownRecordCount(*attributes));
    }
};

CPPUNIT_TEST_SUITE_REGISTRATION(WsSql2MetadataTests);
#endif // _USE_CPPUNIT