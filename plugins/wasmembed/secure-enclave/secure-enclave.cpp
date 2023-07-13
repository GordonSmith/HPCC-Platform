#include "secure-enclave.hpp"
#include "rtlconst.hpp"

// From deftype.hpp in common
#define UNKNOWN_LENGTH 0xFFFFFFF1

#include "abi.hpp"
#include "util.hpp"

#include <map>
#include <functional>
#include <mutex>
#include <shared_mutex>

#define ENABLE_TRACE
#ifdef ENABLE_TRACE
#define TRACE(format, ...) embedContextCallbacks->DBGLOG(format, ##__VA_ARGS__)
#else
#define TRACE(format, ...) \
    do                     \
    {                      \
    } while (0)
#endif

template <typename K, typename V>
class ThreadSafeMap
{
protected:
    std::unordered_map<K, V> map;
    mutable std::shared_mutex mutex;

public:
    ThreadSafeMap() {}
    ~ThreadSafeMap() {}

    void clear()
    {
        std::unique_lock lock(mutex);
        map.clear();
    }

    void insertIfMissing(const K &key, std::function<V()> &valueCallback)
    {
        std::unique_lock lock(mutex);
        if (map.find(key) == map.end())
            map.insert(std::make_pair(key, valueCallback()));
    }

    void erase(const K &key)
    {
        std::unique_lock lock(mutex);
        map.erase(key);
    }

    bool find(const K &key, std::optional<V> &value) const
    {
        std::shared_lock lock(mutex);
        auto it = map.find(key);
        if (it != map.end())
        {
            value = it->second;
            return true;
        }
        return false;
    }

    bool has(const K &key) const
    {
        std::shared_lock lock(mutex);
        return map.find(key) != map.end();
    }

    void for_each(std::function<void(const K &key, const V &value)> func) const
    {
        std::shared_lock lock(mutex);
        for (auto it = map.begin(); it != map.end(); ++it)
        {
            func(it->first, it->second);
        }
    }
};

std::shared_ptr<IWasmEmbedCallback> embedContextCallbacks;

class WasmEngine
{
private:
    wasmtime::Engine engine;
    wasmtime::Store store;

    ThreadSafeMap<std::string, wasmtime::Instance> wasmInstances;
    //  wasmMems and wasmFuncs are only written to during createInstance, so no need for a mutex
    std::unordered_map<std::string, wasmtime::Memory> wasmMems;
    std::unordered_map<std::string, wasmtime::Func> wasmFuncs;

    mutable std::shared_mutex store_mutex;

public:
    WasmEngine() : store(engine)
    {
    }

    ~WasmEngine()
    {
    }

    bool hasInstance(const std::string &wasmName) const
    {
        return wasmInstances.has(wasmName);
    }

    wasmtime::Instance getInstance(const std::string &wasmName) const
    {
        std::optional<wasmtime::Instance> instance;
        if (!wasmInstances.find(wasmName, instance))
            embedContextCallbacks->throwStringException(-1, "Wasm instance not found: %s", wasmName.c_str());
        return instance.value();
    }

    wasmtime::Instance createInstance(const std::string &wasmName, const std::variant<std::string_view, wasmtime::Span<uint8_t>> &wasm)
    {
        TRACE("resolveModule %s", wasmName.c_str());
        auto module = std::holds_alternative<std::string_view>(wasm) ? wasmtime::Module::compile(engine, std::get<std::string_view>(wasm)).unwrap() : wasmtime::Module::compile(engine, std::get<wasmtime::Span<uint8_t>>(wasm)).unwrap();
        TRACE("resolveModule2 %s", wasmName.c_str());

        wasmtime::WasiConfig wasi;
        wasi.inherit_argv();
        wasi.inherit_env();
        wasi.inherit_stdin();
        wasi.inherit_stdout();
        wasi.inherit_stderr();
        store.context().set_wasi(std::move(wasi)).unwrap();
        TRACE("resolveModule3 %s", wasmName.c_str());

        wasmtime::Linker linker(engine);
        linker.define_wasi().unwrap();
        TRACE("resolveModule4 %s", wasmName.c_str());

        auto callback = [this, wasmName](wasmtime::Caller caller, uint32_t msg, uint32_t msg_len)
        {
            TRACE("callback: %i %i", msg_len, msg);

            auto data = this->getData(wasmName);
            auto msg_ptr = (char *)&data[msg];
            std::string str(msg_ptr, msg_len);
            embedContextCallbacks->DBGLOG("from wasm: %s", str.c_str());
        };
        auto host_func = linker.func_wrap("$root", "dbglog", callback).unwrap();

        auto newInstance = linker.instantiate(store, module).unwrap();
        linker.define_instance(store, "linking2", newInstance).unwrap();

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

        return newInstance;
    }

