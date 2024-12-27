#ifndef CMCPP_TRAITS_HPP
#define CMCPP_TRAITS_HPP

#include <cstdint>
#include <vector>
#include <optional>
#include <variant>
#include <memory>
#include <stdexcept>
#include <array>
#include <cassert>
#include <limits>

//  See canonical ABI:
//  https://github.com/WebAssembly/component-model/blob/main/design/mvp/canonical-abi/definitions.py
//  https://github.com/WebAssembly/component-model/blob/main/design/mvp/CanonicalABI.md

namespace cmcpp
{
    using float32_t = float;
    using float64_t = double;

    enum class WasmValType : uint8_t
    {
        UNKNOWN,
        i32,
        i64,
        f32,
        f64,
        LAST
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
            assert(it != end);
            return std::get<T>(*it++);
        }
    };

    template <typename T>
    struct WasmValTrait
    {
        static constexpr WasmValType type = WasmValType::UNKNOWN;
        // static_assert(WasmValTrait<T>::type != WasmValType::UNKNOWN, "T must be valid WasmValType.");
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

    template <typename T>
    concept WasmValT =
        WasmValTrait<T>::type == WasmValType::i32 ||
        WasmValTrait<T>::type == WasmValType::i64 ||
        WasmValTrait<T>::type == WasmValType::f32 ||
        WasmValTrait<T>::type == WasmValType::f64;

    //  --------------------------------------------------------------------

    enum class Encoding
    {
        Latin1,
        Utf8,
        Utf16,
        Latin1_Utf16
    };

    enum class ValType : uint8_t
    {
        UNKNOWN,
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
        LAST
    };

    using bool_t = bool;

    template <typename T>
    struct ValTrait
    {
        static constexpr ValType type = ValType::UNKNOWN;
        using inner_type = void;
        static constexpr uint32_t size = 0;
        static constexpr uint32_t alignment = 0;
        using flat_types = void;
    };

    template <>
    struct ValTrait<bool_t>
    {
        static constexpr ValType type = ValType::Bool;
        static constexpr uint32_t size = 1;
        static constexpr uint32_t alignment = 1;
        using flat_type = int32_t;
    };

    template <>
    struct ValTrait<int8_t>
    {
        static constexpr ValType type = ValType::S8;
        static constexpr uint32_t size = 1;
        static constexpr uint32_t alignment = 1;
        using flat_type = int32_t;

        static constexpr int8_t LOW_VALUE = std::numeric_limits<int8_t>::lowest();
        static constexpr int8_t HIGH_VALUE = std::numeric_limits<int8_t>::max();
    };

    template <>
    struct ValTrait<uint8_t>
    {
        static constexpr ValType type = ValType::U8;
        static constexpr uint32_t size = 1;
        static constexpr uint32_t alignment = 1;
        using flat_type = int32_t;

        static constexpr int8_t LOW_VALUE = std::numeric_limits<uint8_t>::lowest();
        static constexpr int8_t HIGH_VALUE = std::numeric_limits<uint8_t>::max();
    };

    template <>
    struct ValTrait<int16_t>
    {
        static constexpr ValType type = ValType::S16;
        static constexpr uint32_t size = 2;
        static constexpr uint32_t alignment = 2;
        using flat_type = int32_t;

        static constexpr int16_t LOW_VALUE = std::numeric_limits<int16_t>::lowest();
        static constexpr int16_t HIGH_VALUE = std::numeric_limits<int16_t>::max();
    };

    template <>
    struct ValTrait<uint16_t>
    {
        static constexpr ValType type = ValType::U16;
        static constexpr uint32_t size = 2;
        static constexpr uint32_t alignment = 2;
        using flat_type = int32_t;

        static constexpr uint16_t LOW_VALUE = std::numeric_limits<uint16_t>::lowest();
        static constexpr uint16_t HIGH_VALUE = std::numeric_limits<uint16_t>::max();
    };

    template <>
    struct ValTrait<int32_t>
    {
        static constexpr ValType type = ValType::S32;
        static constexpr uint32_t size = 4;
        static constexpr uint32_t alignment = 4;
        using flat_type = int32_t;

        static constexpr int32_t LOW_VALUE = std::numeric_limits<int32_t>::lowest();
        static constexpr int32_t HIGH_VALUE = std::numeric_limits<int32_t>::max();
    };

    template <>
    struct ValTrait<uint32_t>
    {
        static constexpr ValType type = ValType::U32;
        static constexpr uint32_t size = 4;
        static constexpr uint32_t alignment = 4;
        using flat_type = int32_t;

        static constexpr uint32_t LOW_VALUE = std::numeric_limits<uint32_t>::lowest();
        static constexpr uint32_t HIGH_VALUE = std::numeric_limits<uint32_t>::max();
    };

    template <>
    struct ValTrait<int64_t>
    {
        static constexpr ValType type = ValType::S64;
        static constexpr uint32_t size = 8;
        static constexpr uint32_t alignment = 8;
        using flat_type = int64_t;

        static constexpr int64_t LOW_VALUE = std::numeric_limits<int64_t>::lowest();
        static constexpr int64_t HIGH_VALUE = std::numeric_limits<int64_t>::max();
    };

    template <>
    struct ValTrait<uint64_t>
    {
        static constexpr ValType type = ValType::U64;
        static constexpr uint32_t size = 8;
        static constexpr uint32_t alignment = 8;
        using flat_type = int64_t;

        static constexpr uint64_t LOW_VALUE = std::numeric_limits<uint64_t>::lowest();
        static constexpr uint64_t HIGH_VALUE = std::numeric_limits<uint64_t>::max();
    };

    template <>
    struct ValTrait<float32_t>
    {
        static constexpr ValType type = ValType::F32;
        static constexpr uint32_t size = 4;
        static constexpr uint32_t alignment = 4;
        using flat_type = float32_t;

        static constexpr float32_t LOW_VALUE = std::numeric_limits<float32_t>::lowest();
        static constexpr float32_t HIGH_VALUE = std::numeric_limits<float32_t>::max();
    };

    template <>
    struct ValTrait<float64_t>
    {
        static constexpr ValType type = ValType::F64;
        static constexpr uint32_t size = 8;
        static constexpr uint32_t alignment = 8;
        using flat_type = float64_t;

        static constexpr float64_t LOW_VALUE = std::numeric_limits<float64_t>::lowest();
        static constexpr float64_t HIGH_VALUE = std::numeric_limits<float64_t>::max();
    };

    template <>
    struct ValTrait<char8_t>
    {
        static constexpr ValType type = ValType::Char;
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
        static constexpr ValType type = ValType::String;
        static constexpr uint32_t size = 8;
        static constexpr uint32_t alignment = 4;
        using flat_type_0 = int32_t;
        using flat_type_1 = int32_t;
    };

    template <typename T>
    using list_t = std::vector<T>;
    template <typename T>
    struct ValTrait<list_t<T>>
    {
        static constexpr ValType type = ValType::List;
        using inner_type = T;
        static constexpr uint32_t size = 8;
        static constexpr uint32_t alignment = 4;
        using flat_type_0 = int32_t;
        using flat_type_1 = int32_t;
    };

    template <typename T>
    struct field_t
    {
        std::string label;
        T v;
    };
    template <typename T>
    struct ValTrait<field_t<T>>
    {
        static constexpr ValType type = ValType::Field;
        using inner_type = T;
    };

    template <typename... Fields>
    struct record_t
    {
        std::array<field_t<Fields>...> fields;
    };
    template <typename... Fields>
    struct ValTrait<record_t<Fields...>>
    {
        static constexpr ValType type = ValType::Record;
    };

    template <typename... Ts>
    using tuple_t = std::tuple<Ts...>;
    template <typename... Ts>
    struct ValTrait<tuple_t<Ts...>>
    {
        static constexpr ValType type = ValType::Tuple;
    };

    template <typename T>
    struct case_t
    {
        std::string label;
        std::optional<T> v;
    };
    template <typename T>
    struct ValTrait<case_t<T>>
    {
        static constexpr ValType type = ValType::Case;
        using inner_type = T;
    };

    template <typename... Ts>
    using variant_t = std::variant<Ts...>;
    template <typename... Ts>
    struct ValTrait<variant_t<Ts...>>
    {
        static constexpr ValType type = ValType::Variant;
    };

    using enum_t = std::vector<std::string>;
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

    //  --------------------------------------------------------------------
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

    using offset = uint32_t;
    using bytes = uint32_t;
}

#endif
