#ifndef CMCPP_STORE_HPP
#define CMCPP_STORE_HPP

#include "context.hpp"
#include "float.hpp"
#include "integer.hpp"
#include "string.hpp"
#include "list.hpp"
#include "util.hpp"

#include <tuple>
#include <cassert>

namespace cmcpp
{
    template <typename T>
    void store(CallContext *cx, const T &v, uint32_t ptr)
    {
        cx->trap("store of unsupported type");
        throw std::runtime_error("trap not terminating execution");
    }

    template <>
    inline void store<bool_t>(CallContext *cx, const bool_t &v, uint32_t ptr)
    {
        integer::store(cx, v, ptr);
    }

    template <>
    inline void store<uint8_t>(CallContext *cx, const uint8_t &v, uint32_t ptr)
    {
        integer::store(cx, v, ptr);
    }

    template <>
    inline void store<int8_t>(CallContext *cx, const int8_t &v, uint32_t ptr)
    {
        integer::store(cx, v, ptr);
    }

    template <>
    inline void store<uint16_t>(CallContext *cx, const uint16_t &v, uint32_t ptr)
    {
        integer::store(cx, v, ptr);
    }

    template <>
    inline void store<int16_t>(CallContext *cx, const int16_t &v, uint32_t ptr)
    {
        integer::store(cx, v, ptr);
    }

    template <>
    inline void store<uint32_t>(CallContext *cx, const uint32_t &v, uint32_t ptr)
    {
        integer::store(cx, v, ptr);
    }

    template <>
    inline void store<int32_t>(CallContext *cx, const int32_t &v, uint32_t ptr)
    {
        integer::store(cx, v, ptr);
    }

    template <>
    inline void store<uint64_t>(CallContext *cx, const uint64_t &v, uint32_t ptr)
    {
        integer::store(cx, v, ptr);
    }

    template <>
    inline void store<int64_t>(CallContext *cx, const int64_t &v, uint32_t ptr)
    {
        integer::store(cx, v, ptr);
    }

    template <>
    inline void store<float32_t>(CallContext *cx, const float32_t &v, uint32_t ptr)
    {
        float_::store(cx, v, ptr);
    }

    template <>
    inline void store<float64_t>(CallContext *cx, const float64_t &v, uint32_t ptr)
    {
        float_::store(cx, v, ptr);
    }

    template <>
    inline void store<string_t>(CallContext *cx, const string_t &v, uint32_t ptr)
    {
        string::store(cx, v, ptr);
    }
}

#endif
