#include "platform.h"
#include "eclrtl.hpp"

#include <memory>

interface IWasmEmbedCallback
{
    virtual inline void DBGLOG(char const *format, ...) __attribute__((format(printf, 2, 3))) = 0;
    virtual void *rtlMalloc(size32_t size) = 0;

    virtual const char *resolveManifestPath(const char *leafName) = 0;
};

interface ISecureEnclave : extends IEmbedFunctionContext
{
    virtual ~ISecureEnclave() = default;
};

void init(std::shared_ptr<IWasmEmbedCallback> embedContext);
void kill();
std::unique_ptr<ISecureEnclave> createISecureEnclave();
