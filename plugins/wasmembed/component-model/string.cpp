#include "string.hpp"

#include <cassert>

namespace cmcpp {

auto UTF16_TAG = 1U << 31;

enum class ComponentModelTypeKind
{
    _bool,
    u8,
    u16,
    u32,
    u64,
    s8,
    s16,
    s32,
    s64,
    float32,
    float64,
    _char,
    string,
    list,
    record,
    tuple,
    variant,
    _enum,
    flags,
    option,
    result,
    resource,
    resourceHandle,
    borrow,
    own
};

enum class Alignment
{
    byte = 1,
    halfWord = 2,
    word = 4,
    doubleWord = 8
};

using u8 = uint8_t;
using u16 = uint16_t;
using u32 = uint32_t;
using u64 = uint64_t;
using s8 = int8_t;
using s16 = int16_t;
using s32 = int32_t;
using s64 = int64_t;
using float32 = float;
using float64 = double;
// using char = char;

using ptr = uint32_t;
using size = uint32_t;
using offset = uint32_t;

void trap_if(const LiftLowerContext &cx, bool condition)
{
    if (condition)
    {
        cx.trap("Error");
    }
}

uint32_t align_to(uint32_t ptr, uint32_t alignment)
{
    return (ptr + alignment - 1) & ~(alignment - 1);
}

template <typename T>
T load_int(const LiftLowerContext &cx, ptr ptr, uint8_t nbytes)
{
    assert(nbytes == sizeof(T));
    T retVal = 0;
    for (size_t i = 0; i < sizeof(T); ++i)
    {
        retVal |= static_cast<T>(cx.opts->memory[ptr + i]) << (8 * i);
    }
    return retVal;
}

struct i32
{
};

namespace string
{
    const offset data_offset = 0;
    const offset codeUnits_offset = 4;

    const ComponentModelTypeKind kind = ComponentModelTypeKind::string;
    const cmcpp::size size = 8;
    const Alignment alignment = Alignment::word;
    const std::initializer_list<i32> flatTypes = {i32(), i32()};

    std::tuple<Encoding /*encoding*/, offset, cmcpp::size> loadFromRange(const LiftLowerContext &cx, ptr ptr, cmcpp::size tagged_code_units)
    {
        uint32_t alignment;
        uint32_t byte_length;
        Encoding encoding;
        switch (cx.opts->encoding)
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
        trap_if(cx, ptr + byte_length > cx.opts->memory.size());
        return std::make_tuple(encoding, ptr, byte_length);
    }

    std::tuple<Encoding /*encoding*/, offset, cmcpp::size> load(const LiftLowerContext &cx, offset offset)
    {
        ptr begin = load_int<ptr>(cx, offset + data_offset, 4);
        cmcpp::size tagged_code_units = load_int<cmcpp::size>(cx, offset + codeUnits_offset, 4);
         return loadFromRange(cx, begin, tagged_code_units);
    }
};

}
