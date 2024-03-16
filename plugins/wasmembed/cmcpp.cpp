#include "cmcpp.hpp"

#include <cstring>
#include <optional> // Include the necessary header file

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
    int realloc(int ptr, int old_size, int align, int new_size)
    {
        return _realloc(ptr, old_size, align, new_size);
    }
    void post_return()
    {
        //  Optional
        if (_post_return)
        {
            _post_return();
        }
    }
};

const char *GuestEncodingString[] = {"utf-8", "utf-16-le", "latin1"};

CanonicalOptionsPtr createCanonicalOptions(const GuestMemory &memory, const GuestRealloc &realloc, GuestEncoding encoding, const GuestPostReturn &post_return)
{
    return std::make_shared<CanonicalOptionsImpl>(memory, GuestEncodingString[encoding], realloc, post_return);
}

class CallContextImpl : public CallContext
{
public:
    CallContextImpl(CanonicalOptionsPtr options)
    {
        opts = options;
    }
};

CallContextPtr createCallContext(const GuestMemory &memory, const GuestRealloc &realloc, GuestEncoding encoding, const GuestPostReturn &post_return)
{
    return std::make_shared<CallContextImpl>(createCanonicalOptions(memory, realloc, encoding, post_return));
}
