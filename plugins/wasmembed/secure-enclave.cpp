#include "secure-enclave.hpp"

#include "eclrtl_imp.hpp"
#include "jexcept.hpp"
#include "jiface.hpp"
#include "eclhelper.hpp"
#include "enginecontext.hpp"

#include "abi.hpp"
#include "util.hpp"
#include "val.hpp"

#include <mutex>
#include <filesystem>

#include <wasmtime.hh>

// From deftype.hpp in common
#define UNKNOWN_LENGTH 0xFFFFFFF1

#define ENABLE_TRACE
#ifdef ENABLE_TRACE
#define TRACE(format, ...) DBGLOG(format __VA_OPT__(, ) __VA_ARGS__)
#else
#define TRACE(format, ...) \
    do                     \
    {                      \
    } while (0)
#endif

class WasmEngine
{
private:
    std::once_flag wasmLoadedFlag;
    std::unordered_map<std::string, wasmtime::Module> wasmModules;

    wasmtime::Module createModule(const std::string &wasmName, const wasmtime::Span<uint8_t> &wasm)
    {
        TRACE("WasmEngine createModule %s", wasmName.c_str());
        try
        {
            wasmtime::Store store(engine);
            wasmtime::WasiConfig wasi;
            wasi.inherit_argv();
            wasi.inherit_env();
            wasi.inherit_stdin();
            wasi.inherit_stdout();
            wasi.inherit_stderr();
            store.context().set_wasi(std::move(wasi)).unwrap();
            return wasmtime::Module::compile(engine, wasm).unwrap();
        }
        catch (const wasmtime::Error &e)
        {
            throw makeStringExceptionV(100, "WasmEngine createModule failed: %s", e.message().c_str());
        }
    }

    void loadWasmFiles(ICodeContext *codeCtx)
    {
        TRACE("WasmEngine loadWasmFiles");
        IEngineContext *engine = codeCtx->queryEngineContext();
        if (!engine)
            throw makeStringException(100, "Failed to get engine context");

        StringArray manifestModules;
        engine->getManifestFiles("wasm", manifestModules);

        ForEachItemIn(idx, manifestModules)
        {
            const char *path = manifestModules.item(idx);
            TRACE("WasmEngine loadWasmFiles %s", path);
            std::vector<uint8_t> contents = readWasmBinaryToBuffer(path);
            auto module = createModule(path, contents);
            std::filesystem::path p(path);
            wasmModules.insert(std::make_pair(p.stem(), module));
        }
    }

public:
    wasmtime::Engine engine;

    WasmEngine()
    {
        TRACE("WASM SE WasmEngine");
    }

    ~WasmEngine()
    {
        TRACE("WASM SE ~WasmEngine");
    }

    void setCodeContext(ICodeContext *codeCtx)
    {
        TRACE("WASM SE setCodeContext");
        std::call_once(wasmLoadedFlag, &WasmEngine::loadWasmFiles, this, codeCtx);
    }

    void setModule(const std::string &wasmName, const wasmtime::Span<uint8_t> &wasm)
    {
        TRACE("WASM SE createModule");
        wasmModules.insert(std::make_pair(wasmName, createModule(wasmName, wasm)));
    }

    bool hasModule(const std::string &wasmName) const
    {
        TRACE("WASM SE hasModule");
        return wasmModules.find(wasmName) != wasmModules.end();
    }

    wasmtime::Module getModule(const std::string &wasmName) const
    {
        TRACE("WASM SE getModule");
        auto found = wasmModules.find(wasmName);
        if (found == wasmModules.end())
            throw makeStringExceptionV(100, "Wasm module not found: %s", wasmName.c_str());
        return found->second;
    }
};
static std::unique_ptr<WasmEngine> wasmEngine = std::make_unique<WasmEngine>();

class WasmStore
{
private:
    wasmtime::Store store;

    std::unordered_map<std::string, wasmtime::Instance> wasmInstances;
    std::unordered_map<std::string, wasmtime::Memory> wasmMems;
    std::unordered_map<std::string, wasmtime::Func> wasmFuncs;

public:
    WasmStore() : store(wasmEngine->engine)
    {
        TRACE("WASM SE WasmStore");
    }

    ~WasmStore()
    {
        TRACE("WASM SE ~WasmStore");
    }

