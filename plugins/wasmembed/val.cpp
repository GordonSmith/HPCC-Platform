#include "val.hpp"

#include <cassert>
#include <cmath>
#include <random>
#include <map>

Val::Val() : val{}
{
    val.kind = ValType::U32;
    val.of.u32 = 0;
}
Val::Val(val_t val) : val(val) {}

Val::Val(bool b) : val{}
{
    val.kind = ValType::Bool;
    val.of.b = b;
}

Val::Val(int8_t s8) : val{}
{
    val.kind = ValType::S8;
    val.of.s8 = s8;
}

Val::Val(uint8_t u8) : val{}
{
    val.kind = ValType::U8;
    val.of.u8 = u8;
}

Val::Val(int16_t s16) : val{}
{
    val.kind = ValType::S16;
    val.of.s16 = s16;
}

Val::Val(uint16_t u16) : val{}
{
    val.kind = ValType::U16;
    val.of.u16 = u16;
}

Val::Val(int32_t s32) : val{}
{
    val.kind = ValType::S32;
    val.of.s32 = s32;
}

Val::Val(int64_t s64) : val{}
{
    val.kind = ValType::S64;
    val.of.s64 = s64;
}

Val::Val(uint64_t u64) : val{}
{
    val.kind = ValType::U64;
    val.of.u64 = u64;
}

Val::Val(float32_t f32) : val{}
{
    val.kind = ValType::Float32;
    val.of.f32 = f32;
}

Val::Val(float64_t f64) : val{}
{
    val.kind = ValType::Float64;
    val.of.f64 = f64;
}

Val::Val(char c) : val{}
{
    val.kind = ValType::Char;
    val.of.c = c;
}

Val::Val(const char *s) : val{}
{
    val.kind = ValType::String;
    val.of.s.ptr = s;
    val.of.s.len = strlen(s);
}

Val::Val(const char *s, size_t len) : val{}
{
    val.kind = ValType::String;
    val.of.s.ptr = s;
    val.of.s.len = len;
}

Val::Val(FuncTypePtr func) : val{}
{
    val.kind = ValType::Borrow;
    val.of.func = func.get();
    shared_ptr = func;
}

Val::Val(ListPtr list) : val{}
{
    val.kind = ValType::List;
    val.of.list = list.get();
    shared_ptr = list;
}

Val::Val(FieldPtr field) : val{}
{
    val.kind = ValType::Field;
    val.of.field = field.get();
    shared_ptr = field;
}

Val::Val(RecordPtr record) : val{}
{
    val.kind = ValType::Record;
    val.of.record = record.get();
    shared_ptr = record;
}

Val::Val(TuplePtr tuple) : val{}
{
    val.kind = ValType::Tuple;
    val.of.tuple = tuple.get();
    shared_ptr = tuple;
}

Val::Val(CasePtr case_) : val{}
{
    val.kind = ValType::Case;
    val.of.case_ = case_.get();
    shared_ptr = case_;
}

Val::Val(VariantPtr variant) : val{}
{
    val.kind = ValType::Variant;
    val.of.variant = variant.get();
    shared_ptr = variant;
}

Val::Val(EnumPtr enum_) : val{}
{
    val.kind = ValType::Enum;
    val.of.enum_ = enum_.get();
    shared_ptr = enum_;
}

Val::Val(OptionPtr option) : val{}
{
    val.kind = ValType::Option;
    val.of.option = option.get();
    shared_ptr = option;
}

Val::Val(ResultPtr result) : val{}
{
    val.kind = ValType::Result;
    val.of.result = result.get();
    shared_ptr = result;
}

Val::Val(FlagsPtr flags) : val{}
{
    val.kind = ValType::Flags;
    val.of.flags = flags.get();
    shared_ptr = flags;
}

Val::Val(OwnPtr own) : val{}
{
    val.kind = ValType::Own;
    val.of.own = own.get();
    shared_ptr = own;
}

Val::Val(BorrowPtr borrow) : val{}
{
    val.kind = ValType::Borrow;
    val.of.borrow = borrow.get();
    shared_ptr = borrow;
}

Val::Val(const Val &other) : val{}
{
    val = other.val;
    shared_ptr = other.shared_ptr;
}

Val::Val(Val &&other) noexcept : val{}
{
    val.kind = ValType::U32;
    val.of.u32 = 0;
    std::swap(val, other.val);
    std::swap(shared_ptr, other.shared_ptr);
}

Val::~Val()
{
}

Val &Val::operator=(const Val &other) noexcept
{
    val = other.val;
    shared_ptr = other.shared_ptr;
    return *this;
}
Val &Val::operator=(Val &&other) noexcept
{
    std::swap(val, other.val);
    std::swap(shared_ptr, other.shared_ptr);
    return *this;
}

ValType Val::kind() const
{
    return val.kind;
}

bool Val::b() const
{
    if (val.kind != ValType::Bool)
        std::abort();
    return val.of.b;
}

