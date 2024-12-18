#if __has_include(<span>)
#include <span>
#else
#include <string>
#include <sstream>
#endif

#include <cstdint>
#include <string>
#include <functional>

std::tuple<uint32_t /*ptr*/, std::string /*encoding*/, uint32_t /*byte length*/> load_string(const std::span<uint8_t> &data, uint32_t ptr);

enum class Encoding
{
    utf8,
    utf16,
    latin1,
    latin1_utf16
};
using GuestMemory = std::span<uint8_t>;
using HostTrap = std::function<void(const char *msg)>;

class Options
{
public:
    const Encoding encoding;
    const GuestMemory memory;
    const HostTrap trap;
    Options(Encoding encoding, const GuestMemory memory, const HostTrap trap)
        : encoding(encoding), memory(memory), trap(trap) {}
    Options(const Options &other) = default;
};

class LiftLowerContext
{
public:
    const Options opts;

    LiftLowerContext(const Options opts): opts(opts) {}
    LiftLowerContext(const LiftLowerContext &other) = default;
};

using offset = uint32_t;
using size = uint32_t;

namespace string
{
    std::tuple<Encoding /*encoding*/, offset, ::size> load(const LiftLowerContext &cx, offset offset);
}
