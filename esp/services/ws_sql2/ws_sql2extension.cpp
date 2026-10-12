#include "ws_sql2extension.hpp"

#include "ws_sql2metadata.hpp"
#include "ws_sql2typemapping.hpp"

#include "thorcommon.hpp"
#include "thorread.hpp"
#include "nbcd.hpp"

#include "duckdb/main/extension/extension_loader.hpp"

namespace
{
class CHpccScanBindData : public duckdb::TableFunctionData
{
public:
    CHpccScanBindData(std::string _logicalName, IDistributedFile* _file, std::vector<CWsSql2FieldDescriptor> _fields)
        : logicalName(std::move(_logicalName)), file(_file), fields(std::move(_fields))
    {
    }

    std::string logicalName;
    Owned<IDistributedFile> file;
    std::vector<CWsSql2FieldDescriptor> fields;
};

class CHpccScanGlobalState : public duckdb::GlobalTableFunctionState
{
public:
    FileAccessOptions accessOptions;
    Owned<IOutputMetaData> actualMetadata;
    Owned<IRowReadFormatMapping> mapping;
    Owned<IDiskRowReader> reader;
    Owned<ILogicalRowStream> stream;
};

class CHpccScanFieldProcessor : implements IFieldProcessor, public CInterface
{
    struct NestedFrame
    {
        bool collection;
        const CWsSql2FieldDescriptor* descriptor;
        unsigned nextChild = 0;
        std::vector<duckdb::Value> values;
    };

    duckdb::DataChunk& output;
    const std::vector<CWsSql2FieldDescriptor>& fields;
    unsigned column = 0;
    // HPCC emits nested callbacks in depth-first order; each frame collects one STRUCT or LIST value.
    std::vector<NestedFrame> nested;

    void setValue(duckdb::Value value)
    {
        if (nested.empty())
        {
            output.SetValue(column++, 0, value);
            return;
        }
        nested.back().values.push_back(std::move(value));
        if (!nested.back().collection)
            ++nested.back().nextChild;
    }

    const CWsSql2FieldDescriptor& nextNestedDescriptor() const
    {
        if (nested.empty())
            return fields.at(column);
        const auto& parent = nested.back();
        if (parent.collection)
            return *parent.descriptor;
        return parent.descriptor->children.at(parent.nextChild);
    }

    void finishNested(bool collection)
    {
        if (nested.empty() || nested.back().collection != collection)
            throw duckdb::InternalException("hpcc_scan nested metadata callback mismatch");

        NestedFrame frame = std::move(nested.back());
        nested.pop_back();
        if (collection)
        {
            setValue(frame.values.empty() ? duckdb::Value::LIST(duckdb::LogicalType::VARCHAR, {})
                                          : duckdb::Value::LIST(std::move(frame.values)));
            return;
        }

        duckdb::child_list_t<duckdb::Value> children;
        for (unsigned index = 0; index < frame.values.size(); ++index)
        {
            std::string name = "field" + std::to_string(index);
            if (index < frame.descriptor->children.size())
            {
                const auto& path = frame.descriptor->children[index].fieldPath;
                const size_t separator = path.rfind('.');
                name = separator == std::string::npos ? path : path.substr(separator + 1);
            }
            children.emplace_back(std::move(name), std::move(frame.values[index]));
        }
        setValue(duckdb::Value::STRUCT(std::move(children)));
    }

    [[noreturn]] void unsupported(const char* kind)
    {
        throw duckdb::NotImplementedException("hpcc_scan does not yet convert %s fields", kind);
    }

    unsigned decimalWidth() const
    {
        const std::string& sourceType = fields.at(column).sourceType;
        size_t start = sourceType.find("DECIMAL");
        if (start == std::string::npos)
            start = sourceType.find("UDECIMAL");
        if (start == std::string::npos)
            return 0;
        start = sourceType.find_first_of("0123456789", start);
        if (start == std::string::npos)
            return 0;
        return static_cast<unsigned>(std::strtoul(sourceType.c_str() + start, nullptr, 10));
    }

public:
    IMPLEMENT_IINTERFACE;

    CHpccScanFieldProcessor(duckdb::DataChunk& _output, const std::vector<CWsSql2FieldDescriptor>& _fields)
        : output(_output), fields(_fields)
    {
    }

