#ifndef CMCPP_LIFT_HPP
#define CMCPP_LIFT_HPP

#include "context.hpp"
#include "integer.hpp"
#include "float.hpp"
#include "string.hpp"
#include "list.hpp"
#include "util.hpp"

namespace cmcpp
{
    // template <typename T>
    // inline T lift_flat(const CallContext *cx, const WasmValVectorIterator &vi)
    // {
    //     cx->trap("lift_flat of unsupported type");
    //     throw std::runtime_error("trap not terminating execution");
    // }

    template <Boolean T>
    inline T lift_flat(const CallContext *cx, const WasmValVectorIterator &vi)
    {
        return convert_int_to_bool(vi.next<int32_t>());
    }

    template <Unsigned T>
    inline T lift_flat(const CallContext *cx, const WasmValVectorIterator &vi)
    {
        return integer::lift_flat_unsigned<T, int32_t>(vi, ValTrait<T>::type==ValType::U64 ? 64 : 32, 8);
    }

    template <Signed T>
    inline T lift_flat(const CallContext *cx, const WasmValVectorIterator &vi)
    {
        return integer::lift_flat_signed<T, int32_t>(vi, ValTrait<T>::type==ValType::S64 ? 64 : 32, 8);
    }
    
    // template <Integer T>
    // inline uint64_t lift_flat<uint64_t>(const CallContext *cx, const WasmValVectorIterator &vi)
    // {
    //     return integer::lift_flat_unsigned<uint32_t, int32_t>(vi, 64, 64);
    // }

    // template <Integer T>
    // inline int64_t lift_flat<int64_t>(const CallContext *cx, const WasmValVectorIterator &vi)
    // {
    //     return integer::lift_flat_signed<int64_t, int64_t>(vi, 64, 64);
    // }

    template <String T>
    inline T lift_flat(const CallContext *cx, const WasmValVectorIterator &vi)
    {
        return string::lift_flat(cx, vi);
    }

    template <List T>
    inline T lift_flat(const CallContext *cx, const WasmValVectorIterator &vi)
    {
        return list::lift_flat<typename ValTrait<T>::inner_type>(cx, vi);
    }
}

#endif
