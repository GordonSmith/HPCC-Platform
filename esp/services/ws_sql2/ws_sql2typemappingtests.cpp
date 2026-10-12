#include "ws_sql2typemapping.hpp"
#include "ws_sql2metadata.hpp"

#include <cassert>

void runWsSql2TypeMappingTests()
{
    assert(CWsSql2MetadataResolver::isValidLogicalName("scope::file"));
    assert(!CWsSql2MetadataResolver::isValidLogicalName("file"));
    assert(!CWsSql2MetadataResolver::isValidLogicalName("scope::bad name"));
    assert(!CWsSql2MetadataResolver::isValidLogicalName("scope:::file"));
    assert(!CWsSql2MetadataResolver::isValidLogicalName("scope::::file"));
    assert(!CWsSql2MetadataResolver::isValidLogicalName("scope:file"));

    CWsSql2TypeMapper mapper;
    std::vector<CWsSql2Warning> warnings;

    CWsSql2FieldDescriptor integerField = mapper.mapField("id", "INTEGER", warnings);
    assert(integerField.duckdbType == "BIGINT");
    assert(!integerField.fallback);
    assert(warnings.empty());

    CWsSql2FieldDescriptor unsupportedField = mapper.mapField("payload", "CUSTOM", warnings);
    assert(unsupportedField.duckdbType == "JSON");
    assert(unsupportedField.fallback);
    assert(warnings.size() == 1);
    assert(warnings.front().code == "UNSUPPORTED_FIELD_TYPE");
    assert(warnings.front().fieldPath == "payload");

    std::vector<CWsSql2FieldDescriptor> recordFields;
    std::vector<CWsSql2Warning> recordWarnings;
    mapper.mapEclRecordDefinition("RECORD unsigned4 id; string name; udecimal8_2 price; END;", recordFields, recordWarnings);
    assert(recordFields.size() == 3);
    assert(recordFields[0].fieldPath == "id");
    assert(recordFields[0].duckdbType == "BIGINT");
    assert(recordFields[1].duckdbType == "VARCHAR");
    assert(recordFields[2].duckdbType == "DECIMAL");

    recordFields.clear();
    recordWarnings.clear();
    mapper.mapEclRecordDefinition("record unsigned4 id; string name; end;", recordFields, recordWarnings);
    assert(recordFields.size() == 2);

    recordFields.clear();
    recordWarnings.clear();
    mapper.mapEclRecordDefinition("not a record definition", recordFields, recordWarnings);
    assert(recordFields.empty());

    recordFields.clear();
    recordWarnings.clear();
    mapper.mapEclRecordDefinition("RECORD set of unsigned4 ids; dictionary of string labels; row of string address; END;", recordFields, recordWarnings);
    assert(recordFields.size() == 3);
    assert(recordFields[0].duckdbType == "LIST");
    assert(recordFields[1].duckdbType == "MAP");
    assert(recordFields[2].duckdbType == "STRUCT");

    recordFields.clear();
    recordWarnings.clear();
    mapper.mapEclRecordDefinition("RECORD string name; unsigned4 name; END;", recordFields, recordWarnings);
    assert(recordFields.size() == 2);
    assert(recordFields[0].fieldPath == "name");
    assert(recordFields[1].fieldPath == "name_2");

    assert(mapper.mapField("birthDate", "DATE", recordWarnings).duckdbType == "DATE");
    assert(mapper.mapField("startTime", "TIME", recordWarnings).duckdbType == "TIME");
    assert(mapper.mapField("created", "DATETIME", recordWarnings).duckdbType == "TIMESTAMP");
    return;
}