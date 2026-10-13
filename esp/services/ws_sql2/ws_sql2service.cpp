#include "ws_sql2service.hpp"
#include "ws_sql2engine.hpp"
#include "ws_sql2metadata.hpp"
#include "ws_sql2typemapping.hpp"
#include "thorcommon.hpp"
#include "thorread.hpp"
#include "thorxmlwrite.hpp"

#include "seclib.hpp"

#include <algorithm>
#include <vector>

static void appendMetadataFields(IArrayOf<IEspMetadataField>& fields, IArrayOf<IEspMetadataWarning>& warnings,
    const std::vector<CWsSql2FieldDescriptor>& descriptors, const std::vector<CWsSql2Warning>& mappingWarnings)
{
    for (const auto& descriptor : descriptors)
    {
        auto* field = new CMetadataField("ws_sql2", static_cast<const char*>(nullptr));
        field->setPath(descriptor.fieldPath.c_str());
        field->setSourceType(descriptor.sourceType.c_str());
        field->setDuckDBType(descriptor.duckdbType.c_str());
        field->setFallback(descriptor.fallback);
        fields.append(*field);
    }
    for (const auto& warning : mappingWarnings)
    {
        auto* item = new CMetadataWarning("ws_sql2", static_cast<const char*>(nullptr));
        item->setCode(warning.code.c_str());
        item->setFieldPath(warning.fieldPath.c_str());
        item->setMessage(warning.message.c_str());
        warnings.append(*item);
    }
}

static void appendMetadataWarning(IArrayOf<IEspMetadataWarning>& warnings, const char* code, const char* fieldPath, const char* message)
{
    auto* item = new CMetadataWarning("ws_sql2", static_cast<const char*>(nullptr));
    item->setCode(code);
    item->setFieldPath(fieldPath ? fieldPath : "");
    item->setMessage(message ? message : "");
    warnings.append(*item);
}

static void appendSuperfileLayoutWarnings(IDistributedFile& file, IArrayOf<IEspMetadataWarning>& warnings)
{
    IDistributedSuperFile* superFile = file.querySuperFile();
    if (!superFile)
        return;

    Owned<IDefRecordMeta> expectedLayout;
    Owned<IDistributedFileIterator> subfiles = superFile->getSubFileIterator(true);
    ForEach(*subfiles)
    {
        IDistributedFile& subfile = subfiles->query();
        MemoryBuffer serializedMetadata;
        const char* logicalName = subfile.queryLogicalName();
        if (!subfile.queryAttributes().getPropBin("ECLbin", serializedMetadata))
        {
            appendMetadataWarning(warnings, "MISSING_SUBFILE_LAYOUT", logicalName,
                "Superfile subfile has no stored ECL record layout");
            continue;
        }

        try
        {
            Owned<IDefRecordMeta> layout = deserializeRecordMeta(serializedMetadata, true);
            if (!layout)
            {
                appendMetadataWarning(warnings, "INVALID_SUBFILE_LAYOUT", logicalName,
                    "Superfile subfile has an empty ECL record layout");
                continue;
            }
            if (!expectedLayout)
                expectedLayout.setown(layout.getClear());
            else if (!expectedLayout->equals(layout))
                appendMetadataWarning(warnings, "INCOMPATIBLE_SUBFILE_LAYOUT", logicalName,
                    "Superfile subfile record layout differs from the first subfile");
        }
        catch (IException* exception)
        {
            StringBuffer message;
            exception->errorMessage(message);
            appendMetadataWarning(warnings, "INVALID_SUBFILE_LAYOUT", logicalName, message.str());
            exception->Release();
        }
    }
}

static Owned<IUserDescriptor> createRequestUser(IEspContext& context)
{
    StringBuffer userId;
    context.getUserID(userId);
    Owned<IUserDescriptor> user;
    if (!userId.isEmpty())
    {
        user.setown(createUserDescriptor());
        user->set(userId, context.queryPassword(), context.querySignature());
    }
    return user;
}

void Cwssql2Ex::init(IPropertyTree* cfg, const char* process, const char* service)
{
    Cwssql2::init(cfg, process, service);
}

