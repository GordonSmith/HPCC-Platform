#include "util.hpp"
#include <unicode/ucnv.h>
#include <unicode/unistr.h>

namespace cmcpp
{

    void trap_if(const CallContext &cx, bool condition, const char *message)
    {
        if (condition)
        {
            cx.trap(message);
        }
    }

    uint32_t align_to(uint32_t ptr, uint8_t alignment)
    {
        return (ptr + static_cast<int32_t>(alignment) - 1) & ~(static_cast<int32_t>(alignment) - 1);
    }

    ValType despecialize(const ValType t)
    {
        switch (t)
        {
        case ValType::Tuple:
            return ValType::Record;
        case ValType::Enum:
            return ValType::Variant;
        case ValType::Option:
            return ValType::Variant;
        case ValType::Result:
            return ValType::Variant;
        }
        return t;
    }

    bool convert_int_to_bool(uint8_t i)
    {
        return i > 0;
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
}