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
using GuestRealloc = std::function<void *(void *ptr, size_t old_size, size_t align, size_t new_size)>;
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
    virtual void *realloc(void *ptr, size_t old_size, size_t align, size_t new_size) = 0;
    virtual void post_return() = 0;
};
using CanonicalOptionsPtr = std::shared_ptr<CanonicalOptions>;
CanonicalOptionsPtr createCanonicalOptions(const GuestMemory &memory, GuestEncoding encoding, const GuestRealloc &realloc, const GuestPostReturn &post_return);

class CallContext
{
public:
    virtual ~CallContext() = default;

    CanonicalOptionsPtr opts;
};
using CallContextPtr = std::shared_ptr<CallContext>;
CallContextPtr createCallContext(CallContextPtr options);

#endif
