#include "secure-enclave.hpp"
#include "eclrtl.hpp"
#include "eclrtl_imp.hpp"
#include "rtlconst.hpp"
#include "jiface.hpp"
#include "jlog.hpp"
#include "jexcept.hpp"

// From deftype.hpp in common
#define UNKNOWN_LENGTH 0xFFFFFFF1

#include "abi.hpp"
#include "util.hpp"

#include <map>
#include <functional>
#include <mutex>
#include <shared_mutex>

// #define ENABLE_TRACE
#ifdef ENABLE_TRACE
#define TRACE(format, ...) DBGLOG(format, ##__VA_ARGS__)
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
        TRACE("WASM SE ThreadSafeMap clear");
        std::unique_lock lock(mutex);
        map.clear();
        TRACE("WASM SE ThreadSafeMap clear2");
    }

    void insertIfMissing(const K &key, std::function<V()> &valueCallback)
    {
        TRACE("WASM SE ThreadSafeMap insertIfMissing");
        std::unique_lock lock(mutex);
        if (map.find(key) == map.end())
            map.insert(std::make_pair(key, valueCallback()));
        TRACE("WASM SE ThreadSafeMap insertIfMissing2");
    }

    void erase(const K &key)
    {
        TRACE("WASM SE ThreadSafeMap erase");
        std::unique_lock lock(mutex);
        map.erase(key);
        TRACE("WASM SE ThreadSafeMap erase2");
    }

    bool find(const K &key, std::optional<V> &value) const
    {
        TRACE("WASM SE ThreadSafeMap find");
        std::shared_lock lock(mutex);
        auto it = map.find(key);
        if (it != map.end())
        {
            value = it->second;
            TRACE("WASM SE ThreadSafeMap find2");
            return true;
        }
        TRACE("WASM SE ThreadSafeMap find3");
        return false;
    }

    bool has(const K &key) const
    {
        TRACE("WASM SE ThreadSafeMap has");
        std::shared_lock lock(mutex);
        TRACE("WASM SE ThreadSafeMap has2");
        return map.find(key) != map.end();
    }

    void for_each(std::function<void(const K &key, const V &value)> func) const
    {
        TRACE("WASM SE ThreadSafeMap for_each");
        std::shared_lock lock(mutex);
        for (auto it = map.begin(); it != map.end(); ++it)
        {
            func(it->first, it->second);
        }
        TRACE("WASM SE ThreadSafeMap for_each2");
    }
};

class WasmEngine
{
private:
    wasmtime::Engine engine;
    wasmtime::Store store;

    ThreadSafeMap<std::string, wasmtime::Instance> wasmInstances;
    //  wasmMems and wasmFuncs are only written to during createInstance, so no need for a mutex
    std::unordered_map<std::string, wasmtime::Memory> wasmMems;
    std::unordered_map<std::string, wasmtime::Func> wasmFuncs;

public:
    WasmEngine() : store(engine)
    {
        TRACE("WASM SE WasmEngine");
    }

    ~WasmEngine()
    {
        TRACE("WASM SE ~WasmEngine");
    }

    bool hasInstance(const std::string &wasmName) const
    {
        TRACE("WASM SE hasInstance");
        return wasmInstances.has(wasmName);
    }

    wasmtime::Instance getInstance(const std::string &wasmName) const
    {
        TRACE("WASM SE getInstance");
        std::optional<wasmtime::Instance> instance;
        if (!wasmInstances.find(wasmName, instance))
            throw makeStringExceptionV(-1, "Wasm instance not found: %s", wasmName.c_str());
        return instance.value();
    }