    void processString(unsigned len, const char* value, const RtlFieldInfo*) override
    {
        setValue(duckdb::Value(std::string(value, len)));
    }
    void processBool(bool value, const RtlFieldInfo*) override { setValue(duckdb::Value::BOOLEAN(value)); }
    void processData(unsigned len, const void* value, const RtlFieldInfo*) override
    {
        setValue(duckdb::Value::BLOB(static_cast<const unsigned char*>(value), len));
    }
    void processInt(__int64 value, const RtlFieldInfo*) override { setValue(duckdb::Value::BIGINT(value)); }
    void processUInt(unsigned __int64 value, const RtlFieldInfo*) override
    {
        if (value > static_cast<unsigned __int64>(INT64_MAX))
            unsupported("unsigned integer");
        setValue(duckdb::Value::BIGINT(static_cast<__int64>(value)));
    }
    void processReal(double value, const RtlFieldInfo*) override { setValue(duckdb::Value::DOUBLE(value)); }
    // The callback exposes packed byte length, not the original decimal digit width; reject until metadata is carried here.
    void processDecimal(const void* value, unsigned length, unsigned precision, const RtlFieldInfo*) override
    {
        unsigned width = decimalWidth();
        if (!width || width > 18 || precision > width)
            unsupported("decimal");
        Decimal decimal;
        decimal.setDecimal(static_cast<byte>(length), static_cast<byte>(precision), value);
        setValue(duckdb::Value::DECIMAL(static_cast<int64_t>(decimal.getInt64()), static_cast<uint8_t>(width), static_cast<uint8_t>(precision)));
    }
    void processUDecimal(const void* value, unsigned length, unsigned precision, const RtlFieldInfo*) override
    {
        unsigned width = decimalWidth();
        if (!width || width > 18 || precision > width)
            unsupported("unsigned decimal");
        Decimal decimal;
        decimal.setUDecimal(static_cast<byte>(length), static_cast<byte>(precision), value);
        unsigned __int64 integer = decimal.getUInt64();
        if (integer > static_cast<unsigned __int64>(INT64_MAX))
            unsupported("unsigned decimal");
        setValue(duckdb::Value::DECIMAL(static_cast<int64_t>(integer), static_cast<uint8_t>(width), static_cast<uint8_t>(precision)));
    }
    void processUnicode(unsigned len, const UChar* value, const RtlFieldInfo*) override
    {
        unsigned utf8Length = 0;
        char* utf8Value = nullptr;
        rtlUnicodeToUtf8X(utf8Length, utf8Value, len, value);
        setValue(duckdb::Value(std::string(utf8Value, utf8Length)));
        rtlFree(utf8Value);
    }
    void processQString(unsigned len, const char* value, const RtlFieldInfo*) override
    {
        setValue(duckdb::Value(std::string(value, len)));
    }
    void processUtf8(unsigned len, const char* value, const RtlFieldInfo*) override
    {
        setValue(duckdb::Value(std::string(value, len)));
    }

