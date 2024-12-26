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
    template <Boolean T>
    inline WasmValVector lower_flat(CallContext &cx, const T &v)
    {
        return {static_cast<int32_t>(v)};
    }

    template <Unsigned T>
    inline WasmValVector lower_flat(CallContext &cx, const T &v)
    {
        return {ValTrait<T>::type == ValType::U64 ? static_cast<int64_t>(v) : static_cast<int32_t>(v)};
    }

    template <Signed T>
    inline WasmValVector lower_flat(CallContext &cx, const T &v)
    {
        return integer::lower_flat_signed(v, ValTrait<T>::type == ValType::U64 ? 64 : 32);
    }

    template <String T>
    inline WasmValVector lower_flat(CallContext &cx, const T &v)
    {
        return string::lower_flat(cx, v);
    }

    template <List T>
    inline WasmValVector lower_flat(CallContext &cx, const T &v)
    {
        return list::lower_flat<typename ValTrait<T>::inner_type>(cx, v);
    }
}

#endif