    wasmtime::Instance createInstance(const std::string &wasmName, const std::variant<std::string_view, wasmtime::Span<uint8_t>> &wasm)
    {
        TRACE("WASM SE resolveModule %s", wasmName.c_str());
        auto module = std::holds_alternative<std::string_view>(wasm) ? wasmtime::Module::compile(engine, std::get<std::string_view>(wasm)).unwrap() : wasmtime::Module::compile(engine, std::get<wasmtime::Span<uint8_t>>(wasm)).unwrap();
        TRACE("WASM SE resolveModule2 %s", wasmName.c_str());

        wasmtime::WasiConfig wasi;
        wasi.inherit_argv();
        wasi.inherit_env();
        wasi.inherit_stdin();
        wasi.inherit_stdout();
        wasi.inherit_stderr();
        store.context().set_wasi(std::move(wasi)).unwrap();
        TRACE("WASM SE resolveModule3 %s", wasmName.c_str());

        wasmtime::Linker linker(engine);
        linker.define_wasi().unwrap();
        TRACE("WASM SE resolveModule4 %s", wasmName.c_str());

        auto callback = [this, wasmName](wasmtime::Caller caller, uint32_t msg, uint32_t msg_len)
        {
            TRACE("WASM SE callback: %i %i", msg_len, msg);
            auto data = this->getData(wasmName);
            auto msg_ptr = (const char *)&data[msg];
            DBGLOG("from wasm: %.*s", msg_len, msg_ptr);
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
                TRACE("WASM SE Exported function: %s", name.c_str());
                auto func = std::get<wasmtime::Func>(*newInstance.get(store, name));
                wasmFuncs.insert(std::make_pair(wasmName + "." + name, func));
            }
            else if (std::holds_alternative<wasmtime::MemoryType::Ref>(externType))
            {
                TRACE("WASM SE Exported memory: %s", name.c_str());
                auto memory = std::get<wasmtime::Memory>(*newInstance.get(store, name));
                wasmMems.insert(std::make_pair(wasmName + "." + name, memory));
            }
            else if (std::holds_alternative<wasmtime::TableType::Ref>(externType))
            {
                TRACE("WASM SE Exported table: %s", name.c_str());
            }
            else if (std::holds_alternative<wasmtime::GlobalType::Ref>(externType))
            {
                TRACE("WASM SE Exported global: %s", name.c_str());
            }
            else
            {
                TRACE("WASM SE Unknown export type");
            }
        }

        return newInstance;
    }

    void registerInstance(const std::string &wasmName, const std::variant<std::string_view, wasmtime::Span<uint8_t>> &wasm)
    {
        TRACE("WASM SE registerInstance %s", wasmName.c_str());
        std::function<wasmtime::Instance()> createInstanceCallback = [this, wasmName, wasm]()
        {
            return createInstance(wasmName, wasm);
        };
        wasmInstances.insertIfMissing(wasmName, createInstanceCallback);
    }

    bool hasFunc(const std::string &qualifiedID) const
    {
        TRACE("WASM SE hasFunc");
        return wasmFuncs.find(qualifiedID) != wasmFuncs.end();
    }

    wasmtime::Func getFunc(const std::string &qualifiedID) const
    {
        TRACE("WASM SE getFunc");
        auto found = wasmFuncs.find(qualifiedID);
        if (found == wasmFuncs.end())
            throw makeStringExceptionV(-1, "Wasm function not found: %s", qualifiedID.c_str());
        TRACE("WASM SE getFunc2");
        return found->second;
    }

    wasmtime::ValType::ListRef getFuncParams(const std::string &qualifiedID)
    {
        TRACE("WASM SE getFuncParams");
        auto func = getFunc(qualifiedID);
        wasmtime::FuncType funcType = func.type(store.context());
        return funcType->params();
    }

    wasmtime::ValType::ListRef getFuncResults(const std::string &qualifiedID)
    {
        TRACE("WASM SE getFuncResults");
        auto func = getFunc(qualifiedID);
        wasmtime::FuncType funcType = func.type(store.context());
        return funcType->results();
    }

    std::vector<wasmtime::Val> call(const std::string &qualifiedID, const std::vector<wasmtime::Val> &params)
    {
        TRACE("WASM SE call");
        auto func = getFunc(qualifiedID);
        auto retVal = func.call(store, params).unwrap();
        TRACE("WASM SE call 2");
        return retVal;
    }

    std::vector<wasmtime::Val> callRealloc(const std::string &wasmName, const std::vector<wasmtime::Val> &params)
    {
        TRACE("WASM SE callRealloc");
        return call(createQualifiedID(wasmName, "cabi_realloc"), params);
    }

    wasmtime::Span<uint8_t> getData(const std::string &wasmName)
    {
        TRACE("WASM SE getData");
        auto found = wasmMems.find(createQualifiedID(wasmName, "memory"));
        if (found == wasmMems.end())
            throw makeStringExceptionV(-1, "Wasm memory not found: %s", wasmName.c_str());
        return found->second.data(store.context());
    }
};
static std::unique_ptr<WasmEngine> wasmEngine;

