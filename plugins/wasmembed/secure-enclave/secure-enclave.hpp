#include "platform.h"
#include "eclrtl.hpp"

#include <memory>
#include <functional>
#include <variant>

typedef float float32_t;
typedef double float64_t;

enum class DataType
{
    INT32,
    INT64,
    FLOAT32,
    FLOAT64
};
typedef std::variant<int32_t, int64_t, float32_t, float64_t> Value;
typedef std::vector<std::pair<DataType, Value>> Values;

class ISecureEnclave
{
public:
    virtual void appendWatModule(const char *wat) = 0;
    virtual void callFunction(const char *funcName, Values values) = 0;
    virtual int32_t i32Result() = 0;
    virtual int64_t i64Result() = 0;
    virtual float32_t f32Result() = 0;
    virtual float64_t f64Result() = 0;
};

std::shared_ptr<ISecureEnclave> createISecureEnclave(std::function<void(const char *)> dbglog);
// std::shared_ptr<IModule> createIModule(const char *wat, std::function<void(const char *)> dbglog);
