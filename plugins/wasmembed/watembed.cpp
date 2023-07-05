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

class Param
{
public:
    const DataType type;
    const std::string name;
    const Value value;

    Param(std::string _name, int32_t _i32)
        : type(DataType::INT32), name(std::move(_name)), value(_i32) {}

    Param(std::string _name, int64_t _i64)
        : type(DataType::INT64), name(std::move(_name)), value(_i64) {}

    Param(std::string _name, float _f32)
        : type(DataType::FLOAT32), name(std::move(_name)), value(_f32) {}

    Param(std::string _name, double _f64)
        : type(DataType::FLOAT64), name(std::move(_name)), value(_f64) {}

    const char *const dataType() const
    {
        switch (type)
        {
        case DataType::INT32:
            return "i32";
        case DataType::INT64:
            return "i64";
        case DataType::FLOAT32:
            return "f32";
        case DataType::FLOAT64:
            return "f64";
        default:
            return "unknown";
        }
    }

    std::string declaration() const
    {
        std::stringstream ss;
        ss << "(param $" << name << " " << dataType() << ")";
        return ss.str();
    }
};

namespace watLanguageHelper
{

    class WATEmbedFunctionContext : public CInterfaceOf<IEmbedFunctionContext>
    {
    protected:
        std::shared_ptr<ISecureEnclave> enclave;
        std::vector<std::unique_ptr<Param>> params;
        std::string utf;

    public:
        WATEmbedFunctionContext()
        {
            DBGLOG("WATEmbedFunctionContext created");
            auto dbglog = [](const char *value)
            {
                DBGLOG("%s", value);
            };
            enclave = createISecureEnclave(dbglog);
        }
        ~WATEmbedFunctionContext()
        {
            DBGLOG("WATEmbedFunctionContext destroyed");
        }
        //  Params  ---
        virtual void appendI32Param(const char *name, int32_t val)
        {
            params.push_back(std::make_unique<Param>(name, val));
        }
        virtual void appendI64Param(const char *name, int64_t val)
        {
            params.push_back(std::make_unique<Param>(name, val));
        }
        virtual void appendParam(const char *name, float32_t val)
        {
            params.push_back(std::make_unique<Param>(name, val));
        }
        virtual void appendParam(const char *name, float64_t val)
        {
            params.push_back(std::make_unique<Param>(name, val));
        }

        std::string declaration() const
        {
            std::stringstream ss;
            for (const auto &param : params)
            {
                ss << param->declaration() << " ";
            }
            DBGLOG("declaration: %s", ss.str().c_str());
            return ss.str();
        }

        Values values() const
        {
            Values values;
            for (const auto &param : params)
            {
                values.push_back(std::make_pair(param->type, param->value));
            }
            return values;
        }