bool Cwssql2Ex::onDescribeFile(IEspContext& context, IEspDescribeFileRequest& req, IEspDescribeFileResponse& resp)
{
    Owned<IUserDescriptor> user = createRequestUser(context);

    Owned<IDistributedFile> file = CWsSql2MetadataResolver::resolveLogicalFile(req.getLogicalName(), user);
    bool blockedCompression = false;
    const bool compressed = file->isCompressed(&blockedCompression);
    const IPropertyTree& attributes = file->queryAttributes();
    resp.setResolved(true);
    resp.setLogicalName(file->queryLogicalName());
    resp.setKind(attributes.queryProp("@kind", "unknown"));
    resp.setFormat(attributes.queryProp("@format", "unknown"));
    resp.setNumParts(file->numParts());
    resp.setCompressed(compressed);
    resp.setBlockedCompression(blockedCompression);
    IDistributedSuperFile* superFile = file->querySuperFile();
    resp.setIsSuperfile(superFile != nullptr);
    resp.setNumSubFiles(superFile ? superFile->numSubFiles() : 0);
    resp.setRecordSize((int)attributes.getPropInt64("@recordSize", 0));
    resp.setOwner(attributes.queryProp("@owner", ""));
    resp.setModified(attributes.queryProp("@modified", ""));
    resp.setIsKeyed(strieq(attributes.queryProp("@kind", ""), "key"));
    resp.setMetadataSchemaUnbounded(true);
    resp.setEclRecordDefinition(attributes.queryProp("ECL", ""));

    IArrayOf<IEspMetadataField> fields;
    IArrayOf<IEspMetadataWarning> warnings;
    MemoryBuffer serializedMetadata;
    if (attributes.getPropBin("ECLbin", serializedMetadata))
    {
        try
        {
            Owned<IDefRecordMeta> recordMeta = deserializeRecordMeta(serializedMetadata, true);
            if (recordMeta)
            {
                CWsSql2TypeMapper mapper;
                std::vector<CWsSql2FieldDescriptor> descriptors;
                std::vector<CWsSql2Warning> mappingWarnings;
                mapper.mapRecord(recordMeta->queryRecord(), nullptr, descriptors, mappingWarnings);

                appendMetadataFields(fields, warnings, descriptors, mappingWarnings);
            }
        }
        catch (IException* exception)
        {
            StringBuffer message;
            exception->errorMessage(message);
            auto* warning = new CMetadataWarning("ws_sql2", static_cast<const char*>(nullptr));
            warning->setCode("INVALID_ECLBIN");
            warning->setFieldPath("");
            warning->setMessage(message);
            warnings.append(*warning);
            exception->Release();
        }
    }
    if (fields.ordinality() == 0)
    {
        CWsSql2TypeMapper mapper;
        std::vector<CWsSql2FieldDescriptor> descriptors;
        std::vector<CWsSql2Warning> mappingWarnings;
        mapper.mapEclRecordDefinition(attributes.queryProp("ECL", ""), descriptors, mappingWarnings);
        appendMetadataFields(fields, warnings, descriptors, mappingWarnings);
    }
    appendSuperfileLayoutWarnings(*file, warnings);
    resp.setFields(fields);
    resp.setWarnings(warnings);
    return true;
}

bool Cwssql2Ex::onExecuteSQL(IEspContext& context, IEspExecuteSQLRequest& req, IEspExecuteSQLResponse& resp)
{
    if (isEmptyString(req.getSqlText()))
        throw makeStringException(-1, "SqlText is required");

    Owned<IUserDescriptor> user = createRequestUser(context);
    CWsSql2QueryEngine engine(user);
    if (!engine.isInitialized())
        throw makeStringException(-1, "Unable to initialize hpcc_scan engine");

    std::string resultText;
    std::string errorMessage;
    if (!engine.executeQuery(req.getSqlText(), req.getRowLimit(), req.getByteLimit(), resultText, errorMessage))
        throw makeStringException(-1, errorMessage.c_str());
    resp.setResult(resultText.c_str());
    return true;
}

bool Cwssql2Ex::onExplainScan(IEspContext& context, IEspExplainScanRequest& req, IEspExplainScanResponse& resp)
{
    Owned<IUserDescriptor> user = createRequestUser(context);
    CWsSql2QueryEngine engine(user);
    if (!engine.isInitialized())
        throw makeStringException(-1, "Unable to initialize hpcc_scan engine");

    resp.setDataRead(false);
    resp.setSqlText(req.getSqlText());
    StringArray projectedColumns;
    StringArray residualFilters;
    std::string planText;
    std::string planJson;
    std::string errorMessage;
    if (!engine.explainQuery(req.getSqlText(), planText, planJson, projectedColumns, residualFilters, errorMessage))
        throw makeStringException(-1, errorMessage.c_str());
    resp.setProjectedColumns(projectedColumns);
    resp.setResidualFilters(residualFilters);
    resp.setOptimizedPlan(planText.c_str());
    resp.setOptimizedPlanJson(planJson.c_str());
    return true;
}

