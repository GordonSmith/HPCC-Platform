#ifndef CMCPP_STRING_HPP
#define CMCPP_STRING_HPP

#include "context.hpp"
#include <tuple>

namespace cmcpp
{
    using offset = uint32_t;
    using size = uint32_t;

    namespace string
    {
        std::tuple<cmcpp::Encoding /*encoding*/, cmcpp::offset, cmcpp::size> load(const cmcpp::LiftLowerContext &cx, offset offset);
    }
}

#endif
