#ifndef CMCPP_LIFT_HPP
#define CMCPP_LIFT_HPP

#include "context.hpp"
#include "integer.hpp"
#include "float.hpp"
#include "string.hpp"
#include "list.hpp"
#include "record.hpp"
#include "util.hpp"

namespace cmcpp
{
    template <Boolean T>
    inline T lift_flat(const CallContext &cx, const WasmValVectorIterator &vi)
    {
        return convert_int_to_bool(vi.next<int32_t>());
    }

    template <Unsigned T>
    inline T lift_flat(const CallContext &cx, const WasmValVectorIterator &vi)
    {
        return integer::lift_flat_unsigned<T>(vi, ValTrait<T>::size * 8, 8);
    }

    template <Signed T>
    inline T lift_flat(const CallContext &cx, const WasmValVectorIterator &vi)
    {
        return integer::lift_flat_signed<T>(vi, ValTrait<T>::size * 8, 8);
    }

    template <Float T>
    inline T lift_flat(const CallContext &cx, const WasmValVectorIterator &vi)
    {
        return float_::canonicalize_nan<T>(vi.next<T>());
    }

    template <String T>
    inline T lift_flat(const CallContext &cx, const WasmValVectorIterator &vi)
    {
        return string::lift_flat(cx, vi);
    }

    template <List T>
    inline T lift_flat(const CallContext &cx, const WasmValVectorIterator &vi)
    {
        return list::lift_flat<typename ValTrait<T>::inner_type>(cx, vi);
    }

    template <Record T>
    T lift_flat(const CallContext &cx, const WasmValVectorIterator &vi)
    {
        T result;
        return record::lift_flat(cx, vi, result);
    }
}

#endif
