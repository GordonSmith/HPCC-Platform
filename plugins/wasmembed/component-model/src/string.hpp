#ifndef CMCPP_STRING_HPP
#define CMCPP_STRING_HPP

#include "context.hpp"
#include "integer.hpp"
#include "util.hpp"

namespace cmcpp
{
    namespace string
    {
        std::pair<uint32_t, uint32_t> store_string_copy(CallContext &cx, const void *src, uint32_t src_code_units, uint32_t dst_code_unit_size, uint32_t dst_alignment, Encoding dst_encoding);
        std::pair<uint32_t, uint32_t> store_utf16_to_utf8(CallContext &cx, const void *src, uint32_t src_code_units);
        std::pair<uint32_t, uint32_t> store_latin1_to_utf8(CallContext &cx, const void *src, uint32_t src_code_units);
        std::pair<uint32_t, uint32_t> store_utf8_to_utf16(CallContext &cx, const void *src, uint32_t src_code_units);
        std::pair<uint32_t, uint32_t> store_string_to_latin1_or_utf16(CallContext &cx, Encoding src_encoding, const void *src, uint32_t src_code_units);
        std::pair<uint32_t, uint32_t> store_probably_utf16_to_latin1_or_utf16(CallContext &cx, const void *src, uint32_t src_code_units);

        template <String T>
        std::pair<offset, bytes> store_into_range(CallContext &cx, const T &v)
        {
            Encoding src_encoding = ValTrait<T>::encoding;
            auto *src = v.data();
            const size_t src_tagged_code_units = v.size() * ValTrait<T>::char_size;

            Encoding src_simple_encoding;
            uint32_t src_code_units;
            if (src_encoding == Encoding::Latin1_Utf16)
            {
                if (src_tagged_code_units & UTF16_TAG)
                {
                    src_simple_encoding = Encoding::Utf16;
                    src_code_units = src_tagged_code_units ^ UTF16_TAG;
                }
                else
                {
                    src_simple_encoding = Encoding::Latin1;
                    src_code_units = src_tagged_code_units;
                }
            }
            else
            {
                src_simple_encoding = src_encoding;
                src_code_units = src_tagged_code_units;
            }

            switch (cx.guest_encoding)
            {
            case Encoding::Latin1:
            case Encoding::Utf8:
                switch (src_simple_encoding)
                {
                case Encoding::Utf8:
                    return store_string_copy(cx, src, src_code_units, 1, 1, Encoding::Utf8);
                case Encoding::Utf16:
                    return store_utf16_to_utf8(cx, src, src_code_units);
                case Encoding::Latin1:
                    return store_latin1_to_utf8(cx, src, src_code_units);
                }
                break;
            case Encoding::Utf16:
                switch (src_simple_encoding)
                {
                case Encoding::Utf8:
                    return store_utf8_to_utf16(cx, src, src_code_units);
                case Encoding::Utf16:
                    return store_string_copy(cx, src, src_code_units, 2, 2, Encoding::Utf16);
                case Encoding::Latin1:
                    return store_string_copy(cx, src, src_code_units, 2, 2, Encoding::Utf16);
                }
                break;
            case Encoding::Latin1_Utf16:
                switch (src_encoding)
                {
                case Encoding::Utf8:
                    return store_string_to_latin1_or_utf16(cx, src_encoding, src, src_code_units);
                case Encoding::Utf16:
                    return store_string_to_latin1_or_utf16(cx, src_encoding, src, src_code_units);
                case Encoding::Latin1_Utf16:
                    switch (src_simple_encoding)
                    {
                    case Encoding::Latin1:
                        return store_string_copy(cx, src, src_code_units, 1, 2, Encoding::Latin1);
                    case Encoding::Utf16:
                        return store_probably_utf16_to_latin1_or_utf16(cx, src, src_code_units);
                    }
                }
            }
            assert(false);
            return std::make_pair(0, 0);
        }
        void store(CallContext &cx, const string_t &v, uint32_t ptr);

        template <String T>
        WasmValVector lower_flat(CallContext &cx, const T &v)
        {
            auto [ptr, packed_length] = store_into_range(cx, v);
            return {(int32_t)ptr, (int32_t)packed_length};
        }

        template <String T>
        T load_from_range(const CallContext &cx, uint32_t ptr, uint32_t tagged_code_units)
        {
            uint32_t alignment = 0;
            uint32_t byte_length = 0;
            Encoding encoding = Encoding::Utf8;
            switch (cx.guest_encoding)
            {
            case Encoding::Utf8:
                alignment = 1;
                byte_length = tagged_code_units;
                encoding = Encoding::Utf8;
                break;
            case Encoding::Utf16:
                alignment = 2;
                byte_length = 2 * tagged_code_units;
                encoding = Encoding::Utf16;
                break;
            case Encoding::Latin1_Utf16:
                alignment = 2;
                if (tagged_code_units & UTF16_TAG)
                {
                    byte_length = 2 * (tagged_code_units ^ UTF16_TAG);
                    encoding = Encoding::Utf16;
                }
                else
                {
                    byte_length = tagged_code_units;
                    encoding = Encoding::Latin1;
                }
                break;
            default:
                trap_if(cx, false);
            }
            trap_if(cx, ptr != align_to(ptr, alignment));
            trap_if(cx, ptr + byte_length > cx.memory.size());

            size_t host_byte_length = (byte_length) * ValTrait<T>::char_size + 100;
            T retVal;
            retVal.resize(host_byte_length);
            auto decoded = cx.convert(retVal.data(), host_byte_length, (void *)&cx.memory[ptr], byte_length, cx.guest_encoding, ValTrait<T>::encoding);
            if (decoded.second < host_byte_length)
            {
                retVal.resize(decoded.second);
            }
            return retVal;
        }

        template <String T>
        T load(const CallContext &cx, offset offset)
        {
            auto begin = integer::load<uint32_t>(cx, offset);
            auto tagged_code_units = integer::load<uint32_t>(cx, offset + 4);
            return load_from_range<T>(cx, begin, tagged_code_units);
        }

        template <String T>
        T lift_flat(const CallContext &cx, const WasmValVectorIterator &vi)
        {

            auto ptr = vi.next<int32_t>();
            auto packed_length = vi.next<int32_t>();
            return load_from_range<T>(cx, ptr, packed_length);
        }
    }
}

#endif