    void registerInstance(const std::string &wasmName, const std::variant<std::string_view, wasmtime::Span<uint8_t>> &wasm)
    {
        std::function<wasmtime::Instance()> createInstanceCallback = [this, wasmName, wasm]()
        {
            return createInstance(wasmName, wasm);
        };
        wasmInstances.insertIfMissing(wasmName, createInstanceCallback);
    }

    bool hasFunc(const std::string &qualifiedID) const
    {
        return wasmFuncs.find(qualifiedID) != wasmFuncs.end();
    }

    wasmtime::Func getFunc(const std::string &qualifiedID) const
    {
        auto found = wasmFuncs.find(qualifiedID);
        if (found == wasmFuncs.end())
            embedContextCallbacks->throwStringException(-1, "Wasm function not found: %s", qualifiedID.c_str());
        return found->second;
    }

    wasmtime::ValType::ListRef getFuncParams(const std::string &qualifiedID)
    {
        auto func = getFunc(qualifiedID);
        wasmtime::FuncType funcType = func.type(store.context());
        return funcType->params();
    }

    wasmtime::ValType::ListRef getFuncResults(const std::string &qualifiedID)
    {
        auto func = getFunc(qualifiedID);
        wasmtime::FuncType funcType = func.type(store.context());
        return funcType->results();
    }

    std::vector<wasmtime::Val> call(const std::string &qualifiedID, const std::vector<wasmtime::Val> &params)
    {
        return getFunc(qualifiedID).call(store, params).unwrap();
    }

    std::vector<wasmtime::Val> callRealloc(const std::string &wasmName, const std::vector<wasmtime::Val> &params)
    {
        return call(createQualifiedID(wasmName, "cabi_realloc"), params);
    }

    wasmtime::Span<uint8_t> getData(const std::string &wasmName)
    {
        auto found = wasmMems.find(createQualifiedID(wasmName, "memory"));
        if (found == wasmMems.end())
            embedContextCallbacks->throwStringException(-1, "Wasm memory not found: %s", wasmName.c_str());
        return found->second.data(store.context());
    }
};
std::unique_ptr<WasmEngine> wasmEngine;

class SecureFunction : public ISecureEnclave
{
    std::string wasmName;
    std::string funcName;
    std::string qualifiedID;

    const IThorActivityContext *activityCtx = nullptr;
    std::vector<wasmtime::Val> args;
    std::vector<wasmtime::Val> results;

public:
    SecureFunction()
    {
        TRACE("se:constructor");
    }

