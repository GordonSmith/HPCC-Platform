#include "host-util.hpp"
#include <iostream>
#include <cstring>
#include <cassert>
#include <iconv.h>

void trap(const char *msg)
{
    throw new std::runtime_error(msg);
}

std::pair<char8_t *, size_t> convert(char8_t *dest, uint32_t dest_byte_len, const char8_t *src, uint32_t byte_len, Encoding from_encoding, Encoding to_encoding)
{
    iconv_t conv;
    switch (from_encoding)
    {
    case Encoding::Latin1:
        switch (to_encoding)
        {
        case Encoding::Latin1:
            std::memcpy(dest, src, byte_len);
            return std::make_pair(reinterpret_cast<char8_t *>(dest), byte_len);
        case Encoding::Utf8:
            conv = iconv_open("UTF-8", "ISO-8859-1");
            break;
        case Encoding::Utf16:
            conv = iconv_open("UTF-16", "ISO-8859-1");
            break;
        }
        break;
    case Encoding::Utf8:
        switch (to_encoding)
        {
        case Encoding::Latin1:
            conv = iconv_open("ISO-8859-1", "UTF-8");
            break;
        case Encoding::Utf8:
            std::memcpy(dest, src, byte_len);
            return std::make_pair(reinterpret_cast<char8_t *>(dest), byte_len);
        case Encoding::Utf16:
            conv = iconv_open("UTF-16", "UTF-8");
            break;
        }
        break;
    case Encoding::Utf16:
        switch (to_encoding)
        {
        case Encoding::Latin1:
            conv = iconv_open("ISO-8859-1", "UTF-16");
            break;
        case Encoding::Utf8:
            conv = iconv_open("UTF-8", "UTF-16");
            break;
        case Encoding::Utf16:
            std::memcpy(dest, src, byte_len);
            return std::make_pair(reinterpret_cast<char8_t *>(dest), byte_len);
        }
        break;
    }

    if (conv == (iconv_t)-1)
    {
        std::cerr << "iconv_open failed" << std::endl;
        return std::make_pair(nullptr, 0);
    }
    char *in_buf = const_cast<char *>(reinterpret_cast<const char *>(src));
    size_t in_bytes_left = byte_len;
    size_t out_bytes_left = dest_byte_len; 
    char *out_buf = reinterpret_cast<char *>(dest);
    char *out_ptr = out_buf;
    if (iconv(conv, &in_buf, &in_bytes_left, &out_ptr, &out_bytes_left) == (size_t)-1)
    {
        std::cerr << "iconv failed" << std::endl;
        iconv_close(conv);
        return std::make_pair(nullptr, 0);
    }
    iconv_close(conv);
    return std::make_pair(dest, dest_byte_len - out_bytes_left);
}
