#ifndef CMCPP_FLOAT_HPP
#define CMCPP_FLOAT_HPP

#include "context.hpp"
#include "integer.hpp"

namespace cmcpp
{

    namespace float_
    {
        inline float32_t decode_i32_as_float(int32_t i)
        {
            return *reinterpret_cast<float32_t*>(&i);
        }

        inline float64_t decode_i64_as_float(int64_t i)
        {
            return *reinterpret_cast<float64_t*>(&i);
        }

        inline int32_t encode_float_as_i32(float32_t f)
        {
            return *reinterpret_cast<int32_t*>(&f);
        }

        inline int64_t encode_float_as_i64(float64_t f)
        {
            return *reinterpret_cast<int64_t*>(&f);
        }

        template <typename T>
        T load(const CallContext *cx, offset ptr)
        {
            cx->trap("load of unsupported type");
            throw std::runtime_error("trap not terminating execution");
        }

        template <>
        inline float32_t load<float32_t>(const CallContext *cx, offset ptr)
        {
            return decode_i32_as_float(integer::load<int32_t>(cx, ptr, 4));
        }

        template <>
        inline float64_t load<float64_t>(const CallContext *cx, offset ptr)
        {
            return decode_i64_as_float(integer::load<int64_t>(cx, ptr, 8));
        }

        template <typename T>
        inline void store(CallContext *cx, const T &v, offset ptr, uint8_t nbytes)
        {
            cx->trap("store of unsupported type");
            throw std::runtime_error("trap not terminating execution");
        }

        template <>
        inline void store<float32_t>(CallContext *cx, const float32_t &v, offset ptr, uint8_t nbytes)
        {
            integer::store(cx, encode_float_as_i32(v), ptr, 4);
        }

        template <>
        inline void store<float64_t>(CallContext *cx, const float64_t &v, offset ptr, uint8_t nbytes)
        {
            integer::store(cx, encode_float_as_i64(v), ptr, 8);
        }

    }
}

#endif
