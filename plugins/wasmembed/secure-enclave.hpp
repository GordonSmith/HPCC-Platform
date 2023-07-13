#include "platform.h"
#include "jutil.hpp"
#include "eclrtl.hpp"

#ifdef SECUREENCLAVE_EXPORTS
#define SECUREENCLAVE_API DECL_EXPORT
#else
#define SECUREENCLAVE_API DECL_IMPORT
#endif

SECUREENCLAVE_API IEmbedFunctionContext *createISecureEnclave(const StringArray &manifestModules);

SECUREENCLAVE_API void syntaxCheck(size32_t &__lenResult, char *&__result, const char *funcname, size32_t charsBody, const char *body, const char *argNames, const char *compilerOptions, const char *persistOptions);
