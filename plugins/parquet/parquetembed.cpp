/*##############################################################################
    HPCC SYSTEMS software Copyright (C) 2022 HPCC Systems®.
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

#include "parquetembed.hpp"

#include <map>
#include <mutex>
#include <thread>
#include <cstdlib>
#include <iostream>
#include <string>
#include <memory>
#include <cstdint>

#include "platform.h"
#include "jthread.hpp"
#include "rtlembed.hpp"
#include "jptree.hpp"
#include "rtlds_imp.hpp"
#include <time.h>
#include <vector>

static constexpr const char *MODULE_NAME = "parquet";
static constexpr const char *MODULE_DESCRIPTION = "Parquet Embed Helper";
static constexpr const char *VERSION = "Parquet Embed Helper 1.0.0";
static const char *COMPATIBLE_VERSIONS[] = { VERSION, nullptr };
static const NullFieldProcessor NULLFIELD(NULL);

/**
 * @brief Takes a pointer to an ECLPluginDefinitionBlock and passes in all the important info
 * about the plugin. 
 */
extern "C" PARQUETEMBED_PLUGIN_API bool getECLPluginDefinition(ECLPluginDefinitionBlock *pb)
{
    if (pb->size == sizeof(ECLPluginDefinitionBlockEx)) 
    {
        ECLPluginDefinitionBlockEx * pbx = (ECLPluginDefinitionBlockEx *) pb;
        pbx->compatibleVersions = COMPATIBLE_VERSIONS;
    }
    else if (pb->size != sizeof(ECLPluginDefinitionBlock))
        return false;

    pb->magicVersion = PLUGIN_VERSION;
    pb->version = VERSION;
    pb->moduleName = MODULE_NAME;
    pb->ECL = nullptr;
    pb->flags = PLUGIN_IMPLICIT_MODULE;
    pb->description = MODULE_DESCRIPTION;
    return true;
}

namespace parquetembed
{
    //--------------------------------------------------------------------------
    // Plugin Classes
    //--------------------------------------------------------------------------
    
    /**
     * @brief Throws an exception and gets called when an operation that is unsupported is attempted.
     * 
     * @param feature Name of the feature that is currently unsupported.
     */
    extern void UNSUPPORTED(const char *feature)
    {
        throw MakeStringException(-1, "%s UNSUPPORTED feature: %s not supported in %s", MODULE_NAME, feature, VERSION);
    }

    /**
     * @brief Exits the program with a failure code and a message to display.
     * 
     * @param message Message to display.
     * @param ... Takes any number of arguments that can be inserted into the string using %.
     */
    extern void failx(const char *message, ...)
    {
        va_list args;
        va_start(args,message);
        StringBuffer msg;
        msg.appendf("%s: ", MODULE_NAME).valist_appendf(message,args);
        va_end(args);
        rtlFail(0, msg.str());
    }

    /**
     * @brief Exits the program with a failure code and a message to display.
     * 
     * @param message Message to display.
     */
    extern void fail(const char *message)
    {
        StringBuffer msg;
        msg.appendf("%s: ", MODULE_NAME).append(message);
        rtlFail(0, msg.str());
    }
    
    /**
     * @brief Construct a new ParquetEmbedFunctionContext object
     * 
     * @param _logctx Context logger for use with the ParquetRecordBinder ParquetDatasetBinder classes.
     * @param options Pointer to the list of options that are passed into the Embed function.
     * @param _flags Should be zero if the embedded script is ok.
     */
    ParquetEmbedFunctionContext::ParquetEmbedFunctionContext(const IContextLogger &_logctx, const char *options, unsigned _flags)
    : logctx(_logctx), m_NextRow(), m_nextParam(0), m_numParams(0), m_scriptFlags(_flags)
    {
        // Option Variables
        const char *option = "";
        // Iterate through user options and save them
        StringArray inputOptions;
        inputOptions.appendList(options, ",");
        ForEachItemIn(idx, inputOptions) 
        {
            const char *opt = inputOptions.item(idx);
            const char *val = strchr(opt, '=');
            if (val)
            {
                StringBuffer optName(val-opt, opt);
                val++;
                if (stricmp(optName, "option")==0)
                    // Store in option variables
                    option = val;
                else
                    failx("Unknown option %s", optName.str());
            }
        }
    }

    /**
     * @brief Destroy the ParquetEmbedFunctionContext object.
     */
    ParquetEmbedFunctionContext::~ParquetEmbedFunctionContext()
    {
    }

    /**
     * @brief Serves as the entry point for the HPCC Engine into the plugin and is how it obtains a 
     * ParquetEmbedFunctionContext object for creating the query and executing it.
     * 
     */
    class ParquetEmbedContext : public CInterfaceOf<IEmbedContext>
    {
    public:
        virtual IEmbedFunctionContext * createFunctionContext(unsigned flags, const char *options) override
        {
            return createFunctionContextEx(nullptr, nullptr, flags, options);
        }

        virtual IEmbedFunctionContext * createFunctionContextEx(ICodeContext * ctx, const IThorActivityContext *activityCtx, unsigned flags, const char *options) override
        {
            if (flags & EFimport) 
            {
                UNSUPPORTED("IMPORT");
                return nullptr;
            } 
            else 
                return new ParquetEmbedFunctionContext(ctx ? ctx->queryContextLogger() : queryDummyContextLogger(), options, flags);
        }

        virtual IEmbedServiceContext * createServiceContext(const char *service, unsigned flags, const char *options) override
        {
            throwUnexpected();
            return nullptr;
        }
    };


    extern DECL_EXPORT IEmbedContext* getEmbedContext()
    {
        return new ParquetEmbedContext();
    }

    extern DECL_EXPORT bool syntaxCheck(const char *script)
    {
        return true; // TO-DO
    }
}

MODULE_INIT(INIT_PRIORITY_STANDARD)
{
    return true;
}

MODULE_EXIT()
{
}
