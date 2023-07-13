#include "platform.h"
#include "jutil.hpp"
#include "eclrtl.hpp"

IEmbedFunctionContext *createISecureEnclave(const StringArray &manifestModules);

void syntaxCheck(size32_t &__lenResult, char *&__result, const char *funcname, size32_t charsBody, const char *body, const char *argNames, const char *compilerOptions, const char *persistOptions);
