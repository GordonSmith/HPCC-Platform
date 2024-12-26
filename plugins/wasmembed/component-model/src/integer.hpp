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
        void store(CallContext &cx, const T &v, offset ptr)
        {
            std::memcpy(&cx.memory[ptr], &v, sizeof(T));
        }

        template <typename T>
        WasmValVector lower_flat_signed(T v, int core_bits)
        {
            if (v < 0)
            {
                v += 1 << core_bits;
            }
            return {static_cast<int32_t>(v)};
        }

        template <typename T>
        T load(const CallContext &cx, offset ptr)
        {
            T retVal;
            std::memcpy(&retVal, &cx.memory[ptr], sizeof(T));
            return retVal;
        }

        template <typename R, typename T>
        T lift_flat_unsigned(const WasmValVectorIterator &vi, int core_width, int t_width)
        {
            auto i = vi.next<T>();
            assert(0 <= i && i < (1 << core_width));
            return i % (1 << t_width);
        }

        template <typename R, typename T>
        T lift_flat_signed(const WasmValVectorIterator &vi, int core_width, int t_width)
        {
            auto i = vi.next<T>();
            assert(0 <= i && i < (1 << core_width));
            if (i >= (1 << (t_width - 1)))
            {
                return i - (1 << t_width);
            }
            return i;
        }
    }
}

#endif
