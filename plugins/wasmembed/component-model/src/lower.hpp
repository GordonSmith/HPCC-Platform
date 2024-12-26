#ifndef CMCPP_LOWER_HPP
#define CMCPP_LOWER_HPP

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
    inline WasmValVector lower_flat(CallContext *cx, const T &v)
    {
        cx->trap("lower_flat of unsupported type");
        throw std::runtime_error("trap not terminating execution");
    }

    template <>
    inline WasmValVector lower_flat<bool_t>(CallContext *cx, const bool_t &v)
    {
        return {static_cast<int32_t>(v)};
    }

    template <>
    inline WasmValVector lower_flat<uint8_t>(CallContext *cx, const uint8_t &v)
    {
        return {static_cast<int32_t>(v)};
    }

    template <>
    inline WasmValVector lower_flat<int8_t>(CallContext *cx, const int8_t &v)
    {
        return integer::lower_flat_signed(v, 32);
    }

    template <>
    inline WasmValVector lower_flat<uint16_t>(CallContext *cx, const uint16_t &v)
    {
        return {static_cast<int32_t>(v)};
    }

    template <>
    inline WasmValVector lower_flat<int16_t>(CallContext *cx, const int16_t &v)
    {
        return integer::lower_flat_signed(v, 32);
    }

    template <>
    inline WasmValVector lower_flat<uint32_t>(CallContext *cx, const uint32_t &v)
    {
        return {static_cast<int32_t>(v)};
    }

    template <>
    inline WasmValVector lower_flat<int32_t>(CallContext *cx, const int32_t &v)
    {
        return integer::lower_flat_signed(v, 32);
    }

    template <>
    inline WasmValVector lower_flat<uint64_t>(CallContext *cx, const uint64_t &v)
    {
        return {static_cast<int64_t>(v)};
    }

    template <>
    inline WasmValVector lower_flat<int64_t>(CallContext *cx, const int64_t &v)
    {
        return integer::lower_flat_signed(v, 64);
    }

    template <>
    inline WasmValVector lower_flat<string_t>(CallContext *cx, const string_t &v)
    {
        return string::lower_flat(cx, v);
    }

    template <typename T>
    inline WasmValVector lower_flat(CallContext *cx, const list_t<T> &v)
    {
        return list::lower_flat<T>(cx, v);
    }
}

#endif
