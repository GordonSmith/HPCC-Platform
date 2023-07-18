#include "platform.h"
#include "hqlplugins.hpp"
#include "rtlfield.hpp"
#include "enginecontext.hpp"

#include "secure-enclave/secure-enclave.hpp"

static const char *compatibleVersions[] = {
    "WASM Embed Helper 1.0.0",
    NULL};

static const char *version = "WASM Embed Helper 1.0.0";

extern "C" DECL_EXPORT bool getECLPluginDefinition(ECLPluginDefinitionBlock *pb)
{
    if (pb->size == sizeof(ECLPluginDefinitionBlockEx))
    {
        ECLPluginDefinitionBlockEx *pbx = (ECLPluginDefinitionBlockEx *)pb;
        pbx->compatibleVersions = compatibleVersions;
    }
    else if (pb->size != sizeof(ECLPluginDefinitionBlock))
        return false;
    pb->magicVersion = PLUGIN_VERSION;
    pb->version = version;
    pb->moduleName = "wasm";
    pb->ECL = NULL;
    pb->flags = PLUGIN_MULTIPLE_VERSIONS;
    pb->description = "WASM Embed Helper";
    return true;
}

namespace wasmLanguageHelper
{
    class Callbacks : public IWasmEmbedCallback
    {
    protected:
        bool manifestAdded = false;
        StringArray manifestModules;

    public:
        Callbacks()
        {
        }
        ~Callbacks()
        {
        }
        void manifestPaths(ICodeContext *codeCtx)
        {
            if (codeCtx && !manifestAdded)
            {
                manifestAdded = true;
                IEngineContext *engine = codeCtx->queryEngineContext();
                if (engine)
                {
                    engine->getManifestFiles("wasm", manifestModules);
                }
            }
        }

        //  IWasmEmbedCallback  ---
        virtual inline void DBGLOG(const char *format, ...) override
        {
            va_list args;
            va_start(args, format);
            VALOG(MCdebugInfo, unknownJob, format, args);
            va_end(args);
        }

        virtual void throwStringException(int code, const char *format, ...) override
        {
            va_list args;
            va_start(args, format);
            IException *ret = makeStringExceptionVA(code, format, args);
            va_end(args);
            throw ret;
        }

        virtual void *rtlMalloc(size32_t size) override
        {
            return ::rtlMalloc(size);
        }

        virtual void rtlStrToStrX(unsigned &tlen, char *&tgt, unsigned slen, const void *src) override
        {
            return ::rtlStrToStrX(tlen, tgt, slen, src);
        }

        virtual void rtlUtf8ToUnicodeX(unsigned &outlen, UChar *&out, unsigned inlen, char const *in) override
        {
            ::rtlUtf8ToUnicodeX(outlen, out, inlen, in);
        }

        virtual void rtlUtf8ToUtf8X(size32_t &outlen, char *&out, size32_t inlen, const char *in) override
        {
            ::rtlUtf8ToUtf8X(outlen, out, inlen, in);
        }

        virtual unsigned rtlUtf8Size(unsigned len, const void *data) override
        {
            return ::rtlUtf8Size(len, data);
        }

        virtual unsigned rtlUtf8Length(unsigned size, const void *_data) override
        {
            return ::rtlUtf8Length(size, _data);
        }

        virtual void rtlUnicodeToUtf8X(unsigned &outlen, char *&out, unsigned inlen, const UChar *in) override
        {
            return ::rtlUnicodeToUtf8X(outlen, out, inlen, in);
        }

        virtual const char *resolveManifestPath(const char *leafName) override
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
    };
    std::shared_ptr<Callbacks> callbacks;

    class WasmEmbedContext : public CInterfaceOf<IEmbedContext>
    {
        std::unique_ptr<ISecureEnclave> enclave;

    public:
        WasmEmbedContext()
        {
            enclave = createISecureEnclave();
        }
        virtual ~WasmEmbedContext() override
        {
        }
        //  IEmbedContext  ---
        virtual IEmbedFunctionContext *createFunctionContext(unsigned flags, const char *options) override
        {
            return createFunctionContextEx(nullptr, nullptr, flags, options);
        }
        virtual IEmbedFunctionContext *createFunctionContextEx(ICodeContext *ctx, const IThorActivityContext *activityContext, unsigned flags, const char *options) override
        {
            callbacks->manifestPaths(ctx);
            return enclave.get();
        }
        virtual IEmbedServiceContext *createServiceContext(const char *service, unsigned flags, const char *options) override
        {
            throwUnexpected();
            return nullptr;
        }
    };

    extern DECL_EXPORT IEmbedContext *getEmbedContext()
    {
        return new WasmEmbedContext();
    }

    extern DECL_EXPORT void syntaxCheck(size32_t &__lenResult, char *&__result, const char *funcname, size32_t charsBody, const char *body, const char *argNames, const char *compilerOptions, const char *persistOptions)
    {
        StringBuffer result;
        //  MORE - ::syntaxCheck(__lenResult, __result, funcname, charsBody, body, argNames, compilerOptions, persistOptions);
        __lenResult = result.length();
        __result = result.detach();
    }

} // namespace

MODULE_INIT(INIT_PRIORITY_STANDARD)
{
    wasmLanguageHelper::callbacks = std::make_shared<wasmLanguageHelper::Callbacks>();
    init(wasmLanguageHelper::callbacks);
    return true;
}

MODULE_EXIT()
{
    kill();
    wasmLanguageHelper::callbacks.reset();
}