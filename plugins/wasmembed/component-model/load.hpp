#ifndef CMCPP_LOAD_HPP
#define CMCPP_LOAD_HPP

#include "traits.hpp"
#include "context.hpp"
#include <tuple>

namespace cmcpp
{
    template <typename T>
    auto load(CallContext *cx, uint32_t ptr) -> decltype(integer::load<T>(cx, ptr, sizeof(T)))
    {
        auto t = ValTrait<T>::type();
        switch (t)
        {
        case ValType::U8:
            return integer::load<uint8_t>(cx, ptr, 1);
        case ValType::S8:
            return integer::load<int8_t>(cx, ptr, 1);
        case ValType::U16:
            return integer::load<uint16_t>(cx, ptr, 2);
        case ValType::S16:
            return integer::load<int16_t>(cx, ptr, 2);
        case ValType::U32:
            return integer::load<uint32_t>(cx, ptr, 4);
        case ValType::S32:
            return integer::load<int32_t>(cx, ptr, 4);
        case ValType::U64:
            return integer::load<uint64_t>(cx, ptr, 8);
        case ValType::S64:
            return integer::load<int64_t>(cx, ptr, 8);
        default:
            break;
        }
        cx->trap("load of unsupported type");
        throw std::runtime_error("trap not terminating execution");
    }
}

#endif
