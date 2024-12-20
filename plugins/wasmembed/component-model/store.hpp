#ifndef CMCPP_STORE_HPP
#define CMCPP_STORE_HPP

#include "traits.hpp"
#include "context.hpp"
#include "util.hpp"
#include "integer.hpp"

#include <tuple>
#include <cassert>

namespace cmcpp
{
    template <typename T>
    void store(CallContext *cx, const T &v, uint32_t ptr)
    {
        auto t = ValTrait<T>::type();
        assert(ptr == align_to(ptr, alignment(t)));
        assert(ptr + elem_size(v) <= cx->memory.size());
        switch (t)
        {
        case ValType::U8:
            integer::store(cx, v, ptr, 1);
            break;
        case ValType::S8:
            integer::store(cx, v, ptr, 1);
            break;
        case ValType::U16:
            integer::store(cx, v, ptr, 2);
            break;
        case ValType::S16:
            integer::store(cx, v, ptr, 2);
            break;
        case ValType::U32:
            integer::store(cx, v, ptr, 4);
            break;
        case ValType::S32:
            integer::store(cx, v, ptr, 4);
            break;
        case ValType::U64:
            integer::store(cx, v, ptr, 8);
            break;
        case ValType::S64:
            integer::store(cx, v, ptr, 8);
            break;
        }
        throw std::runtime_error("Unknown type");
    }

}

#endif