int8_t Val::s8() const
{
    if (val.kind != ValType::S8)
        std::abort();
    return val.of.s8;
}

uint8_t Val::u8() const
{
    if (val.kind != ValType::U8)
        std::abort();
    return val.of.u8;
}

int16_t Val::s16() const
{
    if (val.kind != ValType::S16)
        std::abort();
    return val.of.s16;
}

uint16_t Val::u16() const
{
    if (val.kind != ValType::U16)
        std::abort();
    return val.of.u16;
}

int32_t Val::s32() const
{
    if (val.kind != ValType::S32)
        std::abort();
    return val.of.s32;
}

uint32_t Val::u32() const
{
    if (val.kind != ValType::U32)
        std::abort();
    return val.of.u32;
}

int64_t Val::s64() const
{
    if (val.kind != ValType::S64)
        std::abort();
    return val.of.s64;
}

uint64_t Val::u64() const
{
    if (val.kind != ValType::U64)
        std::abort();
    return val.of.u64;
}

float32_t Val::f32() const
{
    if (val.kind != ValType::Float32)
        std::abort();
    return val.of.f32;
}

float64_t Val::f64() const
{
    if (val.kind != ValType::Float64)
        std::abort();
    return val.of.f64;
}

char Val::c() const
{
    if (val.kind != ValType::Char)
        std::abort();
    return val.of.c;
}

string_t Val::s() const
{
    if (val.kind != ValType::String)
        std::abort();
    return val.of.s;
}

FuncType *Val::func() const
{
    if (val.kind != ValType::Borrow)
        std::abort();
    return val.of.func;
}

List *Val::list() const
{
    if (val.kind != ValType::List)
        std::abort();
    return val.of.list;
}

Field *Val::field() const
{
    if (val.kind != ValType::Field)
        std::abort();
    return val.of.field;
}

Record *Val::record() const
{
    if (val.kind != ValType::Record)
        std::abort();
    return val.of.record;
}

Tuple *Val::tuple() const
{
    if (val.kind != ValType::Tuple)
        std::abort();
    return val.of.tuple;
}

Case *Val::case_() const
{
    if (val.kind != ValType::Case)
        std::abort();
    return val.of.case_;
}

Variant *Val::variant() const
{
    if (val.kind != ValType::Variant)
        std::abort();
    return val.of.variant;
}

Enum *Val::enum_() const
{
    if (val.kind != ValType::Enum)
        std::abort();
    return val.of.enum_;
}

Option *Val::option() const
{
    if (val.kind != ValType::Option)
        std::abort();
    return val.of.option;
}

Result *Val::result() const
{
    if (val.kind != ValType::Result)
        std::abort();
    return val.of.result;
}

Flags *Val::flags() const
{
    if (val.kind != ValType::Flags)
        std::abort();
    return val.of.flags;
}

Own *Val::own() const
{
    if (val.kind != ValType::Own)
        std::abort();
    return val.of.own;
}

Borrow *Val::borrow() const
{
    if (val.kind != ValType::Borrow)
        std::abort();
    return val.of.borrow;
}

WasmVal::WasmVal() : val{} {}

WasmVal::WasmVal(val_t val) : val(val) {}

WasmVal::WasmVal(uint32_t i32) : val{}
{
    val.kind = ValType::U32;
    val.of.u32 = i32;
}

WasmVal::WasmVal(uint64_t i64) : val{}
{
    val.kind = ValType::U64;
    val.of.u64 = i64;
}

WasmVal::WasmVal(float32_t f32) : val{}
{
    val.kind = ValType::Float32;
    val.of.f32 = f32;
}

WasmVal::WasmVal(float64_t f64) : val{}
{
    val.kind = ValType::Float64;
    val.of.f64 = f64;
}

WasmVal::WasmVal(const WasmVal &other) : val{}
{
    val = other.val;
}

WasmVal::WasmVal(WasmVal &&other) noexcept : val{}
{
    val.kind = ValType::U32;
    val.of.u32 = 0;
    std::swap(val, other.val);
}

WasmVal::~WasmVal()
{
    // if (val.kind == WASMTIME_EXTERNREF && val.of.externref != nullptr)
    // {
    //      TODO:  wasmtime_externref_delete(val.of.externref);
    // }
}

/// Copies the contents of another value into this one.
WasmVal &WasmVal::operator=(const WasmVal &other) noexcept
{
    // if (val.kind == WASMTIME_EXTERNREF && val.of.externref != nullptr)
    // {
    //     // TODO:  wasmtime_externref_delete(val.of.externref);
    // }
    // // TODO: val_copy(&val, &other.val);
    val = other.val;
    return *this;
}

WasmVal &WasmVal::operator=(WasmVal &&other) noexcept
{
    std::swap(val, other.val);
    return *this;
}

WasmValType WasmVal::kind() const
{
    switch (val.kind)
    {
    case ValType::U32:
        return WasmValType::I32;
    case ValType::U64:
        return WasmValType::I64;
    case ValType::Float32:
        return WasmValType::F32;
    case ValType::Float64:
        return WasmValType::F64;
    default:
        return WasmValType::I32;
    }
}

