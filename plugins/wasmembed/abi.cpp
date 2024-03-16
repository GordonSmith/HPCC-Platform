/*
  See:  https://github.com/WebAssembly/component-model/blob/main/design/mvp/CanonicalABI.md
        https://github.com/WebAssembly/component-model/blob/main/design/mvp/canonical-abi/definitions.py
*/

#include "abi.hpp"

#include <cmath>
#include <cassert>

#include "jexcept.hpp"

namespace abi
{
    auto UTF16_TAG = 1U << 31;

    // class List;
    // class Record;
    // class Tuple;
    // class Variant;
    // class Enum;
    // class Option;
    // class Result;
    // class Flags;
    // class Own;
    // class Borrow;

    // typedef std::variant<bool, int8_t, uint8_t, int16_t, uint16_t, int32_t, uint32_t, int64_t, uint64_t, float32_t, float64_t,
    // char, std::string, List, Record, Tuple, Variant, Enum, Option, Result, Flags, Own, Borrow> VariantT;

    class Type
    {
    public:
    };
    class ExternType : public Type
    {
    public:
        ExternType() {}
    };
    class CoreExternType : public Type
    {
    public:
        CoreExternType() {}
    };

    class CoreImportDecl
    {
    public:
        std::string module;
        std::string field;
        CoreExternType t;

        CoreImportDecl(std::string module, std::string field, CoreExternType t)
            : module(module), field(field), t(t)
        {
        }
    };

    class CoreExportDecl
    {
    public:
        std::string name;
        CoreExternType t;

        CoreExportDecl(std::string name, CoreExternType t)
            : name(name), t(t)
        {
        }
    };

    class ModuleType : ExternType
    {
    public:
        std::vector<CoreImportDecl> imports;
        std::vector<CoreExportDecl> exports;

        ModuleType(std::vector<CoreImportDecl> imports, std::vector<CoreExportDecl> exports)
            : imports(imports), exports(exports)
        {
        }
    };

    class CoreFuncType : CoreExternType
    {
    public:
        std::vector<std::string> params;
        std::vector<std::string> results;

        CoreFuncType(std::vector<std::string> params, std::vector<std::string> results)
            : params(params), results(results)
        {
        }
    };

    class CoreMemoryType : CoreExternType
    {
    public:
        std::vector<int> initial;
        std::optional<int> maximum;

        CoreMemoryType(std::vector<int> initial, std::optional<int> maximum)
            : initial(initial), maximum(maximum)
        {
        }
    };

    class ExternDecl
    {
    public:
        std::string name;
        ExternType t;

        ExternDecl(std::string name, ExternType t)
            : name(name), t(t)
        {
        }
    };

    class ComponentType : ExternType
    {
    public:
        std::vector<ExternDecl> imports;
        std::vector<ExternDecl> exports;

        ComponentType(std::vector<ExternDecl> imports, std::vector<ExternDecl> exports)
            : imports(imports), exports(exports)
        {
        }
    };

    class InstanceType : ExternType
    {
    public:
        std::vector<ExternDecl> exports;

        InstanceType(std::vector<ExternDecl> exports)
            : exports(exports)
        {
        }
    };

    // typedef std::tuple<std::string, ValType> Param;
    // class FuncType : public ExternType
    // {
    // public:
    //     std::vector<Param> params;
    //     std::vector<std::variant<VariantT, Param>> results;

    //     FuncType(std::vector<Param> params, std::vector<std::variant<VariantT, Param>> results)
    //         : params(params), results(results)
    //     {
    //     }

    //     std::vector<std::variant<VariantT, Param>> param_types()
    //     {
    //         return extract_types(params);
    //     }

    //     std::vector<std::variant<VariantT, Param>> result_types()
    //     {
    //         return extract_types(results);
    //     }

    //     std::vector<std::variant<VariantT, Param>> extract_types(std::vector<Param> vec)
    //     {
    //         if (vec.empty())
    //         {
    //             return {};
    //         }

