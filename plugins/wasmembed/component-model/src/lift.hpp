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
    template <typename T> 
    concept Integer = std::is_integral_v<T>;

    template <typename T> 
    concept String = ValTrait<T>::type == ValType::String;

    template <typename T> 
    concept List = ValTrait<T>::type == ValType::List;

    template <typename R>
    inline R lift_flat(const CallContext *cx, const WasmValVectorIterator &vi)
    {
        cx->trap("lift_flat of unsupported type");
        throw std::runtime_error("trap not terminating execution");
    }

    template <>
    inline bool_t lift_flat<bool_t>(const CallContext *cx, const WasmValVectorIterator &vi)
    {
        return convert_int_to_bool(vi.next<int32_t>());
    }

    template <>
    inline uint8_t lift_flat<uint8_t>(const CallContext *cx, const WasmValVectorIterator &vi)
    {
        return integer::lift_flat_unsigned<uint8_t, int32_t>(vi, 32, 8);
    }

    template <>
    inline int8_t lift_flat<int8_t>(const CallContext *cx, const WasmValVectorIterator &vi)
    {
        return integer::lift_flat_signed<int8_t, int32_t>(vi, 32, 8);
    }
    
    template <>
    inline uint16_t lift_flat<uint16_t>(const CallContext *cx, const WasmValVectorIterator &vi)
    {
        return integer::lift_flat_unsigned<uint16_t, int32_t>(vi, 32, 16);
    }

    template <>
    inline int16_t lift_flat<int16_t>(const CallContext *cx, const WasmValVectorIterator &vi)
    {
        return integer::lift_flat_signed<int16_t, int32_t>(vi, 32, 16);
    }

    template <>
    inline uint32_t lift_flat<uint32_t>(const CallContext *cx, const WasmValVectorIterator &vi)
    {
        return integer::lift_flat_unsigned<uint32_t, int32_t>(vi, 32, 32);
    }

    template <>
    inline int32_t lift_flat<int32_t>(const CallContext *cx, const WasmValVectorIterator &vi)
    {
        return integer::lift_flat_signed<int32_t, int32_t>(vi, 32, 32);
    }

    template <>
    inline uint64_t lift_flat<uint64_t>(const CallContext *cx, const WasmValVectorIterator &vi)
    {
        return integer::lift_flat_unsigned<uint32_t, int32_t>(vi, 64, 64);
    }

    template <>
    inline int64_t lift_flat<int64_t>(const CallContext *cx, const WasmValVectorIterator &vi)
    {
        return integer::lift_flat_signed<int64_t, int64_t>(vi, 64, 64);
    }

    template <>
    inline string_t lift_flat<string_t>(const CallContext *cx, const WasmValVectorIterator &vi)
    {
        return string::lift_flat(cx, vi);
    }

    template <List T>
    inline list_t<T> lift_flat(const CallContext *cx, const WasmValVectorIterator &vi)
    {
        return lift_flat(cx, vi, static_cast<list_t<T>*>(nullptr));
    }
}

#endif
