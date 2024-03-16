/*
  See:  https://github.com/WebAssembly/component-model/blob/main/design/mvp/CanonicalABI.md
        https://github.com/WebAssembly/component-model/blob/main/design/mvp/canonical-abi/definitions.py
*/

#include "abi.hpp"

#include <cmath>
#include <cassert>
#include <map>
#include <cstring>
#include <random>
#include <bit>
#include <stdexcept>
#include <any>

using float32_t = float;
using float64_t = double;

namespace abi
{
    const char *HostEncodingString[] = {"utf8", "utf16", "latin1", "latin1+utf16"};
    const char *GuestEncodingString[] = {"utf-8", "utf-16-le", "latin1"};

    CoreImportDecl::CoreImportDecl(const std::string &module, const std::string &field) : module(module), field(field)
    {
    }
    CoreExportDecl::CoreExportDecl(const std::string &name) : name(name)
    {
    }
    ModuleType::ModuleType(const std::vector<CoreImportDecl> &imports, const std::vector<CoreExportDecl> &exports) : imports(imports), exports(exports)
    {
    }
    CoreFuncType::CoreFuncType(const std::vector<std::string> &params, const std::vector<std::string> &results) : params(params), results(results)
    {
    }
    CoreMemoryType::CoreMemoryType(const std::vector<uint32_t> &initial, const std::optional<uint32_t> &maximum) : initial(initial), maximum(maximum)
    {
    }
    ExternDecl::ExternDecl(const std::string &name, const ExternType &t) : name(name), t(t)
    {
    }
    ComponentType::ComponentType(const std::vector<ExternDecl> &imports, const std::vector<ExternDecl> &exports) : imports(imports), exports(exports)
    {
    }

    InstanceType::InstanceType(const std::vector<ExternDecl> &exports) : exports(exports)
    {
    }

    std::vector<ValType> FuncType::param_types()
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

    std::vector<ValType> FuncType::result_types()
    {
        return results;
    }

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

    bool Bool::load(const CallContext &cx, uint32_t ptr)
    {
        return convert_int_to_bool(load_int<uint8_t>(cx, ptr, 1));
    }

    void Bool::store(const CallContext &cx, const bool &v, uint32_t ptr)
    {
        store_int(cx, v, ptr, 1);
    }

    HostStringTuple String::load(const CallContext &cx, uint32_t ptr)
    {
        return load_string(cx, ptr);
    }

    GuestStringPtr String::store(const CallContext &cx, const HostStringTuple &v)
    {
        return store_string(cx, v);
    }

    List::List(const ValType &t) : t(t) {}

    Field::Field(const std::string &label, const ValType &t) : label(label), t(t) {}

    Record::Record(const std::vector<Field> &fields) : fields(fields) {}

    Tuple::Tuple(const std::vector<ValType> &ts) : ts(ts) {}

    Case::Case(const std::string &label, const std::optional<ValType> &t, const std::optional<std::string> &refines) : label(label), t(t), refines(refines) {}

    Variant::Variant(const std::vector<Case> &cases) : cases(cases) {}

    Enum::Enum(const std::vector<std::string> &labels) : labels(labels) {}

    Option::Option(const ValType &t) : t(t) {}

    Result::Result(const std::optional<ValType> &ok, const std::optional<ValType> &error) : ok(ok), error(error) {}

    Flags::Flags(const std::vector<std::string> &labels) : labels(labels) {}

    Own::Own(const ResourceType &rt) : rt(rt) {}

    Borrow::Borrow(const ResourceType &rt) : rt(rt) {}

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

