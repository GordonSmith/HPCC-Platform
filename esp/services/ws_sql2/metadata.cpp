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
#include "duckdb-hpcc/materialization.hpp"

#ifdef _USE_CPPUNIT
#include "unittests.hpp"
#endif

using namespace duckdb::hpcc;

#include <algorithm>

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
    const RtlRecord& expectedRecord = expectedMetadata->queryRecordAccessor(true);
    const bool hasNestedDescriptor = std::any_of(fields.begin(), fields.end(), [](const FieldDescriptor& field) { return !field.children.empty(); });
    bool hasNestedExpectedField = false;
    for (unsigned index = 0; index < expectedRecord.getNumFields(); ++index)
    {
        const RtlTypeInfo* type = expectedRecord.queryType(index);
        if (type && (type->getType() == type_record || type->getType() == type_row || type->getType() == type_set || type->getType() == type_table || type->getType() == type_groupedtable))
        {
            hasNestedExpectedField = true;
            break;
        }
    }
    if (fields.empty() || (hasNestedExpectedField && !hasNestedDescriptor))
        fields = mapRtlRecord(expectedRecord);
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
        fields = mapRtlRecord(actualRecord);
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
    CPPUNIT_TEST(testRuntimeRecordMapping);
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

    void testRuntimeRecordMapping()
    {
        Owned<IOutputMetaData> metadata = createWsSql2OutputMetaDataFromEcl(
            "child := RECORD unsigned4 childId; END; RECORD unsigned8 id; DATASET(child) children; END;",
            "flat", false);
        CPPUNIT_ASSERT(metadata);

        const std::vector<FieldDescriptor> fields = mapRtlRecord(metadata->queryRecordAccessor(true));
        CPPUNIT_ASSERT_EQUAL(size_t{ 2 }, fields.size());
        CPPUNIT_ASSERT_EQUAL(std::string("id"), fields[0].fieldPath);
        CPPUNIT_ASSERT_EQUAL(std::string("UBIGINT"), fields[0].duckdbType);
        CPPUNIT_ASSERT_EQUAL(std::string("children"), fields[1].fieldPath);
        CPPUNIT_ASSERT_EQUAL(std::string("LIST"), fields[1].duckdbType);
        CPPUNIT_ASSERT_EQUAL(size_t{ 1 }, fields[1].children.size());
        CPPUNIT_ASSERT_EQUAL(std::string("children.childid"), fields[1].children[0].fieldPath);
    }
};

CPPUNIT_TEST_SUITE_REGISTRATION(WsSql2MetadataTests);
#endif // _USE_CPPUNIT