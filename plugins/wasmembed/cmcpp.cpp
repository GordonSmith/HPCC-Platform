#include "cmcpp.hpp"

class CanonicalOptionsImpl : public CanonicalOptions
{
private:
    const std::string &_string_encoding;
    const GuestRealloc &_realloc;
    const GuestPostReturn &_post_return;

public:
    CanonicalOptionsImpl(const GuestMemory &memory, const std::string &string_encoding, const GuestRealloc &realloc, const GuestPostReturn &post_return) : _string_encoding(string_encoding), _realloc(realloc), _post_return(post_return)
    {
        this->memory = memory;
    }

    const char *string_encoding()
    {
        return _string_encoding.c_str();
    }
    void *realloc(void *ptr, size_t old_size, size_t align, size_t new_size)
    {
        if (_realloc)
        {
            return _realloc(ptr, old_size, align, new_size);
        }
        throw std::runtime_error("realloc not set");
    }
    void post_return()
    {
        if (_post_return)
        {
            _post_return();
        }
        throw std::runtime_error("post_return not set");
    }
};

const char *GuestEncodingString[] = {"utf-8", "utf-16-le", "latin1"};

CanonicalOptionsPtr createCanonicalOptions(const GuestMemory &memory, GuestEncoding encoding, const GuestRealloc &realloc, const GuestPostReturn &post_return)
{
    return std::make_shared<CanonicalOptionsImpl>(memory, GuestEncodingString[encoding], realloc, post_return);
}

class CallContextImpl : public CallContext
{
public:
    CallContextImpl(CallContextPtr options)
    {
        this->opts = options->opts;
    }
};

CallContextPtr createCallContext(CallContextPtr options)
{
    return std::make_shared<CallContextImpl>(options);
}
