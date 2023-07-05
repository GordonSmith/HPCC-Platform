#include "platform.h"
#include "eclrtl.hpp"

#include <memory>
#include <functional>

interface IWasmFunctionContext : extends IEmbedFunctionContext
{
    virtual void setActivityContext(const IThorActivityContext *_activityCtx) = 0;
};

interface ISecureEnclave
{
    virtual std::shared_ptr<IWasmFunctionContext> createFunctionContext() = 0;
};

std::shared_ptr<ISecureEnclave> createISecureEnclave(std::function<void(const std::string &)> dbglog);
// std::shared_ptr<IModule> createIModule(const char *wat, std::function<void(const std::string &)> dbglog);
