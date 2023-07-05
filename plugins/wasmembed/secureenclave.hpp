#include <memory>
#include <functional>

class ISecureEnclave
{
public:
};

std::shared_ptr<ISecureEnclave> createISecureEnclave(const char * wat, std::function<void(const char *)> dbglog);