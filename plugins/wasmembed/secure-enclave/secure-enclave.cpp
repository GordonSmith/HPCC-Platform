#include "secure-enclave.hpp"

// Define a function pointer type for the original fprintf function
typedef int (*fprintf_t)(FILE *, const char *, ...);

// Custom exception class for fprintf errors
class FprintfException : public std::exception
{
public:
    FprintfException(const char *message) : message_(message) {}

    const char *what() const noexcept override
    {
        return message_.c_str();
    }

private:
    std::string message_;
};

// Custom fprintf function
int my_fprintf(FILE *stream, const char *format, ...)
{
    // Create a temporary buffer
    const int buffer_size = 256;
    char buffer[buffer_size];

    // Create a memory stream using the buffer
    FILE *mem_stream = fmemopen(buffer, buffer_size, "w");
    if (mem_stream == nullptr)
    {
        throw std::runtime_error("Failed to create memory stream.");
    }

    // Format the text into the memory stream
    va_list args;
    va_start(args, format);
    int result = vfprintf(mem_stream, format, args);
    va_end(args);

    // Close the memory stream
    fclose(mem_stream);

    // Check for fprintf errors and throw an exception
    if (result < 0)
    {
        throw FprintfException("fprintf error occurred.");
    }

    // Throw an exception with the text that would have been sent to the file
    throw FprintfException(buffer);

    // Return the number of characters that would have been written to the file
    // return result;
}
// Macro to replace fprintf calls with my_fprintf
#define fprintf my_fprintf

#include "abi.hpp"
#include <wasmtime.hh>

#include <fstream>
#include <iostream>
#include <sstream>
#include <map>
#include <regex>

using namespace wasmtime;

std::vector<uint8_t> read_wasm_binary_to_buffer(const std::string &filename)
{
    std::ifstream file(filename, std::ios::binary | std::ios::ate);
    if (!file)
    {
        throw std::runtime_error("Failed to open file");
    }

    std::streamsize size = file.tellg();
    file.seekg(0, std::ios::beg);

    std::vector<uint8_t> buffer(size);
    if (!file.read(reinterpret_cast<char *>(buffer.data()), size))
    {
        throw std::runtime_error("Failed to read file");
    }

    return buffer;
}

std::string extractContentInDoubleQuotes(const std::string &input)
{
    std::regex pattern("export \"([^\"]*)\"");
    std::smatch match;

    if (std::regex_search(input, match, pattern) && match.size() > 1)
    {
        return match.str(1);
    }

    return "";
}

std::pair<std::string, std::string> splitQualifiedName(const std::string &qualifiedName)
{
    std::istringstream iss(qualifiedName);
    std::vector<std::string> tokens;
    std::string token;

    while (std::getline(iss, token, '.'))
    {
        tokens.push_back(token);
    }
    if (tokens.size() != 2)
    {
        throw std::runtime_error("Invalid import function " + qualifiedName + ", expected format: <module>.<function>");
    }
    return std::make_pair(tokens[0], tokens[1]);
}

std::string joinQualifiedName(const std::string &wasmName, const std::string &funcName)
{
    return wasmName + "." + funcName;
}

wasmtime::Engine engine;
wasmtime::Store store(engine);

std::map<std::string, wasmtime::Instance> wasmInstances;
std::map<std::string, wasmtime::Memory> wasmMems;
std::map<std::string, wasmtime::Func> wasmFuncs;

class Val
{
    Val()
    {
    }

public:
};

class SecureFunction : public ISecureEnclave
{
    IWasmEmbedCallback &embedContext;
    const IThorActivityContext *activityCtx = nullptr;
    std::vector<wasmtime::Val> args;
    std::vector<wasmtime::Val> results;
    uint32_t crcValue;
    std::string wasmName;
    std::string funcName;

public:
    SecureFunction(IWasmEmbedCallback &embedContext) : embedContext(embedContext)
    {
        embedContext.dbglog("se:constructor");
        // embedContext.dbglog("se:Create wasi");
        // WasiConfig wasi;
        // // wasi.inherit_argv();
        // // wasi.inherit_env();
        // // wasi.inherit_stdin();
        // // wasi.inherit_stdout();
        // // wasi.inherit_stderr();
        // store.context().set_wasi(std::move(wasi)).unwrap();
        // linker.define_wasi().unwrap();
    }

    virtual ~SecureFunction() override
    {
        embedContext.dbglog("se:destructor");
    }