    bool hasInstance(const std::string &wasmName) const
    {
        TRACE("WASM SE hasInstance");
        return wasmInstances.find(wasmName) != wasmInstances.end();
    }

    wasmtime::Instance getInstance(const std::string &wasmName) const
    {
        TRACE("WASM SE getInstance");
        auto found = wasmInstances.find(wasmName);
        if (found == wasmInstances.end())
            throw makeStringExceptionV(100, "Wasm instance not found: %s", wasmName.c_str());
        return found->second;
    }

    void registerInstance(const std::string &wasmName)
    {
        TRACE("WASM SE registerInstance %s", wasmName.c_str());
        if (hasInstance(wasmName))
        {
            throw makeStringExceptionV(100, "Wasm instance already registered: %s", wasmName.c_str());
        }
        TRACE("WASM SE createInstance %s", wasmName.c_str());
        auto module = wasmEngine->getModule(wasmName);
        try
        {
            wasmtime::Linker linker(wasmEngine->engine);
            linker.define_wasi().unwrap();

            auto callback = [this, wasmName](wasmtime::Caller caller, uint32_t msg, uint32_t msg_len)
            {
                auto data = this->getData(wasmName);
                auto msg_ptr = (char *)&data[msg];
                std::string str(msg_ptr, msg_len);
                DBGLOG("from wasm: %s", str.c_str());
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
            wasmInstances.insert(std::make_pair(wasmName, newInstance));
        }
        catch (const wasmtime::Error &e)
        {
            throw makeStringExceptionV(100, "WASM SE createInstance: %s", e.message().c_str());
        }
    }

    abi::CallContext createContext(const std::string &qualifiedID)
    {
        return abi::mk_cx(this->getData(qualifiedID), "utf8", [this, qualifiedID](int a, int b, int c, int d) -> int
                          { return this->callRealloc(qualifiedID, {a, b, c, d})[0].i32(); });
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
            throw makeStringExceptionV(100, "Wasm function not found: %s", qualifiedID.c_str());
        return found->second;
    }

    std::vector<wasmtime::ValType> getFuncParams(const std::string &qualifiedID)
    {
        TRACE("WASM SE getFuncParams");
        auto func = getFunc(qualifiedID);
        wasmtime::FuncType funcType = func.type(store.context());
        auto params = funcType->params();
        std::vector<wasmtime::ValType> retVal;
        for (auto &param : params)
        {
            retVal.push_back(param);
        }
        return retVal;
    }

    std::vector<wasmtime::ValType> getFuncResults(const std::string &qualifiedID)
    {
        TRACE("WASM SE getFuncResults");
        auto func = getFunc(qualifiedID);
        wasmtime::FuncType funcType = func.type(store.context());
        auto results = funcType->results();
        std::vector<wasmtime::ValType> retVal;
        for (auto &result : results)
        {
            retVal.push_back(result);
        }
        return retVal;
    }

    std::vector<wasmtime::Val> call(const std::string &qualifiedID, const std::vector<wasmtime::Val> &params)
    {
        TRACE("WASM SE call");
        auto func = getFunc(qualifiedID);
        try
        {
            auto retVal = func.call(store, params).unwrap();
            return retVal;
        }
        catch (const wasmtime::Trap &e)
        {
            throw makeStringExceptionV(100, "WASM SE call: %s", e.message().c_str());
        }
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
            throw makeStringExceptionV(100, "Wasm memory not found: %s", wasmName.c_str());
        return found->second.data(store.context());
    }
};
thread_local std::unique_ptr<WasmStore> wasmStore = std::make_unique<WasmStore>();

class Function
{
protected:
    std::string wasmName;
    std::string funcName;
    std::string qualifiedID;

    std::vector<wasmtime::Val> args;
    std::vector<wasmtime::Val> wasmResults;

    Function()
    {
        TRACE("Function::constructor");
    }

public:
    Function(const std::string &qualifiedID) : qualifiedID(qualifiedID)
    {
        TRACE("Function::constructor(%s)", qualifiedID.c_str());
        std::tie(wasmName, funcName) = splitQualifiedID(qualifiedID);
    }

    virtual ~Function()
    {
        TRACE("Function::destructor");

        //  Garbage Collection  ---
        //    Function results  ---
        auto gc_func_name = createQualifiedID(wasmName, "cabi_post_" + funcName);
        if (wasmStore->hasFunc(gc_func_name))
        {
            for (auto &result : wasmResults)
            {
                wasmStore->call(gc_func_name, {result});
            }
        }
    }