class SecureFunction : public CInterfaceOf<IEmbedFunctionContext>
{
    std::string wasmName;
    std::string funcName;
    std::string qualifiedID;

    const IThorActivityContext *activityCtx = nullptr;
    std::vector<wasmtime::Val> args;
    std::vector<wasmtime::Val> wasmResults;

    StringArray manifestModules;

public:
    SecureFunction(const StringArray &_manifestModules)
    {
        TRACE("WASM SE se:constructor");
        manifestModules.appendArray(_manifestModules);
        if (!wasmEngine)
        {
            TRACE("WASM SE se:constructor2");
            wasmEngine = std::make_unique<WasmEngine>();
        }
        TRACE("WASM SE se:constructor3");
    }

    virtual ~SecureFunction()
    {
        TRACE("WASM SE se:destructor");

        //  Garbage Collection  ---
        //    Function results  ---
        auto gc_func_name = createQualifiedID(wasmName, "cabi_post_" + funcName);
        TRACE("WASM SE se:destructor %s", gc_func_name.c_str());
        if (wasmEngine->hasFunc(gc_func_name))
        {
            for (auto &result : wasmResults)
            {
                wasmEngine->call(gc_func_name, {result});
            }
        }
    }

    const char *resolveManifestPath(const char *leafName)
    {
        if (leafName && *leafName)
        {
            ForEachItemIn(idx, manifestModules)
            {
                const char *path = manifestModules.item(idx);
                if (endsWith(path, leafName))
                    return path;
            }
        }
        return nullptr;
    }

    //  IEmbedFunctionContext ---
    void setActivityContext(const IThorActivityContext *_activityCtx)
    {
        activityCtx = _activityCtx;
    }

