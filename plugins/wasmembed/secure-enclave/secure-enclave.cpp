#include "secure-enclave.hpp"

#include <wasmtime.hh>

#include <mutex>
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

class SecureFunction : public IWasmFunctionContext
{
    Engine &engine;
    Store &store;
    Linker &linker;
    std::function<void(const std::string &)> dbglog;
    const IThorActivityContext *activityCtx = nullptr;
    std::vector<wasmtime::Val> args;
    std::vector<wasmtime::Val> results;
    std::map<std::string, std::optional<wasmtime::Instance>> wasmInstances;
    uint32_t crcValue;
    std::string funcName;

public:
    SecureFunction(Engine &engine, Store &store, Linker &linker, std::function<void(const std::string &)> dbglog) : engine(engine), store(store), linker(linker), dbglog(dbglog)
    {
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
        dbglog("paramWriterCommit");
        return NULL;
    }
    virtual void paramWriterCommit(IInterface *writer)
    {
        dbglog("paramWriterCommit");
    }
    virtual void writeResult(IInterface *esdl, const char *esdlservice, const char *esdltype, IInterface *writer)
    {
        dbglog("writeResult");
    }
    virtual void bindBooleanParam(const char *name, bool val)
    {
        dbglog("bindBooleanParam %s %i");
    }
    virtual void bindDataParam(const char *name, size32_t len, const void *val)
    {
        dbglog("bindDataParam %s %i");
    }
    virtual void bindFloatParam(const char *name, float val)
    {
        dbglog("bindFloatParam %s %f");
        args.push_back(wasmtime::Val(val));
    }
    virtual void bindRealParam(const char *name, double val)
    {
        dbglog("bindRealParam %s %f");
        args.push_back(wasmtime::Val(val));
    }
    virtual void bindSignedSizeParam(const char *name, int size, __int64 val)
    {
        dbglog("bindSignedSizeParam %s %i %lld");
        if (size <= 4)
            args.push_back(wasmtime::Val((int32_t)val));
        else
            args.push_back(wasmtime::Val((int64_t)val));
    }
    virtual void bindSignedParam(const char *name, __int64 val)
    {
        dbglog("bindSignedParam %s %lld");
    }
    virtual void bindUnsignedSizeParam(const char *name, int size, unsigned __int64 val)
    {
        dbglog("bindUnsignedSizeParam %s %i %llu");
    }
    virtual void bindUnsignedParam(const char *name, unsigned __int64 val)
    {
        dbglog("bindUnsignedParam %s %llu");
    }
    virtual void bindStringParam(const char *name, size32_t len, const char *val)
    {
        dbglog("bindStringParam %s %i %s");
    }
    virtual void bindVStringParam(const char *name, const char *val)
    {
        dbglog("bindVStringParam %s %s");
    }
    virtual void bindUTF8Param(const char *name, size32_t chars, const char *val)
    {
        dbglog("bindUTF8Param %s %i %s");
    }
    virtual void bindUnicodeParam(const char *name, size32_t chars, const UChar *val)
    {
        dbglog("bindUnicodeParam %s %i");
    }
    virtual void bindSetParam(const char *name, int elemType, size32_t elemSize, bool isAll, size32_t totalBytes, const void *setData)
    {
        dbglog("bindSetParam %s %i %i %i %i %p");
    }
    virtual void bindRowParam(const char *name, IOutputMetaData &metaVal, const byte *val) override
    {
        dbglog("bindRowParam %s %p");
    }
    virtual void bindDatasetParam(const char *name, IOutputMetaData &metaVal, IRowStream *val)
    {
        dbglog("bindDatasetParam %s %p");
    }
    virtual bool getBooleanResult()
    {
        dbglog("getBooleanResult");
        return false;
    }
    virtual void getDataResult(size32_t &__len, void *&__result)
    {
        dbglog("getDataResult");
    }
    virtual double getRealResult()
    {
        dbglog("getRealResult");
        if (results[0].kind() == wasmtime::ValKind::F64)
            return (int32_t)results[0].f64();
        return results[0].f32();
    }
    virtual __int64 getSignedResult()
    {
        dbglog("getSignedResult");
        if (results[0].kind() == wasmtime::ValKind::I64)
            return (int32_t)results[0].i64();
        return results[0].i32();
    }
    virtual unsigned __int64 getUnsignedResult()
    {
        dbglog("getUnsignedResult");
        if (results[0].kind() == wasmtime::ValKind::I64)
            return (int32_t)results[0].i64();
        return results[0].i32();
    }
    virtual void getStringResult(size32_t &__chars, char *&__result)
    {
        dbglog("getStringResult");
    }
    virtual void getUTF8Result(size32_t &__chars, char *&__result)
    {
        dbglog("getUTF8Result");
    }
    virtual void getUnicodeResult(size32_t &__chars, UChar *&__result)
    {
        dbglog("getUnicodeResult");
    }
    virtual void getSetResult(bool &__isAllResult, size32_t &__resultBytes, void *&__result, int elemType, size32_t elemSize)
    {
        dbglog("getSetResult");
    }
    virtual IRowStream *getDatasetResult(IEngineRowAllocator *_resultAllocator)
    {
        dbglog("getDatasetResult");
        return NULL;
    }
    virtual byte *getRowResult(IEngineRowAllocator *_resultAllocator)
    {
        dbglog("getRowResult");
        return NULL;
    }
    virtual size32_t getTransformResult(ARowBuilder &builder)
    {
        dbglog("getTransformResult");
        return 0;
    }
    virtual void compileEmbeddedScript(size32_t lenChars, const char *_utf)
    {
        dbglog("compileEmbeddedScript %s");
        // std::string utf = "(module\n" + std::string(_utf) + "\n)\n";
        std::string utf = _utf;

        auto module = Module::compile(engine, utf).unwrap();

        // std::cout << "Creating callback...\n";
        // auto secureEnclave_func = linker.func_wrap("global", "print",
        //                                   [](Caller caller, uint32_t msg, uint32_t msg_len)
        //                                   {

        //                                       // const uint8_t* data = memory.data();
        //                                       //     std::string str(reinterpret_cast<const char*>(data + msg), reinterpret_cast<const char*>(data + msg + msg_len));

        //                                       // auto memory = std::get<Memory>(*caller.get_export("memory"));
        //                                       // auto type = memory.type(caller.context());
        //                                       // auto data = memory.data(caller.context());
        //                                       // auto size = memory.size(caller.context());

        //                                       // std::string str(data[msg], data[msg] + msg_len);

        //                                       // Copy the string from the Wasm memory into the C++ string
        //                                       // const char *msg_ptr = reinterpret_cast<const char *>(data[msg]);
        //                                       // auto memory = std::get<Memory>(caller.get_export("memory")).unwrap();
        //                                       // auto xxx = memory[msg];
        //                                       // auto msg = memory.data(store)[msg];

        //     auto memory = std::get<Memory>(*caller.get_export("memory"));
        //     auto data = memory.data(caller.context());
        //     auto msg_ptr = (char *)&data[msg];
        //     std::string str(msg_ptr, msg_len);
        //     printf("print: %s\n", str.c_str()); })
        //                      .unwrap();

        // Once we've got that all set up we can then move to the instantiation
        // phase, pairing together a compiled module as well as a set of imports.
        // Note that this is where the wasm `start` function, if any, would run.
        dbglog("se:Instantiating module...");

        funcName = extractContentInDoubleQuotes(utf);

        if (wasmInstances.find(funcName) == wasmInstances.end())
        {
            dbglog("se:Instantiate module " + funcName);
            auto instance = linker.instantiate(store, module).unwrap();
            wasmInstances[funcName] = instance;
            dbglog("se:Link module...");
            linker.define_instance(store, "linking", instance).unwrap();
        }
        else
        {
            dbglog("se:Skip Instantiate module " + funcName);
        }

        // dbglog("se:Extract memory...");
        // auto memory = std::get<Memory>(*(wasmInstance.value()).get(store, "memory"));
    }
    virtual void loadCompiledScript(size32_t chars, const void *_script) override
    {
        dbglog("loadCompiledScript %p");
    }
    virtual void enter() override
    {
        dbglog("enter");
    }
    virtual void reenter(ICodeContext *codeCtx) override
    {
        dbglog("reenter");
    }
    virtual void exit() override
    {
        dbglog("exit");
        args.clear();
    }
    virtual void importFunction(size32_t lenChars, const char *utf)
    {
        dbglog("importFunction %s");
    }
    virtual void callFunction()
    {
        dbglog("callFunction " + funcName);

        dbglog("resolve instance " + funcName);
        auto tmp = wasmInstances[funcName].value();

        dbglog("resolve function " + funcName);
        auto myFunc = std::get<Func>(*tmp.get(store, funcName));

        dbglog("call function " + funcName);
        results = myFunc.call(store, args).unwrap();

        dbglog("result count " + std::to_string(results.size()));
        // dbglog("result type " + std::to_string(results[0].kind()));
    }
};

