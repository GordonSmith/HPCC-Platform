#ifndef CMCPP_LIST_HPP
#define CMCPP_LIST_HPP

#include "context.hpp"
#include "traits.hpp"
#include "integer.hpp"
#include "util.hpp"
#include "store.hpp"
#include "load.hpp"

#include <tuple>
#include <cassert>
#include <limits>

namespace cmcpp
{
    using offset = uint32_t;
    using size = uint32_t;

    namespace list
    {

        template <typename T>
        std::pair<uint32_t, uint32_t> store_list_into_range(CallContext *cx, const list_t<T> &v)
        {
            auto elem_type = ValTrait<T>::type();
            size_t nbytes = elem_size(elem_type);
            auto byte_length = v->vs.size() * nbytes;
            if (byte_length >= std::numeric_limits<size>::max())
            {
                throw std::runtime_error("byte_length exceeds limit");
            }
            uint32_t ptr = cx->realloc(0, 0, alignment(elem_type), byte_length);
            if (ptr != align_to(ptr, alignment(elem_type)))
            {
                throw std::runtime_error("ptr not aligned");
            }
            if (ptr + byte_length > cx->memory.size())
            {
                throw std::runtime_error("memory overflow");
            }
            for (size_t i = 0; i < v->vs.size(); ++i)
            {
                cmcpp::store<T>(cx, v->vs[i], ptr + i * nbytes);
            }
            return {ptr, v->vs.size()};
        }

        template <typename T>
        void store(CallContext *cx, const list_t<T> &list, offset ptr)
        {
            auto [begin, length] = store_into_range(cx, list);
            store_int(cx, begin, ptr, 4);
            store_int(cx, length, ptr + 4, 4);
        }

        template <typename T>
        std::shared_ptr<list_t<T>> load_from_range(CallContext *cx, offset ptr, size length)
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