    bool processBeginSet(const RtlFieldInfo*, unsigned, bool isAll, const byte*) override
    {
        if (isAll)
            unsupported("unbounded set");
        nested.push_back({true, &nextNestedDescriptor()});
        return true;
    }
    bool processBeginDataset(const RtlFieldInfo*, unsigned) override
    {
        nested.push_back({true, &nextNestedDescriptor()});
        return true;
    }
    bool processBeginRow(const RtlFieldInfo*) override
    {
        nested.push_back({false, &nextNestedDescriptor()});
        return true;
    }
    void processEndSet(const RtlFieldInfo*) override { finishNested(true); }
    void processEndDataset(const RtlFieldInfo*) override { finishNested(true); }
    void processEndRow(const RtlFieldInfo*) override { finishNested(false); }
};

static duckdb::LogicalType mapDuckDBType(const CWsSql2FieldDescriptor& descriptor)
{
    const std::string& type = descriptor.duckdbType;
    if (type == "BOOLEAN")
        return duckdb::LogicalType::BOOLEAN;
    if (type == "BIGINT")
        return duckdb::LogicalType::BIGINT;
    if (type == "DOUBLE")
        return duckdb::LogicalType::DOUBLE;
    if (type == "BLOB")
        return duckdb::LogicalType::BLOB;
    if (type == "DATE")
        return duckdb::LogicalType::DATE;
    if (type == "TIME")
        return duckdb::LogicalType::TIME;
    if (type == "TIMESTAMP")
        return duckdb::LogicalType::TIMESTAMP;
    if (type == "STRUCT")
    {
        duckdb::child_list_t<duckdb::LogicalType> children;
        for (const auto& child : descriptor.children)
        {
            const size_t separator = child.fieldPath.rfind('.');
            const std::string name = separator == std::string::npos ? child.fieldPath : child.fieldPath.substr(separator + 1);
            children.emplace_back(name, mapDuckDBType(child));
        }
        return duckdb::LogicalType::STRUCT(std::move(children));
    }
    if (type == "LIST")
    {
        if (descriptor.children.size() == 1)
            return duckdb::LogicalType::LIST(mapDuckDBType(descriptor.children.front()));
        if (!descriptor.children.empty())
        {
            duckdb::child_list_t<duckdb::LogicalType> rowChildren;
            for (const auto& child : descriptor.children)
            {
                const size_t separator = child.fieldPath.rfind('.');
                const std::string name = separator == std::string::npos ? child.fieldPath : child.fieldPath.substr(separator + 1);
                rowChildren.emplace_back(name, mapDuckDBType(child));
            }
            return duckdb::LogicalType::LIST(duckdb::LogicalType::STRUCT(std::move(rowChildren)));
        }
        return duckdb::LogicalType::LIST(duckdb::LogicalType::VARCHAR);
    }
    if (type == "MAP")
        return duckdb::LogicalType::MAP(duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR);
    if (type == "DECIMAL")
    {
        size_t start = descriptor.sourceType.find_first_of("0123456789");
        if (start != std::string::npos)
        {
            unsigned width = static_cast<unsigned>(std::strtoul(descriptor.sourceType.c_str() + start, nullptr, 10));
            size_t separator = descriptor.sourceType.find('_', start);
            unsigned precision = separator == std::string::npos ? 0 : static_cast<unsigned>(std::strtoul(descriptor.sourceType.c_str() + separator + 1, nullptr, 10));
            if (width && width <= 18 && precision <= width)
                return duckdb::LogicalType::DECIMAL(width, precision);
        }
        return duckdb::LogicalType::DECIMAL(18, 3);
    }
    return duckdb::LogicalType::VARCHAR;
}

static std::vector<CWsSql2FieldDescriptor> appendScanColumns(IDistributedFile& file,
    duckdb::vector<duckdb::LogicalType>& returnTypes, duckdb::vector<std::string>& names)
{
    std::vector<CWsSql2FieldDescriptor> descriptors;
    std::vector<CWsSql2Warning> warnings;
    MemoryBuffer serializedMetadata;
    const IPropertyTree& attributes = file.queryAttributes();
    if (attributes.getPropBin("ECLbin", serializedMetadata))
    {
        Owned<IDefRecordMeta> recordMeta = deserializeRecordMeta(serializedMetadata, true);
        if (recordMeta)
        {
            CWsSql2TypeMapper mapper;
            mapper.mapRecord(recordMeta->queryRecord(), nullptr, descriptors, warnings);
        }
    }
    if (descriptors.empty())
    {
        CWsSql2TypeMapper mapper;
        mapper.mapEclRecordDefinition(attributes.queryProp("ECL", ""), descriptors, warnings);
    }
    if (descriptors.empty())
        throw duckdb::BinderException("hpcc_scan could not determine a record layout");

    for (const auto& descriptor : descriptors)
    {
        returnTypes.push_back(mapDuckDBType(descriptor));
        names.emplace_back(descriptor.fieldPath);
    }
    return descriptors;
}

duckdb::unique_ptr<duckdb::FunctionData> bindHpccScan(duckdb::ClientContext& context, duckdb::TableFunctionBindInput& input,
    duckdb::vector<duckdb::LogicalType>& returnTypes, duckdb::vector<std::string>& names)
{
    if (input.inputs.size() != 1 || input.inputs[0].IsNull() || input.inputs[0].ToString().empty())
        throw duckdb::BinderException("hpcc_scan requires one logical file name");

    const std::string logicalName = input.inputs[0].ToString();
    if (!CWsSql2MetadataResolver::isValidLogicalName(logicalName.c_str()))
        throw duckdb::BinderException("hpcc_scan requires a valid scoped logical file name");
    auto accessContext = context.registered_state->Get<CWsSql2AccessContext>("ws_sql2.access_context");
    if (!accessContext)
        throw duckdb::BinderException("hpcc_scan requires a request access context");

    try
    {
        Owned<IDistributedFile> file = CWsSql2MetadataResolver::resolveLogicalFile(logicalName.c_str(), accessContext->queryUser());
        auto fields = appendScanColumns(*file, returnTypes, names);
        return duckdb::make_uniq<CHpccScanBindData>(logicalName, file.getClear(), std::move(fields));
    }
    catch (IException* exception)
    {
        StringBuffer message;
        exception->errorMessage(message);
        exception->Release();
        throw duckdb::BinderException(message.str());
    }

}

void executeHpccScan(duckdb::ClientContext&, duckdb::TableFunctionInput& input, duckdb::DataChunk& output)
{
    auto& state = input.global_state->Cast<CHpccScanGlobalState>();
    size32_t rowSize = 0;
    const byte* row = static_cast<const byte*>(state.stream->prefetchRow(rowSize));
    if (isEndOfFile(row))
    {
        output.SetCardinality(0);
        return;
    }
    if (isSpecialRow(row))
        throw duckdb::NotImplementedException("hpcc_scan encountered a grouped row boundary");

    const auto& bindData = input.bind_data->Cast<CHpccScanBindData>();
    CHpccScanFieldProcessor processor(output, bindData.fields);
    state.actualMetadata->process(row, processor, 0, (unsigned)-1);
    output.SetCardinality(1);
}

duckdb::unique_ptr<duckdb::GlobalTableFunctionState> initializeHpccScan(duckdb::ClientContext&,
    duckdb::TableFunctionInitInput& input)
{
    const auto& bindData = input.bind_data->Cast<CHpccScanBindData>();
    if (bindData.file->numParts() != 1)
        throw duckdb::NotImplementedException("hpcc_scan currently supports one file part");

    auto state = duckdb::make_uniq<CHpccScanGlobalState>();
    state->accessOptions.updateFromFile(bindData.file);
    if (state->accessOptions.formatOptions && state->accessOptions.formatOptions->getPropBool("@grouped", false))
        throw duckdb::NotImplementedException("hpcc_scan currently does not support grouped files");

    state->actualMetadata.setown(getDaliLayoutInfo(bindData.file->queryAttributes()));
    if (!state->actualMetadata || !state->accessOptions.formatCrc)
        throw duckdb::BinderException("hpcc_scan could not initialize the published record layout");

    state->mapping.setown(createRowReadFormatMapping(
        state->accessOptions.recordTranslationMode,
        state->accessOptions.format,
        state->accessOptions.formatCrc, *state->actualMetadata,
        state->accessOptions.formatCrc, *state->actualMetadata,
        state->accessOptions.formatCrc, *state->actualMetadata,
        state->accessOptions.formatOptions));
    state->reader.setown(createDiskReader(state->accessOptions.format, false, state->mapping,
        state->accessOptions.providerOptions, nullptr));

    Owned<IDistributedFilePart> part = bindData.file->getPart(0);
    RemoteFilename filename;
    part->getFilename(filename, 0);
    FieldFilterArray noFilters;
    if (!state->reader->setInputFile(filename, bindData.file->queryLogicalName(), 0, 0, noFilters))
        throw duckdb::IOException("hpcc_scan could not open the file part");
    state->stream.setown(state->reader->queryAllocatedRowStream());
    return state;
}
}

void CWsSql2Extension::Load(duckdb::ExtensionLoader& loader)
{
    loader.SetDescription("HPCC logical-file scan extension");
    loader.RegisterFunction(duckdb::TableFunction("hpcc_scan", {duckdb::LogicalType::VARCHAR}, executeHpccScan,
        bindHpccScan, initializeHpccScan));
}

std::string CWsSql2Extension::Name()
{
    return "hpcc_scan";
}

std::string CWsSql2Extension::Version() const
{
    return "0.1.0";
}