    void push_param(bool val)
    {
        TRACE("Function::push_param %s %i", "bool", val);
        args.push_back(val);
    }

#include <tuple> // Include the missing header file

    void push_param(const char *str)
    {
        const abi::CallContext &cx = wasmStore->createContext(wasmName);
        auto tmp = abi::store_string(cx, abi::HostStringTuple(str, "utf8", strlen(str)));
        args.push_back((int32_t)std::get<0>(tmp));
        args.push_back((int32_t)std::get<1>(tmp));
    }

    template <typename T>
    T result(size_t idx = 0)
    {
        TRACE("Function::result");
        if (wasmResults.empty() || idx >= wasmResults.size())
            throw std::runtime_error("idx out of range");

        auto result = wasmResults[idx];

        if constexpr (std::is_same<T, bool>::value ||
                      std::is_same<T, uint8_t>::value ||
                      std::is_same<T, int8_t>::value ||
                      std::is_same<T, uint32_t>::value ||
                      std::is_same<T, int32_t>::value)
        {
            if (result.kind() != wasmtime::ValKind::I32)
                throw std::runtime_error("Result is not an i32");
            return result.i32();
        }
        else if constexpr (std::is_same<T, const char *>::value)
        {
            if (result.kind() != wasmtime::ValKind::I32)
                throw std::runtime_error("Result is not an i32");
            const abi::CallContext &cx = wasmStore->createContext(wasmName);
            auto ptr = result.i32();
            auto [strPtr, encoding, bytes] = abi::load_string(cx, ptr);
            size32_t codepoints = rtlUtf8Length(bytes, strPtr);
            size32_t chars;
            char *result;
            rtlUtf8ToStrX(chars, result, codepoints, strPtr);
            return result;
        }
        throw std::runtime_error("Unknwon T");
    }

    void call()
    {
        TRACE("Function::call %s", qualifiedID.c_str());
        wasmResults = wasmStore->call(qualifiedID, args);
    }
};

class SecureFunction : public Function, public CInterfaceOf<IEmbedFunctionContext>
{
public:
    SecureFunction(ICodeContext *codeCtx)
    {
        TRACE("WASM SE se:constructor");
        wasmEngine->setCodeContext(codeCtx);
    }

    virtual ~SecureFunction()
    {
        TRACE("WASM SE se:destructor");
    }

