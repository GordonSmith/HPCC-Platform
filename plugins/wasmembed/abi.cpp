/*
  See:  https://github.com/WebAssembly/component-model/blob/main/design/mvp/CanonicalABI.md
        https://github.com/WebAssembly/component-model/blob/main/design/mvp/canonical-abi/definitions.py
*/

#include "abi.hpp"

#include "jexcept.hpp"

// FILEPATH: /home/gordon/HPCC-Platform/plugins/wasmembed/abi.hpp

#include <string>
#include <optional>
#include <vector>
#include <tuple>

class Trap : public std::exception
{
};
class CoreWebAssemblyException : public std::exception
{
};

void trap()
{
    throw Trap();
}

void trap_if(bool cond)
{
    if (cond)
    {
        throw Trap();
    }
}

class Type
{
public:
};

class ValType : public Type
{
public:
};

class ExternType : public Type
{
public:
};

class CoreExternType : public Type
{
public:
};

class CoreImportDecl
{
public:
    std::string module;
    std::string field;
    CoreExternType t;

    CoreImportDecl(std::string module, std::string field, CoreExternType t) : module(module), field(field), t(t)
    {
    }
};

class CoreExportDecl
{
public:
    std::string name;
    CoreExternType t;

    CoreExportDecl(std::string name, CoreExternType t) : name(name), t(t)
    {
    }
};

class ModuleType : public ExternType
{
public:
    std::vector<CoreImportDecl> imports;
    std::vector<CoreExportDecl> exports;

    ModuleType(std::vector<CoreImportDecl> imports, std::vector<CoreExportDecl> exports) : imports(imports), exports(exports)
    {
    }
};

class CoreFuncType : public CoreExternType
{
public:
    std::vector<std::string> params;
    std::vector<std::string> results;

    CoreFuncType(std::vector<std::string> params, std::vector<std::string> results) : params(params), results(results)
    {
    }
};

class CoreMemoryType : public CoreExternType
{
public:
    std::vector<int> initial;
    std::optional<int> maximum;

    CoreMemoryType(std::vector<int> initial, std::optional<int> maximum) : initial(initial), maximum(maximum)
    {
    }
};

class ExternDecl
{
public:
    std::string name;
    ExternType t;

    ExternDecl(std::string name, ExternType t) : name(name), t(t)
    {
    }
};

class ComponentType : public ExternType
{
public:
    std::vector<ExternDecl> imports;
    std::vector<ExternDecl> exports;

    ComponentType(std::vector<ExternDecl> imports, std::vector<ExternDecl> exports) : imports(imports), exports(exports)
    {
    }
};

class InstanceType : public ExternType
{
public:
    std::vector<ExternDecl> exports;

    InstanceType(std::vector<ExternDecl> exports) : exports(exports)
    {
    }
};

class FuncType : public ExternType
{
protected:
    std::vector<std::tuple<std::string, ValType>> params;
    std::vector<ValType> resultsA;
    std::vector<std::tuple<std::string, ValType>> resultsB;

    std::vector<ValType> extract_types(const std::vector<std::tuple<std::string, ValType>> &vec)
    {
        std::vector<ValType> types;
        for (const auto &[name, type] : vec)
        {
            types.push_back(type);
        }
        return types;
    }

public:
    FuncType(std::vector<std::tuple<std::string, ValType>> params, std::vector<ValType> results) : params(params), resultsA(results)
    {
    }

    FuncType(std::vector<std::tuple<std::string, ValType>> params, std::vector<std::tuple<std::string, ValType>> results) : params(params), resultsB(results)
    {
    }

    std::vector<ValType> param_types()
    {
        return extract_types(params);
    }

    std::vector<ValType> result_types()
    {
        if (resultsA.size() > 0)
        {
            return resultsA;
        }
        return extract_types(resultsB);
    }
};

class ValueType : public ExternType
{
public:
    ValType t;