    //         std::vector<std::variant<VariantT, Param>> result;
    //         for (Param &item : vec)
    //         {
    //             std::variant<VariantT, Param &> newItem = item;
    //             // result.push_back(std::variant<VariantT, Param>(item));
    //         }
    //         return result;
    //     }

    //     std::vector<std::variant<VariantT, Param>> extract_types(std::vector<std::variant<VariantT, Param>> vec)
    //     {
    //         if (vec.empty())
    //         {
    //             return {};
    //         }

    //         if (std::holds_alternative<VariantT>(vec[0]))
    //         {
    //             return vec;
    //         }

    //         std::vector<std::variant<VariantT, Param>> result;
    //         for (auto &item : vec)
    //         {
    //             if (std::holds_alternative<Param>(item))
    //             {
    //                 result.push_back(std::get<Param>(item));
    //             }
    //         }

    //         return result;
    //     }
    // };

    class Bounds
    {
    public:
        Bounds() {}
    };

    class Eq : Bounds
    {
    public:
        Type t;

        Eq(Type t) : t(t) {}
    };

    class TypeType : Bounds
    {
    public:
        Bounds bounds;

        TypeType(Bounds bounds) : bounds(bounds) {}
    };

    enum class ValKind
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

    class ValType
    {
    public:
        ValKind kind;

        ValType(ValKind kind) : kind(kind) {}
    };

    class Bool : public ValType
    {
    public:
        Bool() : ValType(ValKind::Bool) {}
    };

    class S8 : public ValType
    {
    public:
        S8() : ValType(ValKind::S8) {}
    };

    class U8 : public ValType
    {
    public:
        U8() : ValType(ValKind::U8) {}
    };

    class S16 : public ValType
    {
    public:
        S16() : ValType(ValKind::S16) {}
    };

    class U16 : public ValType
    {
    public:
        U16() : ValType(ValKind::U16) {}
    };

    class S32 : public ValType
    {
    public:
        S32() : ValType(ValKind::S32) {}
    };

    class U32 : public ValType
    {
    public:
        U32() : ValType(ValKind::U32) {}
    };

    class S64 : public ValType
    {
    public:
        S64() : ValType(ValKind::S64) {}
    };

    class U64 : public ValType
    {
    public:
        U64() : ValType(ValKind::U64) {}
    };

    class Float32 : public ValType
    {
    public:
        Float32() : ValType(ValKind::Float32) {}
    };
    class Float64 : public ValType
    {
    public:
        Float64() : ValType(ValKind::Float64) {}
    };
    class Char : public ValType
    {
    public:
        Char() : ValType(ValKind::Char) {}
    };
    class String : public ValType
    {
    public:
        String() : ValType(ValKind::String) {}
    };

    class List : public ValType
    {
    public:
        ValKind t;

        List(ValKind t) : ValType(ValKind::List), t(t) {}
    };

    class Field : public ValType
    {
    public:
        std::string label;
        ValType t;

        Field(std::string label, ValType t) : ValType(ValKind::Field), label(label), t(t) {}
    };

    class Record : public ValType
    {
    public:
        std::vector<Field> fields;

        Record() : ValType(ValKind::Record) {}
        Record(std::vector<Field> fields) : ValType(ValKind::Record), fields(fields) {}
    };

    class Tuple : public ValType
    {
    public:
        std::vector<ValType> ts;

        Tuple(std::vector<ValType> ts) : ValType(ValKind::Tuple), ts(ts) {}
    };

    class Case : public ValType
    {
    public:
        std::string label;
        std::optional<ValType> t;
        std::optional<std::string> refines = std::nullopt;

        Case(std::string label, std::optional<ValType> t = std::nullopt, std::optional<std::string> refines = std::nullopt)
            : ValType(ValKind::Case), label(label), t(t), refines(refines)
        {
        }
    };

    class Variant : public ValType
    {
    public:
        std::vector<Case> cases;

        Variant() : ValType(ValKind::Variant) {}
        Variant(std::vector<Case> cases) : ValType(ValKind::Variant), cases(cases) {}
    };

    class Enum : public ValType
    {
    public:
        std::vector<std::string> labels;