uint32_t WasmVal::i32() const
{
    if (val.kind != ValType::U32)
        std::abort();
    return val.of.u32;
}

uint64_t WasmVal::i64() const
{
    if (val.kind != ValType::U64)
        std::abort();
    return val.of.u64;
}

float32_t WasmVal::f32() const
{
    if (val.kind != ValType::Float32)
        std::abort();
    return val.of.f32;
}

float64_t WasmVal::f64() const
{
    if (val.kind != ValType::Float64)
        std::abort();
    return val.of.f64;
}

using Param = std::pair<std::string, ValType>;
class FuncTypeImpl : public FuncType
{
protected:
    std::vector<Param> params;
    std::vector<ValType> results;

public:
    FuncTypeImpl()
    {
    }
    std::vector<ValType> param_types()
    {
        std::vector<ValType> retVal;
        if (!params.empty())
        {
            for (const auto &pair : params)
            {
                retVal.push_back(pair.second);
            }
        }
        return retVal;
    }

    std::vector<ValType> result_types()
    {
        return results;
    }
};

FuncTypePtr createFuncType()
{
    return std::make_shared<FuncTypeImpl>();
}

List::List(const ValType &t) : t(t) {}

Field::Field(const std::string &label, const Val &v) : label(label), v(v) {}

Record::Record() {}

Tuple::Tuple() {}

Case::Case(const std::string &label, const std::optional<Val> &v, const std::optional<std::string> &refines) : label(label), v(v), refines(refines) {}

Variant::Variant(const std::vector<Case> &cases) : cases(cases) {}

Enum::Enum(const std::vector<std::string> &labels) : labels(labels) {}

Option::Option(const Val &v) : v(v) {}

Result::Result(const std::optional<Val> &ok, const std::optional<Val> &error) : ok(ok), error(error) {}

Flags::Flags(const std::vector<std::string> &labels) : labels(labels) {}

CoreFuncType::CoreFuncType(const std::vector<std::string> &params, const std::vector<std::string> &results) : params(params), results(results) {}

//  ABI       ----------------------------------------------------------------

Val despecialize(const Val &v)
{
    switch (v.kind())
    {
    case ValType::Tuple:
    {
        RecordPtr r = std::make_shared<Record>();
        for (const auto &t : v.tuple()->ts)
        {
            r->fields.push_back(Field("", despecialize(t)));
        }
        return r;
    }
    case ValType::Enum:
    {
        std::vector<Case> cases;
        for (const auto &label : v.enum_()->labels)
        {
            cases.push_back(Case(label));
        }
        VariantPtr v = std::make_shared<Variant>(cases);
        return v;
    }
    case ValType::Option:
        return std::make_shared<Variant>(std::vector<Case>{Case("None"), Case("Some", v.option()->v)});
    case ValType::Result:
        return std::make_shared<Variant>(std::vector<Case>{Case("Ok", v.result()->ok), Case("Error", v.result()->error)});
    }
    return v;
}

ValType discriminant_type(const std::vector<Case> &cases)
{
    size_t n = cases.size();

    assert(0 < n && n < std::numeric_limits<unsigned int>::max());
    int match = std::ceil(std::log2(n) / 8);
    switch (match)
    {
    case 0:
        return ValType::U8;
    case 1:
        return ValType::U8;
    case 2:
        return ValType::U16;
    case 3:
        return ValType::U32;
    default:
        throw std::runtime_error("Invalid match value");
    }
}

int alignment_record(const std::vector<Field> &fields);
int alignment_variant(const std::vector<Case> &cases);

int alignment_flags(const std::vector<std::string> &labels)
{
    int n = labels.size();
    if (n <= 8)
        return 1;
    if (n <= 16)
        return 2;
    return 4;
}

int alignment(ValType t)
{
    switch (t)
    {
    case ValType::Bool:
    case ValType::S8:
    case ValType::U8:
        return 1;
    case ValType::S16:
    case ValType::U16:
        return 2;
    case ValType::S32:
    case ValType::U32:
    case ValType::Float32:
    case ValType::Char:
        return 4;
    case ValType::S64:
    case ValType::U64:
    case ValType::Float64:
        return 8;
    case ValType::String:
    case ValType::List:
        return 4;
    case ValType::Own:
    case ValType::Borrow:
        return 4;
    }
    throw std::runtime_error("Invalid type");
}

int alignment(Val _v)
{
    Val v = despecialize(_v);
    switch (v.kind())
    {
    case ValType::Record:
        return alignment_record(_v.record()->fields);
    case ValType::Variant:
        return alignment_variant(_v.variant()->cases);
    case ValType::Flags:
        return alignment_flags(_v.flags()->labels);
    default:
        return alignment(v);
    }
}

int alignment_record(const std::vector<Field> &fields)
{
    int a = 1;
    for (const auto &f : fields)
    {
        a = std::max(a, alignment(f.v));
    }
    return a;
}