    virtual IInterface *bindParamWriter(IInterface *esdl, const char *esdlservice, const char *esdltype, const char *name)
    {
        TRACE("WASM SE paramWriterCommit");
        return NULL;
    }
    virtual void paramWriterCommit(IInterface *writer)
    {
        TRACE("WASM SE paramWriterCommit");
    }
    virtual void writeResult(IInterface *esdl, const char *esdlservice, const char *esdltype, IInterface *writer)
    {
        TRACE("WASM SE writeResult");
    }
    virtual void bindBooleanParam(const char *name, bool val)
    {
        TRACE("WASM SE bindBooleanParam %s %i", name, val);
        args.push_back(val);
    }
    virtual void bindDataParam(const char *name, size32_t len, const void *val)
    {
        TRACE("WASM SE bindDataParam %s %d", name, len);
    }
    virtual void bindFloatParam(const char *name, float val)
    {
        TRACE("WASM SE bindFloatParam %s %f", name, val);
        args.push_back(val);
    }
    virtual void bindRealParam(const char *name, double val)
    {
        TRACE("WASM SE bindRealParam %s %f", name, val);
        args.push_back(val);
    }
    virtual void bindSignedSizeParam(const char *name, int size, __int64 val)
    {
        TRACE("WASM SE bindSignedSizeParam %s %i %lld", name, size, val);
        if (size <= 4)
            args.push_back(static_cast<int32_t>(val));
        else
            args.push_back(static_cast<int64_t>(val));
    }
    virtual void bindSignedParam(const char *name, __int64 val)
    {
        TRACE("WASM SE bindSignedParam %s %lld", name, val);
        args.push_back(static_cast<int64_t>(val));
    }
    virtual void bindUnsignedSizeParam(const char *name, int size, unsigned __int64 val)
    {
        TRACE("WASM SE bindUnsignedSizeParam %s %i %llu", name, size, val);
        if (size <= 4)
            args.push_back(static_cast<int32_t>(val));
        else
            args.push_back(static_cast<int64_t>(val));
    }
    virtual void bindUnsignedParam(const char *name, unsigned __int64 val)
    {
        TRACE("WASM SE bindUnsignedParam %s %llu", name, val);
        args.push_back(static_cast<int64_t>(val));
    }
    virtual void bindStringParam(const char *name, size32_t codeUnits, const char *val)
    {
        TRACE("WASM SE bindStringParam %s %d %s", name, codeUnits, val);
        size32_t utfCharCount;
        rtlDataAttr utfText;
        rtlStrToUtf8X(utfCharCount, utfText.refstr(), codeUnits, val);
        bindUTF8Param(name, utfCharCount, utfText.getstr());
    }
    virtual void bindVStringParam(const char *name, const char *val)
    {
        TRACE("WASM SE bindVStringParam %s %s", name, val);
        bindStringParam(name, strlen(val), val);
    }
    virtual void bindUTF8Param(const char *name, size32_t codePoints, const char *val)
    {
        TRACE("WASM SE bindUTF8Param %s %d %s", name, codePoints, val);
        auto codeUnits = rtlUtf8Size(codePoints, val);
        auto memIdxVar = wasmEngine->callRealloc(wasmName, {0, 0, 1, (int32_t)codeUnits});
        auto memIdx = memIdxVar[0].i32();
        auto mem = wasmEngine->getData(wasmName);
        memcpy(&mem[memIdx], val, codeUnits);
        args.push_back(memIdx);
        args.push_back((int32_t)codeUnits);
    }
    virtual void bindUnicodeParam(const char *name, size32_t codePoints, const UChar *val)
    {
        TRACE("WASM SE bindUnicodeParam %s %d", name, codePoints);
        size32_t utfCharCount;
        rtlDataAttr utfText;
        rtlUnicodeToUtf8X(utfCharCount, utfText.refstr(), codePoints, val);
        bindUTF8Param(name, utfCharCount, utfText.getstr());
    }

    virtual void bindSetParam(const char *name, int elemType, size32_t elemSize, bool isAll, size32_t totalBytes, const void *setData)
    {
        TRACE("WASM SE bindSetParam %s %d %d %d %d %p", name, elemType, elemSize, isAll, totalBytes, setData);
        type_vals typecode = (type_vals)elemType;
        const byte *inData = (const byte *)setData;
        const byte *endData = inData + totalBytes;
        int numElems;
        if (elemSize == UNKNOWN_LENGTH)
        {
            numElems = 0;
            // Will need 2 passes to work out how many elements there are in the set :(
            while (inData < endData)
            {
                int thisSize;
                switch (elemType)
                {
                case type_varstring:
                    thisSize = strlen((const char *)inData) + 1;
                    break;
                case type_string:
                    thisSize = *(size32_t *)inData + sizeof(size32_t);
                    break;
                case type_unicode:
                    thisSize = (*(size32_t *)inData) * sizeof(UChar) + sizeof(size32_t);
                    break;
                case type_utf8:
                    thisSize = rtlUtf8Size(*(size32_t *)inData, inData + sizeof(size32_t)) + sizeof(size32_t);
                    break;
                default:
                    rtlFail(0, "wasmembed: Unsupported parameter type");
                    break;
                }
                inData += thisSize;
                numElems++;
            }
            inData = (const byte *)setData;
        }
        else
            numElems = totalBytes / elemSize;

        std::vector<wasmtime::Val> memIdxVar;
        int32_t memIdx;

        switch (typecode)
        {
        case type_boolean:
            memIdxVar = wasmEngine->callRealloc(wasmName, {0, 0, 1, (int32_t)numElems});
            memIdx = memIdxVar[0].i32();
            break;
        default:
            rtlFail(0, "wasmembed: Unsupported parameter type");
            break;
        }

        auto mem = wasmEngine->getData(wasmName);
        size32_t thisSize = elemSize;
        for (int idx = 0; idx < numElems; idx++)
        {
            switch (typecode)
            {
            case type_boolean:
                mem[memIdx + idx] = *(bool *)inData;
                break;
            default:
                rtlFail(0, "v8embed: Unsupported parameter type");
                break;
            }
            inData += thisSize;
        }
        args.push_back(memIdx);
        args.push_back(numElems);
    }

