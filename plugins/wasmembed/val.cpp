#include "val.hpp"

Val despecialize(const Val &t)
{
    switch (t.kind())
    {
    case valkind_t::Tuple:
        break;
    case valkind_t::Enum:
        break;
    case valkind_t::Option:
        break;
    case valkind_t::Result:
        break;
    }
    return t;
}

Val::Val() : val{}
{
    val.kind = valkind_t::U32;
    val.of.u32 = 0;
}
Val::Val(val_t val) : val(val) {}

Val::Val(bool b) : val{}
{
    val.kind = valkind_t::Bool;
    val.of.b = b;
}

Val::Val(int8_t i8) : val{}
{
    val.kind = valkind_t::S8;
    val.of.i8 = i8;
}

Val::Val(uint8_t u8) : val{}
{
    val.kind = valkind_t::U8;
    val.of.u8 = u8;
}

Val::Val(int16_t i16) : val{}
{
    val.kind = valkind_t::S16;
    val.of.i16 = i16;
}

Val::Val(uint16_t u16) : val{}
{
    val.kind = valkind_t::U16;
    val.of.u16 = u16;
}

Val::Val(int32_t i32) : val{}
{
    val.kind = valkind_t::S32;
    val.of.i32 = i32;
}

Val::Val(int64_t i64) : val{}
{
    val.kind = valkind_t::S64;
    val.of.i64 = i64;
}

Val::Val(float32_t f32) : val{}
{
    val.kind = valkind_t::Float32;
    val.of.f32 = f32;
}

Val::Val(float64_t f64) : val{}
{
    val.kind = valkind_t::Float64;
    val.of.f64 = f64;
}

Val::Val(char c) : val{}
{
    val.kind = valkind_t::Char;
    val.of.c = c;
}

Val::Val(const char *s, size_t len) : val{}
{
    val.kind = valkind_t::String;
    val.of.s.ptr = s;
    val.of.s.len = len;
}

Val::Val(FuncTypePtr func) : val{}
{
    val.kind = valkind_t::Borrow;
    val.of.func = func.get();
    val_func = func;
}

Val::Val(const Val &other) : val{}
{
    val = other.val;
    val_func = other.val_func;
}

Val::Val(Val &&other) noexcept : val{}
{
    val.kind = valkind_t::U32;
    val.of.u32 = 0;
    std::swap(val, other.val);
}

Val::~Val()
{
    // if (val.kind == WASMTIME_EXTERNREF && val.of.externref != nullptr)
    // {
    //      TODO:  wasmtime_externref_delete(val.of.externref);
    // }
}

/// Copies the contents of another value into this one.
Val &Val::operator=(const Val &other) noexcept
{
    // if (val.kind == WASMTIME_EXTERNREF && val.of.externref != nullptr)
    // {
    //     // TODO:  wasmtime_externref_delete(val.of.externref);
    // }
    // // TODO: val_copy(&val, &other.val);
    return *this;
}
Val &Val::operator=(Val &&other) noexcept
{
    std::swap(val, other.val);
    return *this;
}

valkind_t Val::kind() const
{
    return val.kind;
}

bool Val::b() const
{
    if (val.kind != valkind_t::Bool)
        std::abort();
    return val.of.b;
}

int8_t Val::i8() const
{
    if (val.kind != valkind_t::S8)
        std::abort();
    return val.of.i8;
}

uint8_t Val::u8() const
{
    if (val.kind != valkind_t::U8)
        std::abort();
    return val.of.u8;
}

int16_t Val::i16() const
{
    if (val.kind != valkind_t::S16)
        std::abort();
    return val.of.i16;
}

uint16_t Val::u16() const
{
    if (val.kind != valkind_t::U16)
        std::abort();
    return val.of.u16;
}

int32_t Val::i32() const
{
    if (val.kind != valkind_t::S32)
        std::abort();
    return val.of.i32;
}

uint32_t Val::u32() const
{
    if (val.kind != valkind_t::U32)
        std::abort();
    return val.of.u32;
}

int64_t Val::i64() const
{
    if (val.kind != valkind_t::S64)
        std::abort();
    return val.of.i64;
}

uint64_t Val::u64() const
{
    if (val.kind != valkind_t::U64)
        std::abort();
    return val.of.u64;
}

float32_t Val::f32() const
{
    if (val.kind != valkind_t::Float32)
        std::abort();
    return val.of.f32;
}

float64_t Val::f64() const
{
    if (val.kind != valkind_t::Float64)
        std::abort();
    return val.of.f64;
}

char Val::c() const
{
    if (val.kind != valkind_t::Char)
        std::abort();
    return val.of.c;
}

string_t Val::s() const
{
    if (val.kind != valkind_t::String)
        std::abort();
    return val.of.s;
}

FuncType *Val::func() const
{
    if (val.kind != valkind_t::Borrow)
        std::abort();
    return val.of.func;
}

void Val::store(CallContextPtr cx) const
{
    Val v = despecialize(*this);
}

class ListImpl : public List
{
    valkind_t _kind;
    std::vector<Val> _list;

public:
    ListImpl(valkind_t kind) : _kind(kind) {}
    valkind_t kind() const
    {
        return _kind;
    }
    void append(const Val &val)
    {
        _list.push_back(val);
    }
};
ListPtr createList(const valkind_t &kind)
{
    return std::make_shared<ListImpl>(kind);
}

class

    class FuncTypeImpl : public FuncType
{
protected:
    std::vector<Val> _params;
    std::vector<Val> _results;
    // const std::function<void(std::vector<std>)> _postReturn;

public:
    FuncTypeImpl()
    {
    }
    void appendParam(const Val &kind)
    {
        _params.push_back(kind);
    }
    void call(CallContextPtr cx)
    {
    }
    void appendResult(const Val &kind)
    {
        _results.push_back(kind);
    }
};

FuncTypePtr createFuncType()
{
    return std::make_shared<FuncTypeImpl>();
}
