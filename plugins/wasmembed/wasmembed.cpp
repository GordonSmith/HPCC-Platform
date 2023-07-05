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
#include "wasmtime.hh"
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

static const char * compatibleVersions[] = {
    "WASM Embed Helper 1.0.0",
    NULL };

static const char *version = "WASM Embed Helper 1.0.0";

extern "C" DECL_EXPORT bool getECLPluginDefinition(ECLPluginDefinitionBlock *pb)
{
    if (pb->size == sizeof(ECLPluginDefinitionBlockEx))
    {
        ECLPluginDefinitionBlockEx * pbx = (ECLPluginDefinitionBlockEx *) pb;
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
    throw MakeStringException(-1, "UNSUPPORTED feature: %s not supported in v8embed plugin", feature);
}

__declspec(noreturn) static void typeError(const char *expected, const RtlFieldInfo *field) __attribute__((noreturn));

static void typeError(const char *expected, const RtlFieldInfo *field)
{
    VStringBuffer msg("v8embed: type mismatch - %s expected", expected);
    if (field)
        msg.appendf(" for field %s", field->name);
    rtlFail(0, msg.str());
}

namespace wasmLanguageHelper {

// A JSRowBuilder object is used to construct an ECL row from a wasm object

class WASMEmbedFunctionContext : public CInterfaceOf<IEmbedFunctionContext>
{
public:
    WASMEmbedFunctionContext()
    {
    }
    ~WASMEmbedFunctionContext()
    {
    }
    void setActivityContext(const IThorActivityContext *_activityCtx)
    {
        activityCtx = _activityCtx;
    }
    virtual IInterface *bindParamWriter(IInterface *esdl, const char *esdlservice, const char *esdltype, const char *name)
    {
        return NULL;
    }
    virtual void paramWriterCommit(IInterface *writer)
    {
    }
    virtual void writeResult(IInterface *esdl, const char *esdlservice, const char *esdltype, IInterface *writer)
    {
    }
    virtual void bindBooleanParam(const char *name, bool val)
    {
    }
    virtual void bindDataParam(const char *name, size32_t len, const void *val)
    {
    }
    virtual void bindFloatParam(const char *name, float val)
    {
    }
    virtual void bindRealParam(const char *name, double val)
    {
    }
    virtual void bindSignedSizeParam(const char *name, int size, __int64 val)
    {
        bindSignedParam(name, val);
    }
    virtual void bindSignedParam(const char *name, __int64 val)
    {
        // MORE - might need to check does not overflow 32 bits? Or store as a real?
    }
    virtual void bindUnsignedSizeParam(const char *name, int size, unsigned __int64 val)
    {
        bindUnsignedParam(name, val);
    }
    virtual void bindUnsignedParam(const char *name, unsigned __int64 val)
    {
    }
    virtual void bindStringParam(const char *name, size32_t len, const char *val)
    {
    }
    virtual void bindVStringParam(const char *name, const char *val)
    {
        bindStringParam(name, strlen(val), val);
    }
    virtual void bindUTF8Param(const char *name, size32_t chars, const char *val)
    {
    }
    virtual void bindUnicodeParam(const char *name, size32_t chars, const UChar *val)
    {
    }
    virtual void bindSetParam(const char *name, int elemType, size32_t elemSize, bool isAll, size32_t totalBytes, const void *setData)
    {
    }
    virtual void bindRowParam(const char *name, IOutputMetaData & metaVal, const byte *val) override
    {
    }
    virtual void bindDatasetParam(const char *name, IOutputMetaData & metaVal, IRowStream * val)
    {
    }

    virtual bool getBooleanResult()
    {
        return false;
    }
    virtual void getDataResult(size32_t &__len, void * &__result)
    {
    }
    virtual double getRealResult()
    {
        return 0;
    }
    virtual __int64 getSignedResult()
    {
        return 0;
    }
    virtual unsigned __int64 getUnsignedResult()
    {
        return 0;
    }
    virtual void getStringResult(size32_t &__chars, char * &__result)
    {
    }
    virtual void getUTF8Result(size32_t &__chars, char * &__result)
    {
    }
    virtual void getUnicodeResult(size32_t &__chars, UChar * &__result)
    {
    }
    virtual void getSetResult(bool & __isAllResult, size32_t & __resultBytes, void * & __result, int elemType, size32_t elemSize)
    {
    }

    virtual IRowStream *getDatasetResult(IEngineRowAllocator * _resultAllocator)
    {
        return NULL;
    }
    virtual byte * getRowResult(IEngineRowAllocator * _resultAllocator)
    {
        return NULL;
    }
    virtual size32_t getTransformResult(ARowBuilder & builder)
    {
        return 0;
    }
    virtual void compileEmbeddedScript(size32_t lenChars, const char *utf)
    {
    }
    virtual void loadCompiledScript(size32_t chars, const void *_script) override
    {
    }
    virtual void enter() override {}
    virtual void reenter(ICodeContext *codeCtx) override {}
    virtual void exit() override {}
    virtual void importFunction(size32_t lenChars, const char *utf)
    {
        UNIMPLEMENTED; // Not sure if meaningful for js
    }
    virtual void callFunction()
    {
    }

protected:
    const IThorActivityContext *activityCtx = nullptr;
};

static __thread WASMEmbedFunctionContext * theFunctionContext;  // We reuse per thread, for speed

static bool releaseContext(bool isPooled)
{
    if (theFunctionContext)
    {
        ::Release(theFunctionContext);
        theFunctionContext = NULL;
    }
    return false;
}

class WASMEmbedContext : public CInterfaceOf<IEmbedContext>
{
public:
    WASMEmbedContext()
    {
    }
    virtual IEmbedFunctionContext *createFunctionContext(unsigned flags, const char *options) override
    {
        return createFunctionContextEx(nullptr, nullptr, flags, options);
    }
    virtual IEmbedFunctionContext *createFunctionContextEx(ICodeContext * ctx, const IThorActivityContext *activityContext, unsigned flags, const char *options) override
    {
        if (flags & EFimport)
            UNSUPPORTED("IMPORT");
        if (!theFunctionContext)
        {
            theFunctionContext = new WASMEmbedFunctionContext;
            addThreadTermFunc(releaseContext);
        }
        theFunctionContext->setActivityContext(activityContext);
        return LINK(theFunctionContext);
    }
    virtual IEmbedServiceContext *createServiceContext(const char *service, unsigned flags, const char *options) override
    {
        throwUnexpected();
    }
} theEmbedContext;


extern DECL_EXPORT IEmbedContext* getEmbedContext()
{
    return LINK(&theEmbedContext);
}

extern DECL_EXPORT void syntaxCheck(size32_t & __lenResult, char * & __result, const char *funcname, size32_t charsBody, const char * body, const char *argNames, const char *compilerOptions, const char *persistOptions)
{
    StringBuffer result;
    // MORE
    __lenResult = result.length();
    __result = result.detach();
}

} // namespace
