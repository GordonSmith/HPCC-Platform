#ifndef CMCPP_UTIL_HPP
#define CMCPP_UTIL_HPP

#include "context.hpp"

namespace cmcpp
{
    const uint32_t UTF16_TAG = 1U << 31;
    const bool DETERMINISTIC_PROFILE = false;
    const float32_t CANONICAL_FLOAT32_NAN = 0x7fc00000;
    const float64_t CANONICAL_FLOAT64_NAN = 0x7ff8000000000000;

    void trap_if(const CallContext *cx, bool condition, const char *message = nullptr) noexcept(false);

    uint32_t align_to(uint32_t ptr, uint32_t alignment);
    int alignment(ValType t);
    uint8_t elem_size(ValType t);
}

#endif