bool Cwssql2Ex::onDebugDev(IEspContext& context, IEspDebugDevRequest& req, IEspDebugDevResponse& resp)
{
    Owned<IUserDescriptor> user = createRequestUser(context);
    Owned<IDistributedFile> file = CWsSql2MetadataResolver::resolveLogicalFile(req.getLogicalName(), user);
    const IPropertyTree& attributes = file->queryAttributes();
    StringBuffer result;
    result.append("{\"logicalName\":").append('"').append(file->queryLogicalName()).append('"');
    result.append(",\"kind\":").append('"').append(attributes.queryProp("@kind", "")).append('"');
    result.append(",\"format\":").append('"').append(attributes.queryProp("@format", "")).append('"');
    result.append(",\"recordSize\":").append(attributes.getPropInt("@recordSize", 0));
    result.append(",\"formatCrc\":").append(attributes.getPropInt("@formatCrc", 0));
    result.append(",\"parts\":").append(file->numParts());
    Owned<IOutputMetaData> actualMetadata = getDaliLayoutInfo(attributes);
    result.append(",\"actualFields\":[");
    if (actualMetadata)
    {
        const RtlRecord& record = actualMetadata->queryRecordAccessor(true);
        for (unsigned fieldIndex = 0; fieldIndex < record.getNumFields(); ++fieldIndex)
        {
            if (fieldIndex)
                result.append(',');
            result.append('"').append(record.queryName(fieldIndex)).append('"');
        }
    }
    result.append("]");
    FileAccessOptions accessOptions;
    accessOptions.updateFromFile(file);
    Owned<IOutputMetaData> rawMetadata = accessOptions.actualDiskMeta.getLink();
    if (!rawMetadata)
        rawMetadata.setown(getDaliLayoutInfo(attributes));
    if (rawMetadata && accessOptions.formatCrc)
    {
        Owned<IRowReadFormatMapping> mapping = createRowReadFormatMapping(
            accessOptions.recordTranslationMode, accessOptions.format, accessOptions.formatCrc, *rawMetadata,
            accessOptions.formatCrc, *rawMetadata, accessOptions.formatCrc, *rawMetadata,
            accessOptions.formatOptions);
        Owned<IDiskRowReader> reader = createDiskReader(accessOptions.format, false, mapping, accessOptions.providerOptions, nullptr);
        Owned<IDistributedFilePart> part = file->getPart(0);
        RemoteFilename filename;
        part->getFilename(filename, 0);
        FieldFilterArray noFilters;
        if (reader->setInputFile(filename, file->queryLogicalName(), 0, 0, noFilters))
        {
            Owned<ILogicalRowStream> stream = reader->queryAllocatedRowStream();
            size32_t rowSize = 0;
            const void* row = stream->prefetchRow(rowSize);
            if (row && !isSpecialRow(row))
            {
                size32_t jsonLength = 0;
                char* json = nullptr;
                convertRowToJSON(jsonLength, json, *rawMetadata, row);
                result.append(",\"rawRow\":").append(jsonLength, json);
                rtlFree(json);
            }
        }
    }
    result.append('}');
    result.insert(result.length() - 1, ",\"copies\":[");
    for (unsigned partIndex = 0; partIndex < file->numParts(); ++partIndex)
    {
        if (partIndex)
            result.append(',');
        Owned<IDistributedFilePart> part = file->getPart(partIndex);
        result.append(part ? part->numCopies() : 0);
    }
    result.append("]}");
    resp.setResult(result.str());
    return true;
}

bool Cwssql2Ex::onListFiles(IEspContext& context, IEspListFilesRequest& req, IEspListFilesResponse& resp)
{
    Owned<IUserDescriptor> user = createRequestUser(context);

    const char* scope = req.getScope();
    Owned<IPropertyTreeIterator> files = queryDistributedFileDirectory().getDFAttributesIterator(
        (scope && *scope) ? scope : "*", user, true, true, nullptr);
    if (!files)
        throw makeStringException(-1, "Unable to enumerate logical files");

    std::vector<std::string> logicalNames;
    ForEach(*files)
    {
        const char* logicalName = files->query().queryProp("@name");
        if (!logicalName || !*logicalName)
            continue;
        logicalNames.emplace_back(logicalName);
    }
    std::sort(logicalNames.begin(), logicalNames.end());
    StringArray responseNames;
    for (const auto& logicalName : logicalNames)
        responseNames.append(logicalName.c_str());
    resp.setScope(scope ? scope : "");
    resp.setFiles(responseNames);
    return true;
}