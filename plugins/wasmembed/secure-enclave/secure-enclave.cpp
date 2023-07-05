#include "secure-enclave.hpp"

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
    std::regex pattern("\"([^\"]*)\"");
    std::smatch match;

    if (std::regex_search(input, match, pattern) && match.size() > 1)
    {
        return match.str(1);
    }

    return "";
}

class SecureFunction : public ISecureEnclave
{
    Engine engine;
    Store store;
    Linker linker;
    IWasmEmbedCallback &embedContext;
    const IThorActivityContext *activityCtx = nullptr;
    std::vector<wasmtime::Val> args;
    std::vector<wasmtime::Val> results;
    std::map<std::string, std::optional<wasmtime::Instance>> wasmInstances;
    uint32_t crcValue;
    std::string wasmName;
    std::string funcName2;

public:
    SecureFunction(IWasmEmbedCallback &embedContext) : store(engine),
                                                       linker(engine),
                                                       embedContext(embedContext)
    {
        embedContext.dbglog("se:constructor");
        embedContext.dbglog("se:Create wasi");
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
    virtual void bindStringParam(const char *name, size32_t len, const char *val)
    {
        embedContext.dbglog("bindStringParam %s %i %s");
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
        embedContext.dbglog("getStringResult");
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
    virtual void compileEmbeddedScript(size32_t lenChars, const char *utf)
    {
        embedContext.dbglog("compileEmbeddedScript %s");

        funcName2 = extractContentInDoubleQuotes(utf);
        wasmName = "embed." + funcName2;
        if (wasmInstances.find(wasmName) == wasmInstances.end())
        {
            embedContext.dbglog("se:Instantiate module " + funcName2);
            auto module = Module::compile(engine, utf).unwrap();
            auto instance = linker.instantiate(store, module).unwrap();
            wasmInstances[wasmName] = instance;
            embedContext.dbglog("se:Link module...");
            linker.define_instance(store, "linking", instance).unwrap();
        }
        else
        {
            embedContext.dbglog("se:Skip Instantiate module " + funcName2);
        }
    }
    virtual void importFunction(size32_t lenChars, const char *qualifiedName)
    {
        embedContext.dbglog(std::string("importFunction:  ") + qualifiedName);
        std::istringstream iss(qualifiedName);
        std::vector<std::string> tokens;
        std::string token;

        while (std::getline(iss, token, '.'))
        {
            tokens.push_back(token);
        }
        if (tokens.size() != 2)
        {
            throw std::runtime_error("Invalid import function string, expected format: <module>.<function>");
        }
        wasmName = tokens[0];
        funcName2 = tokens[1];
        if (wasmInstances.find(wasmName) == wasmInstances.end())
        {
            std::string fullPath = embedContext.resolvePath((wasmName + ".wasm").c_str());
            embedContext.dbglog("importFunction:  fullPath " + fullPath);
            embedContext.dbglog(std::string("se:Instantiate module ") + qualifiedName);
            auto wasmFile = read_wasm_binary_to_buffer(fullPath);
            auto module = Module::compile(engine, wasmFile).unwrap();
            auto instance = linker.instantiate(store, module).unwrap();
            wasmInstances[wasmName] = instance;
            embedContext.dbglog("se:Link module...");
            linker.define_instance(store, "linking", instance).unwrap();
        }
        else
        {
            embedContext.dbglog(std::string("se:Skip Instantiate module ") + qualifiedName);
        }
    }
    virtual void callFunction()
    {
        embedContext.dbglog("callFunction " + funcName2);

        embedContext.dbglog("resolve instance " + funcName2);
        auto tmp = wasmInstances[wasmName].value();

        embedContext.dbglog("resolve function " + funcName2);
        auto myFunc = std::get<Func>(*tmp.get(store, funcName2));

        embedContext.dbglog("call function " + funcName2);
        results = myFunc.call(store, args).unwrap();

        embedContext.dbglog("result count " + std::to_string(results.size()));
        // embedContext.dbglog("result type " + std::to_string(results[0].kind()));
    }
};

std::unique_ptr<ISecureEnclave> createISecureEnclave(IWasmEmbedCallback &embedContext)
{
    return std::make_unique<SecureFunction>(embedContext);
}
