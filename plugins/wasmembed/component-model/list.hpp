#ifndef CMCPP_LIST_HPP
#define CMCPP_LIST_HPP

#include "context.hpp"
#include "traits.hpp"
#include "integer.hpp"
#include "util.hpp"
#include "load.hpp"

#include <tuple>
#include <cassert>

namespace cmcpp
{
    using offset = uint32_t;
    using size = uint32_t;

    namespace list
    {
        template <typename T>
        std::shared_ptr<list_t<T>>load_from_range(CallContext *cx, offset ptr, size length)
        {
            auto t = ValTrait<T>::type();
            assert(ptr == align_to(ptr, alignment(t)));
            assert(ptr + length * elem_size(t) <= cx->memory.size());
            auto list = std::make_shared<list_t<T>>();
            for (uint32_t i = 0; i < length; ++i)
            {
                list->vs.push_back(cmcpp::load<T>(cx, ptr + i * elem_size(t)));
            }
            return list;
        }

        template <typename T>
        std::shared_ptr<list_t<T>> load(CallContext *cx, offset ptr)
                {
            uint32_t begin = integer::load<uint32_t>(cx, ptr, 4);
            uint32_t length = integer::load<uint32_t>(cx, ptr + 4, 4);
            return load_from_range<T>(cx, begin, length);
        }

    }
}

#endif
