#ifndef CMCPP_UTIL_HPP
#define CMCPP_UTIL_HPP

#include "context.hpp"
#include <iostream>
#include <unicode/unistr.h>
#include <unicode/ucnv.h>
#include <unicode/ustream.h>

namespace cmcpp
{
    const uint32_t UTF16_TAG = 1U << 31;
    const bool DETERMINISTIC_PROFILE = false;

    void trap_if(const CallContext &cx, bool condition, const char *message = nullptr) noexcept(false);

    uint32_t align_to(uint32_t ptr, uint8_t alignment);

    bool convert_int_to_bool(uint8_t i);

    std::string latin1_to_utf8(const std::string &latin1_str);
    std::string utf8_to_latin1(const std::string &latin1_str);
    std::u16string utf8_to_utf16(const std::string &utf8_str);
    std::string utf16_to_utf8(const std::u16string &utf16_str);
}

#endif
