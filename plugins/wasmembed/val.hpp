#include <cstring>
#include <optional> // Include the necessary header file
#if __has_include(<span>)
#include <span>
#else
#include <string>
#include <sstream>
#endif

#include <string>
#include <functional>
#include <memory>

#include "cmcpp.hpp"

using float32_t = float;
using float64_t = double;

enum class valkind_t : uint8_t
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
    Float32,
    Float64,
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

typedef struct string_
{
    const char *ptr;
    size_t len;
} string_t;

typedef struct func
{
    uint64_t store_id;
    size_t index;
} func_t;

class List;
using ListPtr = std::shared_ptr<List>;
class Field;
using FieldPtr = std::shared_ptr<Field>;
class Record;
using RecordPtr = std::shared_ptr<Record>;
class Tuple;
using TuplePtr = std::shared_ptr<Tuple>;
class Case;
using CasePtr = std::shared_ptr<Case>;
class Variant;
using VariantPtr = std::shared_ptr<Variant>;
class Enum;
using EnumPtr = std::shared_ptr<Enum>;
class Option;
using OptionPtr = std::shared_ptr<Option>;
class Result;
using ResultPtr = std::shared_ptr<Result>;
class Flags;
using FlagsPtr = std::shared_ptr<Flags>;
class Own;
using OwnPtr = std::shared_ptr<Own>;
class Borrow;
using BorrowPtr = std::shared_ptr<Borrow>;

class FuncType;
using FuncTypePtr = std::shared_ptr<FuncType>;

typedef union valunion
{
    bool b;
    int8_t i8;
    uint8_t u8;
    int16_t i16;
    uint16_t u16;
    int32_t i32;
    uint32_t u32;
    int64_t i64;
    uint64_t u64;
    float32_t f32;
    float64_t f64;
    char c;
    string_t s;
    List *l;
    Field *f;
    Record *r;
    Tuple *t;
    Case *cs;
    Variant *v;
    Enum *e;
    Option *o;
    Result *re;
    Flags *fl;
    Own *ow;
    Borrow *bo;

    FuncType *func;
} valunion_t;

typedef struct val
{
    valkind_t kind;
    valunion_t of;
} val_t;

class Val
{
    val_t val;
    FuncTypePtr val_func;

    Val();
    Val(val_t val);

public:
    Val(bool b);
    Val(int8_t i8);
    Val(uint8_t u8);
    Val(int16_t i16);
    Val(uint16_t u16);
    Val(int32_t i32);
    Val(int64_t i64);
    Val(float32_t f32);
    Val(float64_t f64);
    Val(char c);
    Val(const char *s, size_t len);
    Val(FuncTypePtr func);
    Val(const Val &other);
    Val(Val &&other) noexcept;
    ~Val();

    Val &operator=(const Val &other) noexcept;
    Val &operator=(Val &&other) noexcept;

    valkind_t kind() const;
    bool b() const;
    int8_t i8() const;
    uint8_t u8() const;
    int16_t i16() const;
    uint16_t u16() const;
    int32_t i32() const;
    uint32_t u32() const;
    int64_t i64() const;
    uint64_t u64() const;
    float32_t f32() const;
    float64_t f64() const;
    char c() const;
    string_t s() const;
    FuncType *func() const;

    void store(CallContextPtr cx) const;
};

class List
{
public:
    virtual ~List() = default;

    virtual valkind_t kind() const = 0;
    virtual void append(const Val &v) = 0;
};
ListPtr createList(const valkind_t &kind);

class FuncType
{
public:
    virtual ~FuncType() = default;

    virtual void appendParam(const Val &v) = 0;
    virtual void call(CallContextPtr cx) = 0;
};
FuncTypePtr createFuncType();
