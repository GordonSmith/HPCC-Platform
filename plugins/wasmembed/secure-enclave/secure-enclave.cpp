#include "secure-enclave.hpp"

#include <wasmtime.hh>

#include <mutex>
#include <fstream>
#include <iostream>
#include <sstream>

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

class SecureFunction : public IEmbedFunctionContext
{
    Engine &engine;
    Store &store;
    Linker &linker;

    SecureFunction(Engine &engine, Store &store, Linker &linker) : engine(engine), store(store), linker(linker)
    {
    }

    //  IEmbedFunctionContext ---
    virtual void Link() const
    {
    }
    virtual bool Release() const
    {
        return false;
    };

    virtual IInterface *bindParamWriter(IInterface *esdl, const char *esdlservice, const char *esdltype, const char *name)
    {
        // DBGLOG("paramWriterCommit");
        return NULL;
    }
    virtual void paramWriterCommit(IInterface *writer)
    {
        // DBGLOG("paramWriterCommit");
    }
    virtual void writeResult(IInterface *esdl, const char *esdlservice, const char *esdltype, IInterface *writer)
    {
        // DBGLOG("writeResult");
    }
    virtual void bindBooleanParam(const char *name, bool val)
    {
        // DBGLOG("bindBooleanParam %s %i", name, val);
    }
    virtual void bindDataParam(const char *name, size32_t len, const void *val)
    {
        // DBGLOG("bindDataParam %s %i", name, len);
    }
    virtual void bindFloatParam(const char *name, float val)
    {
        // DBGLOG("bindFloatParam %s %f", name, val);
    }
    virtual void bindRealParam(const char *name, double val)
    {
        // DBGLOG("bindRealParam %s %f", name, val);
    }
    virtual void bindSignedSizeParam(const char *name, int size, __int64 val)
    {
        // DBGLOG("bindSignedSizeParam %s %i %lld", name, size, val);
    }
    virtual void bindSignedParam(const char *name, __int64 val)
    {
        // DBGLOG("bindSignedParam %s %lld", name, val);
    }
    virtual void bindUnsignedSizeParam(const char *name, int size, unsigned __int64 val)
    {
        // DBGLOG("bindUnsignedSizeParam %s %i %llu", name, size, val);
    }
    virtual void bindUnsignedParam(const char *name, unsigned __int64 val)
    {
        // DBGLOG("bindUnsignedParam %s %llu", name, val);
    }
    virtual void bindStringParam(const char *name, size32_t len, const char *val)
    {
        // DBGLOG("bindStringParam %s %i %s", name, len, val);
    }
    virtual void bindVStringParam(const char *name, const char *val)
    {
        // DBGLOG("bindVStringParam %s %s", name, val);
    }
    virtual void bindUTF8Param(const char *name, size32_t chars, const char *val)
    {
        // DBGLOG("bindUTF8Param %s %i %s", name, chars, val);
    }
    virtual void bindUnicodeParam(const char *name, size32_t chars, const UChar *val)
    {
        // DBGLOG("bindUnicodeParam %s %i", name, chars);
    }
    virtual void bindSetParam(const char *name, int elemType, size32_t elemSize, bool isAll, size32_t totalBytes, const void *setData)
    {
        // DBGLOG("bindSetParam %s %i %i %i %i %p", name, elemType, elemSize, isAll, totalBytes, setData);
    }
    virtual void bindRowParam(const char *name, IOutputMetaData &metaVal, const byte *val) override
    {
        // DBGLOG("bindRowParam %s %p", name, static_cast<const void *>(val));
    }
    virtual void bindDatasetParam(const char *name, IOutputMetaData &metaVal, IRowStream *val)
    {
        // DBGLOG("bindDatasetParam %s %p", name, static_cast<void *>(val));
    }
    virtual bool getBooleanResult()
    {
        // DBGLOG("getBooleanResult");
        return false;
    }
    virtual void getDataResult(size32_t &__len, void *&__result)
    {
        // DBGLOG("getDataResult");
    }
    virtual double getRealResult()
    {
        // DBGLOG("getRealResult");
        return 0;
    }
    virtual __int64 getSignedResult()
    {
        // DBGLOG("getSignedResult");
        return 0;
    }
    virtual unsigned __int64 getUnsignedResult()
    {
        // DBGLOG("getUnsignedResult");
        return 0;
    }
    virtual void getStringResult(size32_t &__chars, char *&__result)
    {
        // DBGLOG("getStringResult");
    }
    virtual void getUTF8Result(size32_t &__chars, char *&__result)
    {
        // DBGLOG("getUTF8Result");
    }
    virtual void getUnicodeResult(size32_t &__chars, UChar *&__result)
    {
        // DBGLOG("getUnicodeResult");
    }
    virtual void getSetResult(bool &__isAllResult, size32_t &__resultBytes, void *&__result, int elemType, size32_t elemSize)
    {
        // DBGLOG("getSetResult");
    }
    virtual IRowStream *getDatasetResult(IEngineRowAllocator *_resultAllocator)
    {
        // DBGLOG("getDatasetResult");
        return NULL;
    }
    virtual byte *getRowResult(IEngineRowAllocator *_resultAllocator)
    {
        // DBGLOG("getRowResult");
        return NULL;
    }
    virtual size32_t getTransformResult(ARowBuilder &builder)
    {
        // DBGLOG("getTransformResult");
        return 0;
    }
    virtual void compileEmbeddedScript(size32_t lenChars, const char *utf)
    {
        // DBGLOG("compileEmbeddedScript %s", utf);
    }
    virtual void loadCompiledScript(size32_t chars, const void *_script) override
    {
        // DBGLOG("loadCompiledScript %p", _script);
    }
    virtual void enter() override
    {
        // DBGLOG("enter");
    }
    virtual void reenter(ICodeContext *codeCtx) override
    {
        // DBGLOG("reenter");
    }
    virtual void exit() override
    {
        // DBGLOG("exit");
    }
    virtual void importFunction(size32_t lenChars, const char *utf)
    {
        // DBGLOG("importFunction %s", utf);
    }
    virtual void callFunction()
    {
        // DBGLOG("callFunction");
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
    std::function<void(const char *)> dbglog;

    SecureEnclave(std::function<void(const char *)> _dbglog) : store(engine),
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

    static std::shared_ptr<ISecureEnclave> getInstance(std::function<void(const char *)> dbglog)
    {
        std::call_once(initFlag, [dbglog]()
                       { instance = std::shared_ptr<SecureEnclave>(new SecureEnclave(dbglog)); });
        instance = std::shared_ptr<SecureEnclave>(new SecureEnclave(dbglog));
        return instance;
    }

    //  ISecureEnclave  ---
    virtual void appendWatModule(const char *wat)
    {
        dbglog("Compiling module");
        auto module = Module::compile(engine, wat).unwrap();

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
        wasmInstance = linker.instantiate(store, module).unwrap();
        dbglog("se:Link module...");
        linker.define_instance(store, "linking", wasmInstance.value()).unwrap();

        dbglog("se:Extract memory...");
        auto memory = std::get<Memory>(*(wasmInstance.value()).get(store, "memory"));
    }
    virtual void callFunction(const char *funcName, Values values)
    {
        dbglog("Extracting myfunc...");
        auto tmp = wasmInstance.value();
        auto myFunc = std::get<Func>(*tmp.get(store, funcName));

        // And last but not least we can call it!
        dbglog("Calling myFunc...");
        std::vector<wasmtime::Val> args;
        for (auto value : values)
        {
            switch (value.first)
            {
            case DataType::INT32:
                args.push_back(wasmtime::Val(std::get<int32_t>(value.second)));
                break;
            case DataType::INT64:
                args.push_back(wasmtime::Val(std::get<int64_t>(value.second)));
                break;
            case DataType::FLOAT32:
                args.push_back(wasmtime::Val(std::get<float32_t>(value.second)));
                break;
            case DataType::FLOAT64:
                args.push_back(wasmtime::Val(std::get<float64_t>(value.second)));
                break;
            }
        }
        results = myFunc.call(store, args).unwrap();
        dbglog(std::to_string(results[0].i32()).c_str());
        dbglog("Done");
    }

    virtual int32_t
    i32Result()
    {
        if (results[0].kind() == wasmtime::ValKind::I64)
            return (int32_t)results[0].i64();
        return results[0].i32();
    };

    virtual int64_t i64Result()
    {
        if (results[0].kind() == wasmtime::ValKind::I32)
            return (int64_t)results[0].i32();
        return results[0].i64();
    }
    virtual float32_t f32Result()
    {
        if (results[0].kind() == wasmtime::ValKind::F64)
            return (float32_t)results[0].f64();
        return results[0].f32();
    }
    virtual float64_t f64Result()
    {
        if (results[0].kind() == wasmtime::ValKind::F32)
            return (float64_t)results[0].f32();
        return results[0].f64();
    }
};

std::shared_ptr<ISecureEnclave> createISecureEnclave(std::function<void(const char *)> dbglog)
{
    return SecureEnclave::getInstance(dbglog);
}
