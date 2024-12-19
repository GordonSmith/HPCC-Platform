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
#include <optional>

namespace cmcpp
{
    enum class Encoding
    {
        Latin1,
        Utf8,
        Utf16,
        Latin1_Utf16
    };

    using HostTrap = std::function<void(const char *msg)>;
    using GuestRealloc = std::function<int(int ptr, int old_size, int align, int new_size)>;
    using GuestMemory = std::span<uint8_t>;
    using GuestPostReturn = std::function<void()>;

    struct CallContext
    {
        HostTrap trap;
        GuestRealloc realloc;
        GuestMemory memory;
        Encoding encoding;
        std::optional<GuestPostReturn> post_return;
        bool sync = true;
        bool always_task_return = false;
    };

    struct InstanceContext
    {
        HostTrap trap;
        GuestRealloc realloc;
        std::unique_ptr<CallContext> createCallContext(const GuestMemory &memory, const Encoding &encoding = Encoding::Utf8, const GuestPostReturn &post_return = nullptr);
    };

    std::unique_ptr<InstanceContext> createInstanceContext(const HostTrap &trap, const GuestRealloc &realloc);
}

#endif