        Enum(std::vector<std::string> labels) : ValType(ValKind::Enum), labels(labels) {}
    };

    class Option : public ValType
    {
    public:
        ValType t;

        Option(ValType t) : ValType(ValKind::Option), t(t) {}
    };

    class Result : public ValType
    {
    public:
        std::optional<ValType> ok;
        std::optional<ValType> error;

        Result(std::optional<ValType> ok, std::optional<ValType> error) : ValType(ValKind::Result), ok(ok), error(error)
        {
        }
    };

    class Flags : public ValType
    {
    public:
        std::vector<std::string> labels;

        Flags(std::vector<std::string> labels) : ValType(ValKind::Flags), labels(labels) {}
    };

    class ResourceType;

    class Own : public ValType
    {
    public:
        const ResourceType &rt;

        Own(const ResourceType &rt) : ValType(ValKind::Own), rt(rt) {}
    };

    class Borrow : public ValType
    {
    public:
        const ResourceType &rt;

        Borrow(const ResourceType &rt) : ValType(ValKind::Borrow), rt(rt) {}
    };

    //
    /* canonical despecialize (python)          -------------------------------------------------------------

    def despecialize(t):
      match t:
        case Tuple(ts)         : return Record([ Field(str(i), t) for i,t in enumerate(ts) ])
        case Enum(labels)      : return Variant([ Case(l, None) for l in labels ])
        case Option(t)         : return Variant([ Case("none", None), Case("some", t) ])
        case Result(ok, error) : return Variant([ Case("ok", ok), Case("error", error) ])
        case _                 : return t
    */

    ValType despecialize(const ValType &t)
    {
        if (t.kind == ValKind::Tuple)
        {
            Record r;
            for (size_t i = 0; i < static_cast<const Tuple &>(t).ts.size(); ++i)
            {
                r.fields.push_back(Field(std::to_string(i), static_cast<const Tuple &>(t).ts[i]));
            }
            return r;
        }
        else if (t.kind == ValKind::Enum)
        {
            Variant v;
            for (size_t i = 0; i < static_cast<const Enum &>(t).labels.size(); ++i)
            {
                v.cases.push_back(Case(static_cast<const Enum &>(t).labels[i]));
            }
            return v;
        }
        else if (t.kind == ValKind::Option)
        {
            Variant v;
            v.cases.push_back(Case("none"));
            v.cases.push_back(Case("some", static_cast<const Option &>(t).t));
            return v;
        }
        else if (t.kind == ValKind::Result)
        {
            Variant v;
            v.cases.push_back(Case("ok", static_cast<const Result &>(t).ok));
            v.cases.push_back(Case("error", static_cast<const Result &>(t).error));
            return v;
        }
        return t;
    }

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

    int alignment(ValType _t)
    {
        ValType t = despecialize(_t);
        switch (t.kind)
        {
        case ValKind::Bool:
        case ValKind::S8:
        case ValKind::U8:
            return 1;
        case ValKind::S16:
        case ValKind::U16:
            return 2;
        case ValKind::S32:
        case ValKind::U32:
        case ValKind::Float32:
        case ValKind::Char:
            return 4;
        case ValKind::S64:
        case ValKind::U64:
        case ValKind::Float64:
            return 8;
        case ValKind::String:
        case ValKind::List:
            return 4;
        case ValKind::Record:
            return alignment_record(static_cast<const Record &>(t).fields);
        case ValKind::Variant:
            return alignment_variant(static_cast<const Variant &>(t).cases);
        case ValKind::Flags:
            return alignment_flags(static_cast<const Flags &>(t).labels);
        case ValKind::Own:
        case ValKind::Borrow:
            return 4;
        }
        throw std::runtime_error("Invalid type");
    }

    int alignment_record(const std::vector<Field> &fields)
    {
        int a = 1;
        for (const auto &f : fields)
        {
            a = std::max(a, alignment(f.t));
        }
        return a;
    }

