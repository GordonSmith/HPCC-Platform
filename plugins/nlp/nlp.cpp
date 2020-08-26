/*##############################################################################

    HPCC SYSTEMS software Copyright (C) 2019 HPCC Systems®.

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
#include "eclrtl.hpp"
#include "nlp.hpp"

#define NLP_VERSION "nlp plugin 1.0.0"
ECL_NLP_API bool getECLPluginDefinition(ECLPluginDefinitionBlock *pb)
{
    /*  Warning:    This function may be called without the plugin being loaded fully.
     *              It should not make any library calls or assume that dependent modules
     *              have been loaded or that it has been initialised.
     *
     *              Specifically:  "The system does not call DllMain for process and thread
     *              initialization and termination.  Also, the system does not load
     *              additional executable modules that are referenced by the specified module."
     */

    if (pb->size != sizeof(ECLPluginDefinitionBlock))
        return false;

    pb->magicVersion = PLUGIN_VERSION;
    pb->version = NLP_VERSION;
    pb->moduleName = "lib_nlp";
    pb->ECL = NULL;
    pb->flags = PLUGIN_IMPLICIT_MODULE;
    pb->description = "ECL plugin library for nlp\n";
    return true;
}

// #include <nlpapi.h>

namespace nlp
{

    //--------------------------------------------------------------------------------
    //                           ECL SERVICE ENTRYPOINTS
    //--------------------------------------------------------------------------------

#define NLP_INDEX_MINSTRLEN 17
    ECL_NLP_API void ECL_NLP_CALL toString(ICodeContext *_ctx, size32_t &lenVarStr, char *&varStr, unsigned __int64 index)
    {
        varStr = static_cast<char *>(rtlMalloc(NLP_INDEX_MINSTRLEN));
        strcpy(varStr, "Hello!");
        lenVarStr = strlen(varStr);
    }

    ECL_NLP_API unsigned __int64 ECL_NLP_CALL fromString(ICodeContext *_ctx, const char *strIdx)
    {
        return strlen(strIdx);
    }

} // namespace nlp