    //  IEmbedFunctionContext ---
    void setActivityContext(const IThorActivityContext *_activityCtx)
    {
        activityCtx = _activityCtx;
    }

    virtual void Link() const
    {
    }

    virtual bool Release() const
    {
        return false;
    };

    virtual IInterface *bindParamWriter(IInterface *esdl, const char *esdlservice, const char *esdltype, const char *name)
    {
        embedContext.dbglog("paramWriterCommit");
        return NULL;
    }
    virtual void paramWriterCommit(IInterface *writer)
    {
        embedContext.dbglog("paramWriterCommit");
    }
    virtual void writeResult(IInterface *esdl, const char *esdlservice, const char *esdltype, IInterface *writer)
    {
        embedContext.dbglog("writeResult");
    }
    virtual void bindBooleanParam(const char *name, bool val)
    {
        embedContext.dbglog("bindBooleanParam %s %i");
    }
    virtual void bindDataParam(const char *name, size32_t len, const void *val)
    {
        embedContext.dbglog("bindDataParam %s %i");
    }
    virtual void bindFloatParam(const char *name, float val)
    {
        embedContext.dbglog("bindFloatParam %s %f");
        args.push_back(wasmtime::Val(val));
    }
    virtual void bindRealParam(const char *name, double val)
    {
        embedContext.dbglog("bindRealParam %s %f");
        args.push_back(wasmtime::Val(val));
    }
    virtual void bindSignedSizeParam(const char *name, int size, __int64 val)
    {
        embedContext.dbglog("bindSignedSizeParam %s %i %lld");
        if (size <= 4)
            args.push_back(wasmtime::Val((int32_t)val));
        else
            args.push_back(wasmtime::Val((int64_t)val));
    }
    virtual void bindSignedParam(const char *name, __int64 val)
    {
        embedContext.dbglog("bindSignedParam %s %lld");
    }
    virtual void bindUnsignedSizeParam(const char *name, int size, unsigned __int64 val)
    {
        embedContext.dbglog("bindUnsignedSizeParam %s %i %llu");
    }
    virtual void bindUnsignedParam(const char *name, unsigned __int64 val)
    {
        embedContext.dbglog("bindUnsignedParam %s %llu");
    }
    virtual void bindStringParam(const char *qualifiedName, size32_t len, const char *val)
    {
        embedContext.dbglog("bindStringParam " + std::string(qualifiedName) + " " + std::string(val) + " " + std::to_string(len));
        auto newBuffer = wasmFuncs.find(joinQualifiedName(wasmName, "new-buffer"));
        if (newBuffer == wasmFuncs.end())
        {
            throw std::runtime_error("Missing:  new-buffer");
        }
        auto memIdxVar = newBuffer->second.call(store, {wasmtime::Val((int32_t)len)}).unwrap();
        auto memIdx = memIdxVar[0].i32();
        auto mem = wasmMems.find(wasmName);
        auto memXXX = mem->second.data(store.context());
        for (int i = 0; i < len; i++)
        {
            memXXX[memIdx + i] = val[i];
        }
        args.push_back(wasmtime::Val(memIdx));
        args.push_back(wasmtime::Val((int32_t)len));

        // std::string tmp(val, len);
        // wasmtime::ExternRef externRef(tmp);

        // auto [wasmName, funcName] = splitQualifiedName(qualifiedName);
        // auto itr = wasmMems.find(wasmName);
        // if (itr == wasmMems.end())
        // {
        //     throw std::runtime_error("Memory not found");
        // }

        // auto memory = itr->second;
        // Table table = std::get<Table>(*instance.get(store, "table"));
        // table.set(store, 3, externRef).unwrap();
        // ExternRef extRefVal = *table.get(store, 3)->externref();
        // args.push_back(wasmtime::Val((int32_t)externRef.raw()));
        // args.push_back(wasmtime::Val((int32_t)len));
    }
    virtual void bindVStringParam(const char *name, const char *val)
    {
        embedContext.dbglog("bindVStringParam %s %s");
    }
    virtual void bindUTF8Param(const char *name, size32_t chars, const char *val)
    {
        embedContext.dbglog("bindUTF8Param %s %i %s");
    }
    virtual void bindUnicodeParam(const char *name, size32_t chars, const UChar *val)
    {
        embedContext.dbglog("bindUnicodeParam %s %i");
    }
    virtual void bindSetParam(const char *name, int elemType, size32_t elemSize, bool isAll, size32_t totalBytes, const void *setData)
    {
        embedContext.dbglog("bindSetParam %s %i %i %i %i %p");
    }
    virtual void bindRowParam(const char *name, IOutputMetaData &metaVal, const byte *val) override
    {
        embedContext.dbglog("bindRowParam %s %p");
    }
    virtual void bindDatasetParam(const char *name, IOutputMetaData &metaVal, IRowStream *val)
    {
        embedContext.dbglog("bindDatasetParam %s %p");
    }
    virtual bool getBooleanResult()
    {
        embedContext.dbglog("getBooleanResult");
        return false;
    }
    virtual void getDataResult(size32_t &__len, void *&__result)
    {
        embedContext.dbglog("getDataResult");
    }
    virtual double getRealResult()
    {
        embedContext.dbglog("getRealResult");
        if (results[0].kind() == wasmtime::ValKind::F64)
            return (int32_t)results[0].f64();
        return results[0].f32();
    }
    virtual __int64 getSignedResult()
    {
        embedContext.dbglog("getSignedResult");
        if (results[0].kind() == wasmtime::ValKind::I64)
            return (int32_t)results[0].i64();
        return results[0].i32();
    }
    virtual unsigned __int64 getUnsignedResult()
    {
        embedContext.dbglog("getUnsignedResult");
        if (results[0].kind() == wasmtime::ValKind::I64)
            return (int32_t)results[0].i64();
        return results[0].i32();
    }

