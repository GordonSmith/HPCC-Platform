#ifndef CMCPP_LOAD_HPP
#define CMCPP_LOAD_HPP

#include "context.hpp"
#include "integer.hpp"
#include "string.hpp"
#include "float.hpp"

namespace cmcpp
{
    template <typename T>
    auto load(const CallContext *cx, uint32_t ptr) -> T
    {
        cx->trap("load of unsupported type");
        throw std::runtime_error("trap not terminating execution");
    }

    bool convert_int_to_bool(uint8_t i)
    {
        return i > 0;
    }

    template <>
    inline bool_t load<bool_t>(const CallContext *cx, uint32_t ptr)
    {
        return convert_int_to_bool(integer::load<uint8_t>(cx, ptr, 1));
    }

    template <>
    inline uint8_t load<uint8_t>(const CallContext *cx, uint32_t ptr)
    {
        return integer::load<uint8_t>(cx, ptr, 1);
    }

    template <>
    inline int8_t load<int8_t>(const CallContext *cx, uint32_t ptr)
    {
        return integer::load<int8_t>(cx, ptr, 1);
    }

    template <>
    inline uint16_t load<uint16_t>(const CallContext *cx, uint32_t ptr)
    {
        return integer::load<uint16_t>(cx, ptr, 2);
    }

    template <>
    inline int16_t load<int16_t>(const CallContext *cx, uint32_t ptr)
    {
        return integer::load<int16_t>(cx, ptr, 2);
    }

    template <>
    inline uint32_t load<uint32_t>(const CallContext *cx, uint32_t ptr)
    {
        return integer::load<uint32_t>(cx, ptr, 4);
    }

    template <>
    inline int32_t load<int32_t>(const CallContext *cx, uint32_t ptr)
    {
        return integer::load<int32_t>(cx, ptr, 4);
    }

    template <>
    inline uint64_t load<uint64_t>(const CallContext *cx, uint32_t ptr)
    {
        return integer::load<uint64_t>(cx, ptr, 8);
    }

    template <>
    inline int64_t load<int64_t>(const CallContext *cx, uint32_t ptr)
    {
        return integer::load<int64_t>(cx, ptr, 8);
    }

    template <>
    inline float32_t load<float32_t>(const CallContext *cx, uint32_t ptr)
    {
        return float_::load<float32_t>(cx, ptr);
    }

    template <>
    inline float64_t load<float64_t>(const CallContext *cx, uint32_t ptr)
    {
        return float_::load<float64_t>(cx, ptr);
    }

    template <>
    inline string_t load<string_t>(const CallContext *cx, uint32_t ptr)
    {
        return string::load(cx, ptr);
    }
}

#endif
