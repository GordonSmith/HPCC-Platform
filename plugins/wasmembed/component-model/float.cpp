#include "float.hpp"

namespace cmcpp
{
    namespace float_
    {
        float32_t decode_i32_as_float(int32_t i)
        {
            union
            {
                float32_t f;
                int32_t i;
            } u;
            u.i = i;
            return u.f;
        }

        float64_t decode_i64_as_float(int64_t i)
        {
            union
            {
                float64_t f;
                int64_t i;
            } u;
            u.i = i;
            return u.f;
        }

        int32_t encode_float_as_i32(float32_t f)
        {
            union
            {
                float32_t f;
                int32_t i;
            } u;
            u.f = f;
            return u.i;
        }

        int64_t encode_float_as_i64(float64_t f)
        {
            union
            {
                float64_t f;
                int64_t i;
            } u;
            u.f = f;
            return u.i;
        }

    }
}
