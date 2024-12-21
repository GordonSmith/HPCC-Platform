#ifndef CMCPP_STORE_HPP
#define CMCPP_STORE_HPP

#include "context.hpp"
#include "util.hpp"
#include "integer.hpp"
#include "string.hpp"

#include <tuple>
#include <cassert>

namespace cmcpp
{
    template <typename T>
    void store(CallContext *cx, const T &v, uint32_t ptr)
    {
        // auto t = ValTrait<T>::type();
        // assert(ptr == align_to(ptr, alignment(t)));
        // assert(ptr + elem_size(t) <= cx->memory.size());
        // switch (t)
        // {
        // case ValType::U8:
        //     integer::store(cx, v, ptr, 1);
        //     break;
        // case ValType::S8:
        //     integer::store(cx, v, ptr, 1);
        //     break;
        // case ValType::U16:
        //     integer::store(cx, v, ptr, 2);
        //     break;
        // case ValType::S16:
        //     integer::store(cx, v, ptr, 2);
        //     break;
        // case ValType::U32:
        //     integer::store(cx, v, ptr, 4);
        //     break;
        // case ValType::S32:
        //     integer::store(cx, v, ptr, 4);
        //     break;
        // case ValType::U64:
        //     integer::store(cx, v, ptr, 8);
        //     break;
        // case ValType::S64:
        //     integer::store(cx, v, ptr, 8);
        //     break;
        // default:
        // {
        //     char errorMsg[50];
        //     snprintf(errorMsg, sizeof(errorMsg), "cmcpp::store Unknown type %i", static_cast<int>(t));
        //     cx->trap(errorMsg);
        // }
        // }
        cx->trap("store of unsupported type");
        throw std::runtime_error("trap not terminating execution");
    }

    template <>
    inline void store<uint8_t>(CallContext *cx, const uint8_t &v, uint32_t ptr)
    {
        integer::store(cx, v, ptr, 1);
    }

    template <>
    inline void store<int8_t>(CallContext *cx, const int8_t &v, uint32_t ptr)
    {
        integer::store(cx, v, ptr, 1);
    }

    template <>
    inline void store<uint16_t>(CallContext *cx, const uint16_t &v, uint32_t ptr)
    {
        integer::store(cx, v, ptr, 2);
    }

    template <>
    inline void store<int16_t>(CallContext *cx, const int16_t &v, uint32_t ptr)
    {
        integer::store(cx, v, ptr, 2);
    }

    template <>
    inline void store<uint32_t>(CallContext *cx, const uint32_t &v, uint32_t ptr)
    {
        integer::store(cx, v, ptr, 4);
    }

    template <>
    inline void store<int32_t>(CallContext *cx, const int32_t &v, uint32_t ptr)
    {
        integer::store(cx, v, ptr, 4);
    }

    template <>
    inline void store<uint64_t>(CallContext *cx, const uint64_t &v, uint32_t ptr)
    {
        integer::store(cx, v, ptr, 8);
    }

    template <>
    inline void store<int64_t>(CallContext *cx, const int64_t &v, uint32_t ptr)
    {
        integer::store(cx, v, ptr, 8);
    }

    template <>
    inline void store<string_t>(CallContext *cx, const string_t &v, uint32_t ptr)
    {
        string::store(cx, v, ptr);
    }

}

#endif