int max_case_alignment(const std::vector<Case> &cases)
{
    int a = 1;
    for (const auto &c : cases)
    {
        if (c.v.has_value()) // Check if c.t exists
        {
            a = std::max(a, alignment(c.v.value()));
        }
    }
    return a;
}

int alignment_variant(const std::vector<Case> &cases)
{
    return std::max(alignment(discriminant_type(cases)), max_case_alignment(cases));
}

uint32_t align_to(uint32_t ptr, uint32_t alignment);

int size_record(const std::vector<Field> &fields);
int size_variant(const std::vector<Case> &cases);
int size_flags(const std::vector<std::string> &labels);

int size(ValType t)
{
    switch (t)
    {
    case ValType::Bool:
    case ValType::S8:
    case ValType::U8:
        return 1;
    case ValType::S16:
    case ValType::U16:
        return 2;
    case ValType::S32:
    case ValType::U32:
    case ValType::Float32:
    case ValType::Char:
        return 4;
    case ValType::S64:
    case ValType::U64:
    case ValType::Float64:
        return 8;
    case ValType::String:
    case ValType::List:
        return 8;
    case ValType::Own:
    case ValType::Borrow:
        return 4;
    }
    throw std::runtime_error("Invalid type");
}

int size(const Val &v)
{
    ValType kind = despecialize(v).kind();
    switch (kind)
    {
    case ValType::Record:
        return size_record(v.record()->fields);
    case ValType::Variant:
        return size_variant(v.variant()->cases);
    case ValType::Flags:
        return size_flags(v.flags()->labels);
    default:
        return size(kind);
    }
    throw std::runtime_error("Invalid type");
}

int size_record(const std::vector<Field> &fields)
{
    int s = 0;
    for (const auto &f : fields)
    {
        s = align_to(s, alignment(f.v));
        s += size(f.v);
    }
    assert(s > 0);
    return align_to(s, alignment_record(fields));
}

uint32_t align_to(uint32_t ptr, uint32_t alignment)
{
    return (ptr + alignment - 1) & ~(alignment - 1);
}

int size_variant(const std::vector<Case> &cases)
{
    int s = size(discriminant_type(cases));
    s = align_to(s, max_case_alignment(cases));
    int cs = 0;
    for (const auto &c : cases)
    {
        if (c.v.has_value())
        {
            cs = std::max(cs, size(c.v.value()));
        }
    }
    s += cs;
    return align_to(s, alignment_variant(cases));
}

int num_i32_flags(const std::vector<std::string> &labels);

int size_flags(const std::vector<std::string> &labels)
{
    int n = labels.size();
    assert(n > 0);
    if (n <= 8)
        return 1;
    if (n <= 16)
        return 2;
    return 4 * num_i32_flags(labels);
}

int num_i32_flags(const std::vector<std::string> &labels)
{
    return std::ceil(static_cast<double>(labels.size()) / 32);
}

bool isAligned(uint32_t ptr, uint32_t alignment)
{
    return (ptr & (alignment - 1)) == 0;
}

//  Storing ----------------------------------------------------------------

auto UTF16_TAG = 1U << 31;

uint32_t char_to_i32(char c)
{
    uint32_t i = static_cast<uint32_t>(c);
    assert((0 <= i && i <= 0xD7FF) || (0xD800 <= i && i <= 0x10FFFF));
    return i;
}

std::tuple<uint32_t, uint32_t> store_string_copy(const CallContext &cx, const char *_src, uint32_t src_code_units, uint32_t dst_code_unit_size, uint32_t dst_alignment, const std::string &dst_encoding)
{
    std::string src(_src, src_code_units);
    const uint32_t MAX_STRING_BYTE_LENGTH = (1U << 31) - 1;
    uint32_t dst_byte_length = dst_code_unit_size * src_code_units;
    assert(dst_byte_length <= MAX_STRING_BYTE_LENGTH);
    uint32_t ptr = cx.opts->realloc(0, 0, dst_alignment, dst_byte_length);
    assert(ptr == align_to(ptr, dst_alignment));
    assert(ptr + dst_byte_length <= cx.opts->memory.size());
    // TODO:    std::string encoded = encode(src, dst_encoding);
    // TODO:    assert(dst_byte_length == encoded.size());
    std::string encoded = src;
    // assert(dst_byte_length == encoded.size());
    std::memcpy(&cx.opts->memory[ptr], encoded.data(), encoded.size());
    return std::make_tuple(ptr, src_code_units);
}

auto MAX_STRING_BYTE_LENGTH = (1U << 31) - 1;

