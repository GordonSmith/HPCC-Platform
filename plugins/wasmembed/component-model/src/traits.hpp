#ifndef CMCPP_TRAITS_HPP
#define CMCPP_TRAITS_HPP

#include <cstdint>
#include <vector>
#include <optional>
#include <variant>
#include <memory>
#include <stdexcept>
#include <array>

//  See canonical ABI:
//  https://github.com/WebAssembly/component-model/blob/main/design/mvp/canonical-abi/definitions.py
//  https://github.com/WebAssembly/component-model/blob/main/design/mvp/CanonicalABI.md

namespace cmcpp
{
    enum class Encoding
    {
        Latin1,
        Utf8,
        Utf16,
        Latin1_Utf16
    };

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
        Borrow,
        UNKNOWN
    };

    using bool_t = bool;
    using float32_t = float;
    using float64_t = double;

    struct string_t
    {
        Encoding encoding;
        const char8_t *ptr;
        size_t byte_len;
    };

    template <typename T>
    using list_t = std::vector<T>;

    template <typename T>
    struct field_t
    {
        std::string label;
        T v;
    };

    template <typename... Fields>
    struct record_t
    {
        std::array<field_t<Fields>...> fields;
    };

    template <typename... Ts>
    using tuple_t = std::tuple<Ts...>;

    template <typename T>
    struct case_t
    {
        std::string label;
        std::optional<T> v;
    };

    template <typename... Ts>
    using variant_t = std::variant<Ts...>;

    using enum_t = std::vector<std::string>;

    // template <typename T = variant_t<>>
    // using VariantT = std::variant<bool, int8_t, uint8_t, int16_t, uint16_t, int32_t, uint32_t, int64_t, uint64_t, float32_t, float64_t, string_t, variant_t<T>, list_t<T>, field_t<T>>;
    // list_t<ReursiveVariantT>, field_t<ReursiveVariantT>>; // record_t>; //, tuple_ptr, case_ptr, variant_ptr, enum_ptr, option_ptr, result_ptr, flags_ptr>;
    // struct ReursiveVariantT {
    //     VariantT v;
    // };
    // ValType type(const VariantT &v);

    template <typename T>
    struct ValTrait
    {
        typedef void inner_type;
        static constexpr ValType type = ValType::UNKNOWN;
        static_assert(ValTrait<T>::type != ValType::UNKNOWN, "T must be valid ValType.");
    };

    template <>
    struct ValTrait<bool_t>
    {
        static constexpr ValType type = ValType::Bool;
    };

    template <>
    struct ValTrait<int8_t>
    {
        static constexpr ValType type = ValType::S8;
    };

    template <>
    struct ValTrait<uint8_t>
    {
        static constexpr ValType type = ValType::U8;
    };

    template <>
    struct ValTrait<int16_t>
    {
        static constexpr ValType type = ValType::S16;
    };

    template <>
    struct ValTrait<uint16_t>
    {
        static constexpr ValType type = ValType::U16;
    };

    template <>
    struct ValTrait<int32_t>
    {
        static constexpr ValType type = ValType::S32;
    };

    template <>
    struct ValTrait<uint32_t>
    {
        static constexpr ValType type = ValType::U32;
    };

    template <>
    struct ValTrait<int64_t>
    {
        static constexpr ValType type = ValType::S64;
    };

    template <>
    struct ValTrait<uint64_t>
    {
        static constexpr ValType type = ValType::U64;
    };

    template <>
    struct ValTrait<float32_t>
    {
        static constexpr ValType type = ValType::F32;
    };

    template <>
    struct ValTrait<float64_t>
    {
        static constexpr ValType type = ValType::F64;
    };

    template <>
    struct ValTrait<char8_t>
    {
        static constexpr ValType type = ValType::Char;
    };

    template <>
    struct ValTrait<string_t>
    {
        static constexpr ValType type = ValType::String;
    };

    template <typename T>
    struct ValTrait<list_t<T>>
    {
        typedef T inner_type;
        static constexpr ValType type = ValType::List;
    };

    template <typename T>
    struct ValTrait<field_t<T>>
    {
        static constexpr ValType type = ValType::Field;
        static constexpr ValType of = ValTrait<T>::type;
    };

    template <typename... Fields>
    struct ValTrait<record_t<Fields...>>
    {
        static constexpr ValType type = ValType::Record;
    };

    template <typename... Ts>
    struct ValTrait<tuple_t<Ts...>>
    {
        static constexpr ValType type = ValType::Tuple;
    };

    template <typename T>
    struct ValTrait<case_t<T>>
    {
        static constexpr ValType type = ValType::Case;
        static constexpr ValType of = ValTrait<T>::type;
    };

    template <typename... Ts>
    struct ValTrait<variant_t<Ts...>>
    {
        static constexpr ValType type = ValType::Variant;
    };

    template <>
    struct ValTrait<enum_t>
    {
        static constexpr ValType type = ValType::Enum;
    };

    // class option_t;
    // using option_ptr = std::shared_ptr<option_t>;
    // template <>
    // struct ValTrait<option_ptr>
    // {
    //     static ValType type() { return ValType::Option; }
    // };

    // class result_t;
    // using result_ptr = std::shared_ptr<result_t>;
    // template <>
    // struct ValTrait<result_ptr>
    // {
    //     static ValType type() { return ValType::Result; }
    // };

    // class flags_t;
    // using flags_ptr = std::shared_ptr<flags_t>;
    // template <>
    // struct ValTrait<flags_ptr>
    // {
    //     static ValType type() { return ValType::Flags; }
    // };

    template <typename T> 
    concept Boolean = ValTrait<T>::type == ValType::Bool;

    template <typename T> 
    concept Signed = ValTrait<T>::type == ValType::S8 || ValTrait<T>::type == ValType::S16 || ValTrait<T>::type == ValType::S32 || ValTrait<T>::type == ValType::S64;

    template <typename T> 
    concept Unsigned = ValTrait<T>::type == ValType::U8 || ValTrait<T>::type == ValType::U16 || ValTrait<T>::type == ValType::U32 || ValTrait<T>::type == ValType::U64;

    template <typename T> 
    concept Integer = Signed<T> || Unsigned<T>;

    template <typename T> 
    concept Float = ValTrait<T>::type == ValType::F32 || ValTrait<T>::type == ValType::F64;

    template <typename T> 
    concept W64 = ValTrait<T>::type == ValType::S64 || ValTrait<T>::type == ValType::U64 || ValTrait<T>::type == ValType::F64;

    template <typename T> 
    concept String = ValTrait<T>::type == ValType::String;

    template <typename T> 
    concept List = ValTrait<T>::type == ValType::List;

    //  --------------------------------------------------------------------
    template <typename T>
    ValType type(const T &v)
    {
        return ValTrait<T>::type;
    }

    //  --------------------------------------------------------------------

    enum class WasmValType : uint8_t
    {
        i32,
        i64,
        f32,
        f64,
        UNKNOWN
    };
    using WasmVal = std::variant<int32_t, int64_t, float32_t, float64_t>;
    using WasmValVector = std::vector<WasmVal>;
    class WasmValVectorIterator
    {
        mutable WasmValVector::const_iterator it;
        WasmValVector::const_iterator end;

    public:
        WasmValVectorIterator(const WasmValVector &v);

        template <typename T>
        T next() const
        {
            if (it == end)
            {
                throw std::out_of_range("Iterator is out of range");
            }
            return std::get<T>(*it++);
        }
    };

    template <typename T>
    struct WasmValTrait
    {
        static constexpr WasmValType type = WasmValType::UNKNOWN;
        static_assert(WasmValTrait<T>::type != WasmValType::UNKNOWN, "T must be valid WasmValType.");
    };

    template <>
    struct WasmValTrait<int32_t>
    {
        static constexpr WasmValType type = WasmValType::i32;
    };

    template <>
    struct WasmValTrait<int64_t>
    {
        static constexpr WasmValType type = WasmValType::i64;
    };

    template <>
    struct WasmValTrait<float32_t>
    {
        static constexpr WasmValType type = WasmValType::f32;
    };

    template <>
    struct WasmValTrait<float64_t>
    {
        static constexpr WasmValType type = WasmValType::f64;
    };

    using offset = uint32_t;
    using bytes = uint32_t;
}

#endif