    virtual void getStringResult(size32_t &__chars, char *&__result)
    {
        embedContext.dbglog("getStringResult " + std::to_string(results.size()));
        auto memRef = wasmMems.find(wasmName);
        auto mem = memRef->second.data(store.context());
        auto offset = results[0].i32();
        embedContext.dbglog("getStringResult (offset) " + std::to_string(offset));
        std::string s = load_string(mem, offset);
        embedContext.dbglog("getStringResult (std::string) " + s);
        __chars = s.length();
        embedContext.dbglog("getStringResult (__chars) " + std::to_string(__chars));
        __result = (char *)rtlMalloc(__chars + 1);
        memcpy(__result, s.c_str(), __chars);

        // size32_t ptr = load_int(mem, offset, 4);
        // embedContext.dbglog("getStringResult (ptr) " + std::to_string(ptr));
        // __chars = (size32_t)mem[offset + 4];
        // embedContext.dbglog("getStringResult (__chars) " + std::to_string(__chars));
        // std::string s = load_string(mem, ptr);

        // embedContext.dbglog("getStringResult (__chars) " + std::to_string(mem[offset]));
        // embedContext.dbglog("getStringResult (__chars) " + std::to_string(mem[offset + 1]));
        // embedContext.dbglog("getStringResult (__chars) " + std::to_string(mem[offset + 2]));
        // embedContext.dbglog("getStringResult (__chars) " + std::to_string(mem[offset + 3]));
        // embedContext.dbglog("getStringResult (__chars) " + std::to_string(mem[offset + 4]));
        // embedContext.dbglog("getStringResult (__chars) " + std::to_string(mem[offset + 5]));
        // embedContext.dbglog("getStringResult (__chars) " + std::to_string(mem[offset + 6]));
        // for (int i = 0; i < __chars; i++)
        // {
        //     __result[i] = mem[ptr + i];
        // }
    }
    virtual void getUTF8Result(size32_t &__chars, char *&__result)
    {
        embedContext.dbglog("getUTF8Result");
    }
    virtual void getUnicodeResult(size32_t &__chars, UChar *&__result)
    {
        embedContext.dbglog("getUnicodeResult");
    }
    virtual void getSetResult(bool &__isAllResult, size32_t &__resultBytes, void *&__result, int elemType, size32_t elemSize)
    {
        embedContext.dbglog("getSetResult");
    }
    virtual IRowStream *getDatasetResult(IEngineRowAllocator *_resultAllocator)
    {
        embedContext.dbglog("getDatasetResult");
        return NULL;
    }
    virtual byte *getRowResult(IEngineRowAllocator *_resultAllocator)
    {
        embedContext.dbglog("getRowResult");
        return NULL;
    }
    virtual size32_t getTransformResult(ARowBuilder &builder)
    {
        embedContext.dbglog("getTransformResult");
        return 0;
    }
    virtual void loadCompiledScript(size32_t chars, const void *_script) override
    {
        embedContext.dbglog("loadCompiledScript %p");
    }
    virtual void enter() override
    {
        embedContext.dbglog("enter");
    }
    virtual void reenter(ICodeContext *codeCtx) override
    {
        embedContext.dbglog("reenter");
    }
    virtual void exit() override
    {
        embedContext.dbglog("exit");
        args.clear();
    }
    wasmtime::Instance registerInstance(const std::string &wasmName, const std::variant<std::string_view, Span<uint8_t>> &wasm)
    {
        embedContext.dbglog("registerInstance " + wasmName);
        auto instanceItr = wasmInstances.find(wasmName);
        if (instanceItr == wasmInstances.end())
        {
            embedContext.dbglog("resolveModule " + wasmName);
            auto module = std::holds_alternative<std::string_view>(wasm) ? Module::compile(engine, std::get<std::string_view>(wasm)).unwrap() : Module::compile(engine, std::get<Span<uint8_t>>(wasm)).unwrap();
            embedContext.dbglog("resolveModule2 " + wasmName);

            WasiConfig wasi;
            wasi.inherit_argv();
            wasi.inherit_env();
            wasi.inherit_stdin();
            wasi.inherit_stdout();
            wasi.inherit_stderr();
            store.context().set_wasi(std::move(wasi)).unwrap();
            embedContext.dbglog("resolveModule3 " + wasmName);

            Linker linker(engine);
            linker.define_wasi().unwrap();
            embedContext.dbglog("resolveModule4 " + wasmName);

            auto newInstance = linker.instantiate(store, module).unwrap();
            linker.define_instance(store, "linking2", newInstance).unwrap();

            embedContext.dbglog("resolveModule5 " + wasmName);

            wasmInstances.insert(std::make_pair(wasmName, newInstance));
            embedContext.dbglog("resolveModule6 " + wasmName);

            auto memory = std::get<Memory>(*newInstance.get(store, "memory"));
            wasmMems.insert(std::make_pair(wasmName, memory));

            for (auto exportItem : module.exports())
            {
                auto externType = ExternType::from_export(exportItem);
                if (std::holds_alternative<wasmtime::FuncType::Ref>(externType))
                {
                    std::string name(exportItem.name());
                    embedContext.dbglog(std::string("Exported function: ") + name);
                    auto func = std::get<Func>(*newInstance.get(store, name));
                    wasmFuncs.insert(std::make_pair(wasmName + "." + name, func));
                }
            }

            return newInstance;
        }
        return instanceItr->second;
    }
    virtual void compileEmbeddedScript(size32_t lenChars, const char *utf)
    {
        embedContext.dbglog("compileEmbeddedScript %s");
        funcName = extractContentInDoubleQuotes(utf);
        wasmName = "embed_" + funcName;
        auto instance = registerInstance(wasmName, utf);
    }
    virtual void importFunction(size32_t lenChars, const char *qualifiedName)
    {
        embedContext.dbglog(std::string("importFunction:  ") + qualifiedName);
        auto [wasmName, funcName] = splitQualifiedName(qualifiedName);
        auto instanceItr = wasmInstances.find(wasmName);
        if (instanceItr == wasmInstances.end())
        {
            std::string fullPath = embedContext.resolvePath((wasmName + ".wasm").c_str());
            embedContext.dbglog("importFunction:  fullPath " + fullPath);
            embedContext.dbglog(std::string("se:Instantiate module ") + wasmName);
            auto wasmFile = read_wasm_binary_to_buffer(fullPath);
            registerInstance(wasmName, wasmFile);
        }
    }
    virtual void callFunction()
    {
        auto qualifiedID = joinQualifiedName(wasmName, funcName);
        embedContext.dbglog("callFunction " + qualifiedID);

        auto myFunc = wasmFuncs.find(qualifiedID);
        if (myFunc == wasmFuncs.end())
        {
            throw std::runtime_error("Invalid function name");
        }
        embedContext.dbglog("do call " + qualifiedID + " " + std::to_string(args.size()));
        results = myFunc->second.call(store, args).unwrap();

        embedContext.dbglog("result count " + std::to_string(results.size()));
    }
};

std::unique_ptr<ISecureEnclave> createISecureEnclave(IWasmEmbedCallback &embedContext)
{
    return std::make_unique<SecureFunction>(embedContext);
}
