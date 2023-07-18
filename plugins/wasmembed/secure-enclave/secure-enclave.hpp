#include "platform.h"
#include "eclrtl.hpp"
#include "eclrtl_imp.hpp"

#ifdef SECUREENCLAVE_EXPORTS
#define SECUREENCLAVE_API DECL_EXPORT
#else
#define SECUREENCLAVE_API DECL_IMPORT
#endif

#include <memory>

interface IWasmEmbedCallback
{
    virtual inline void DBGLOG(const char *format, ...) __attribute__((format(printf, 2, 3))) = 0;
    virtual void throwStringException(int code, const char *format, ...) __attribute__((format(printf, 3, 4))) = 0;

    virtual void *rtlMalloc(size32_t size) = 0;

    virtual void rtlStrToStrX(unsigned &tlen, char *&tgt, unsigned slen, const void *src) = 0;

    virtual void rtlUtf8ToUnicodeX(unsigned &outlen, UChar *&out, unsigned inlen, char const *in) = 0;
    virtual void rtlUtf8ToUtf8X(size32_t &outlen, char *&out, size32_t inlen, const char *in) = 0;
    virtual unsigned rtlUtf8Size(unsigned len, const void *data) = 0;
    virtual unsigned rtlUtf8Length(unsigned size, const void *_data) = 0;

    virtual void rtlUnicodeToUtf8X(unsigned &outlen, char *&out, unsigned inlen, const UChar *in) = 0;

    virtual const char *resolveManifestPath(const char *leafName) = 0;
};

interface ISecureEnclave : extends IEmbedFunctionContext
{
    virtual ~ISecureEnclave() = default;
};

SECUREENCLAVE_API void init(std::shared_ptr<IWasmEmbedCallback> embedContext);
SECUREENCLAVE_API void kill();
SECUREENCLAVE_API std::unique_ptr<ISecureEnclave> createISecureEnclave();
SECUREENCLAVE_API void syntaxCheck(size32_t &__lenResult, char *&__result, const char *funcname, size32_t charsBody, const char *body, const char *argNames, const char *compilerOptions, const char *persistOptions);
