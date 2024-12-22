#ifndef CMCPP_BOOLEAN_HPP
#define CMCPP_BOOLEAN_HPP

#include "context.hpp"

namespace cmcpp
{

    namespace boolean
    {
        bool_t load(const CallContext *cx, uint32_t ptr, uint8_t nbytes)
        {
            uint8_t v = integer::load<uint8_t>(cx, ptr, nbytes);
            if (v == 0)
            {
                return false;
            }
            else if (v == 1)
            {
                return true;
            }
            else
            {
                cx->trap("invalid boolean value");
                throw std::runtime_error("trap not terminating execution");
            }
        }
    }
}

#endif