    //  IEmbedFunctionContext ---
    void setActivityContext(const IThorActivityContext *activityCtx)
    {
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
    virtual void bindStringParam(const char *name, size32_t bytes, const char *val)
    {
        TRACE("WASM SE bindStringParam %s %d %s", name, bytes, val);
        size32_t utfCharCount;
        rtlDataAttr utfText;
        rtlStrToUtf8X(utfCharCount, utfText.refstr(), bytes, val);
        bindUTF8Param(name, utfCharCount, utfText.getstr());
    }
    virtual void bindVStringParam(const char *name, const char *val)
    {
        TRACE("WASM SE bindVStringParam %s %s", name, val);
        bindStringParam(name, strlen(val), val);
    }
    virtual void bindUTF8Param(const char *name, size32_t chars, const char *val)
    {
        TRACE("WASM SE bindUTF8Param %s %d %s", name, chars, val);
        auto bytes = rtlUtf8Size(chars, val);
        auto memIdxVar = wasmStore->callRealloc(wasmName, {0, 0, 1, (int32_t)bytes});
        auto memIdx = memIdxVar[0].i32();
        auto mem = wasmStore->getData(wasmName);
        memcpy(&mem[memIdx], val, bytes);
        args.push_back(memIdx);
        args.push_back((int32_t)bytes);
    }
    virtual void bindUnicodeParam(const char *name, size32_t chars, const UChar *val)
    {
        TRACE("WASM SE bindUnicodeParam %s %d", name, chars);
        size32_t utfCharCount;
        rtlDataAttr utfText;
        rtlUnicodeToUtf8X(utfCharCount, utfText.refstr(), chars, val);
        bindUTF8Param(name, utfCharCount, utfText.getstr());
    }

    virtual void bindSetParam(const char *name, int elemType, size32_t elemSize, bool isAll, size32_t totalBytes, const void *setData)
    {
        TRACE("WASM SE bindSetParam %s %d %d %d %d %p", name, elemType, elemSize, isAll, totalBytes, setData);
        throw makeStringException(200, "bindSetParam not implemented");

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
            memIdxVar = wasmStore->callRealloc(wasmName, {0, 0, 1, (int32_t)numElems});
            memIdx = memIdxVar[0].i32();
            break;
        default:
            rtlFail(0, "wasmembed: Unsupported parameter type");
            break;
        }

        auto mem = wasmStore->getData(wasmName);
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
        throw makeStringException(200, "bindRowParam not implemented");
    }
    virtual void bindDatasetParam(const char *name, IOutputMetaData &metaVal, IRowStream *val)
    {
        TRACE("WASM SE bindDatasetParam %s %p", name, val);
        throw makeStringException(200, "bindDatasetParam not implemented");
    }
    virtual bool getBooleanResult()
    {
        TRACE("WASM SE getBooleanResult");
        return wasmResults[0].i32();
    }
    virtual void getDataResult(size32_t &len, void *&result)
    {
        TRACE("WASM SE getDataResult");
        throw makeStringException(200, "getDataResult not implemented");
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
        abi::CallContext cx = abi::mk_cx(wasmStore->getData(wasmName));
        const char *strPtr;
        std::string encoding;
        uint32_t bytes;
        std::tie(strPtr, encoding, bytes) = abi::load_string(cx, ptr);
        size32_t codepoints = rtlUtf8Length(bytes, strPtr);
        rtlUtf8ToStrX(chars, result, codepoints, strPtr);
    }
    virtual void getUTF8Result(size32_t &chars, char *&result)
    {
        TRACE("WASM SE getUTF8Result");
        auto ptr = wasmResults[0].i32();
        abi::CallContext cx = abi::mk_cx(wasmStore->getData(wasmName));
        const char *strPtr;
        std::string encoding;
        uint32_t bytes;
        std::tie(strPtr, encoding, bytes) = abi::load_string(cx, ptr);
        chars = rtlUtf8Length(bytes, strPtr);
        TRACE("WASM SE getUTF8Result %d %d", bytes, chars);
        result = (char *)rtlMalloc(bytes);
        memcpy(result, strPtr, bytes);
    }
    virtual void getUnicodeResult(size32_t &chars, UChar *&result)
    {
        TRACE("WASM SE getUnicodeResult");
        auto ptr = wasmResults[0].i32();
        abi::CallContext cx = abi::mk_cx(wasmStore->getData(wasmName));
        const char *strPtr;
        std::string encoding;
        uint32_t bytes;
        std::tie(strPtr, encoding, bytes) = abi::load_string(cx, ptr);
        unsigned numchars = rtlUtf8Length(bytes, strPtr);
        rtlUtf8ToUnicodeX(chars, result, numchars, strPtr);
    }
    virtual void getSetResult(bool &__isAllResult, size32_t &resultBytes, void *&result, int elemType, size32_t elemSize)
    {
        TRACE("WASM SE getSetResult %d %d %zu", elemType, elemSize, wasmResults.size());
        auto ptr = wasmResults[0].i32();
        auto data = wasmStore->getData(wasmName);

        throw makeStringException(200, "getSetResult not implemented");
    }
    virtual IRowStream *getDatasetResult(IEngineRowAllocator *_resultAllocator)
    {
        TRACE("WASM SE getDatasetResult");
        throw makeStringException(200, "getDatasetResult not implemented");
        return NULL;
    }
    virtual byte *getRowResult(IEngineRowAllocator *_resultAllocator)
    {
        TRACE("WASM SE getRowResult");
        throw makeStringException(200, "getRowResult not implemented");
        return NULL;
    }
    virtual size32_t getTransformResult(ARowBuilder &builder)
    {
        TRACE("WASM SE getTransformResult");
        throw makeStringException(200, "getTransformResult not implemented");
        return 0;
    }
    virtual void loadCompiledScript(size32_t chars, const void *_script) override
    {
        TRACE("WASM SE loadCompiledScript %p", _script);
        throw makeStringException(200, "loadCompiledScript not implemented");
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
        throw makeStringException(200, "compileEmbeddedScript not supported");
    }
    virtual void importFunction(size32_t lenChars, const char *qualifiedName) override
    {
        TRACE("WASM SE importFunction: %s", qualifiedName);

        qualifiedID = std::string(qualifiedName, lenChars);
        std::tie(wasmName, funcName) = splitQualifiedID(qualifiedID);

        if (!wasmStore->hasInstance(wasmName))
        {
            wasmStore->registerInstance(wasmName);
        }
    }
    virtual void callFunction()
    {
        TRACE("WASM SE callFunction %s", qualifiedID.c_str());
        wasmResults = wasmStore->call(qualifiedID, args);
    }
};

IEmbedFunctionContext *createISecureEnclave(ICodeContext *codeCtx)
{
    return new SecureFunction(codeCtx);
}

#ifdef _USE_CPPUNIT

#include "unittests.hpp"

class WasmTest : public CppUnit::TestFixture
{
    CPPUNIT_TEST_SUITE(WasmTest);
    CPPUNIT_TEST(test);
    CPPUNIT_TEST_SUITE_END();

public:
    WasmTest()
    {
    }