std::tuple<uint32_t, uint32_t> store_string_to_utf8(const CallContext &cx, const char *src, uint32_t src_code_units, uint32_t worst_case_size)
{
    assert(src_code_units <= MAX_STRING_BYTE_LENGTH);
    uint32_t ptr = cx.opts->realloc(0, 0, 1, src_code_units);
    assert(ptr + src_code_units <= cx.opts->memory.size());
    //  TODO:  std::string encoded = encode(src, "utf-8");
    std::string encoded = std::string(src, src_code_units);
    assert(src_code_units <= encoded.size());
    std::memcpy(&cx.opts->memory[ptr], encoded.data(), src_code_units);
    if (src_code_units < encoded.size())
    {
        assert(worst_case_size <= MAX_STRING_BYTE_LENGTH);
        ptr = cx.opts->realloc(ptr, src_code_units, 1, worst_case_size);
        assert(ptr + worst_case_size <= cx.opts->memory.size());
        std::memcpy(&cx.opts->memory[ptr + src_code_units], &encoded[src_code_units], encoded.size() - src_code_units);
        if (worst_case_size > encoded.size())
        {
            ptr = cx.opts->realloc(ptr, worst_case_size, 1, encoded.size());
            assert(ptr + encoded.size() <= cx.opts->memory.size());
        }
    }
    return std::make_tuple(ptr, encoded.size());
}

std::tuple<uint32_t, uint32_t> store_utf16_to_utf8(const CallContext &cx, const char *src, uint32_t src_code_units)
{
    uint32_t worst_case_size = src_code_units * 3;
    return store_string_to_utf8(cx, src, src_code_units, worst_case_size);
}

std::tuple<uint32_t, uint32_t> store_latin1_to_utf8(const CallContext &cx, const char *src, uint32_t src_code_units)
{
    uint32_t worst_case_size = src_code_units * 2;
    return store_string_to_utf8(cx, src, src_code_units, worst_case_size);
}

std::tuple<uint32_t, uint32_t> store_utf8_to_utf16(const CallContext &cx, const char *src, uint32_t src_code_units)
{
    uint32_t worst_case_size = 2 * src_code_units;
    if (worst_case_size > MAX_STRING_BYTE_LENGTH)
        throw std::runtime_error("Worst case size exceeds maximum string byte length");
    uint32_t ptr = cx.opts->realloc(0, 0, 2, worst_case_size);
    if (ptr != align_to(ptr, 2))
        throw std::runtime_error("Pointer misaligned");
    if (ptr + worst_case_size > cx.opts->memory.size())
        throw std::runtime_error("Out of bounds access");
    //  TODO:  std::string encoded = encode(src, "utf-16-le");
    std::string encoded = std::string(src, src_code_units);
    std::memcpy(&cx.opts->memory[ptr], encoded.data(), encoded.size());
    if (encoded.size() < worst_case_size)
    {
        ptr = cx.opts->realloc(ptr, worst_case_size, 2, encoded.size());
        if (ptr != align_to(ptr, 2))
            throw std::runtime_error("Pointer misaligned");
        if (ptr + encoded.size() > cx.opts->memory.size())
            throw std::runtime_error("Out of bounds access");
    }
    uint32_t code_units = static_cast<uint32_t>(encoded.size() / 2);
    return std::make_tuple(ptr, code_units);
}

std::tuple<uint32_t, uint32_t> store_string_to_latin1_or_utf16(const CallContext &cx, const char *src, uint32_t src_code_units)
{
    assert(src_code_units <= MAX_STRING_BYTE_LENGTH);
    uint32_t ptr = cx.opts->realloc(0, 0, 2, src_code_units);
    if (ptr != align_to(ptr, 2))
        throw std::runtime_error("Pointer misaligned");
    if (ptr + src_code_units > cx.opts->memory.size())
        throw std::runtime_error("Out of bounds access");
    uint32_t dst_byte_length = 0;
    for (size_t i = 0; i < src_code_units; ++i)
    {
        char usv = *reinterpret_cast<const char *>(src);
        if (static_cast<uint32_t>(usv) < (1 << 8))
        {
            cx.opts->memory[ptr + dst_byte_length] = static_cast<uint32_t>(usv);
            dst_byte_length += 1;
        }
        else
        {
            uint32_t worst_case_size = 2 * src_code_units;
            if (worst_case_size > MAX_STRING_BYTE_LENGTH)
                throw std::runtime_error("Worst case size exceeds maximum string byte length");
            ptr = cx.opts->realloc(ptr, src_code_units, 2, worst_case_size);
            if (ptr != align_to(ptr, 2))
                throw std::runtime_error("Pointer misaligned");
            if (ptr + worst_case_size > cx.opts->memory.size())
                throw std::runtime_error("Out of bounds access");
            for (int j = dst_byte_length - 1; j >= 0; --j)
            {
                cx.opts->memory[ptr + 2 * j] = cx.opts->memory[ptr + j];
                cx.opts->memory[ptr + 2 * j + 1] = 0;
            }
            // TODO: Implement encoding to 'utf-16-le'
            std::string encoded = std::string(src, src_code_units);
            std::memcpy(&cx.opts->memory[ptr + 2 * dst_byte_length], encoded.data(), encoded.size());
            if (worst_case_size > encoded.size())
            {
                ptr = cx.opts->realloc(ptr, worst_case_size, 2, encoded.size());
                if (ptr != align_to(ptr, 2))
                    throw std::runtime_error("Pointer misaligned");
                if (ptr + encoded.size() > cx.opts->memory.size())
                    throw std::runtime_error("Out of bounds access");
            }
            uint32_t tagged_code_units = static_cast<uint32_t>(encoded.size() / 2) | UTF16_TAG;
            return std::make_tuple(ptr, tagged_code_units);
        }
    }
    if (dst_byte_length < src_code_units)
    {
        ptr = cx.opts->realloc(ptr, src_code_units, 2, dst_byte_length);
        if (ptr != align_to(ptr, 2))
            throw std::runtime_error("Pointer misaligned");
        if (ptr + dst_byte_length > cx.opts->memory.size())
            throw std::runtime_error("Out of bounds access");
    }
    return std::make_tuple(ptr, dst_byte_length);
}

