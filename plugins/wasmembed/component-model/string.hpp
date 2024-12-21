#ifndef CMCPP_STRING_HPP
#define CMCPP_STRING_HPP

#include "context.hpp"

namespace cmcpp
{
    namespace string
    {
        std::pair<offset, bytes> store_into_range(CallContext *cx, const string_t &v);
        void store(CallContext *cx, const string_t &v, uint32_t ptr);

        string_t load(const CallContext *cx, offset offset);
    }
}

#endif