        //  IEmbedFunctionContext  ---
        void setActivityContext(const IThorActivityContext *_activityCtx)
        {
            activityCtx = _activityCtx;
        }
        virtual IInterface *bindParamWriter(IInterface *esdl, const char *esdlservice, const char *esdltype, const char *name)
        {
            DBGLOG("paramWriterCommit");
            return NULL;
        }
        virtual void paramWriterCommit(IInterface *writer)
        {
            DBGLOG("paramWriterCommit");
        }
        virtual void writeResult(IInterface *esdl, const char *esdlservice, const char *esdltype, IInterface *writer)
        {
            DBGLOG("writeResult");
        }
        virtual void bindBooleanParam(const char *name, bool val)
        {
            DBGLOG("bindBooleanParam %s %i", name, val);
        }
        virtual void bindDataParam(const char *name, size32_t len, const void *val)
        {
            DBGLOG("bindDataParam %s %i", name, len);
        }
        virtual void bindFloatParam(const char *name, float val)
        {
            DBGLOG("bindFloatParam %s %f", name, val);
            appendParam(name, val);
        }
        virtual void bindRealParam(const char *name, double val)
        {
            DBGLOG("bindRealParam %s %f", name, val);
            appendParam(name, val);
        }
        virtual void bindSignedSizeParam(const char *name, int size, __int64 val)
        {
            DBGLOG("bindSignedSizeParam %s %i %lld", name, size, val);
            if (size < 5)
            {
                appendI32Param(name, (int32_t)val);
            }
            else
            {
                appendI64Param(name, val);
            }
        }
        virtual void bindSignedParam(const char *name, __int64 val)
        {
            DBGLOG("bindSignedParam %s %lld", name, val);
            bindSignedSizeParam(name, 8, val);
        }
        virtual void bindUnsignedSizeParam(const char *name, int size, unsigned __int64 val)
        {
            DBGLOG("bindUnsignedSizeParam %s %i %llu", name, size, val);
            bindSignedSizeParam(name, size, val);
        }
        virtual void bindUnsignedParam(const char *name, unsigned __int64 val)
        {
            DBGLOG("bindUnsignedParam %s %llu", name, val);
            bindUnsignedSizeParam(name, 8, val);
        }
        virtual void bindStringParam(const char *name, size32_t len, const char *val)
        {
            DBGLOG("bindStringParam %s %i %s", name, len, val);
        }
        virtual void bindVStringParam(const char *name, const char *val)
        {
            DBGLOG("bindVStringParam %s %s", name, val);
        }
        virtual void bindUTF8Param(const char *name, size32_t chars, const char *val)
        {
            DBGLOG("bindUTF8Param %s %i %s", name, chars, val);
        }
        virtual void bindUnicodeParam(const char *name, size32_t chars, const UChar *val)
        {
            DBGLOG("bindUnicodeParam %s %i", name, chars);
        }
        virtual void bindSetParam(const char *name, int elemType, size32_t elemSize, bool isAll, size32_t totalBytes, const void *setData)
        {
            DBGLOG("bindSetParam %s %i %i %i %i %p", name, elemType, elemSize, isAll, totalBytes, setData);
        }
        virtual void bindRowParam(const char *name, IOutputMetaData &metaVal, const byte *val) override
        {
            DBGLOG("bindRowParam %s %p", name, static_cast<const void *>(val));
        }
        virtual void bindDatasetParam(const char *name, IOutputMetaData &metaVal, IRowStream *val)
        {
            DBGLOG("bindDatasetParam %s %p", name, static_cast<void *>(val));
        }
        virtual bool getBooleanResult()
        {
            DBGLOG("getBooleanResult");
            return false;
        }
        virtual void getDataResult(size32_t &__len, void *&__result)
        {
            DBGLOG("getDataResult");
        }
        virtual double getRealResult()
        {
            DBGLOG("getRealResult");
            return 0;
        }
        virtual __int64 getSignedResult()
        {
            DBGLOG("getSignedResult");
            return enclave->i64Result();
        }
        virtual unsigned __int64 getUnsignedResult()
        {
            DBGLOG("getUnsignedResult");
            return enclave->i64Result();
        }
        virtual void getStringResult(size32_t &__chars, char *&__result)
        {
            DBGLOG("getStringResult");
        }
        virtual void getUTF8Result(size32_t &__chars, char *&__result)
        {
            DBGLOG("getUTF8Result");
        }
        virtual void getUnicodeResult(size32_t &__chars, UChar *&__result)
        {
            DBGLOG("getUnicodeResult");
        }
        virtual void getSetResult(bool &__isAllResult, size32_t &__resultBytes, void *&__result, int elemType, size32_t elemSize)
        {
            DBGLOG("getSetResult");
        }
        virtual IRowStream *getDatasetResult(IEngineRowAllocator *_resultAllocator)
        {
            DBGLOG("getDatasetResult");
            return NULL;
        }
        virtual byte *getRowResult(IEngineRowAllocator *_resultAllocator)
        {
            DBGLOG("getRowResult");
            return NULL;
        }
        virtual size32_t getTransformResult(ARowBuilder &builder)
        {
            DBGLOG("getTransformResult");
            return 0;
        }
        virtual void compileEmbeddedScript(size32_t lenChars, const char *_utf)
        {
            DBGLOG("compileEmbeddedScript %s", _utf);
            std::string wat =
                "(module\n"
                "  (func $myFunc " +
                declaration() + "(result i32)\n" +
                std::string(utf) + "\n" +
                "  )\n" +
                "  (export \"myFunc\" (func $myFunc))\n" +
                ")\n";

            enclave->appendWatModule(wat.c_str(), values());
        }
        virtual void loadCompiledScript(size32_t chars, const void *_script) override
        {
            DBGLOG("loadCompiledScript %p", _script);
        }
        virtual void enter() override
        {
            DBGLOG("enter");
            params.clear();
            utf.clear();
        }
        virtual void reenter(ICodeContext *codeCtx) override
        {
            DBGLOG("reenter");
        }
        virtual void exit() override
        {
            DBGLOG("exit");
        }
        virtual void importFunction(size32_t lenChars, const char *utf)
        {
            DBGLOG("importFunction %s", utf);
        }
        virtual void callFunction()
        {
            DBGLOG("callFunction");
            std::string wat =
                "(module\n"
                "  (func $myFunc " +
                declaration() + "(result i32)\n" +
                std::string(utf) + "\n" +
                "  )\n" +
                "  (export \"myFunc\" (func $myFunc))\n" +
                ")\n";

            enclave->appendWatModule(wat.c_str(), values());
        }

    protected:
        const IThorActivityContext *activityCtx = nullptr;
    };

    static __thread WATEmbedFunctionContext *theFunctionContext; // We reuse per thread, for speed

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
            DBGLOG("WASMEmbedContext created");
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
                theFunctionContext = new WATEmbedFunctionContext();
                addThreadTermFunc(releaseContext);
            }
            theFunctionContext->setActivityContext(activityContext);
            return LINK(theFunctionContext);
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
