#include "platform.h"
#include "eclrtl.hpp"

#include <memory>

interface IWasmEmbedCallback
{
    virtual void dbglog(const std::string &msg) = 0;
    virtual const char *resolvePath(const char *leafName) = 0;
};

interface ISecureEnclave : extends IEmbedFunctionContext
{
    virtual ~ISecureEnclave() = default;
};

std::unique_ptr<ISecureEnclave> createISecureEnclave(IWasmEmbedCallback &embedContext);
