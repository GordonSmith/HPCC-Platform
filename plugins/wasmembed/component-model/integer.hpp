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
        void store(CallContext *cx, const T &v, offset ptr)
        {
            std::memcpy(&cx->memory[ptr], &v, sizeof(T));
        }

        template <typename T>
        T load(const CallContext *cx, offset ptr)
        {
            T retVal;
            std::memcpy(&retVal, &cx->memory[ptr], sizeof(T));
            return retVal;
        }

    }
}

#endif