    virtual ~SecureFunction() override
    {
        TRACE("se:destructor");

        //  Garbage Collection  ---
        //    Function results  ---
        auto gc_func_name = createQualifiedID(wasmName, "cabi_post_" + funcName);
        if (wasmEngine->hasFunc(gc_func_name))
        {
            for (auto &result : results)
            {
                wasmEngine->call(gc_func_name, {result});
            }
        }
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
    virtual void bindStringParam(const char *name, size32_t code_units, const char *val)
    {
        TRACE("bindStringParam %s %d %s", name, code_units, val);
        size32_t utfCharCount;
        rtlDataAttr utfText;
        rtlStrToUtf8X(utfCharCount, utfText.refstr(), code_units, val);
        bindUTF8Param(name, utfCharCount, utfText.getstr());
    }
    virtual void bindVStringParam(const char *name, const char *val)
    {
        TRACE("bindVStringParam %s %s", name, val);
        bindStringParam(name, strlen(val), val);
    }
    virtual void bindUTF8Param(const char *name, size32_t code_points, const char *val)
    {
        TRACE("bindUTF8Param %s %d %s", name, code_points, val);
        auto code_units = rtlUtf8Size(code_points, val);
        auto memIdxVar = wasmEngine->callRealloc(wasmName, {0, 0, 1, (int32_t)code_units});
        auto memIdx = memIdxVar[0].i32();
        auto mem = wasmEngine->getData(wasmName);
        memcpy(&mem[memIdx], val, code_units);
        args.push_back(memIdx);
        args.push_back((int32_t)code_units);
    }
    virtual void bindUnicodeParam(const char *name, size32_t code_points, const UChar *val)
    {
        TRACE("bindUnicodeParam %s %d", name, code_points);
        size32_t utfCharCount;
        rtlDataAttr utfText;
        rtlUnicodeToUtf8X(utfCharCount, utfText.refstr(), code_points, val);
        bindUTF8Param(name, utfCharCount, utfText.getstr());
    }
    virtual void bindSetParam(const char *name, int elemType, size32_t elemSize, bool isAll, size32_t totalBytes, const void *setData)
    {
        TRACE("bindSetParam %s %d %d %d %d %p", name, elemType, elemSize, isAll, totalBytes, setData);
        embedContextCallbacks->throwStringException(-1, "bindSetParam not implemented");
    }
    virtual void bindRowParam(const char *name, IOutputMetaData &metaVal, const byte *val) override
    {
        TRACE("bindRowParam %s %p", name, val);
        embedContextCallbacks->throwStringException(-1, "bindRowParam not implemented");
    }
    virtual void bindDatasetParam(const char *name, IOutputMetaData &metaVal, IRowStream *val)
    {
        TRACE("bindDatasetParam %s %p", name, val);
        embedContextCallbacks->throwStringException(-1, "bindDatasetParam not implemented");
    }
    virtual bool getBooleanResult()
    {
        TRACE("getBooleanResult");
        return results[0].i32();
    }
    virtual void getDataResult(size32_t &__len, void *&__result)
    {
        TRACE("getDataResult");
        embedContextCallbacks->throwStringException(-1, "getDataResult not implemented");
    }
    virtual double getRealResult()
    {
        TRACE("getRealResult");
        if (results[0].kind() == wasmtime::ValKind::F64)
            return results[0].f64();
        return results[0].f32();
    }
    virtual __int64 getSignedResult()
    {
        TRACE("getSignedResult");
        if (results[0].kind() == wasmtime::ValKind::I64)
            return results[0].i64();
        return results[0].i32();
    }
    virtual unsigned __int64 getUnsignedResult()
    {
        TRACE("getUnsignedResult");
        if (results[0].kind() == wasmtime::ValKind::I64)
            return results[0].i64();
        return results[0].i32();
    }
    virtual void getStringResult(size32_t &__chars, char *&__result)
    {
        TRACE("getStringResult %zu", results.size());
        auto ptr = results[0].i32();
        auto data = wasmEngine->getData(wasmName);
        uint32_t strPtr;
        uint32_t code_units;
        std::tie(strPtr, code_units) = load_string(data, ptr);
        rtlStrToStrX(__chars, __result, code_units, reinterpret_cast<const char *>(&data[strPtr]));
    }
    virtual void getUTF8Result(size32_t &__chars, char *&__result)
    {
        TRACE("getUTF8Result");
        auto ptr = results[0].i32();
        auto data = wasmEngine->getData(wasmName);
        uint32_t strPtr;
        uint32_t code_units;
        std::tie(strPtr, code_units) = load_string(data, ptr);
        __chars = rtlUtf8Length(code_units, &data[strPtr]);
        TRACE("getUTF8Result %d %d", code_units, __chars);
        __result = (char *)rtlMalloc(code_units);
        memcpy(__result, &data[strPtr], code_units);
    }
    virtual void getUnicodeResult(size32_t &__chars, UChar *&__result)
    {
        TRACE("getUnicodeResult");
        auto ptr = results[0].i32();
        auto data = wasmEngine->getData(wasmName);
        uint32_t strPtr;
        uint32_t code_units;
        std::tie(strPtr, code_units) = load_string(data, ptr);
        unsigned numchars = rtlUtf8Length(code_units, &data[strPtr]);
        rtlUtf8ToUnicodeX(__chars, __result, numchars, reinterpret_cast<const char *>(&data[strPtr]));
    }
    virtual void getSetResult(bool &__isAllResult, size32_t &__resultBytes, void *&__result, int elemType, size32_t elemSize)
    {
        TRACE("getSetResult %d %d %zu", elemType, elemSize, results.size());
        auto ptr = results[0].i32();
        auto data = wasmEngine->getData(wasmName);

        embedContextCallbacks->throwStringException(-1, "getSetResult not implemented");
    }
    virtual IRowStream *getDatasetResult(IEngineRowAllocator *_resultAllocator)
    {
        TRACE("getDatasetResult");
        embedContextCallbacks->throwStringException(-1, "getDatasetResult not implemented");
        return NULL;
    }
    virtual byte *getRowResult(IEngineRowAllocator *_resultAllocator)
    {
        TRACE("getRowResult");
        embedContextCallbacks->throwStringException(-1, "getRowResult not implemented");
        return NULL;
    }
    virtual size32_t getTransformResult(ARowBuilder &builder)
    {
        TRACE("getTransformResult");
        embedContextCallbacks->throwStringException(-1, "getTransformResult not implemented");
        return 0;
    }
    virtual void loadCompiledScript(size32_t chars, const void *_script) override
    {
        TRACE("loadCompiledScript %p", _script);
        embedContextCallbacks->throwStringException(-1, "loadCompiledScript not implemented");
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
    virtual void compileEmbeddedScript(size32_t lenChars, const char *_utf) override
    {
        TRACE("compileEmbeddedScript");
        std::string utf(_utf, lenChars);
        funcName = extractContentInDoubleQuotes(utf);
        wasmName = "embed_" + funcName;
        qualifiedID = createQualifiedID(wasmName, funcName);
        wasmEngine->registerInstance(wasmName, utf);
    }
    virtual void importFunction(size32_t lenChars, const char *qualifiedName) override
    {
        TRACE("importFunction: %s", qualifiedName);

        qualifiedID = std::string(qualifiedName, lenChars);
        auto [_wasmName, _funcName] = splitQualifiedID(qualifiedID);
        wasmName = _wasmName;
        funcName = _funcName;

        if (!wasmEngine->hasInstance(wasmName))
        {
            std::string fullPath = embedContextCallbacks->resolveManifestPath((wasmName + ".wasm").c_str());
            auto wasmFile = read_wasm_binary_to_buffer(fullPath);
            wasmEngine->registerInstance(wasmName, wasmFile);
        }
    }
    virtual void callFunction()
    {
        TRACE("callFunction %s", qualifiedID.c_str());
        results = wasmEngine->call(qualifiedID, args);
    }
};

SECUREENCLAVE_API void init(std::shared_ptr<IWasmEmbedCallback> embedContext)
{
    embedContextCallbacks = embedContext;
    wasmEngine = std::make_unique<WasmEngine>();
    TRACE("init");
}

SECUREENCLAVE_API void kill()
{
    TRACE("kill");
    wasmEngine.reset();
    embedContextCallbacks.reset();
}

SECUREENCLAVE_API std::unique_ptr<ISecureEnclave> createISecureEnclave()
{
    return std::make_unique<SecureFunction>();
}

SECUREENCLAVE_API void syntaxCheck(size32_t &__lenResult, char *&__result, const char *funcname, size32_t charsBody, const char *body, const char *argNames, const char *compilerOptions, const char *persistOptions)
{
    std::string errMsg = "";
    try
    {
        wasmtime::Engine engine;
        wasmtime::Store store(engine);
        auto module = wasmtime::Module::compile(engine, body);
    }
    catch (const wasmtime::Error &e)
    {
        errMsg = e.message();
    }

    __lenResult = errMsg.length();
    __result = reinterpret_cast<char *>(rtlMalloc(__lenResult));
    errMsg.copy(__result, __lenResult);
}