    ~WasmTest()
    {
    }

protected:
    void test()
    {
        std::vector<uint8_t> _contents = readWasmBinaryToBuffer("plugins/wasmembed/test/build-container/wasmembed.wasm");
        const wasmtime::Span<uint8_t> &contents = _contents;
        wasmEngine->setModule("wasmembed", contents);
        wasmStore->registerInstance("wasmembed");
        Function f("wasmembed.bool-test");
        f.push_param(false);
        f.push_param(false);
        f.call();
        bool r = f.result<bool>(0);
        CPPUNIT_ASSERT(r == false);

        wasmtime::Engine engine;

        Function f2("wasmembed.bool-test");
        f2.push_param(true);
        f2.push_param(true);
        f2.call();
        bool r2 = f2.result<bool>(0);
        CPPUNIT_ASSERT(r2 == true);

        const char *r3;
        {
            Function f3("wasmembed.utf8-string-test2");
            f3.push_param("aaa");
            f3.push_param("bbb");
            f3.call();
            r3 = f3.result<const char *>(0);
            CPPUNIT_ASSERT(strcmp(r3, "aaabbb") == 0);
        }
        CPPUNIT_ASSERT(strcmp(r3, "aaabbb") == 0);
        // const char *r4 = f3.result<const char *>(1);
        // CPPUNIT_ASSERT(strcmp(r4, "aaabbb") == 0);

        CPPUNIT_ASSERT(wasmStore->call("wasmembed.bool-test", {true, true})[0].i32() == true);
        auto params = wasmStore->getFuncParams("wasmembed.utf8-string-test");
        CPPUNIT_ASSERT(params.size() == 4);
        auto results = wasmStore->getFuncResults("wasmembed.utf8-string-test");
        CPPUNIT_ASSERT(results.size() == 1);

        // Function f("wasmembed.utf8-string-test");

        // abi::CallContext cx = wasmStore->createContext("wasmembed");
        // auto [aaa, aaa2] = abi::store_string(cx, "aaa");
        // auto [bbb, bbb2] = abi::store_string(cx, "bbb");
        // auto xxx = wasmStore->call("wasmembed.utf8-string-test", {aaa, aaa2, bbb, bbb2})[0].i32();
        // uint32_t strPtr;
        // std::string encoding;
        // uint32_t bytes;
        // std::tie(strPtr, encoding, bytes) = abi::load_string(cx, xxx);
        // size32_t codepoints = rtlUtf8Length(bytes, &cx.opts.memory[strPtr]);
        // size32_t chars;
        // char *result;
        // rtlUtf8ToStrX(chars, result, codepoints, reinterpret_cast<const char *>(&cx.opts.memory[strPtr]));
        // CPPUNIT_ASSERT(strcmp(result, "aaabbb") == 0);

        test2();
    }

    wasmtime::Val val2WVal(const WasmVal &val)
    {
        switch (val.kind())
        {
        case WasmValType::I32:
            return static_cast<int32_t>(val.i32());
        case WasmValType::I64:
            return static_cast<int32_t>(val.i64());
        case WasmValType::F32:
            return static_cast<float>(val.f32());
        case WasmValType::F64:
            return static_cast<double>(val.f64());
        }
    }

    template <typename... Args>
    std::vector<wasmtime::Val> joinWasmVals(Args... args)
    {
        std::vector<wasmtime::Val> result;
        auto push_to_result = [&](const auto &vec)
        {
            for (const auto &val : vec)
                result.push_back(val2WVal(val));
        };
        (push_to_result(args), ...);
        return result;
    }