    ValueType(ValType t) : t(t)
    {
    }
};

class Bounds
{
public:
};

struct Eq : public Bounds
{
public:
    Type t;

    Eq(Type t) : t(t)
    {
    }
};

struct TypeType : public ExternType
{
public:
    Bounds bounds;

    TypeType(Bounds bounds) : bounds(bounds)
    {
    }
};

class Bool : public ValType
{
};
class S8 : public ValType
{
};
class U8 : public ValType
{
};
class S16 : public ValType
{
};
class U16 : public ValType
{
};
class S32 : public ValType
{
};
class U32 : public ValType
{
};
class S64 : public ValType
{
};
class U64 : public ValType
{
};
class Float32 : public ValType
{
};
class Float64 : public ValType
{
};
class Char : public ValType
{
};
class StringX : public ValType
{
};

class List : public ValType
{
public:
    ValType t;

    List(ValType t) : t(t)
    {
    }
};

class Field
{
public:
    std::string label;
    ValType t;

    Field(std::string label, ValType t) : label(label), t(t)
    {
    }
};

class Record : public ValType
{
public:
    std::vector<Field> fields;

    Record(std::vector<Field> fields) : fields(fields)
    {
    }
};

class Tuple : public ValType
{
public:
    std::vector<ValType> ts;

    Tuple(std::vector<ValType> ts) : ts(ts)
    {
    }
};  

class Case {
public:
    std::string label;
    std::optional<std::vector<ValType>> t;
    std::string refines;

    Case(const std::string& label, const std::optional<std::vector<ValType>>& t, const std::string& refines = "")
        : label(label), t(t), refines(refines) {}
};

class Variant : public ValType {
public:
    std::vector<Case> cases;

    Variant(const std::vector<Case>& cases) : cases(cases) {}
};

class Enum : public ValType {
public:
    std::vector<std::string> labels;

    Enum(const std::vector<std::string>& labels) : labels(labels) {}
};

class Option : public ValType {
public:
    ValType t;

    Option(const ValType& t) : t(t) {}
};

class Result : public ValType {
public:
    std::optional<ValType> ok;
    std::optional<ValType> error;

    Result(const std::optional<ValType>& ok, const std::optional<ValType>& error)
        : ok(ok), error(error) {}
};

class Flags : public ValType {
public:
    std::vector<std::string> labels;

    Flags(const std::vector<std::string>& labels) : labels(labels) {}
};

class Own : public ValType {
    // Own class implementation
};



auto UTF16_TAG = 1U << 31;

//
/* canonical despecialize (python)          -------------------------------------------------------------

def despecialize(t):
  match t:
    case Tuple(ts)         : return Record([ Field(str(i), t) for i,t in enumerate(ts) ])
    case Union(ts)         : return Variant([ Case(str(i), t) for i,t in enumerate(ts) ])
    case Enum(labels)      : return Variant([ Case(l, None) for l in labels ])
    case Option(t)         : return Variant([ Case("none", None), Case("some", t) ])
    case Result(ok, error) : return Variant([ Case("ok", ok), Case("error", error) ])
    case _                 : return t

*/

// template <typename T>
// wasmtime::ValType despecialize(const T<wasmtime::Val> &t)
// {
//   switch (t.kind())
//   {
//   case wasmtime::ValKind::I32:
//   case wasmtime::ValKind::I64:
//   case wasmtime::ValKind::F32:
//   case wasmtime::ValKind::F64:
//   case wasmtime::ValKind::V128:
//     return t.kind();
//   default:
//     return wasmtime::ValType::i32();
//   }
// }

/* canonical alignment (python)             -------------------------------------------------------------

def alignment(t):
  match despecialize(t):
    case Bool()             : return 1
    case S8() | U8()        : return 1
    case S16() | U16()      : return 2
    case S32() | U32()      : return 4
    case S64() | U64()      : return 8
    case Float32()          : return 4
    case Float64()          : return 8
    case Char()             : return 4
    case String() | List(_) : return 4
    case Record(fields)     : return alignment_record(fields)
    case Variant(cases)     : return alignment_variant(cases)
    case Flags(labels)      : return alignment_flags(labels)
    case Own(_) | Borrow(_) : return 4

*/

