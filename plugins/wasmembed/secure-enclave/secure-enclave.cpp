#include "secure-enclave.hpp"

#include "abi.hpp"

#include <map>
#include <functional>

std::shared_ptr<IWasmEmbedCallback> embedContextCallbacks;

#define NENABLE_TRACE

#ifdef ENABLE_TRACE
#define TRACE(format, ...) embedContextCallbacks->DBGLOG(format, ##__VA_ARGS__)
#else
#define TRACE(format, ...) \
    do                     \
    {                      \
    } while (0)
#endif

wasmtime::Engine engine;
wasmtime::Store store(engine);

std::map<std::string, wasmtime::Instance> wasmInstances;
std::map<std::string, wasmtime::Memory> wasmMems;
std::map<std::string, wasmtime::Func> wasmFuncs;

class SecureFunction : public ISecureEnclave
{
    std::string wasmName;
    std::string funcName;
    std::string qualifiedID;

    const IThorActivityContext *activityCtx = nullptr;
    std::vector<wasmtime::Val> args;
    std::vector<wasmtime::Val> results;

public:
    static SecureFunction *self;

    SecureFunction()
    {
        TRACE("se:constructor");

        //  Needed for callbacks  ---
        self = this;
    }

    virtual ~SecureFunction() override
    {
        TRACE("se:destructor");

        //  Garbage Collection  ---
        //    Function results  ---
        auto found = wasmFuncs.find(createQualifiedID(wasmName, "cabi_post_" + funcName));
        if (found != wasmFuncs.end())
        {
            for (auto &result : results)
            {
                auto results = found->second.call(store, {result});
            }
        }
    }

    wasmtime::Span<uint8_t> data()
    {
        //  TODO - Confirm if memory / data can be periodically relocated?
        auto found = wasmMems.find(createQualifiedID(wasmName, "memory"));
        if (found == wasmMems.end())
        {
            throw std::runtime_error("memory not found");
        }
        TRACE("se:data:  %zu", found->second.data(store.context()).size());
        return found->second.data(store.context());
    }

    wasmtime::Func realloc()
    {
        auto found = wasmFuncs.find(createQualifiedID(wasmName, "cabi_realloc"));
        if (found == wasmFuncs.end())
        {
            throw std::runtime_error("cabi_realloc not found");
        }
        return found->second;
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
        TRACE("paramWriterCommit");
        return NULL;
    }
    virtual void paramWriterCommit(IInterface *writer)
    {
        TRACE("paramWriterCommit");
    }
    virtual void writeResult(IInterface *esdl, const char *esdlservice, const char *esdltype, IInterface *writer)
    {
        TRACE("writeResult");
    }
    virtual void bindBooleanParam(const char *name, bool val)
    {
        TRACE("bindBooleanParam %s %i", name, val);
        args.push_back(val);
    }
    virtual void bindDataParam(const char *name, size32_t len, const void *val)
    {
        TRACE("bindDataParam %s %d", name, len);
    }
    virtual void bindFloatParam(const char *name, float val)
    {
        TRACE("bindFloatParam %s %f", name, val);
        args.push_back(val);
    }
    virtual void bindRealParam(const char *name, double val)
    {
        TRACE("bindRealParam %s %f", name, val);
        args.push_back(val);
    }
    virtual void bindSignedSizeParam(const char *name, int size, __int64 val)
    {
        TRACE("bindSignedSizeParam %s %i %lld", name, size, val);
        if (size <= 4)
            args.push_back(static_cast<int32_t>(val));
        else
            args.push_back(static_cast<int64_t>(val));
    }
    virtual void bindSignedParam(const char *name, __int64 val)
    {
        TRACE("bindSignedParam %s %lld", name, val);
        args.push_back(static_cast<int64_t>(val));
    }
    virtual void bindUnsignedSizeParam(const char *name, int size, unsigned __int64 val)
    {
        TRACE("bindUnsignedSizeParam %s %i %llu", name, size, val);
        if (size <= 4)
            args.push_back(static_cast<int32_t>(val));
        else
            args.push_back(static_cast<int64_t>(val));
    }
    virtual void bindUnsignedParam(const char *name, unsigned __int64 val)
    {
        TRACE("bindUnsignedParam %s %llu", name, val);
        args.push_back(static_cast<int64_t>(val));
    }
    virtual void bindStringParam(const char *qualifiedName, size32_t len, const char *val)
    {
        TRACE("bindStringParam %s %d %s", qualifiedName, len, val);
        auto memIdxVar = realloc().call(store, {0, 0, 1, (int32_t)len}).unwrap();
        auto memIdx = memIdxVar[0].i32();
        auto mem = data();
        for (int i = 0; i < len; i++)
        {
            mem[memIdx + i] = val[i];
        }
        args.push_back(memIdx);
        args.push_back((int32_t)len);
    }
    virtual void bindVStringParam(const char *name, const char *val)
    {
        TRACE("bindVStringParam %s %s", name, val);
        bindStringParam(name, strlen(val), val);
    }
    virtual void bindUTF8Param(const char *name, size32_t chars, const char *val)
    {
        TRACE("bindUTF8Param %s %d %s", name, chars, val);
        bindStringParam(name, chars, val);
    }
    virtual void bindUnicodeParam(const char *name, size32_t chars, const UChar *val)
    {
        TRACE("bindUnicodeParam %s %d %S", name, chars, reinterpret_cast<const wchar_t *>(val));
        auto memIdxVar = realloc().call(store, {0, 0, 2, (int32_t)chars * 2}).unwrap();
        auto memIdx = memIdxVar[0].i32();
        auto mem = data();
        for (int i = 0; i < chars * 2; i += 2)
        {
            mem[memIdx + i] = val[i];
        }
        args.push_back(memIdx);
        args.push_back((int32_t)chars);
    }
    virtual void bindSetParam(const char *name, int elemType, size32_t elemSize, bool isAll, size32_t totalBytes, const void *setData)
    {
        TRACE("bindSetParam %s %d %d %d %d %p", name, elemType, elemSize, isAll, totalBytes, setData);
    }
    virtual void bindRowParam(const char *name, IOutputMetaData &metaVal, const byte *val) override
    {
        TRACE("bindRowParam %s %p", name, val);
    }
    virtual void bindDatasetParam(const char *name, IOutputMetaData &metaVal, IRowStream *val)
    {
        TRACE("bindDatasetParam %s %p", name, val);
    }
    virtual bool getBooleanResult()
    {
        TRACE("getBooleanResult");
        return results[0].i32();
    }
    virtual void getDataResult(size32_t &__len, void *&__result)
    {
        TRACE("getDataResult");
    }
    virtual double getRealResult()
    {
        TRACE("getRealResult");
        if (results[0].kind() == wasmtime::ValKind::F64)
            return (int32_t)results[0].f64();
        return results[0].f32();
    }
    virtual __int64 getSignedResult()
    {
        TRACE("getSignedResult");
        if (results[0].kind() == wasmtime::ValKind::I64)
            return (int32_t)results[0].i64();
        return results[0].i32();
    }
    virtual unsigned __int64 getUnsignedResult()
    {
        TRACE("getUnsignedResult");
        if (results[0].kind() == wasmtime::ValKind::I64)
            return (int32_t)results[0].i64();
        return results[0].i32();
    }