std::tuple<uint32_t, uint32_t> store_probably_utf16_to_latin1_or_utf16(const CallContext &cx, const char *_src, uint32_t src_code_units)
{
    uint32_t src_byte_length = 2 * src_code_units;
    if (src_byte_length > MAX_STRING_BYTE_LENGTH)
        throw std::runtime_error("src_byte_length exceeds MAX_STRING_BYTE_LENGTH");

    uint32_t ptr = cx.opts->realloc(0, 0, 2, src_byte_length);
    if (ptr != align_to(ptr, 2))
        throw std::runtime_error("ptr is not aligned");

    if (ptr + src_byte_length > cx.opts->memory.size())
        throw std::runtime_error("Not enough memory");

    //  TODO:  std::string encoded = encode_utf16le(src);
    std::string src = std::string(_src, src_code_units);
    std::string encoded = src;
    std::copy(encoded.begin(), encoded.end(), cx.opts->memory.begin() + ptr);

    if (std::any_of(src.begin(), src.end(), [](char c)
                    { return static_cast<unsigned char>(c) >= (1 << 8); }))
    {
        uint32_t tagged_code_units = static_cast<uint32_t>(encoded.size() / 2) | UTF16_TAG;
        return std::make_tuple(ptr, tagged_code_units);
    }

    uint32_t latin1_size = static_cast<uint32_t>(encoded.size() / 2);
    for (uint32_t i = 0; i < latin1_size; ++i)
        cx.opts->memory[ptr + i] = cx.opts->memory[ptr + 2 * i];

    ptr = cx.opts->realloc(ptr, src_byte_length, 1, latin1_size);
    if (ptr + latin1_size > cx.opts->memory.size())
        throw std::runtime_error("Not enough memory");

    return std::make_tuple(ptr, latin1_size);
}

std::tuple<uint32_t, uint32_t> store_string_into_range(const CallContext &cx, const Val &v, HostEncoding src_encoding = HostEncoding::Utf8)
{
    const char *src = v.s().ptr;
    const size_t src_tagged_code_units = v.s().len;
    HostEncoding src_simple_encoding;
    uint32_t src_code_units;

    if (src_encoding == HostEncoding::Latin1_Utf16)
    {
        if (src_tagged_code_units & UTF16_TAG)
        {
            src_simple_encoding = HostEncoding::Utf16;
            src_code_units = src_tagged_code_units ^ UTF16_TAG;
        }
        else
        {
            src_simple_encoding = HostEncoding::Latin1;
            src_code_units = src_tagged_code_units;
        }
    }
    else
    {
        src_simple_encoding = src_encoding;
        src_code_units = src_tagged_code_units;
    }

    if (cx.opts->string_encoding == HostEncoding::Utf8)
    {
        if (src_simple_encoding == HostEncoding::Utf8)
            return store_string_copy(cx, src, src_code_units, 1, 1, "utf-8");
        else if (src_simple_encoding == HostEncoding::Utf16)
            return store_utf16_to_utf8(cx, src, src_code_units);
        else if (src_simple_encoding == HostEncoding::Latin1)
            return store_latin1_to_utf8(cx, src, src_code_units);
    }
    else if (cx.opts->string_encoding == HostEncoding::Utf16)
    {
        if (src_simple_encoding == HostEncoding::Utf8)
            return store_utf8_to_utf16(cx, src, src_code_units);
        else if (src_simple_encoding == HostEncoding::Utf16 || src_simple_encoding == HostEncoding::Latin1)
            return store_string_copy(cx, src, src_code_units, 2, 2, "utf-16-le");
    }
    else if (cx.opts->string_encoding == HostEncoding::Latin1_Utf16)
    {
        if (src_encoding == HostEncoding::Utf8 || src_encoding == HostEncoding::Utf16)
            return store_string_to_latin1_or_utf16(cx, src, src_code_units);
        else if (src_encoding == HostEncoding::Latin1_Utf16)
        {
            if (src_simple_encoding == HostEncoding::Latin1)
                return store_string_copy(cx, src, src_code_units, 1, 2, "latin-1");
            else if (src_simple_encoding == HostEncoding::Utf16)
                return store_probably_utf16_to_latin1_or_utf16(cx, src, src_code_units);
        }
    }

    assert(false);
    return std::make_tuple(0, 0);
}

