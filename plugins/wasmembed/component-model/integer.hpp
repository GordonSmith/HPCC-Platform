#ifndef CMCPP_INTEGER_HPP
#define CMCPP_INTEGER_HPP

#include "context.hpp"

#include <tuple>
#include <cassert>

namespace cmcpp
{
    using ptr = uint32_t;

    namespace integer
    {
        template <typename T>
        void store(CallContext *cx, const T &v, uint32_t ptr, uint8_t nbytes)
        {
            for (size_t i = 0; i < nbytes; ++i)
            {
                cx->memory[ptr + i] = static_cast<uint8_t>(v >> (8 * i));
            }
        }

        template <typename T>
        T load(CallContext *cx, ptr ptr, uint8_t nbytes)
        {
            assert(nbytes == sizeof(T));
            T retVal = 0;
            for (size_t i = 0; i < sizeof(T); ++i)
            {
                retVal |= static_cast<T>(cx->memory[ptr + i]) << (8 * i);
            }
            return retVal;
        }
    }
}

#endif
