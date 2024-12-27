#ifndef CMCPP_RECORD_HPP
#define CMCPP_RECORD_HPP

#include "context.hpp"
#include "integer.hpp"
#include "store.hpp"
#include "load.hpp"
#include "util.hpp"

#include <tuple>
#include <limits>
#include <cassert>

namespace cmcpp
{
    using offset = uint32_t;
    using size = uint32_t;

    // template <Record T>
    // inline void store(CallContext &cx, const record_t<typename ValTrait<T>::inner_type> &v, uint32_t ptr);

    // template <Record T>
    // inline record_t<typename ValTrait<T>::inner_type> load(const CallContext &cx, uint32_t ptr);

    namespace record
    {
        // template <typename T>
        // std::tuple<offset, size> store_into_range(CallContext &cx, const list_t<T> &v)
        // {
        //     auto elem_type = ValTrait<T>::type;
        //     size_t nbytes = ValTrait<T>::size;
        //     auto byte_length = v.size() * nbytes;
        //     if (byte_length >= std::numeric_limits<size>::max())
        //     {
        //         throw std::runtime_error("byte_length exceeds limit");
        //     }
        //     uint32_t ptr = cx.realloc(0, 0, ValTrait<T>::alignment, byte_length);
        //     if (ptr != align_to(ptr, ValTrait<T>::alignment))
        //     {
        //         throw std::runtime_error("ptr not aligned");
        //     }
        //     if (ptr + byte_length > cx.memory.size())
        //     {
        //         throw std::runtime_error("memory overflow");
        //     }
        //     for (size_t i = 0; i < v.size(); ++i)
        //     {
        //         cmcpp::store<T>(cx, v[i], ptr + i * nbytes);
        //     }
        //     return {ptr, v.size()};
        // }

        // template <typename T>
        // void store(CallContext &cx, const list_t<T> &list, offset ptr)
        // {
        //     auto [begin, length] = store_into_range(cx, list);
        //     integer::store(cx, begin, ptr);
        //     integer::store(cx, length, ptr + 4);
        // }

    template <typename... Fields>
    WasmValVector lower_flat(CallContext &cx, const record_t<Fields...> &v)
    {
        WasmValVector retVal = {};
        auto process_field = [&](auto&& field) {
            auto flat = lower_flat(cx, field.v);
            retVal.insert(retVal.end(), flat.begin(), flat.end());
        };

        std::apply([&](auto&&... fields) {
            (process_field(fields), ...);
        }, v);
        return retVal;
    }

    template <typename... Fields>
    inline record_t<Fields...> lift_flat(const CallContext &cx, const WasmValVectorIterator &vi, record_t<Fields...> &result)
    {
        auto process_field = [&](auto&& field) {
            field.v = lift_flat<std::remove_reference_t<decltype(field.v)>>(cx, vi);
        };

        std::apply([&](auto&&... fields) {
            (process_field(fields), ...);
        }, result);
        return result;
    }



        // template <typename T>
        // list_t<T> load_from_range(const CallContext &cx, offset ptr, size length)
        // {
        //     assert(ptr == align_to(ptr, ValTrait<T>::alignment));
        //     assert(ptr + length * ValTrait<T>::size <= cx.memory.size());
        //     list_t<T> list = {};
        //     for (uint32_t i = 0; i < length; ++i)
        //     {
        //         list.push_back(cmcpp::load<T>(cx, ptr + i * ValTrait<T>::size));
        //     }
        //     return list;
        // }

        // template <typename T>
        // list_t<T> load(const CallContext &cx, offset ptr)
        // {
        //     uint32_t begin = integer::load<uint32_t>(cx, ptr);
        //     uint32_t length = integer::load<uint32_t>(cx, ptr + 4);
        //     return load_from_range<T>(cx, begin, length);
        // }
    }

    // template <Record T>
    // inline void store(CallContext &cx, const list_t<typename ValTrait<T>::inner_type> &v, uint32_t ptr)
    // {
    //     record::store(cx, v, ptr);
    // }

    // template <Record T>
    // inline list_t<typename ValTrait<T>::inner_type> load(const CallContext &cx, uint32_t ptr)
    // {
    //     return record::load<typename ValTrait<T>::inner_type>(cx, ptr);
    // }
}

#endif