//  Flatten  ----------------------------------------------------------------

const int MAX_FLAT_PARAMS = 16;
const int MAX_FLAT_RESULTS = 1;

std::vector<std::string> flatten_type(ValType kind);
std::vector<std::string> flatten_types(const std::vector<ValType> &ts);

CoreFuncType flatten_functype(FuncTypePtr ft, std::string context)
{
    std::vector<std::string> flat_params = flatten_types(ft->param_types());
    if (flat_params.size() > MAX_FLAT_PARAMS)
    {
        flat_params = {"i32"};
    }

    std::vector<std::string> flat_results = flatten_types(ft->result_types());
    if (flat_results.size() > MAX_FLAT_RESULTS)
    {
        if (context == "lift")
        {
            flat_results = {"i32"};
        }
        else if (context == "lower")
        {
            flat_params.push_back("i32");
            flat_results = {};
        }
    }

    return CoreFuncType(flat_params, flat_results);
}

std::vector<std::string> flatten_types(const std::vector<ValType> &ts)
{
    std::vector<std::string> result;
    for (const ValType &t : ts)
    {
        std::vector<std::string> flattened = flatten_type(t);
        result.insert(result.end(), flattened.begin(), flattened.end());
    }
    return result;
}

std::vector<std::string> flatten_record(const std::vector<Field> &fields);
std::vector<std::string> flatten_variant(const std::vector<Case> &cases);

std::vector<std::string> flatten_type(ValType kind)
{
    switch (kind)
    {
    case ValType::Bool:
        return {"i32"};
    case ValType::U8:
    case ValType::U16:
    case ValType::U32:
        return {"i32"};
    case ValType::U64:
        return {"i64"};
    case ValType::S8:
    case ValType::S16:
    case ValType::S32:
        return {"i32"};
    case ValType::S64:
        return {"i64"};
    case ValType::Float32:
        return {"f32"};
    case ValType::Float64:
        return {"f64"};
    case ValType::Char:
        return {"i32"};
    case ValType::String:
        return {"i32", "i32"};
    case ValType::List:
        return {"i32", "i32"};
    // case ValType::Record:
    //     return flatten_record(static_cast<const Record &>(t).fields);
    // case ValType::Variant:
    //     return flatten_variant(static_cast<const Variant &>(t).cases);
    // case ValType::Flags:
    //     return std::vector<std::string>(num_i32_flags(static_cast<const Flags &>(t).labels), "i32");
    case ValType::Own:
    case ValType::Borrow:
        return {"i32"};
    }
    throw std::runtime_error("Invalid type");
}

std::vector<std::string> flatten_record(const std::vector<Field> &fields)
{
    std::vector<std::string> flat;
    for (const Field &f : fields)
    {
        auto flattened = flatten_type(f.v.kind());
        flat.insert(flat.end(), flattened.begin(), flattened.end());
    }
    return flat;
}

// std::string join(const std::string &a, const std::string &b);
// std::vector<std::string> flatten_variant(const std::vector<Case> &cases)
// {
//     std::vector<std::string> flat;
//     for (const auto &c : cases)
//     {
//         if (c.t.has_value())
//         {
//             auto flattened = flatten_type(c.t.value());
//             for (size_t i = 0; i < flattened.size(); ++i)
//             {
//                 if (i < flat.size())
//                 {
//                     flat[i] = join(flat[i], flattened[i]);
//                 }
//                 else
//                 {
//                     flat.push_back(flattened[i]);
//                 }
//             }
//         }
//     }
//     auto discriminantFlattened = flatten_type(discriminant_type(cases));
//     flat.insert(flat.begin(), discriminantFlattened.begin(), discriminantFlattened.end());
//     return flat;
// }

std::string join(const std::string &a, const std::string &b)
{
    if (a == b)
        return a;
    if ((a == "i32" && b == "f32") || (a == "f32" && b == "i32"))
        return "i32";
    return "i64";
}

bool DETERMINISTIC_PROFILE = false;
float32_t CANONICAL_FLOAT32_NAN = 0x7fc00000;
float64_t CANONICAL_FLOAT64_NAN = 0x7ff8000000000000;

float canonicalize_nan32(float32_t f)
{
    if (std::isnan(f))
    {
        f = CANONICAL_FLOAT32_NAN;
        assert(std::isnan(f));
    }
    return f;
}

float64_t canonicalize_nan64(float64_t f)
{
    if (std::isnan(f))
    {
        f = CANONICAL_FLOAT64_NAN;
        assert(std::isnan(f));
    }
    return f;
}

float core_f32_reinterpret_i32(int32_t i);
float decode_i32_as_float(int32_t i)
{
    return canonicalize_nan32(core_f32_reinterpret_i32(i));
}