    ValKind despecialize(const ValKind t)
    {
        switch (t)
        {
        case ValKind::Tuple:
            return ValKind::Record;
        case ValKind::Enum:
            return ValKind::Variant;
        case ValKind::Option:
            return ValKind::Variant;
        case ValKind::Result:
            return ValKind::Variant;
        }
        return t;
    }
    ValType despecialize(const ValType &t)
    {
        if (t.kind == ValKind::Tuple)
        {
            std::vector<Field> fields;
            for (size_t i = 0; i < static_cast<const Tuple &>(t).ts.size(); ++i)
            {
                fields.push_back(Field(std::to_string(i), static_cast<const Tuple &>(t).ts[i]));
            }
            return Record(fields);
        }
        else if (t.kind == ValKind::Enum)
        {
            std::vector<Case> cases;
            for (size_t i = 0; i < static_cast<const Enum &>(t).labels.size(); ++i)
            {
                cases.push_back(Case(static_cast<const Enum &>(t).labels[i]));
            }
            return Variant(cases);
        }
        else if (t.kind == ValKind::Option)
        {
            return Variant({Case("none"), Case("some", static_cast<const Option &>(t).t)});
        }
        else if (t.kind == ValKind::Result)
        {
            return Variant({Case("ok", static_cast<const Result &>(t).ok), Case("error", static_cast<const Result &>(t).error)});
        }
        return t;
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

    //  Runtime State  ---

    HandleElem::HandleElem(int rep, bool own, CallContext *scope) : rep(rep), own(own), scope(scope), lend_count(0) {}

    HandleTable::HandleTable()
    {
        array.push_back(std::nullopt);
    }

    HandleElem HandleTable::get(int i)
    {
        assert(i < array.size());
        assert(array[i].has_value());
        return array[i].value();
    }

    int HandleTable::add(const HandleElem &h)
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

    HandleElem HandleTable::remove(int i)
    {
        HandleElem h = get(i);
        array[i] = std::nullopt;
        free.push_back(i);
        return h;
    }

    HandleTable HandleTables::table(const ResourceType &rt)
    {
        if (rt_to_table.find(rt) == rt_to_table.end())
        {
            rt_to_table[rt] = HandleTable();
        }
        return rt_to_table[rt];
    }

    HandleElem HandleTables::get(const ResourceType &rt, int i)
    {
        return table(rt).get(i);
    }

    int HandleTables::add(const ResourceType &rt, const HandleElem &h)
    {
        return table(rt).add(h);
    }

    HandleElem HandleTables::remove(const ResourceType &rt, int i)
    {
        return table(rt).remove(i);
    }

    CanonicalOptions::CanonicalOptions(const Span<uint8_t> &memory,
                                       const std::string &string_encoding,
                                       const std::function<int(int, int, int, int)> &realloc,
                                       const std::function<void()> &post_return) : memory(memory), string_encoding(string_encoding), realloc(realloc), post_return(post_return) {}

    CanonicalOptions::CanonicalOptions(const CanonicalOptions &other) : memory(other.memory), string_encoding(other.string_encoding), realloc(other.realloc), post_return(other.post_return) {}

    ComponentInstance::ComponentInstance()
        : may_leave(true), may_enter(true), handles(HandleTables())
    {
    }

    CallContext::CallContext(const CanonicalOptions &opts, const ComponentInstance &inst)
        : opts(opts), inst(inst), borrow_count(0) {}

    CallContext::CallContext(const CallContext &other) : opts(other.opts), inst(other.inst), borrow_count(other.borrow_count) {}
    void CallContext::operator=(const CallContext &other)
    {
        opts = other.opts;
        inst = other.inst;
        borrow_count = other.borrow_count;
    }

    void CallContext::track_owning_lend(HandleElem &lending_handle)
    {
        assert(lending_handle.own);
        lending_handle.lend_count++;
        lenders.push_back(lending_handle);
    }

    void CallContext::exit_call()
    {
        assert(borrow_count == 0);
        for (auto &h : lenders)
        {
            h.lend_count--;
        }
    }

    ResourceType::ResourceType(ComponentInstance impl, std::function<void(int)> dtor)
        : impl(impl), dtor(dtor) {}

    bool ResourceType::operator<(const ResourceType &rt) const
    {
        return &impl < &rt.impl;
    }

    //  loading --------------------------------------------------------------------------------------------

    std::any load(const CallContext &cx, uint32_t ptr, const ValType &t);

    template <typename T>
    T load_int(const CallContext &cx, uint32_t ptr, uint8_t nbytes)
    {
        T retVal = 0;
        for (size_t i = 0; i < sizeof(T); ++i)
        {
            retVal |= static_cast<T>(cx.opts.memory[ptr + i]) << (8 * i);
        }
        return retVal;
    }

    bool convert_int_to_bool(uint8_t i)
    {
        return i > 0;
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

    char convert_i32_to_char(const CallContext &cx, int32_t i)
    {
        assert(i < 0x110000);
        assert(!(0xD800 <= i && i <= 0xDFFF));
        return static_cast<char>(i);
    }

    HostStringTuple load_string_from_range(const CallContext &cx, uint32_t ptr, uint32_t tagged_code_units);
    HostStringTuple load_string(const CallContext &cx, uint32_t ptr)
    {
        uint32_t begin = load_int<uint32_t>(cx, ptr, 4);
        uint32_t tagged_code_units = load_int<uint32_t>(cx, ptr + 4, 4);
        return load_string_from_range(cx, begin, tagged_code_units);
    }

    auto UTF16_TAG = 1U << 31;
    HostStringTuple load_string_from_range(const CallContext &cx, uint32_t ptr, uint32_t tagged_code_units)
    {
        std::string encoding = "utf-8";
        uint32_t byte_length = tagged_code_units;
        uint32_t alignment = 1;
        if (cx.opts.string_encoding.compare("utf8") == 0)
        {
            alignment = 1;
            byte_length = tagged_code_units;
            encoding = "utf-8";
        }
        else if (cx.opts.string_encoding.compare("utf16") == 0)
        {
            alignment = 2;
            byte_length = 2 * tagged_code_units;
            encoding = "utf-16-le";
        }
        else if (cx.opts.string_encoding.compare("latin1+utf16") == 0)
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
        assert(isAligned(ptr, alignment));
        assert(ptr + byte_length <= cx.opts.memory.size());
        // TODO
        // auto s = cx.opts.memory[ptr:ptr+byte_length].decode(encoding);

        return HostStringTuple((const char *)&cx.opts.memory[ptr], encoding, byte_length);
    }

    std::vector<std::any> load_list_from_range(const CallContext &cx, uint32_t ptr, uint32_t length, const ValType &t);

    std::vector<std::any> load_list(const CallContext &cx, uint32_t ptr, const ValType &t)
    {
        uint32_t begin = load_int<uint32_t>(cx, ptr, 4);
        uint32_t length = load_int<uint32_t>(cx, ptr + 4, 4);
        return load_list_from_range(cx, begin, length, t);
    }

    std::vector<std::any> load_list_from_range(const CallContext &cx, uint32_t ptr, uint32_t length, const ValType &t)
    {
        assert(ptr == align_to(ptr, alignment(t)));
        assert(ptr + length * size(t) <= cx.opts.memory.size());
        std::vector<std::any> a;
        for (uint32_t i = 0; i < length; ++i)
        {
            a.push_back(load(cx, ptr + i * size(t), t));
        }
        return a;
    }

    std::map<std::string, std::any> load_record(const CallContext &cx, uint32_t &ptr, const std::vector<Field> &fields)
    {
        std::map<std::string, std::any> record;
        for (const auto &field : fields)
        {
            ptr = align_to(ptr, alignment(field.t));
            record[field.label] = load(cx, ptr, field.t);
            ptr += size(field.t);
        }
        return record;
    }

    std::string case_label_with_refinements(const Case &c, const std::vector<Case> &cases);
    std::map<std::string, std::any> load_variant(const CallContext &cx, uint32_t &ptr, const std::vector<Case> &cases)
    {
        uint32_t disc_size = size(discriminant_type(cases));
        uint32_t case_index = load_int<uint32_t>(cx, ptr, disc_size);
        ptr += disc_size;
        if (case_index >= cases.size())
        {
            throw std::runtime_error("case_index out of range");
        }
        Case c = cases[case_index];
        ptr = align_to(ptr, max_case_alignment(cases));
        std::string case_label = case_label_with_refinements(c, cases);
        if (c.t.has_value())
        {
            return {{case_label, load(cx, ptr, c.t.value())}};
        }
        return {{case_label, nullptr}};
    }

    int find_case(const std::string &label, const std::vector<Case> &cases);
    std::string case_label_with_refinements(const Case &c, const std::vector<Case> &cases)
    {
        std::string label = c.label;
        Case currentCase = c;

        while (currentCase.refines.has_value())
        {
            // TODO:  currentCase = cases[find_case(currentCase.refines.value(), cases)];
            label += '|' + currentCase.label;
        }

        return label;
    }

    int find_case(const std::string &label, const std::vector<Case> &cases)
    {
        auto it = std::find_if(cases.begin(), cases.end(), [&label](const Case &c)
                               { return c.label == label; });

        if (it != cases.end())
        {
            return std::distance(cases.begin(), it);
        }

        return -1;
    }

    std::map<std::string, bool> unpack_flags_from_int(int i, const std::vector<std::string> &labels);
    std::map<std::string, bool> load_flags(const CallContext &cx, uint32_t ptr, const std::vector<std::string> &labels)
    {
        uint32_t i = load_int<uint32_t>(cx, ptr, size_flags(labels));
        return unpack_flags_from_int(i, labels);
    }

    std::map<std::string, bool> unpack_flags_from_int(int i, const std::vector<std::string> &labels)
    {
        std::map<std::string, bool> record;
        for (const auto &l : labels)
        {
            record[l] = bool(i & 1);
            i >>= 1;
        }
        return record;
    }

    uint32_t lift_own(const CallContext &_cx, int i, const Own &t)
    {
        CallContext &cx = const_cast<CallContext &>(_cx);
        HandleElem h = cx.inst.handles.remove(t.rt, i);
        if (h.lend_count != 0)
        {
            throw std::runtime_error("Lend count is not zero");
        }
        if (!h.own)
        {
            throw std::runtime_error("Not owning");
        }
        return h.rep;
    }

    uint32_t lift_borrow(const CallContext &_cx, int i, const Borrow &t)
    {
        CallContext &cx = const_cast<CallContext &>(_cx);
        HandleElem h = cx.inst.handles.get(t.rt, i);
        if (h.own)
        {
            cx.track_owning_lend(h);
        }
        return h.rep;
    }

    std::any load(const CallContext &cx, uint32_t ptr, const ValType &t)
    {
        switch (t.kind)
        {
        case ValKind::Bool:
            return convert_int_to_bool(load_int<uint8_t>(cx, ptr, 1));
        case ValKind::U8:
            return load_int<uint8_t>(cx, ptr, 1);
        case ValKind::U16:
            return load_int<uint16_t>(cx, ptr, 2);
        case ValKind::U32:
            return load_int<uint32_t>(cx, ptr, 4);
        case ValKind::U64:
            return load_int<uint64_t>(cx, ptr, 8);
        case ValKind::S8:
            return load_int<int8_t>(cx, ptr, 1);
        case ValKind::S16:
            return load_int<int16_t>(cx, ptr, 2);
        case ValKind::S32:
            return load_int<int32_t>(cx, ptr, 4);
        case ValKind::S64:
            return load_int<int64_t>(cx, ptr, 8);
        case ValKind::Float32:
            return decode_i32_as_float(load_int<int32_t>(cx, ptr, 4));
        case ValKind::Float64:
            return decode_i64_as_float(load_int<int64_t>(cx, ptr, 8));
        case ValKind::Char:
            return convert_i32_to_char(cx, load_int<int32_t>(cx, ptr, 4));
        case ValKind::String:
            return load_string(cx, ptr);
        case ValKind::List:
            return load_list(cx, ptr, static_cast<const List &>(t).t);
        case ValKind::Record:
            return load_record(cx, ptr, static_cast<const Record &>(t).fields);
        case ValKind::Variant:
            return load_variant(cx, ptr, static_cast<const Variant &>(t).cases);
        case ValKind::Flags:
            return load_flags(cx, ptr, static_cast<const Flags &>(t).labels);
        case ValKind::Own:
            return lift_own(cx, load_int<uint32_t>(cx, ptr, 4), static_cast<const Own &>(t));
        case ValKind::Borrow:
            return lift_borrow(cx, load_int<uint32_t>(cx, ptr, 4), static_cast<const Borrow &>(t));
        }
        throw std::runtime_error("Invalid type");
    }

    //  Storing  --------------------------------------------------------------------------------------------

    template <typename T>
    void store_int(const CallContext &cx, const T &v, uint32_t ptr, uint8_t nbytes, bool isSigned)
    {
        for (size_t i = 0; i < sizeof(T); ++i)
        {
            cx.opts.memory[ptr + i] = static_cast<uint8_t>(v >> (8 * i));
        }
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

    uint32_t encode_float_as_i32(float32_t f)
    {
        return std::bit_cast<uint32_t>(maybe_scramble_nan32(f));
    }

    uint64_t encode_float_as_i64(float64_t f)
    {
        return std::bit_cast<uint64_t>(maybe_scramble_nan64(f));
    }

    uint32_t core_i32_reinterpret_f32(float32_t f)
    {
        return std::bit_cast<uint32_t>(f);
    }

    uint64_t core_i64_reinterpret_f64(float64_t f)
    {
        return std::bit_cast<uint64_t>(f);
    }

    int32_t char_to_i32(char c)
    {
        int32_t i = static_cast<int32_t>(c);
        assert((0 <= i && i <= 0xD7FF) || (0xD800 <= i && i <= 0x10FFFF));
        return i;
    }

    std::tuple<uint32_t, uint32_t> store_string_copy(const CallContext &cx, const char *_src, uint32_t src_code_units, uint32_t dst_code_unit_size, uint32_t dst_alignment, const std::string &dst_encoding)
    {
        std::string src(_src, src_code_units);
        const uint32_t MAX_STRING_BYTE_LENGTH = (1U << 31) - 1;
        uint32_t dst_byte_length = dst_code_unit_size * src_code_units;
        assert(dst_byte_length <= MAX_STRING_BYTE_LENGTH);
        uint32_t ptr = cx.opts.realloc(0, 0, dst_alignment, dst_byte_length);
        assert(ptr == align_to(ptr, dst_alignment));
        assert(ptr + dst_byte_length <= cx.opts.memory.size());
        // TODO:    std::string encoded = encode(src, dst_encoding);
        // TODO:    assert(dst_byte_length == encoded.size());
        std::string encoded = src;
        // assert(dst_byte_length == encoded.size());
        std::memcpy(&cx.opts.memory[ptr], encoded.data(), encoded.size());
        return std::make_tuple(ptr, src_code_units);
    }

    auto MAX_STRING_BYTE_LENGTH = (1U << 31) - 1;

    std::tuple<uint32_t, uint32_t> store_string_to_utf8(const CallContext &cx, const char *src, uint32_t src_code_units, uint32_t worst_case_size)
    {
        assert(src_code_units <= MAX_STRING_BYTE_LENGTH);
        uint32_t ptr = cx.opts.realloc(0, 0, 1, src_code_units);
        assert(ptr + src_code_units <= cx.opts.memory.size());
        //  TODO:  std::string encoded = encode(src, "utf-8");
        std::string encoded = std::string(src, src_code_units);
        assert(src_code_units <= encoded.size());
        std::memcpy(&cx.opts.memory[ptr], encoded.data(), src_code_units);
        if (src_code_units < encoded.size())
        {
            assert(worst_case_size <= MAX_STRING_BYTE_LENGTH);
            ptr = cx.opts.realloc(ptr, src_code_units, 1, worst_case_size);
            assert(ptr + worst_case_size <= cx.opts.memory.size());
            std::memcpy(&cx.opts.memory[ptr + src_code_units], &encoded[src_code_units], encoded.size() - src_code_units);
            if (worst_case_size > encoded.size())
            {
                ptr = cx.opts.realloc(ptr, worst_case_size, 1, encoded.size());
                assert(ptr + encoded.size() <= cx.opts.memory.size());
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
        uint32_t ptr = cx.opts.realloc(0, 0, 2, worst_case_size);
        if (ptr != align_to(ptr, 2))
            throw std::runtime_error("Pointer misaligned");
        if (ptr + worst_case_size > cx.opts.memory.size())
            throw std::runtime_error("Out of bounds access");
        //  TODO:  std::string encoded = encode(src, "utf-16-le");
        std::string encoded = std::string(src, src_code_units);
        std::memcpy(&cx.opts.memory[ptr], encoded.data(), encoded.size());
        if (encoded.size() < worst_case_size)
        {
            ptr = cx.opts.realloc(ptr, worst_case_size, 2, encoded.size());
            if (ptr != align_to(ptr, 2))
                throw std::runtime_error("Pointer misaligned");
            if (ptr + encoded.size() > cx.opts.memory.size())
                throw std::runtime_error("Out of bounds access");
        }
        uint32_t code_units = static_cast<uint32_t>(encoded.size() / 2);
        return std::make_tuple(ptr, code_units);
    }

    std::tuple<uint32_t, uint32_t> store_string_to_latin1_or_utf16(const CallContext &cx, const char *src, uint32_t src_code_units)
    {
        assert(src_code_units <= MAX_STRING_BYTE_LENGTH);
        uint32_t ptr = cx.opts.realloc(0, 0, 2, src_code_units);
        if (ptr != align_to(ptr, 2))
            throw std::runtime_error("Pointer misaligned");
        if (ptr + src_code_units > cx.opts.memory.size())
            throw std::runtime_error("Out of bounds access");
        uint32_t dst_byte_length = 0;
        for (size_t i = 0; i < src_code_units; ++i)
        {
            char usv = *reinterpret_cast<const char *>(src);
            if (static_cast<uint32_t>(usv) < (1 << 8))
            {
                cx.opts.memory[ptr + dst_byte_length] = static_cast<uint32_t>(usv);
                dst_byte_length += 1;
            }
            else
            {
                uint32_t worst_case_size = 2 * src_code_units;
                if (worst_case_size > MAX_STRING_BYTE_LENGTH)
                    throw std::runtime_error("Worst case size exceeds maximum string byte length");
                ptr = cx.opts.realloc(ptr, src_code_units, 2, worst_case_size);
                if (ptr != align_to(ptr, 2))
                    throw std::runtime_error("Pointer misaligned");
                if (ptr + worst_case_size > cx.opts.memory.size())
                    throw std::runtime_error("Out of bounds access");
                for (int j = dst_byte_length - 1; j >= 0; --j)
                {
                    cx.opts.memory[ptr + 2 * j] = cx.opts.memory[ptr + j];
                    cx.opts.memory[ptr + 2 * j + 1] = 0;
                }
                // TODO: Implement encoding to 'utf-16-le'
                std::string encoded = std::string(src, src_code_units);
                std::memcpy(&cx.opts.memory[ptr + 2 * dst_byte_length], encoded.data(), encoded.size());
                if (worst_case_size > encoded.size())
                {
                    ptr = cx.opts.realloc(ptr, worst_case_size, 2, encoded.size());
                    if (ptr != align_to(ptr, 2))
                        throw std::runtime_error("Pointer misaligned");
                    if (ptr + encoded.size() > cx.opts.memory.size())
                        throw std::runtime_error("Out of bounds access");
                }
                uint32_t tagged_code_units = static_cast<uint32_t>(encoded.size() / 2) | UTF16_TAG;
                return std::make_tuple(ptr, tagged_code_units);
            }
        }
        if (dst_byte_length < src_code_units)
        {
            ptr = cx.opts.realloc(ptr, src_code_units, 2, dst_byte_length);
            if (ptr != align_to(ptr, 2))
                throw std::runtime_error("Pointer misaligned");
            if (ptr + dst_byte_length > cx.opts.memory.size())
                throw std::runtime_error("Out of bounds access");
        }
        return std::make_tuple(ptr, dst_byte_length);
    }

    std::tuple<uint32_t, uint32_t> store_probably_utf16_to_latin1_or_utf16(const CallContext &cx, const char *_src, uint32_t src_code_units)
    {
        uint32_t src_byte_length = 2 * src_code_units;
        if (src_byte_length > MAX_STRING_BYTE_LENGTH)
            throw std::runtime_error("src_byte_length exceeds MAX_STRING_BYTE_LENGTH");

        uint32_t ptr = cx.opts.realloc(0, 0, 2, src_byte_length);
        if (ptr != align_to(ptr, 2))
            throw std::runtime_error("ptr is not aligned");

        if (ptr + src_byte_length > cx.opts.memory.size())
            throw std::runtime_error("Not enough memory");

        //  TODO:  std::string encoded = encode_utf16le(src);
        std::string src = std::string(_src, src_code_units);
        std::string encoded = src;
        std::copy(encoded.begin(), encoded.end(), cx.opts.memory.begin() + ptr);

        if (std::any_of(src.begin(), src.end(), [](char c)
                        { return static_cast<unsigned char>(c) >= (1 << 8); }))
        {
            uint32_t tagged_code_units = static_cast<uint32_t>(encoded.size() / 2) | UTF16_TAG;
            return std::make_tuple(ptr, tagged_code_units);
        }

        uint32_t latin1_size = static_cast<uint32_t>(encoded.size() / 2);
        for (uint32_t i = 0; i < latin1_size; ++i)
            cx.opts.memory[ptr + i] = cx.opts.memory[ptr + 2 * i];

        ptr = cx.opts.realloc(ptr, src_byte_length, 1, latin1_size);
        if (ptr + latin1_size > cx.opts.memory.size())
            throw std::runtime_error("Not enough memory");

        return std::make_tuple(ptr, latin1_size);
    }

    std::tuple<uint32_t, uint32_t> store_string_into_range(const CallContext &cx, const HostStringTuple &v)
    {
        auto [src, src_encoding, src_tagged_code_units] = v;
        std::string src_simple_encoding;
        uint32_t src_code_units;

        if (src_encoding == "latin1+utf16")
        {
            if (src_tagged_code_units & UTF16_TAG)
            {
                src_simple_encoding = "utf16";
                src_code_units = src_tagged_code_units ^ UTF16_TAG;
            }
            else
            {
                src_simple_encoding = "latin1";
                src_code_units = src_tagged_code_units;
            }
        }
        else
        {
            src_simple_encoding = src_encoding;
            src_code_units = src_tagged_code_units;
        }

        if (cx.opts.string_encoding.compare("utf8") == 0)
        {
            if (src_simple_encoding == "utf8")
                return store_string_copy(cx, src, src_code_units, 1, 1, "utf-8");
            else if (src_simple_encoding == "utf16")
                return store_utf16_to_utf8(cx, src, src_code_units);
            else if (src_simple_encoding == "latin1")
                return store_latin1_to_utf8(cx, src, src_code_units);
        }
        else if (cx.opts.string_encoding.compare("utf16") == 0)
        {
            if (src_simple_encoding == "utf8")
                return store_utf8_to_utf16(cx, src, src_code_units);
            else if (src_simple_encoding == "utf16" || src_simple_encoding == "latin1")
                return store_string_copy(cx, src, src_code_units, 2, 2, "utf-16-le");
        }
        else if (cx.opts.string_encoding.compare("latin1+utf16") == 0)
        {
            if (src_encoding == "utf8" || src_encoding == "utf16")
                return store_string_to_latin1_or_utf16(cx, src, src_code_units);
            else if (src_encoding == "latin1+utf16")
            {
                if (src_simple_encoding == "latin1")
                    return store_string_copy(cx, src, src_code_units, 1, 2, "latin-1");
                else if (src_simple_encoding == "utf16")
                    return store_probably_utf16_to_latin1_or_utf16(cx, src, src_code_units);
            }
        }

        assert(false);
        return std::make_tuple(0, 0);
    }

    // Flattening  --------------------------------------------------------------------------------------------

    const int MAX_FLAT_PARAMS = 16;
    const int MAX_FLAT_RESULTS = 1;

    std::vector<std::string> flatten_type(const ValType &t);
    std::vector<std::string> flatten_types(const std::vector<ValType> &ts);

    CoreFuncType flatten_functype(FuncType ft, std::string context)
    {
        std::vector<std::string> flat_params = flatten_types(ft.param_types());
        if (flat_params.size() > MAX_FLAT_PARAMS)
        {
            flat_params = {"i32"};
        }

        std::vector<std::string> flat_results = flatten_types(ft.result_types());
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

    std::vector<std::string> flatten_type(const ValType &t)
    {
        switch (t.kind)
        {
        case ValKind::Bool:
            return {"i32"};
        case ValKind::U8:
        case ValKind::U16:
        case ValKind::U32:
            return {"i32"};
        case ValKind::U64:
            return {"i64"};
        case ValKind::S8:
        case ValKind::S16:
        case ValKind::S32:
            return {"i32"};
        case ValKind::S64:
            return {"i64"};
        case ValKind::Float32:
            return {"f32"};
        case ValKind::Float64:
            return {"f64"};
        case ValKind::Char:
            return {"i32"};
        case ValKind::String:
            return {"i32", "i32"};
        case ValKind::List:
            return {"i32", "i32"};
        case ValKind::Record:
            return flatten_record(static_cast<const Record &>(t).fields);
        case ValKind::Variant:
            return flatten_variant(static_cast<const Variant &>(t).cases);
        case ValKind::Flags:
            return std::vector<std::string>(num_i32_flags(static_cast<const Flags &>(t).labels), "i32");
        case ValKind::Own:
        case ValKind::Borrow:
            return {"i32"};
        }
        throw std::runtime_error("Invalid type");
    }

    std::vector<std::string> flatten_record(const std::vector<Field> &fields)
    {
        std::vector<std::string> flat;
        for (const auto &f : fields)
        {
            auto flattened = flatten_type(f.t);
            flat.insert(flat.end(), flattened.begin(), flattened.end());
        }
        return flat;
    }

    std::string join(const std::string &a, const std::string &b);
    std::vector<std::string> flatten_variant(const std::vector<Case> &cases)
    {
        std::vector<std::string> flat;
        for (const auto &c : cases)
        {
            if (c.t.has_value())
            {
                auto flattened = flatten_type(c.t.value());
                for (size_t i = 0; i < flattened.size(); ++i)
                {
                    if (i < flat.size())
                    {
                        flat[i] = join(flat[i], flattened[i]);
                    }
                    else
                    {
                        flat.push_back(flattened[i]);
                    }
                }
            }
        }
        auto discriminantFlattened = flatten_type(discriminant_type(cases));
        flat.insert(flat.begin(), discriminantFlattened.begin(), discriminantFlattened.end());
        return flat;
    }

    std::string join(const std::string &a, const std::string &b)
    {
        if (a == b)
            return a;
        if ((a == "i32" && b == "f32") || (a == "f32" && b == "i32"))
            return "i32";
        return "i64";
    }

    //  -------------------------------------------------------------------------------------------------------

    GuestStringPtr store_string(const CallContext &cx, const HostStringTuple &v)
    {
        auto [begin, tagged_code_units] = store_string_into_range(cx, v);
        return GuestStringPtr(begin, tagged_code_units);
    }

    CanonicalOptions mk_opts(const Span<uint8_t> &memory,
                             const std::string &encoding = "utf8",
                             const std::function<int(int, int, int, int)> &realloc = nullptr,
                             const std::function<void()> &post_return = nullptr)
    {
        return CanonicalOptions(memory, encoding, realloc, post_return);
    }

    CallContext mk_cx(const Span<uint8_t> &memory,
                      const std::string &encoding,
                      const std::function<int(int, int, int, int)> &realloc,
                      const std::function<void()> &post_return)
    {
        auto opts = mk_opts(memory, encoding, realloc, post_return);
        return CallContext(opts, ComponentInstance());
    }
}
