#include "traits.hpp"

namespace cmcpp
{
    // ValType type(const VariantT &v)
    // {
    //     {
    //         auto visitor = [](auto &&arg) -> ValType
    //         {
    //             using T = std::decay_t<decltype(arg)>;
    //             return ValTrait<T>::type();
    //         };
    //         return std::visit(visitor, v);
    //     }
    // }
}