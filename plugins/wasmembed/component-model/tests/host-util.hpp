#include <utility>
#include "context.hpp"

using namespace cmcpp;

void trap(const char *msg = "");

std::string latin1_to_utf8(const std::string &latin1_str);
std::string utf8_to_latin1(const std::string &latin1_str);
std::u16string utf8_to_utf16(const std::string &utf8_str);
std::string utf16_to_utf8(const std::u16string &utf16_str);

template <String R>
R convert2(const void *src, uint32_t src_byte_len, Encoding from_encoding)
{
    Encoding to_encoding = ValTrait<R>::encoding;
    if (from_encoding == to_encoding)
    {
        return R((const char *)src, src_byte_len);
    }

    switch (from_encoding)
    {
    case Encoding::Latin1:
        switch (to_encoding)
        {
        case Encoding::Utf8:
            return latin1_to_utf8(std::string((const char *)src, src_byte_len));
        case Encoding::Utf16:
            return utf16_to_utf8(std::u16string((const char16_t *)src, src_byte_len / 2));
        }
        break;
    case Encoding::Utf8:
        switch (to_encoding)
        {
        case Encoding::Latin1:
            return utf8_to_latin1(std::string((const char *)src, src_byte_len));
        case Encoding::Utf16:
            return utf16_to_utf8(std::u16string((const char16_t *)src, src_byte_len / 2));
        }
        break;
    case Encoding::Utf16:
        switch (to_encoding)
        {
        case Encoding::Latin1:
            return latin1_to_utf8(std::string((const char *)src, src_byte_len));
        case Encoding::Utf8:
            return utf8_to_utf16(std::string((const char *)src, src_byte_len));
        }
        break;
    }
}
std::pair<void *, size_t> convert(void *dest, uint32_t dest_byte_len, const void *src, uint32_t src_byte_len, Encoding from_encoding, Encoding to_encoding);

// std::u8string u16_u8(const std::u16string &src);
// std::u16string u8_u16(const std::u8string &str);
