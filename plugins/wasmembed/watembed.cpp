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
#include "jexcept.hpp"
#include "jthread.hpp"
#include "hqlplugins.hpp"
#include "deftype.hpp"
#include "eclrtl.hpp"
#include "eclrtl_imp.hpp"
#include "rtlds_imp.hpp"
#include "rtlfield.hpp"
#include "nbcd.hpp"
#include "roxiemem.hpp"
#include <vector>
#include <variant>
#include <sstream>

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

namespace watLanguageHelper
{
    static std::shared_ptr<IWasmFunctionContext> theFunctionContext; // We reuse per thread, for speed

    static bool releaseContext(bool isPooled)
    {

        if (theFunctionContext)
        {
            theFunctionContext = nullptr;
        }
        return false;
    }

    class WASMEmbedContext : public CInterfaceOf<IEmbedContext>
    {
        std::shared_ptr<ISecureEnclave> enclave;

    public:
        WASMEmbedContext()
        {
            DBGLOG("WASMEmbedContext created");
            auto dbglog = [](const std::string &value)
            {
                DBGLOG("%s", value.c_str());
            };
            enclave = createISecureEnclave(dbglog);
        }
        ~WASMEmbedContext()
        {
            DBGLOG("WASMEmbedContext destroyed");
        }
        virtual IEmbedFunctionContext *createFunctionContext(unsigned flags, const char *options) override
        {
            DBGLOG("createFunctionContext");
            return createFunctionContextEx(nullptr, nullptr, flags, options);
        }
        virtual IEmbedFunctionContext *createFunctionContextEx(ICodeContext *ctx, const IThorActivityContext *activityContext, unsigned flags, const char *options) override
        {
            DBGLOG("createFunctionContextEx %s", options);
            if (flags & EFimport)
                UNSUPPORTED("IMPORT");
            if (!theFunctionContext)
            {
                DBGLOG("NEW createFunctionContextEx %s", options);
                theFunctionContext = enclave->createFunctionContext();
                addThreadTermFunc(releaseContext);
            }
            theFunctionContext->setActivityContext(activityContext);
            return theFunctionContext.get();
        }
        virtual IEmbedServiceContext *createServiceContext(const char *service, unsigned flags, const char *options) override
        {
            DBGLOG("createServiceContext %s", service);
            throwUnexpected();
        }
    } theEmbedContext;

    extern DECL_EXPORT IEmbedContext *getEmbedContext()
    {
        DBGLOG("getEmbedContext");
        return LINK(&theEmbedContext);
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
