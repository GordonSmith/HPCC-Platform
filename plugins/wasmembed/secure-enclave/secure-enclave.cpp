#include "secure-enclave.hpp"

#include "abi.hpp"

#include <map>
#include <functional>

wasmtime::Engine engine;
wasmtime::Store store(engine);

std::map<std::string, wasmtime::Instance> wasmInstances;
std::map<std::string, wasmtime::Memory> wasmMems;
std::map<std::string, wasmtime::Func> wasmFuncs;

class SecureFunction : public ISecureEnclave
{
    IWasmEmbedCallback &embedContext;
    std::string wasmName;
    std::string funcName;
    std::string qualifiedID;

    const IThorActivityContext *activityCtx = nullptr;
    std::vector<wasmtime::Val> args;
    std::vector<wasmtime::Val> results;
    std::vector<std::pair<int32_t, size32_t>> garbage;

public:
    static SecureFunction *self;

    SecureFunction(IWasmEmbedCallback &embedContext) : embedContext(embedContext)
    {
        embedContext.dbglog("se:constructor");

        //  Needed for callbacks  ---
        self = this;
    }

    virtual ~SecureFunction() override
    {
        embedContext.dbglog("se:destructor");

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

        //    Function params  ---
        if (garbage.size() > 0)
        {
            auto realloc = this->realloc();
            for (auto &pair : garbage)
            {
                realloc.call(store, {pair.first, (int32_t)pair.second, 1, 0}).unwrap();
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
        args.push_back(val);
    }
    virtual void bindRealParam(const char *name, double val)
    {
        embedContext.dbglog("bindRealParam %s %f");
        args.push_back(val);
    }
    virtual void bindSignedSizeParam(const char *name, int size, __int64 val)
    {
        embedContext.dbglog("bindSignedSizeParam %s %i %lld");
        if (size <= 4)
            args.push_back((int32_t)val);
        else
            args.push_back((int64_t)val);
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
    virtual void bindStringParam(const char *qualifiedName, size32_t len, const char *_val)
    {
        std::string val(_val, len);
        embedContext.dbglog("bindStringParam " + std::string(qualifiedName) + " " + val + " " + std::to_string(len));
        auto memIdxVar = realloc().call(store, {0, 0, 1, (int32_t)len}).unwrap();
        auto memIdx = memIdxVar[0].i32();
        auto mem = data();
        for (int i = 0; i < len; i++)
        {
            mem[memIdx + i] = val[i];
        }
        args.push_back(memIdx);
        args.push_back((int32_t)len);
        garbage.push_back(std::make_pair(memIdx, len));
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
        auto ptr = results[0].i32();
        embedContext.dbglog("getStringResult (ptr) " + std::to_string(ptr));
        auto data = this->data();

        uint32_t begin = load_int(data, ptr, 4);
        embedContext.dbglog("begin " + std::to_string(begin));
        uint32_t tagged_code_units = load_int(data, ptr + 4, 4);
        embedContext.dbglog("tagged_code_units " + std::to_string(tagged_code_units));
        std::string s = load_string(data, ptr);
        embedContext.dbglog("getStringResult (std::string) " + s);
        __chars = s.length();
        embedContext.dbglog("getStringResult (__chars) " + std::to_string(__chars));
        __result = (char *)rtlMalloc(__chars + 1);
        memcpy(__result, s.c_str(), __chars);
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
    }
    void registerInstance(const std::string &_wasmName, const std::variant<std::string_view, wasmtime::Span<uint8_t>> &wasm)
    {
        embedContext.dbglog("registerInstance " + _wasmName);
        auto instanceItr = wasmInstances.find(_wasmName);
        if (instanceItr == wasmInstances.end())
        {
            wasmName = _wasmName;
            embedContext.dbglog("resolveModule " + wasmName);
            auto module = std::holds_alternative<std::string_view>(wasm) ? wasmtime::Module::compile(engine, std::get<std::string_view>(wasm)).unwrap() : wasmtime::Module::compile(engine, std::get<wasmtime::Span<uint8_t>>(wasm)).unwrap();
            embedContext.dbglog("resolveModule2 " + wasmName);

            wasmtime::WasiConfig wasi;
            wasi.inherit_argv();
            wasi.inherit_env();
            wasi.inherit_stdin();
            wasi.inherit_stdout();
            wasi.inherit_stderr();
            store.context().set_wasi(std::move(wasi)).unwrap();
            embedContext.dbglog("resolveModule3 " + wasmName);

            wasmtime::Linker linker(engine);
            linker.define_wasi().unwrap();
            embedContext.dbglog("resolveModule4 " + wasmName);

            auto callback = [](wasmtime::Caller caller, uint32_t msg, uint32_t msg_len)
            {
                self->embedContext.dbglog("callback: " + std::to_string(msg) + ", " + std::to_string(msg_len));
                auto data = self->data();
                auto msg_ptr = (char *)&data[msg];
                std::string str(msg_ptr, msg_len);
                self->embedContext.dbglog("from wasm: " + str);
            };
            auto host_func = linker.func_wrap("$root", "dbglog", callback).unwrap();

            auto newInstance = linker.instantiate(store, module).unwrap();
            linker.define_instance(store, "linking2", newInstance).unwrap();

            embedContext.dbglog("resolveModule5 " + wasmName);

            wasmInstances.insert(std::make_pair(wasmName, newInstance));

            for (auto exportItem : module.exports())
            {
                auto externType = wasmtime::ExternType::from_export(exportItem);
                std::string name(exportItem.name());
                if (std::holds_alternative<wasmtime::FuncType::Ref>(externType))
                {
                    embedContext.dbglog(std::string("Exported function: ") + name);
                    auto func = std::get<wasmtime::Func>(*newInstance.get(store, name));
                    wasmFuncs.insert(std::make_pair(wasmName + "." + name, func));
                }
                else if (std::holds_alternative<wasmtime::MemoryType::Ref>(externType))
                {
                    embedContext.dbglog(std::string("Exported memory: ") + name);
                    auto memory = std::get<wasmtime::Memory>(*newInstance.get(store, name));
                    wasmMems.insert(std::make_pair(wasmName + "." + name, memory));
                }
                else if (std::holds_alternative<wasmtime::TableType::Ref>(externType))
                {
                    embedContext.dbglog(std::string("Exported table: ") + name);
                }
                else if (std::holds_alternative<wasmtime::GlobalType::Ref>(externType))
                {
                    embedContext.dbglog(std::string("Exported global: ") + name);
                }
                else
                {
                    embedContext.dbglog("Unknown export type");
                }
            }
        }
    }
    virtual void compileEmbeddedScript(size32_t lenChars, const char *_utf)
    {
        std::string utf(_utf, lenChars);
        embedContext.dbglog("compileEmbeddedScript");
        funcName = extractContentInDoubleQuotes(utf);
        registerInstance("embed_" + funcName, utf);
        qualifiedID = createQualifiedID("embed_" + funcName, funcName);
    }
    virtual void importFunction(size32_t lenChars, const char *qualifiedName)
    {
        qualifiedID = std::string(qualifiedName, lenChars);
        embedContext.dbglog(std::string("importFunction:  ") + qualifiedID);
        auto [_wasmName, _funcName] = splitQualifiedID(qualifiedID);
        wasmName = _wasmName;
        funcName = _funcName;
        embedContext.dbglog(std::string("importFunction2:  ") + wasmName + ", " + funcName);

        auto instanceItr = wasmInstances.find(wasmName);
        if (instanceItr == wasmInstances.end())
        {
            std::string fullPath = embedContext.resolvePath((wasmName + ".wasm").c_str());
            embedContext.dbglog("importFunction:  fullPath " + fullPath);
            auto wasmFile = read_wasm_binary_to_buffer(fullPath);
            registerInstance(wasmName, wasmFile);
        }
    }
    virtual void callFunction()
    {
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
SecureFunction *SecureFunction::self = nullptr;

std::unique_ptr<ISecureEnclave> createISecureEnclave(IWasmEmbedCallback &embedContext)
{
    return std::make_unique<SecureFunction>(embedContext);
}