std::shared_ptr<ISecureEnclave> instance;
std::once_flag initFlag;

class SecureEnclave : public ISecureEnclave
{
protected:
    Engine engine;
    Store store;
    Linker linker;
    std::optional<Instance> wasmInstance;
    std::vector<wasmtime::Val> results;
    std::function<void(const std::string &)> dbglog;

    SecureEnclave(std::function<void(const std::string &)> _dbglog) : store(engine),
                                                                      linker(engine),
                                                                      dbglog(_dbglog)
    {
        dbglog("se:constructor");
        dbglog("se:Create wasi");
        WasiConfig wasi;
        // wasi.inherit_argv();
        // wasi.inherit_env();
        // wasi.inherit_stdin();
        // wasi.inherit_stdout();
        // wasi.inherit_stderr();
        store.context().set_wasi(std::move(wasi)).unwrap();

        dbglog("Linking");
        linker.define_wasi().unwrap();
    }

public:
    SecureEnclave(const SecureEnclave &) = delete;
    SecureEnclave &operator=(const SecureEnclave &) = delete;
    ~SecureEnclave()
    {
        dbglog("se:destructor");
    }

    static std::shared_ptr<ISecureEnclave> getInstance(std::function<void(const std::string &)> dbglog)
    {
        std::call_once(initFlag, [dbglog]()
                       { instance = std::shared_ptr<SecureEnclave>(new SecureEnclave(dbglog)); });
        return instance;
    }

    //  ISecureEnclave  ---
    virtual std::shared_ptr<IWasmFunctionContext> createFunctionContext()
    {
        std::shared_ptr<IWasmFunctionContext> retVal = std::shared_ptr<SecureFunction>(new SecureFunction(engine, store, linker, dbglog));
        return retVal;
    }
};

std::shared_ptr<ISecureEnclave> createISecureEnclave(std::function<void(const std::string &)> dbglog)
{
    return SecureEnclave::getInstance(dbglog);
}