    virtual void bindRowParam(const char *name, IOutputMetaData &metaVal, const byte *val) override
    {
        TRACE("WASM SE bindRowParam %s %p", name, val);
        throw makeStringException(-1, "bindRowParam not implemented");
    }
    virtual void bindDatasetParam(const char *name, IOutputMetaData &metaVal, IRowStream *val)
    {
        TRACE("WASM SE bindDatasetParam %s %p", name, val);
        throw makeStringException(-1, "bindDatasetParam not implemented");
    }
    virtual bool getBooleanResult()
    {
        TRACE("WASM SE getBooleanResult");
        return wasmResults[0].i32();
    }
    virtual void getDataResult(size32_t &len, void *&result)
    {
        TRACE("WASM SE getDataResult");
        throw makeStringException(-1, "getDataResult not implemented");
    }
    virtual double getRealResult()
    {
        TRACE("WASM SE getRealResult");
        if (wasmResults[0].kind() == wasmtime::ValKind::F64)
            return wasmResults[0].f64();
        return wasmResults[0].f32();
    }
    virtual __int64 getSignedResult()
    {
        TRACE("WASM SE getSignedResult1 %i", (uint8_t)wasmResults[0].kind());
        if (wasmResults[0].kind() == wasmtime::ValKind::I64)
        {
            return wasmResults[0].i64();
        }
        return static_cast<__int64>(wasmResults[0].i32());
    }
    virtual unsigned __int64 getUnsignedResult()
    {
        TRACE("WASM SE getUnsignedResult");
        if (wasmResults[0].kind() == wasmtime::ValKind::I64)
            return wasmResults[0].i64();
        return static_cast<unsigned __int64>(wasmResults[0].i32());
    }
    virtual void getStringResult(size32_t &chars, char *&result)
    {
        TRACE("WASM SE getStringResult %zu", wasmResults.size());
        auto ptr = wasmResults[0].i32();
        auto data = wasmEngine->getData(wasmName);
        uint32_t strPtr;
        uint32_t codeUnits;
        std::tie(strPtr, codeUnits) = load_string(data, ptr);
        rtlStrToStrX(chars, result, codeUnits, reinterpret_cast<const char *>(&data[strPtr]));
    }
    virtual void getUTF8Result(size32_t &chars, char *&result)
    {
        TRACE("WASM SE getUTF8Result");
        auto ptr = wasmResults[0].i32();
        auto data = wasmEngine->getData(wasmName);
        uint32_t strPtr;
        uint32_t codeUnits;
        std::tie(strPtr, codeUnits) = load_string(data, ptr);
        chars = rtlUtf8Length(codeUnits, &data[strPtr]);
        TRACE("WASM SE getUTF8Result %d %d", codeUnits, chars);
        result = (char *)rtlMalloc(codeUnits);
        memcpy(result, &data[strPtr], codeUnits);
    }
    virtual void getUnicodeResult(size32_t &chars, UChar *&result)
    {
        TRACE("WASM SE getUnicodeResult");
        auto ptr = wasmResults[0].i32();
        auto data = wasmEngine->getData(wasmName);
        uint32_t strPtr;
        uint32_t codeUnits;
        std::tie(strPtr, codeUnits) = load_string(data, ptr);
        unsigned numchars = rtlUtf8Length(codeUnits, &data[strPtr]);
        rtlUtf8ToUnicodeX(chars, result, numchars, reinterpret_cast<const char *>(&data[strPtr]));
    }
    virtual void getSetResult(bool &__isAllResult, size32_t &resultBytes, void *&result, int elemType, size32_t elemSize)
    {
        TRACE("WASM SE getSetResult %d %d %zu", elemType, elemSize, wasmResults.size());
        auto ptr = wasmResults[0].i32();
        auto data = wasmEngine->getData(wasmName);

        throw makeStringException(-1, "getSetResult not implemented");
    }
    virtual IRowStream *getDatasetResult(IEngineRowAllocator *_resultAllocator)
    {
        TRACE("WASM SE getDatasetResult");
        throw makeStringException(-1, "getDatasetResult not implemented");
        return NULL;
    }
    virtual byte *getRowResult(IEngineRowAllocator *_resultAllocator)
    {
        TRACE("WASM SE getRowResult");
        throw makeStringException(-1, "getRowResult not implemented");
        return NULL;
    }
    virtual size32_t getTransformResult(ARowBuilder &builder)
    {
        TRACE("WASM SE getTransformResult");
        throw makeStringException(-1, "getTransformResult not implemented");
        return 0;
    }
    virtual void loadCompiledScript(size32_t chars, const void *_script) override
    {
        TRACE("WASM SE loadCompiledScript %p", _script);
        throw makeStringException(-1, "loadCompiledScript not implemented");
    }
    virtual void enter() override
    {
        TRACE("WASM SE enter");
    }
    virtual void reenter(ICodeContext *codeCtx) override
    {
        TRACE("WASM SE reenter");
    }
    virtual void exit() override
    {
        TRACE("WASM SE exit");
    }
    virtual void compileEmbeddedScript(size32_t lenChars, const char *_utf) override
    {
        TRACE("WASM SE compileEmbeddedScript");
        std::string utf(_utf, lenChars);
        funcName = extractContentInDoubleQuotes(utf);
        wasmName = "embed_" + funcName;
        qualifiedID = createQualifiedID(wasmName, funcName);
        wasmEngine->registerInstance(wasmName, utf);
    }
    virtual void importFunction(size32_t lenChars, const char *qualifiedName) override
    {
        TRACE("WASM SE importFunction: %s", qualifiedName);

        qualifiedID = std::string(qualifiedName, lenChars);
        auto [_wasmName, _funcName] = splitQualifiedID(qualifiedID);
        wasmName = _wasmName;
        funcName = _funcName;

        if (!wasmEngine->hasInstance(wasmName))
        {
            std::string fullPath = resolveManifestPath((wasmName + ".wasm").c_str());
            auto wasmFile = read_wasm_binary_to_buffer(fullPath);
            wasmEngine->registerInstance(wasmName, wasmFile);
        }
    }
    virtual void callFunction()
    {
        TRACE("WASM SE callFunction %s", qualifiedID.c_str());
        wasmResults = wasmEngine->call(qualifiedID, args);
    }
};

SECUREENCLAVE_API IEmbedFunctionContext *createISecureEnclave(const StringArray &manifestModules)
{
    // TRACE("WASM SE createISecureEnclave");
    return new SecureFunction(manifestModules);
}

SECUREENCLAVE_API void syntaxCheck(size32_t &lenResult, char *&result, const char *funcname, size32_t charsBody, const char *body, const char *argNames, const char *compilerOptions, const char *persistOptions)
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

    lenResult = errMsg.length();
    result = reinterpret_cast<char *>(rtlMalloc(lenResult));
    errMsg.copy(result, lenResult);
}
