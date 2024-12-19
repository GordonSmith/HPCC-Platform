#ifndef CMCPP_HPP
#define CMCPP_HPP

#if __has_include(<span>)
#include <span>
#else
#include <string>
#include <sstream>
#endif

#include <string>
#include <functional>
#include <memory>

namespace cmcpp
{
    enum class Encoding
    {
        Latin1,
        Utf8,
        Utf16,
        Latin1_Utf16
    };

    using GuestMemory = std::span<uint8_t>;
    using GuestPostReturn = std::function<void()>;

    class CanonicalOptions
    {
    public:
        virtual ~CanonicalOptions() = default;

        GuestMemory memory;
        Encoding encoding;
        virtual void post_return() = 0;
        bool sync = true;
        bool always_task_return = false;
    };

    using HostTrap = std::function<void(const char *msg)>;
    using GuestRealloc = std::function<int(int ptr, int old_size, int align, int new_size)>;
    class LiftLowerContext
    {
    public:
        virtual ~LiftLowerContext() = default;

        HostTrap trap;
        GuestRealloc realloc;
        std::unique_ptr<CanonicalOptions> opts;
        virtual void createCallContext(const GuestMemory &memory, const Encoding &encoding = Encoding::Utf8, const GuestPostReturn &post_return = nullptr) = 0;
    };

    std::unique_ptr<LiftLowerContext> createHostContext(const HostTrap &trap, const GuestRealloc &realloc);
}

#endif