// int alignment(const wasmtime::ValType &t)
// {
//   switch (t.kind())
//   {
//   case wasmtime::ValKind::I32:
//   case wasmtime::ValKind::F32:
//     return 4;
//   case wasmtime::ValKind::I64:
//   case wasmtime::ValKind::F64:
//     return 8;
//   case wasmtime::ValKind::V128:
//     return 16;
//   default:
//     return 1;
//   }
// }

/* canonical align_to (python)              -------------------------------------------------------------

def align_to(ptr, alignment):
  return math.ceil(ptr / alignment) * alignment

*/

uint32_t align_to(uint32_t ptr, uint32_t alignment)
{
    return (ptr + alignment - 1) & ~(alignment - 1);
}

bool isAligned(uint32_t ptr, uint32_t alignment)
{
    return (ptr & (alignment - 1)) == 0;
}

//  loading ---

/* canonical load (python)              -------------------------------------------------------------
def load(cx, ptr, t):
  assert(ptr == align_to(ptr, alignment(t)))
  assert(ptr + size(t) <= len(cx.opts.memory))
  match despecialize(t):
    case Bool()         : return convert_int_to_bool(load_int(cx, ptr, 1))
    case U8()           : return load_int(cx, ptr, 1)
    case U16()          : return load_int(cx, ptr, 2)
    case U32()          : return load_int(cx, ptr, 4)
    case U64()          : return load_int(cx, ptr, 8)
    case S8()           : return load_int(cx, ptr, 1, signed=True)
    case S16()          : return load_int(cx, ptr, 2, signed=True)
    case S32()          : return load_int(cx, ptr, 4, signed=True)
    case S64()          : return load_int(cx, ptr, 8, signed=True)
    case Float32()      : return decode_i32_as_float(load_int(cx, ptr, 4))
    case Float64()      : return decode_i64_as_float(load_int(cx, ptr, 8))
    case Char()         : return convert_i32_to_char(cx, load_int(cx, ptr, 4))
    case String()       : return load_string(cx, ptr)
    case List(t)        : return load_list(cx, ptr, t)
    case Record(fields) : return load_record(cx, ptr, fields)
    case Variant(cases) : return load_variant(cx, ptr, cases)
    case Flags(labels)  : return load_flags(cx, ptr, labels)
    case Own()          : return lift_own(cx, load_int(opts, ptr, 4), t)
    case Borrow()       : return lift_borrow(cx, load_int(opts, ptr, 4), t)
*/

template <typename T>
T load(const wasmtime::Span<uint8_t> &data, uint32_t ptr, const T &t)
{
    assert(ptr == align_to(ptr, alignment(t)));
    assert(ptr + size(t) <= data.size());

    switch (despecialize(t))
    {
    case Bool():
        return convert_int_to_bool(load_int(data, ptr, 1));
    case U8():
        return load_int(data, ptr, 1);
    case U16():
        return load_int(data, ptr, 2);
    case U32():
        return load_int(data, ptr, 4);
    case U64():
        return load_int(data, ptr, 8);
    case S8():
        return load_int(data, ptr, 1, true);
    case S16():
        return load_int(data, ptr, 2, true);
    case S32():
        return load_int(data, ptr, 4, true);
    case S64():
        return load_int(data, ptr, 8, true);
    case Float32():
        return decode_i32_as_float(load_int(data, ptr, 4));
    case Float64():
        return decode_i64_as_float(load_int(data, ptr, 8));
    case Char():
        return convert_i32_to_char(load_int(data, ptr, 4));
    case String():
        return load_string(data, ptr);
    case List(t):
        return load_list(data, ptr, t);
    case Record(fields):
        return load_record(data, ptr, fields);
    case Variant(cases):
        return load_variant(data, ptr, cases);
    case Flags(labels):
        return load_flags(data, ptr, labels);
    case Own():
        return lift_own(data, load_int(data, ptr, 4), t);
    case Borrow():
        return lift_borrow(data, load_int(data, ptr, 4), t);
    default:
        throw std::runtime_error("Invalid type");
    }
}

