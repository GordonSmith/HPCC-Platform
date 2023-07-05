/*##############################################################################

    HPCC SYSTEMS software Copyright (C) 2012 HPCC Systems®.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
############################################################################## */

#include "platform.h"
#include "hqlplugins.hpp"
#include "rtlfield.hpp"
#include "enginecontext.hpp"

#include "secure-enclave/secure-enclave.hpp"

#include <mutex>

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

__declspec(noreturn) static void UNSUPPORTED(const char *feature) __attribute__((noreturn));

static void UNSUPPORTED(const char *feature)
{
    throw MakeStringException(-1, "UNSUPPORTED feature: %s not supported in wasm plugin", feature);
}

__declspec(noreturn) static void typeError(const char *expected, const RtlFieldInfo *field) __attribute__((noreturn));

static void typeError(const char *expected, const RtlFieldInfo *field)
{
    VStringBuffer msg("wasm: type mismatch - %s expected", expected);
    if (field)
        msg.appendf(" for field %s", field->name);
    rtlFail(0, msg.str());
}

namespace wasmLanguageHelper
{

    class Callbacks : public IWasmEmbedCallback
    {
    protected:
        bool manifestAdded = false;
        StringArray manifestModules;

    public:
        virtual void manifestPaths(ICodeContext *codeCtx)
        {
            if (codeCtx && !manifestAdded) // MORE - this assumes we never reuse a thread for a different workunit, without the thread termination hooks having been called
            {
                manifestAdded = true;
                IEngineContext *engine = codeCtx->queryEngineContext();
                if (engine)
                {
                    engine->getManifestFiles("wasm", manifestModules);
                    if (manifestModules.length())
                    {
                        ForEachItemIn(idx, manifestModules)
                        {
                            const char *path = manifestModules.item(idx);
                            DBGLOG("Manifest wasm %s", path);
                        }
                    }
                }
            }
        }

        //  IWasmEmbedCallback  ---
        virtual void dbglog(const std::string &msg) override
        {
            DBGLOG("%s", msg.c_str());
        }

        virtual const char *resolvePath(const char *leafName) override
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

    } callbacks;

    std::once_flag initFlag;
    std::unique_ptr<ISecureEnclave> enclave;
    class WasmEmbedContext : public CInterfaceOf<IEmbedContext>
    {
    public:
        WasmEmbedContext()
        {
            DBGLOG("WasmEmbedContext constructor");
            std::call_once(initFlag, []()
                           { enclave = createISecureEnclave(callbacks); });
        }
        virtual ~WasmEmbedContext() override
        {
            DBGLOG("WasmEmbedContext destructor");
        }
        //  IEmbedContext  ---
        virtual IEmbedFunctionContext *createFunctionContext(unsigned flags, const char *options) override
        {
            DBGLOG("createFunctionContext");
            return createFunctionContextEx(nullptr, nullptr, flags, options);
        }
        virtual IEmbedFunctionContext *createFunctionContextEx(ICodeContext *ctx, const IThorActivityContext *activityContext, unsigned flags, const char *options) override
        {
            DBGLOG("createFunctionContextEx");
            callbacks.manifestPaths(ctx);
            return enclave.get();
        }
        virtual IEmbedServiceContext *createServiceContext(const char *service, unsigned flags, const char *options) override
        {
            DBGLOG("createServiceContext %s", service);
            throwUnexpected();
            return nullptr;
        }
    };

    extern DECL_EXPORT IEmbedContext *getEmbedContext()
    {
        DBGLOG("getEmbedContext");
        return new WasmEmbedContext();
    }

    extern DECL_EXPORT void syntaxCheck(size32_t &__lenResult, char *&__result, const char *funcname, size32_t charsBody, const char *body, const char *argNames, const char *compilerOptions, const char *persistOptions)
    {
        DBGLOG("syntaxCheck");
        StringBuffer result;
        // result.set("syntaxCheck: XXX");
        // MORE
        __lenResult = result.length();
        __result = result.detach();
    }

} // namespace

MODULE_INIT(INIT_PRIORITY_STANDARD)
{
    return true;
}

MODULE_EXIT()
{
    wasmLanguageHelper::enclave.reset();
}