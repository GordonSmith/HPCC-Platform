#include "host-util.hpp"

#include <iostream>
#include <string>
#include <cstring>
#include <cassert>
#include <unicode/ucnv.h>
#include <unicode/unistr.h>

using namespace cmcpp;

void trap(const char *msg)
{
    throw new std::runtime_error(msg);
}

std::string latin1_to_utf8(const std::string &latin1_str)
{
    icu::UnicodeString unicodeStr(latin1_str.c_str(), "ISO-8859-1");
    std::string utf8;
    return unicodeStr.toUTF8String(utf8);
}

std::string utf8_to_latin1(const std::string &latin1_str)
{
    icu::UnicodeString unicodeStr(latin1_str.c_str(), "UTF-8");
    std::string utf8;
    return unicodeStr.toUTF8String(utf8);
}

std::u16string utf8_to_utf16(const std::string &utf8_str)
{
    icu::UnicodeString unicodeStr = icu::UnicodeString::fromUTF8(icu::StringPiece(utf8_str.c_str()));
    std::u16string utf16(unicodeStr.getBuffer(), unicodeStr.length());
    return utf16;
}

std::string utf16_to_utf8(const std::u16string &utf16_str)
{
    icu::UnicodeString unicodeStr(utf16_str.data(), utf16_str.length());
    std::string utf8;
    unicodeStr.toUTF8String(utf8);
    return utf8;
}

std::pair<void *, size_t> convert(void *dest, uint32_t dest_byte_len, const void *src, uint32_t src_byte_len, Encoding from_encoding, Encoding to_encoding){
    return std::make_pair(nullptr, 0);
}