/* canonical load_int (python)              -------------------------------------------------------------

def load_int(cx, ptr, nbytes, signed = False):
  return int.from_bytes(cx.opts.memory[ptr : ptr+nbytes], 'little', signed=signed)

*/

template <typename T>
T load_int(const wasmtime::Span<uint8_t> &data, uint32_t ptr)
{
    T retVal = 0;
    if constexpr (sizeof(T) == 1)
    {
        retVal = static_cast<T>(data[ptr]);
    }
    else if constexpr (sizeof(T) == 2)
    {
        retVal = static_cast<T>((static_cast<uint16_t>(data[ptr + 1]) << 8) |
                                static_cast<uint16_t>(data[ptr]));
    }
    else if constexpr (sizeof(T) == 4)
    {
        retVal = static_cast<T>((static_cast<uint32_t>(data[ptr + 3]) << 24) |
                                (static_cast<uint32_t>(data[ptr + 2]) << 16) |
                                (static_cast<uint32_t>(data[ptr + 1]) << 8) |
                                static_cast<uint32_t>(data[ptr]));
    }
    else if constexpr (sizeof(T) == 8)
    {
        retVal = static_cast<T>((static_cast<uint64_t>(data[ptr + 7]) << 56) |
                                (static_cast<uint64_t>(data[ptr + 6]) << 48) |
                                (static_cast<uint64_t>(data[ptr + 5]) << 40) |
                                (static_cast<uint64_t>(data[ptr + 4]) << 32) |
                                (static_cast<uint64_t>(data[ptr + 3]) << 24) |
                                (static_cast<uint64_t>(data[ptr + 2]) << 16) |
                                (static_cast<uint64_t>(data[ptr + 1]) << 8) |
                                static_cast<uint64_t>(data[ptr]));
    }
    return retVal;
}
/* canonical load_string_from_range (python)  -------------------------------------------------------------

def load_string_from_range(cx, ptr, tagged_code_units):
  match cx.opts.string_encoding:
    case 'utf8':
      alignment = 1
      byte_length = tagged_code_units
      encoding = 'utf-8'
    case 'utf16':
      alignment = 2
      byte_length = 2 * tagged_code_units
      encoding = 'utf-16-le'
    case 'latin1+utf16':
      alignment = 2
      if bool(tagged_code_units & UTF16_TAG):
        byte_length = 2 * (tagged_code_units ^ UTF16_TAG)
        encoding = 'utf-16-le'
      else:
        byte_length = tagged_code_units
        encoding = 'latin-1'

  trap_if(ptr != align_to(ptr, alignment))
  trap_if(ptr + byte_length > len(cx.opts.memory))
  try:
    s = cx.opts.memory[ptr : ptr+byte_length].decode(encoding)
  except UnicodeError:
    trap()

  return (s, cx.opts.string_encoding, tagged_code_units)

*/

//  More:  Not currently available from the wasmtime::context object, see https://github.com/bytecodealliance/wasmtime/issues/6719
static const std::string global_encoding = "utf8";