    ValType discriminant_type(const std::vector<Case> &cases)
    {
        size_t n = cases.size();
        assert(0 < n && n < std::numeric_limits<unsigned int>::max());
        int match = std::ceil(std::log2(n) / 8);
        switch (match)
        {
        case 0:
            return U8();
        case 1:
            return U8();
        case 2:
            return U16();
        case 3:
            return U32();
        default:
            throw std::runtime_error("Invalid match value");
        }
    }

    int max_case_alignment(const std::vector<Case> &cases)
    {
        int a = 1;
        for (const auto &c : cases)
        {
            if (c.t.has_value()) // Check if c.t exists
            {
                a = std::max(a, alignment(c.t.value()));
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

    int size(const ValType &t)
    {
        switch (despecialize(t).kind)
        {
        case ValKind::Bool:
        case ValKind::S8:
        case ValKind::U8:
            return 1;
        case ValKind::S16:
        case ValKind::U16:
            return 2;
        case ValKind::S32:
        case ValKind::U32:
        case ValKind::Float32:
        case ValKind::Char:
            return 4;
        case ValKind::S64:
        case ValKind::U64:
        case ValKind::Float64:
            return 8;
        case ValKind::String:
        case ValKind::List:
            return 8;
        case ValKind::Record:
            return size_record(static_cast<const Record &>(t).fields);
        case ValKind::Variant:
            return size_variant(static_cast<const Variant &>(t).cases);
        case ValKind::Flags:
            return size_flags(static_cast<const Flags &>(t).labels);
        case ValKind::Own:
        case ValKind::Borrow:
            return 4;
        }
        throw std::runtime_error("Invalid type");
    }

    int size_record(const std::vector<Field> &fields)
    {
        int s = 0;
        for (const auto &f : fields)
        {
            s = align_to(s, alignment(f.t));
            s += size(f.t);
        }
        assert(s > 0);
        return align_to(s, alignment_record(fields));
    }
    /* canonical align_to (python)              -------------------------------------------------------------

    def align_to(ptr, alignment):
      return math.ceil(ptr / alignment) * alignment
    */

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
            if (c.t.has_value())
            {
                cs = std::max(cs, size(c.t.value()));
            }
        }
        s += cs;
        return align_to(s, alignment_variant(cases));
    }

    int num_i32_flags(const std::vector<std::string>& labels);

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

    int num_i32_flags(const std::vector<std::string>& labels) {
        return std::ceil(static_cast<double>(labels.size()) / 32);
    }

    bool isAligned(uint32_t ptr, uint32_t alignment)
    {
        return (ptr & (alignment - 1)) == 0;
    }

    //  Runtime State  ---

    class CallContext;

    class HandleElem
    {
    public:
        int rep;
        bool own;
        std::optional<CallContext *> scope;
        int lend_count;

        HandleElem(int rep, bool own, CallContext *scope = nullptr)
            : rep(rep), own(own), scope(scope), lend_count(0) {}
    };

    class HandleTable
    {
    public:
        std::vector<std::optional<HandleElem>> array;
        std::vector<int> free;

        HandleTable()
        {
            array.push_back(std::nullopt);
        }

        HandleElem &get(int i)
        {
            assert(i < array.size());
            assert(array[i].has_value());
            return array[i].value();
        }

        int add(const HandleElem &h)
        {
            int i;
            if (!free.empty())
            {
                i = free.back();
                free.pop_back();
                assert(!array[i].has_value());
                array[i] = h;
            }
            else
            {
                i = static_cast<int>(array.size());
                assert(i < (1 << 30));
                array.push_back(h);
            }
            return i;
        }

        HandleElem remove(int i)
        {
            HandleElem h = get(i);
            array[i] = std::nullopt;
            free.push_back(i);
            return h;
        }
    };

    // class HandleTables
    // {
    // private:
    //     std::unordered_map<ResourceType, HandleTable> rt_to_table;

    // public:

    //     HandleTable &table(ResourceType rt)
    //     {
    //         return rt_to_table[rt];
    //     }

    //     // Get a handle from the table
    //     // Assuming HandleTable::get(i) returns the handle
    //     // Modify the return type accordingly
    //     HandleElem get(ResourceType rt, int i)
    //     {
    //         return table(rt).get(i);
    //     }

    //     // Add a handle to the table
    //     // Assuming HandleTable::add(h) adds the handle
    //     // Modify the parameters and return type accordingly
    //     void add(ResourceType rt, const HandleElem &h)
    //     {
    //         table(rt).add(h);
    //     }
    // };

    // class CanonicalOptions
    // {
    // public:
    //     std::vector<uint8_t> memory;
    //     std::string string_encoding;
    //     std::function<int(int, int, int, int)> realloc;
    //     std::function<void()> post_return;
    // };

    class ComponentInstance
    {
    public:
        bool may_leave;
        bool may_enter;
        // HandleTables handles;

        ComponentInstance() : may_leave(true), may_enter(true) {}
    };

    class ResourceType
    {
    public:
        ComponentInstance impl;
        std::function<void(int)> dtor;

        ResourceType(ComponentInstance impl, std::function<void(int)> dtor = nullptr)
            : impl(impl), dtor(dtor) {}
    };

    // class CallContext
    // {
    // public:
    //     CanonicalOptions opts;
    //     ComponentInstance inst;
    //     std::vector<HandleElem> lenders;
    //     int borrow_count;

    //     CallContext(const CanonicalOptions &opts, const ComponentInstance &inst)
    //         : opts(opts), inst(inst), borrow_count(0) {}

    //     void track_owning_lend(HandleElem &lending_handle)
    //     {
    //         assert(lending_handle.own);
    //         lending_handle.lend_count++;
    //         lenders.push_back(lending_handle);
    //     }

    //     void exit_call()
    //     {
    //         assert(borrow_count == 0);
    //         for (auto &h : lenders)
    //         {
    //             h.lend_count--;
    //         }
    //     }
    // };

    //  loading ---

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

    //  Storing  ---

    /*

    MAX_STRING_BYTE_LENGTH = (1 << 31) - 1

    def store_string_copy(cx, src, src_code_units, dst_code_unit_size, dst_alignment, dst_encoding):
      dst_byte_length = dst_code_unit_size * src_code_units
      trap_if(dst_byte_length > MAX_STRING_BYTE_LENGTH)
      ptr = cx.opts.realloc(0, 0, dst_alignment, dst_byte_length)
      trap_if(ptr != align_to(ptr, dst_alignment))
      trap_if(ptr + dst_byte_length > len(cx.opts.memory))
      encoded = src.encode(dst_encoding)
      assert(dst_byte_length == len(encoded))
      cx.opts.memory[ptr : ptr+len(encoded)] = encoded
      return (ptr, src_code_units)

    */

    uint32_t MAX_STRING_BYTE_LENGTH = (1U << 31) - 1;

    // std::tuple<uint32_t, uint32_t> store_string_copy(const wasmtime::Span<uint8_t> &data, const char *src, uint32_t src_code_units, uint32_t dst_code_unit_size, uint32_t dst_alignment, const std::string &dst_encoding)
    // {
    //     uint32_t dst_byte_length = dst_code_unit_size * src_code_units;
    //     if (dst_byte_length > MAX_STRING_BYTE_LENGTH)
    //     {
    //         throw makeStringException(4, "String too long");
    //     }
    //     uint32_t ptr = cx.set_data().realloc(0, 0, dst_alignment, dst_byte_length);
    //     if (!isAligned(ptr, dst_alignment))
    //     {
    //         throw makeStringException(2, "Invalid alignment");
    //     }
    //     if (ptr + dst_byte_length > data.size())
    //     {
    //         throw makeStringException(1, "Out of bounds access");
    //     }
    //     std::string encoded = src;
    //     if (dst_encoding.compare("utf-8") == 0)
    //     {
    //         encoded = src;
    //     }
    //     else if (dst_encoding.compare("utf-16-le") == 0)
    //     {
    //         encoded = src;
    //     }
    //     else if (dst_encoding.compare("latin-1") == 0)
    //     {
    //         encoded = src;
    //     }
    //     else
    //     {
    //         throw makeStringException(5, "Unsupported encoding");
    //     }
    //     assert(dst_byte_length == encoded.size());
    //     std::copy(encoded.begin(), encoded.end(), data.begin() + ptr);
    //     return std::make_tuple(ptr, src_code_units);
    // }

    // void store_string_into_range(const wasmtime::Span<uint8_t> &data, const char *src, const std::string &src_encoding, uint32_t src_byte_length)
    // {

    //     //  Python code:
    //     //   if src_encoding == 'latin1+utf16':
    //     //     if bool(src_tagged_code_units & UTF16_TAG):
    //     //       src_simple_encoding = 'utf16'
    //     //       src_code_units = src_tagged_code_units ^ UTF16_TAG
    //     //     else:
    //     //       src_simple_encoding = 'latin1'
    //     //       src_code_units = src_tagged_code_units
    //     //   else:
    //     //     src_simple_encoding = src_encoding
    //     //     src_code_units = src_tagged_code_units
    //     std::string src_simple_encoding;
    //     uint32_t src_code_units;
    //     if (src_encoding.compare("latin1+utf16") == 0)
    //     {
    //         if (src_byte_length & UTF16_TAG)
    //         {
    //             src_simple_encoding = "utf16";
    //             src_code_units = src_byte_length ^ UTF16_TAG;
    //         }
    //         else
    //         {
    //             src_simple_encoding = "latin1";
    //             src_code_units = src_byte_length;
    //         }
    //     }
    //     else
    //     {
    //         src_simple_encoding = src_encoding;
    //         src_code_units = src_byte_length;
    //     }

    //     //   match cx.opts.string_encoding:
    //     //     case 'utf8':
    //     //       match src_simple_encoding:
    //     //         case 'utf8'         : return store_string_copy(cx, src, src_code_units, 1, 1, 'utf-8')
    //     //         case 'utf16'        : return store_utf16_to_utf8(cx, src, src_code_units)
    //     //         case 'latin1'       : return store_latin1_to_utf8(cx, src, src_code_units)
    //     //     case 'utf16':
    //     //       match src_simple_encoding:
    //     //         case 'utf8'         : return store_utf8_to_utf16(cx, src, src_code_units)
    //     //         case 'utf16'        : return store_string_copy(cx, src, src_code_units, 2, 2, 'utf-16-le')
    //     //         case 'latin1'       : return store_string_copy(cx, src, src_code_units, 2, 2, 'utf-16-le')
    //     //     case 'latin1+utf16':
    //     //       match src_encoding:
    //     //         case 'utf8'         : return store_string_to_latin1_or_utf16(cx, src, src_code_units)
    //     //         case 'utf16'        : return store_string_to_latin1_or_utf16(cx, src, src_code_units)
    //     //         case 'latin1+utf16' :
    //     //           match src_simple_encoding:
    //     //             case 'latin1'   : return store_string_copy(cx, src, src_code_units, 1, 2, 'latin-1')
    //     //             case 'utf16'    : return store_probably_utf16_to_latin1_or_utf16(cx, src, src_code_units)

    //     if (global_encoding.compare("utf8") == 0)
    //     {
    //         if (src_simple_encoding.compare("utf8") == 0)
    //         {
    //             return store_string_copy(data, src, src_code_units, 1, 1, "utf-8");
    //         }
    //         else if (src_simple_encoding.compare("utf16") == 0)
    //         {
    //             return store_utf16_to_utf8(data, src, src_code_units);
    //         }
    //         else if (src_simple_encoding.compare("latin1") == 0)
    //         {
    //             return store_latin1_to_utf8(data, src, src_code_units);
    //         }
    //     }
    //     else if (global_encoding.compare("utf16") == 0)
    //     {
    //         if (src_simple_encoding.compare("utf8") == 0)
    //         {
    //             return store_utf8_to_utf16(data, src, src_code_units);
    //         }
    //         else if (src_simple_encoding.compare("utf16") == 0)
    //         {
    //             return store_string_copy(data, src, src_code_units, 2, 2, "utf-16-le");
    //         }
    //         else if (src_simple_encoding.compare("latin1") == 0)
    //         {
    //             return store_string_copy(data, src, src_code_units, 2, 2, "utf-16-le");
    //         }
    //     }
    //     else if (global_encoding.compare("latin1+utf16") == 0)
    //     {
    //         if (src_encoding.compare("utf8") == 0)
    //         {
    //             return store_string_to_latin1_or_utf16(data, src, src_code_units);
    //         }
    //         else if (src_encoding.compare("utf16") == 0)
    //         {
    //             return store_string_to_latin1_or_utf16(data, src, src_code_units);
    //         }
    //         else if (src_encoding.compare("latin1+utf16") == 0)
    //         {
    //             if (src_simple_encoding.compare("latin1") == 0)
    //             {
    //                 return store_string_copy(data, src, src_code_units, 1, 2, "latin-1");
    //             }
    //             else if (src_simple_encoding.compare("utf16") == 0)
    //             {
    //                 return store_probably_utf16_to_latin1_or_utf16(data, src, src_code_units);
    //             }
    //         }
    //     }
    // }

    // void store_string(const wasmtime::Span<uint8_t> &data, const std::string &utf8Str)
    // {
    // }
}

#ifdef _USE_CPPUNIT

#include "unittests.hpp"
using namespace wasmtime;

#include <iostream>
#include <vector>
#include <map>
#include <cassert>

// Function to check equality modulo string encoding
bool equal_modulo_string_encoding(const auto &s, const auto &t)
{
    if (s == nullptr && t == nullptr)
    {
        return true;
    }
    if (std::is_same_v<decltype(s), bool> && std::is_same_v<decltype(t), bool>)
    {
        return s == t;
    }
    if (std::is_same_v<decltype(s), int> && std::is_same_v<decltype(t), int>)
    {
        return s == t;
    }
    if (std::is_same_v<decltype(s), float> && std::is_same_v<decltype(t), float>)
    {
        return s == t;
    }
    if (std::is_same_v<decltype(s), std::string> && std::is_same_v<decltype(t), std::string>)
    {
        return s == t;
    }
    // if (std::is_same_v<decltype(s), std::tuple<std::string>> && std::is_same_v<decltype(t), std::tuple<std::string>>) {
    //     assert(std::get<0>(s) == std::get<0>(t));
    //     return std::get<0>(s) == std::get<0>(t);
    // }
    // if (std::is_same_v<decltype(s), std::map<std::string, auto>> && std::is_same_v<decltype(t), std::map<std::string, auto>>) {
    //     for (const auto& [key, value] : s) {
    //         if (!equal_modulo_string_encoding(value, t[key])) {
    //             return false;
    //         }
    //     }
    //     return true;
    // }
    // if (std::is_same_v<decltype(s), std::vector<auto>> && std::is_same_v<decltype(t), std::vector<auto>>) {
    //     for (size_t i = 0; i < s.size(); ++i) {
    //         if (!equal_modulo_string_encoding(s[i], t[i])) {
    //             return false;
    //         }
    //     }
    //     return true;
    // }
    assert(false);
}

// class Heap
// {
// private:
//     std::vector<uint8_t> memory;
//     size_t last_alloc = 0;

//     // Helper function to align memory addresses

// public:
//     Heap(size_t arg) : memory(arg) {}

//     // Reallocate memory
//     size_t realloc(size_t original_ptr, size_t original_size, size_t alignment, size_t new_size)
//     {
//         if (original_ptr != 0 && new_size < original_size)
//         {
//             return align_to(original_ptr, alignment);
//         }

//         size_t ret = align_to(last_alloc, alignment);
//         last_alloc = ret + new_size;

//         if (last_alloc > memory.size())
//         {
//             std::cerr << "Out of memory: have " << memory.size() << " bytes, need " << last_alloc << " bytes" << std::endl;
//             exit(EXIT_FAILURE);
//         }

//         // Copy data from original memory region to new memory region
//         std::copy(memory.begin() + original_ptr, memory.begin() + original_ptr + original_size, memory.begin() + ret);

//         return ret;
//     }
// };

// CanonicalOptions mk_opts(const std::vector<uint8_t> &memory = {},
//                          const std::string &encoding = "utf8",
//                          const std::function<int(int, int, int, int)> &realloc = nullptr,
//                          const std::function<void()> &post_return = nullptr)
// {
//     CanonicalOptions opts;
//     opts.memory = memory;
//     opts.string_encoding = encoding;
//     opts.realloc = realloc;
//     opts.post_return = post_return;
//     return opts;
// }

// CallContext mk_cx(const std::vector<uint8_t> &memory = {},
//                   const std::string &encoding = "utf8",
//                   const std::function<int(int, int, int, int)> &realloc = nullptr,
//                   const std::function<void()> &post_return = nullptr)
// {
//     auto opts = mk_opts(memory, encoding, realloc, post_return);
//     return CallContext(opts, ComponentInstance());
// }

// std::tuple<std::string, std::string, size_t> mk_str(const std::string &s)
// {
//     return std::make_tuple(s, "utf8", s.size());
// }

// template <typename T>
// void test(const std::string &t, const std::vector<T> &vals_to_lift, T v,
//           CallContext cx = mk_cx(),
//           std::string dst_encoding = "",
//           std::string lower_t = "",
//           std::string lower_v = "")
// {
//     auto test_name = [&]()
//     {
//         std::stringstream ss;
//         ss << "test(" << t << "," << vals_to_lift << "," << v << "):";
//         return ss.str();
//     };

//     std::vector<T> vi_v;
//     // for (size_t i = 0; i < vals_to_lift.size(); ++i)
//     // {
//     //     vi_v.push_back(Value(flatten_type(t)[i], vals_to_lift[i]));
//     // }

//     // if (v == nullptr)
//     // {
//     //     try
//     //     {
//     //         Value got = lift_flat(cx, vi, t);
//     //         fail(test_name(t, vals_to_lift, v) + " expected trap, but got " + got);
//     //     }
//     //     catch (const Trap &)
//     //     {
//     //         return;
//     //     }
//     // }

//     // Value got = lift_flat(cx, vi, t);
//     // if (vi.i != vi.values.size() || got != v)
//     // {
//     //     fail(test_name(t, vals_to_lift, v) + " initial lift_flat() expected " + v + " but got " + got);
//     // }

//     // if (lower_t.empty())
//     // {
//     //     lower_t = t;
//     // }
//     // if (lower_v.empty())
//     // {
//     //     lower_v = v;
//     // }

//     // Heap heap(5 * cx.opts.memory.size());
//     // if (dst_encoding.empty())
//     // {
//     //     dst_encoding = cx.opts.string_encoding;
//     // }
//     // cx = mk_cx(heap.memory, dst_encoding, heap.realloc);
//     // std::vector<Value> lowered_vals = lower_flat(cx, v, lower_t);
//     // assert(flatten_type(lower_t) == std::vector<std::string>(lowered_vals.begin(), lowered_vals.end()));

//     // vi = ValueIter(lowered_vals);
//     // got = lift_flat(cx, vi, lower_t);
//     // if (!equal_modulo_string_encoding(got, lower_v))
//     // {
//     //     fail(test_name(t, vals_to_lift, v) + " re-lift expected " + lower_v + " but got " + got);
//     // }
// }

class WasmABITest : public CppUnit::TestFixture
{
    CPPUNIT_TEST_SUITE(WasmABITest);
    CPPUNIT_TEST(test);
    CPPUNIT_TEST_SUITE_END();

public:
    WasmABITest()
    {
    }

    ~WasmABITest()
    {
    }

protected:
    void test()
    {
        std::cout << "Compiling module\n";
        std::cout << "Done\n";
    }
};

CPPUNIT_TEST_SUITE_REGISTRATION(WasmABITest);
CPPUNIT_TEST_SUITE_NAMED_REGISTRATION(WasmABITest, "WasmABITest");

#endif