double core_f64_reinterpret_i64(int64_t i);
double decode_i64_as_float(int64_t i)
{
    return canonicalize_nan64(core_f64_reinterpret_i64(i));
}

float32_t core_f32_reinterpret_i32(int32_t i)
{
    float f;
    std::memcpy(&f, &i, sizeof f);
    return f;
}

float64_t core_f64_reinterpret_i64(int64_t i)
{
    double d;
    std::memcpy(&d, &i, sizeof d);
    return d;
}

template <typename T>
T random_nan_bits(int bits, int quiet_bits)
{
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> distrib(1 << quiet_bits, (1 << bits) - 1);
    return distrib(gen);
}

float32_t maybe_scramble_nan32(float32_t f)
{
    if (std::isnan(f))
    {
        if (DETERMINISTIC_PROFILE)
        {
            f = CANONICAL_FLOAT32_NAN;
        }
        else
        {
            f = core_f32_reinterpret_i32(random_nan_bits<int32_t>(32, 8));
        }
        assert(std::isnan(f));
    }
    return f;
}

float64_t maybe_scramble_nan64(float64_t f)
{
    if (std::isnan(f))
    {
        if (DETERMINISTIC_PROFILE)
        {
            f = CANONICAL_FLOAT32_NAN;
        }
        else
        {
            f = core_f64_reinterpret_i64(random_nan_bits<int64_t>(64, 11));
        }
        assert(std::isnan(f));
    }
    return f;
}

std::vector<WasmVal> lower_flat_string(const CallContext &cx, const Val &v)
{
    auto [ptr, packed_length] = store_string_into_range(cx, v);
    return {ptr, packed_length};
}

std::vector<WasmVal> lower_flat(const CallContext &cx, const Val &v)
{
    switch (despecialize(v).kind())
    {
    case ValType::Bool:
        return {WasmVal(static_cast<uint32_t>(v.b()))};
    case ValType::U8:
        return {WasmVal(static_cast<uint32_t>(v.u8()))};
    case ValType::U16:
        return {WasmVal(static_cast<uint32_t>(v.u16()))};
    case ValType::U32:
        return {WasmVal(static_cast<uint32_t>(v.u32()))};
    case ValType::U64:
        return {WasmVal(static_cast<uint64_t>(v.u64()))};
    case ValType::S8:
        return {WasmVal(static_cast<uint32_t>(v.s8()))};
    case ValType::S16:
        return {WasmVal(static_cast<uint32_t>(v.s16()))};
    case ValType::S32:
        return {WasmVal(static_cast<uint32_t>(v.s32()))};
    case ValType::S64:
        return {WasmVal(static_cast<uint64_t>(v.s64()))};
    case ValType::Float32:
        return {WasmVal(static_cast<float32_t>(maybe_scramble_nan32(v.f32())))};
    case ValType::Float64:
        return {WasmVal(static_cast<float64_t>(maybe_scramble_nan64(v.f64())))};
    case ValType::Char:
        return {WasmVal(char_to_i32(v.c()))};
    case ValType::String:
        return lower_flat_string(cx, v);
    }
}

std::vector<WasmVal> lower_values(const CallContext &cx, int max_flat, std::vector<Val> &vs, int *out_param = nullptr)
{
    if (vs.size() > max_flat)
    {
        std::map<std::string, Val> tuple_value;
        for (int i = 0; i < vs.size(); ++i)
        {
            tuple_value.insert(std::make_pair(std::to_string(i), vs[i]));
        }
        uint32_t ptr;
        if (out_param == nullptr)
        {
            ptr = cx.opts->realloc(0, 0, alignment(ValType::Tuple), size(ValType::Tuple));
        }
        else
        {
            //  TODO:  ptr = out_param.next('i32');
            std::abort();
        }
        if (ptr != align_to(ptr, alignment(ValType::Tuple)) || ptr + size(ValType::Tuple) > cx.opts->memory.size())
        {
            throw std::runtime_error("Out of bounds access");
        }
        store(cx, tuple_value, tuple_type, ptr);
        return {WasmVal(ptr)};
    }
    else
    {
        std::vector<WasmVal> flat_vals;
        for (const Val &v : vs)
        {
            std::vector<WasmVal> temp = lower_flat(cx, v);
            flat_vals.insert(flat_vals.end(), temp.begin(), temp.end());
        }
        return flat_vals;
    }
}

//  Storing  ----------------------------------------------------------------
template <typename T>
void store_int(const CallContext &cx, const T &v, uint32_t ptr, uint8_t nbytes, bool isSigned)
{
    for (size_t i = 0; i < nbytes; ++i)
    {
        cx.opts->memory[ptr + i] = static_cast<uint8_t>(v >> (8 * i));
    }
}

// void store(CallContextPtr cx, const Val &hostValue, const std::vector<Val> &guestValues)
// {
//     Val v = despecialize(*this);
//     switch (v.kind())
//     {
//     case ValType::Bool:
//         store_int(cx, v.b(), 0, 1, false);
//         break;
//     }
// }