    void test2()
    {
        std::cout << "Compiling module\n";
        wasmtime::Engine engine;

        wasmtime::Store store(engine);
        std::vector<uint8_t> _contents = readWasmBinaryToBuffer("plugins/wasmembed/test/build-container/wasmembed.wasm");
        const wasmtime::Span<uint8_t> &contents = _contents;
        auto module = wasmtime::Module::compile(engine, contents).unwrap();

        wasmtime::WasiConfig wasi;
        wasi.inherit_argv();
        wasi.inherit_env();
        wasi.inherit_stdin();
        wasi.inherit_stdout();
        wasi.inherit_stderr();
        store.context().set_wasi(std::move(wasi)).unwrap();

        wasmtime::Linker linker(engine);
        linker.define_wasi().unwrap();

        auto callback = [&store](wasmtime::Caller caller, uint32_t msg, uint32_t msg_len)
        {
            auto memory = std::get<wasmtime::Memory>(*caller.get_export("memory"));
            auto data = memory.data(store.context());
            const char *msg_ptr = reinterpret_cast<const char *>(&data[msg]);
            std::string str(msg_ptr, msg_len);
            std::cout << str << std::endl;
        };

        auto host_func = linker.func_wrap("$root", "dbglog", callback).unwrap();
        auto instance = linker.instantiate(store, module).unwrap();
        linker.define_instance(store, "linking2", instance).unwrap();

        auto cabi_realloc = std::get<wasmtime::Func>(*instance.get(store, "cabi_realloc"));
        std::function<int(int, int, int, int)> realloc = [&store, cabi_realloc](int a, int b, int c, int d) -> int
        {
            return cabi_realloc.call(store, {a, b, c, d}).unwrap()[0].i32();
        };
        auto memory = std::get<wasmtime::Memory>(*instance.get(store, "memory"));
        store.context().set_data(memory);
        wasmtime::Span<uint8_t> data = memory.data(store.context());
        CallContextPtr cx = createCallContext(data, realloc);

        auto bool_test = std::get<wasmtime::Func>(*instance.get(store, "bool-test"));
        ASSERT(bool_test.call(store, joinWasmVals(lower_flat(*cx, false), lower_flat(*cx, false))).unwrap()[0].i32() == false);
        ASSERT(bool_test.call(store, joinWasmVals(lower_flat(*cx, false), lower_flat(*cx, true))).unwrap()[0].i32() == false);
        ASSERT(bool_test.call(store, joinWasmVals(lower_flat(*cx, true), lower_flat(*cx, false))).unwrap()[0].i32() == false);
        ASSERT(bool_test.call(store, joinWasmVals(lower_flat(*cx, true), lower_flat(*cx, true))).unwrap()[0].i32() == true);

        auto utf8_string_test = std::get<wasmtime::Func>(*instance.get(store, "utf8-string-test"));

        auto result = utf8_string_test.call(store, joinWasmVals(lower_flat(*cx, "aaa"), lower_flat(*cx, "bbb"))).unwrap()[0];
        lift

                // Val v2 = Val(false);
                // Val w2 = store(cx);

                // f4->appendParam(false);
                // f4->appendParam(false);
                // f4->call(cx);

                // auto [aaa, aaa2] = abi::store_string(cx, "aaa");
                // auto [bbb, bbb2] = abi::store_string(cx, "bbb");
                // auto ret = utf8_string_test.call(store, {aaa, aaa2, bbb, bbb2}).unwrap();
                // auto ptr = ret[0].i32();
                // uint32_t strPtr;
                // std::string encoding;
                // uint32_t bytes;
                // std::tie(strPtr, encoding, bytes) = abi::load_string(cx, ptr);
                // size32_t codepoints = rtlUtf8Length(bytes, &cx.opts.memory[strPtr]);
                // size32_t chars;
                // char *result;
                // rtlUtf8ToStrX(chars, result, codepoints, reinterpret_cast<const char *>(&cx.opts.memory[strPtr]));

                // ASSERT(bool_test.call(store, {false, false}).unwrap()[0].i32() == false);

                std::cout
            << "Done\n";
    }
};

CPPUNIT_TEST_SUITE_REGISTRATION(WasmTest);
CPPUNIT_TEST_SUITE_NAMED_REGISTRATION(WasmTest, "WasmTest");

#endif