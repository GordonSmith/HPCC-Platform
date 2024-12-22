#ifndef CMCPP_INTEGER_HPP
#define CMCPP_INTEGER_HPP

#include "context.hpp"

#include <cstring>
#include <cassert>

namespace cmcpp
{
    using offset = uint32_t;

    namespace integer
    {
        template <typename T>
        void store(CallContext *cx, const T &v, offset ptr, uint8_t nbytes)
        {
            assert(nbytes == sizeof(T));
            std::memcpy(&cx->memory[ptr], &v, nbytes);
        }

        template <typename T>
        T load(const CallContext *cx, offset ptr, uint8_t nbytes)
        {
            assert(nbytes == sizeof(T));
            T retVal;
            std::memcpy(&retVal, &cx->memory[ptr], nbytes);
            return retVal;
        }

    }
}

#endif