    virtual void getStringResult(size32_t &__chars, char *&__result)
    {
        TRACE("getStringResult %zu", results.size());
        auto ptr = results[0].i32();
        TRACE("getStringResult (ptr) %d", ptr);
        auto data = this->data();

        uint32_t begin = load_int(data, ptr, 4);
        TRACE("getStringResult (begin) %d", begin);
        uint32_t tagged_code_units = load_int(data, ptr + 4, 4);
        TRACE("getStringResult (tagged_code_units) %d", tagged_code_units);
        std::string s = load_string(data, ptr);
        TRACE("getStringResult (std::string) %s", s.c_str());
        __chars = s.length();
        TRACE("getStringResult (__chars) %d", static_cast<int>(__chars));
        __result = (char *)rtlMalloc(__chars + 1);
        memcpy(__result, s.c_str(), __chars);
    }
    virtual void getUTF8Result(size32_t &__chars, char *&__result)
    {
        TRACE("getUTF8Result");
    }
    virtual void getUnicodeResult(size32_t &__chars, UChar *&__result)
    {
        TRACE("getUnicodeResult");
    }
    virtual void getSetResult(bool &__isAllResult, size32_t &__resultBytes, void *&__result, int elemType, size32_t elemSize)
    {
        TRACE("getSetResult");
    }
    virtual IRowStream *getDatasetResult(IEngineRowAllocator *_resultAllocator)
    {
        TRACE("getDatasetResult");
        return NULL;
    }
    virtual byte *getRowResult(IEngineRowAllocator *_resultAllocator)
    {
        TRACE("getRowResult");
        return NULL;
    }
    virtual size32_t getTransformResult(ARowBuilder &builder)
    {
        TRACE("getTransformResult");
        return 0;
    }
    virtual void loadCompiledScript(size32_t chars, const void *_script) override
    {
        TRACE("loadCompiledScript %p", _script);
    }
    virtual void enter() override
    {
        TRACE("enter");
    }
    virtual void reenter(ICodeContext *codeCtx) override
    {
        TRACE("reenter");
    }
    virtual void exit() override
    {
        TRACE("exit");
    }
    void registerInstance(const std::string &_wasmName, const std::variant<std::string_view, wasmtime::Span<uint8_t>> &wasm)
    {
        TRACE("registerInstance %s", _wasmName.c_str());
        auto instanceItr = wasmInstances.find(_wasmName);
        if (instanceItr == wasmInstances.end())
        {
            wasmName = _wasmName;
            TRACE("resolveModule %s", _wasmName.c_str());
            auto module = std::holds_alternative<std::string_view>(wasm) ? wasmtime::Module::compile(engine, std::get<std::string_view>(wasm)).unwrap() : wasmtime::Module::compile(engine, std::get<wasmtime::Span<uint8_t>>(wasm)).unwrap();
            TRACE("resolveModule2 %s", _wasmName.c_str());

            wasmtime::WasiConfig wasi;
            wasi.inherit_argv();
            wasi.inherit_env();
            wasi.inherit_stdin();
            wasi.inherit_stdout();
            wasi.inherit_stderr();
            store.context().set_wasi(std::move(wasi)).unwrap();
            TRACE("resolveModule3 %s", _wasmName.c_str());

            wasmtime::Linker linker(engine);
            linker.define_wasi().unwrap();
            TRACE("resolveModule4 %s", _wasmName.c_str());

            auto callback = [](wasmtime::Caller caller, uint32_t msg, uint32_t msg_len)
            {
                TRACE("callback: %i %i", msg_len, msg);

                auto data = self->data();
                auto msg_ptr = (char *)&data[msg];
                std::string str(msg_ptr, msg_len);
                embedContextCallbacks->DBGLOG("from wasm: %s", str.c_str());
            };
            auto host_func = linker.func_wrap("$root", "dbglog", callback).unwrap();

            auto newInstance = linker.instantiate(store, module).unwrap();
            linker.define_instance(store, "linking2", newInstance).unwrap();

            TRACE("resolveModule5 %s", wasmName.c_str());

            wasmInstances.insert(std::make_pair(wasmName, newInstance));

            for (auto exportItem : module.exports())
            {
                auto externType = wasmtime::ExternType::from_export(exportItem);
                std::string name(exportItem.name());
                if (std::holds_alternative<wasmtime::FuncType::Ref>(externType))
                {
                    TRACE("Exported function: %s", name.c_str());
                    auto func = std::get<wasmtime::Func>(*newInstance.get(store, name));
                    wasmFuncs.insert(std::make_pair(wasmName + "." + name, func));
                }
                else if (std::holds_alternative<wasmtime::MemoryType::Ref>(externType))
                {
                    TRACE("Exported memory: %s", name.c_str());
                    auto memory = std::get<wasmtime::Memory>(*newInstance.get(store, name));
                    wasmMems.insert(std::make_pair(wasmName + "." + name, memory));
                }
                else if (std::holds_alternative<wasmtime::TableType::Ref>(externType))
                {
                    TRACE("Exported table: %s", name.c_str());
                }
                else if (std::holds_alternative<wasmtime::GlobalType::Ref>(externType))
                {
                    TRACE("Exported global: %s", name.c_str());
                }
                else
                {
                    TRACE("Unknown export type");
                }
            }
        }
    }
    virtual void compileEmbeddedScript(size32_t lenChars, const char *_utf) override
    {
        TRACE("compileEmbeddedScript");
        std::string utf(_utf, lenChars);
        funcName = extractContentInDoubleQuotes(utf);
        wasmName = "embed_" + funcName;
        qualifiedID = createQualifiedID(wasmName, funcName);
        registerInstance(wasmName, utf);
    }
    virtual void importFunction(size32_t lenChars, const char *qualifiedName) override
    {
        TRACE("importFunction: %s", qualifiedName);

        qualifiedID = std::string(qualifiedName, lenChars);
        TRACE("importFunction: %s", qualifiedID.c_str());
        auto [_wasmName, _funcName] = splitQualifiedID(qualifiedID);
        wasmName = _wasmName;
        funcName = _funcName;
        TRACE("importFunction2: %s %s", wasmName.c_str(), funcName.c_str());

        auto instanceItr = wasmInstances.find(wasmName);
        if (instanceItr == wasmInstances.end())
        {
            std::string fullPath = embedContextCallbacks->resolveManifestPath((wasmName + ".wasm").c_str());
            TRACE("importFunction: fullPath %s", fullPath.c_str());
            auto wasmFile = read_wasm_binary_to_buffer(fullPath);
            registerInstance(wasmName, wasmFile);
        }
    }
    virtual void callFunction()
    {
        TRACE("callFunction %s", qualifiedID.c_str());

        auto myFunc = wasmFuncs.find(qualifiedID);
        if (myFunc == wasmFuncs.end())
        {
            throw std::runtime_error("Invalid function name");
        }
        TRACE("do call %s %zu", qualifiedID.c_str(), args.size());
        results = myFunc->second.call(store, args).unwrap();

        TRACE("result count %zu", results.size());
    }
};
SecureFunction *SecureFunction::self = nullptr;

void init(std::shared_ptr<IWasmEmbedCallback> embedContext)
{
    embedContextCallbacks = embedContext;
    TRACE("init");
}

void kill()
{
    TRACE("kill");
    embedContextCallbacks = nullptr;
}

std::unique_ptr<ISecureEnclave> createISecureEnclave()
{
    return std::make_unique<SecureFunction>();
}
