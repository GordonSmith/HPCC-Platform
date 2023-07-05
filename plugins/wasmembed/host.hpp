#ifdef _MSC_VER
 #define DECL_EXPORT __declspec(dllexport)
 #define DECL_IMPORT __declspec(dllimport)
 #define DECL_LOCAL
 #define DECL_EXCEPTION
#elif __GNUC__ >= 4
 #define DECL_EXPORT __attribute__ ((visibility ("default")))
 #define DECL_IMPORT __attribute__ ((visibility ("default")))
 #define DECL_LOCAL  __attribute__ ((visibility ("hidden")))
 #define DECL_EXCEPTION DECL_EXPORT
#else
 #define DECL_EXPORT
 #define DECL_IMPORT
 #define DECL_LOCAL
 #define DECL_EXCEPTION
#endif

#include <memory>
#include <functional>

class IHost
{
public:
};

std::shared_ptr<IHost> createIHost(std::function<void(const char *)> dbglog);