std::tuple<uint32_t /*ptr*/, std::string /*encoding*/, uint32_t /*byte length*/> load_string_from_range(const wasmtime::Span<uint8_t> &data, uint32_t ptr, uint32_t tagged_code_units)
{
    std::string encoding = "utf-8";
    uint32_t byte_length = tagged_code_units;
    uint32_t alignment = 1;
    if (global_encoding.compare("utf8") == 0)
    {
        alignment = 1;
        byte_length = tagged_code_units;
        encoding = "utf-8";
    }
    else if (global_encoding.compare("utf16") == 0)
    {
        alignment = 2;
        byte_length = 2 * tagged_code_units;
        encoding = "utf-16-le";
    }
    else if (global_encoding.compare("latin1+utf16") == 0)
    {
        alignment = 2;
        if (tagged_code_units & UTF16_TAG)
        {
            byte_length = 2 * (tagged_code_units ^ UTF16_TAG);
            encoding = "utf-16-le";
        }
        else
        {
            byte_length = tagged_code_units;
            encoding = "latin-1";
        }
    }

    if (!isAligned(ptr, alignment))
    {
        throw makeStringException(3, "Invalid alignment");
    }

    if (ptr + byte_length > data.size())
    {
        throw makeStringException(1, "Out of bounds");
    }

    return std::make_tuple(ptr, encoding, byte_length);
}

/*  canonical load_string (python)          -------------------------------------------------------------

def load_string(cx, ptr):
  begin = load_int(cx, ptr, 4)
  tagged_code_units = load_int(cx, ptr + 4, 4)
  return load_string_from_range(cx, begin, tagged_code_units)

*/
std::tuple<uint32_t /*ptr*/, std::string /*encoding*/, uint32_t /*byte length*/> load_string(const wasmtime::Span<uint8_t> &data, uint32_t ptr)
{
    uint32_t begin = load_int<uint32_t>(data, ptr);
    uint32_t tagged_code_units = load_int<uint32_t>(data, ptr + 4);
    return load_string_from_range(data, begin, tagged_code_units);
}

/*  canonical load_list_from_range (python) -------------------------------------------------------------

def load_list_from_range(cx, ptr, length, elem_type):
  trap_if(ptr != align_to(ptr, alignment(elem_type)))
  trap_if(ptr + length * size(elem_type) > len(cx.opts.memory))
  a = []
  for i in range(length):
    a.append(load(cx, ptr + i * size(elem_type), elem_type))
  return a

*/

template <typename T>
std::vector<T> load_list_from_range(const wasmtime::Span<uint8_t> &data, uint32_t ptr, uint32_t length)
{
    if (!isAligned(ptr, alignment(T{})))
        throw makeStringException(2, "Pointer is not aligned");
    if (ptr + length * sizeof(T) > data.size())
        throw makeStringException(1, "Out of bounds access");
    std::vector<T> a;
    for (uint32_t i = 0; i < length; i++)
    {
        a.push_back(load<T>(data, ptr + i * sizeof(T)));
    }
    return a;
}

/*  canonical load_list (python)            -------------------------------------------------------------

def load_list(cx, ptr, elem_type):
  begin = load_int(cx, ptr, 4)
  length = load_int(cx, ptr + 4, 4)
  return load_list_from_range(cx, begin, length, elem_type)

*/

template <typename T>
std::vector<T> load_list(const wasmtime::Span<uint8_t> &data, uint32_t ptr)
{
    uint32_t begin = load_int<uint32_t>(data, ptr);
    uint32_t length = load_int<uint32_t>(data, ptr + 4);
    return load_list_from_range<T>(data, begin, length);
}

/*  canonical load_record (python)            -------------------------------------------------------------

def load_record(cx, ptr, fields):
  record = {}
  for field in fields:
    ptr = align_to(ptr, alignment(field.t))
    record[field.label] = load(cx, ptr, field.t)
    ptr += size(field.t)
  return record
*/

template <typename T>
std::map<std::string, T> load_record(const wasmtime::Span<uint8_t> &data, uint32_t ptr, const std::vector<std::pair<std::string, T>> &fields)
{
    std::map<std::string, T> record;
    for (auto field : fields)
    {
        ptr = align_to(ptr, alignment(field.second));
        record[field.first] = load<T>(data, ptr);
        ptr += sizeof(T);
    }
    return record;
}

//  Storing  ---
