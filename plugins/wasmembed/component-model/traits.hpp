#ifndef CMCPP_TRAITS_HPP
#define CMCPP_TRAITS_HPP

#include <cstdint>
#include <vector>
#include <optional>
#include <variant>
#include <memory>
#include <stdexcept>

namespace cmcpp
{
    enum class ValType : uint8_t
    {
        Bool,
        S8,
        U8,
        S16,
        U16,
        S32,
        U32,
        S64,
        U64,
        F32,
        F64,
        Char,
        String,
        List,
        Field,
        Record,
        Tuple,
        Case,
        Variant,
        Enum,
        Option,
        Result,
        Flags,
        Own,
        Borrow
    };

    template <typename T>
    struct ValTrait
    {
        static ValType type()
        {
            throw std::runtime_error(typeid(T).name());
        }
    };

    template <>
    struct ValTrait<bool>
    {
        static ValType type()
        {
            return ValType::Bool;
        }
    };

    template <>
    struct ValTrait<int8_t>
    {
        static ValType type()
        {
            return ValType::S8;
        }
    };

    template <>
    struct ValTrait<uint8_t>
    {
        static ValType type()
        {
            return ValType::U8;
        }
    };

    template <>
    struct ValTrait<int16_t>
    {
        static ValType type()
        {
            return ValType::S16;
        }
    };

    template <>
    struct ValTrait<uint16_t>
    {
        static ValType type()
        {
            return ValType::U16;
        }
    };

    template <>
    struct ValTrait<int32_t>
    {
        static ValType type()
        {
            return ValType::S32;
        }
    };

    template <>
    struct ValTrait<uint32_t>
    {
        static ValType type()
        {
            return ValType::U32;
        }
    };

    template <>
    struct ValTrait<int64_t>
    {
        static ValType type()
        {
            return ValType::S64;
        }
    };

    template <>
    struct ValTrait<uint64_t>
    {
        static ValType type()
        {
            return ValType::U64;
        }
    };

    using float32_t = float;
    template <>
    struct ValTrait<float32_t>
    {
        static ValType type()
        {
            return ValType::F32;
        }
    };

    using float64_t = double;
    template <>
    struct ValTrait<float64_t>
    {
        static ValType type()
        {
            return ValType::F64;
        }
    };

    template <>
    struct ValTrait<char8_t>
    {
        static ValType type()
        {
            return ValType::Char;
        }
    };

    enum class Encoding
    {
        Latin1,
        Utf8,
        Utf16,
        Latin1_Utf16
    };

    struct string_t
    {
        Encoding encoding;
        const char8_t *ptr;
        size_t byte_len;
    };
    template <>
    struct ValTrait<string_t>
    {
        static ValType type() { return ValType::String; }
    };

    template <typename T>
    using list_t = std::vector<T>;
    template <typename T>
    struct ValTrait<list_t<T>>
    {
        static ValType type() { return ValType::List; }
        static ValType of() { return ValTrait<T>::type(); }
    };

    class field_t;
    using field_ptr = std::shared_ptr<field_t>;
    template <>
    struct ValTrait<field_ptr>
    {
        static ValType type() { return ValType::Field; }
    };

    class record_t;
    using record_ptr = std::shared_ptr<record_t>;
    template <>
    struct ValTrait<record_ptr>
    {
        static ValType type() { return ValType::Record; }
    };

    class tuple_t;
    using tuple_ptr = std::shared_ptr<tuple_t>;
    template <>
    struct ValTrait<tuple_ptr>
    {
        static ValType type() { return ValType::Tuple; }
    };

    class case_t;
    using case_ptr = std::shared_ptr<case_t>;
    template <>
    struct ValTrait<case_ptr>
    {
        static ValType type() { return ValType::Case; }
    };

    class variant_t;
    using variant_ptr = std::shared_ptr<variant_t>;
    template <>
    struct ValTrait<variant_ptr>
    {
        static ValType type() { return ValType::Variant; }
    };

    class enum_t;
    using enum_ptr = std::shared_ptr<enum_t>;
    template <>
    struct ValTrait<enum_ptr>
    {
        static ValType type() { return ValType::Enum; }
    };

    class option_t;
    using option_ptr = std::shared_ptr<option_t>;
    template <>
    struct ValTrait<option_ptr>
    {
        static ValType type() { return ValType::Option; }
    };

    class result_t;
    using result_ptr = std::shared_ptr<result_t>;
    template <>
    struct ValTrait<result_ptr>
    {
        static ValType type() { return ValType::Result; }
    };

    class flags_t;
    using flags_ptr = std::shared_ptr<flags_t>;
    template <>
    struct ValTrait<flags_ptr>
    {
        static ValType type() { return ValType::Flags; }
    };

    //  --------------------------------------------------------------------
    template <typename T>
    ValType type(const T &v)
    {
        return ValTrait<T>::type();
    }

    //  --------------------------------------------------------------------

    template <typename T>
    struct WasmValTrait
    {
        static const char *type()
        {
            throw std::runtime_error(typeid(T).name());
        }
    };

    using offset = uint32_t;
    using bytes = uint32_t;
}

#endif
