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

using GuestMemory = std::span<uint8_t, std::dynamic_extent>;
using GuestRealloc = std::function<int(int ptr, int old_size, int align, int new_size)>;
using GuestPostReturn = std::function<void()>;

enum GuestEncoding
{
    Utf8,
    Utf16le,
    Latin1
};

class CanonicalOptions
{
public:
    virtual ~CanonicalOptions() = default;

    GuestMemory memory;
    virtual const char *string_encoding() = 0;
    virtual int realloc(int ptr, int old_size, int align, int new_size) = 0;
    virtual void post_return() = 0;
};
using CanonicalOptionsPtr = std::shared_ptr<CanonicalOptions>;
CanonicalOptionsPtr createCanonicalOptions(const GuestMemory &memory, const GuestRealloc &realloc, GuestEncoding encoding = GuestEncoding::Utf8, const GuestPostReturn &post_return = nullptr);

class CallContext
{
public:
    virtual ~CallContext() = default;

    CanonicalOptionsPtr opts;
};
using CallContextPtr = std::shared_ptr<CallContext>;
CallContextPtr createCallContext(const GuestMemory &memory, const GuestRealloc &realloc, GuestEncoding encoding = GuestEncoding::Utf8, const GuestPostReturn &post_return = nullptr);

#endif
