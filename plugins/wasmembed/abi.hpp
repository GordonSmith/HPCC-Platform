#if __has_include(<span>)
#include <span>
#else
#include <string>
#include <sstream>
#endif

#include <functional>
#include <optional>
#include <map>

#include <wasmtime.hh>

namespace abi
{
    class CanonicalOptions
    {
    public:
        wasmtime::Span<uint8_t> memory;
        std::string string_encoding;
        std::function<int(int, int, int, int)> realloc;
        std::function<void()> post_return;

        CanonicalOptions(const wasmtime::Span<uint8_t> &memory,
                         const std::string &string_encoding,
                         const std::function<int(int, int, int, int)> &realloc,
                         const std::function<void()> &post_return);

        CanonicalOptions(const CanonicalOptions &other);
    };

    class CallContext;
    class HandleElem
    {
    public:
        int rep;
        bool own;
        std::optional<CallContext *> scope;
        int lend_count;

        HandleElem(int rep, bool own, CallContext *scope = nullptr);
    };

    class HandleTable
    {
    public:
        std::vector<std::optional<HandleElem>> array;
        std::vector<int> free;

        HandleTable();
        HandleElem get(int i);
        int add(const HandleElem &h);
        HandleElem remove(int i);
    };

    class ResourceType;
    class HandleTables
    {
    public:
        std::map<ResourceType, HandleTable> rt_to_table;

        HandleTable table(const ResourceType &rt);
        HandleElem get(const ResourceType &rt, int i);
        int add(const ResourceType &rt, const HandleElem &h);
        HandleElem remove(const ResourceType &rt, int i);
    };

    class ComponentInstance
    {
    public:
        bool may_leave;
        bool may_enter;
        HandleTables handles;

        ComponentInstance();
    };

    class Type
    {
    public:
        virtual ~Type() = default;
    };

    class ResourceType : public Type
    {
    public:
        ComponentInstance impl;
        std::function<void(int)> dtor;

        ResourceType(ComponentInstance impl, std::function<void(int)> dtor = nullptr);
        bool operator<(const ResourceType &rt) const;
    };

    class CallContext
    {
    public:
        CanonicalOptions opts;
        ComponentInstance inst;
        std::vector<HandleElem> lenders;
        int borrow_count;

        CallContext(const CanonicalOptions &opts, const ComponentInstance &inst);
        CallContext(const CallContext &other);
        void operator=(const CallContext &other);

        void track_owning_lend(HandleElem &lending_handle);
        void exit_call();
    };

    CallContext mk_cx(const wasmtime::Span<uint8_t> &memory,
                      const std::string &encoding = "utf8",
                      const std::function<int(int, int, int, int)> &realloc = nullptr,
                      const std::function<void()> &post_return = nullptr);

    enum class ValKind
    {
        Unknown,
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

    enum class HostEncoding
    {
        Utf8,
        Utf16,
        Latin1,
        Latin1_Utf16
    };

    enum class GuestEncoding
    {
        Utf8,
        Utf16le,
        Latin1
    };

    //  ---

    class ExternType : public Type
    {
    public:
        virtual ~ExternType() = default;
    };

    class CoreExternType : public Type
    {
    public:
        virtual ~CoreExternType() = default;
    };

    class CoreImportDecl
    {
    public:
        const std::string &module;
        const std::string &field;

        CoreImportDecl(const std::string &module, const std::string &field);
        virtual ~CoreImportDecl() = default;
    };

    class CoreExportDecl
    {
    public:
        const std::string &name;

        CoreExportDecl(const std::string &name);
        virtual ~CoreExportDecl() = default;
    };

    class ModuleType : public ExternType
    {
    public:
        const std::vector<CoreImportDecl> &imports;
        const std::vector<CoreExportDecl> &exports;

        ModuleType(const std::vector<CoreImportDecl> &imports, const std::vector<CoreExportDecl> &exports);
        virtual ~ModuleType() = default;
    };

    class CoreFuncType : public CoreExternType
    {
    public:
        const std::vector<std::string> &params;
        const std::vector<std::string> &results;

        CoreFuncType(const std::vector<std::string> &params, const std::vector<std::string> &results);
        virtual ~CoreFuncType() = default;
    };

    class CoreMemoryType : public CoreExternType
    {
    public:
        const std::vector<uint32_t> &initial;
        const std::optional<uint32_t> &maximum;

        CoreMemoryType(const std::vector<uint32_t> &initial, const std::optional<uint32_t> &maximum);
        virtual ~CoreMemoryType() = default;
    };

    class ExternDecl
    {
    public:
        const std::string &name;
        const ExternType &t;

        ExternDecl(const std::string &name, const ExternType &t);
        virtual ~ExternDecl() = default;
    };

    class ComponentType : public ExternType
    {
    public:
        const std::vector<ExternDecl> &imports;
        const std::vector<ExternDecl> &exports;

        ComponentType(const std::vector<ExternDecl> &imports, const std::vector<ExternDecl> &exports);
        virtual ~ComponentType() = default;
    };

    class InstanceType : public ExternType
    {
    public:
        const std::vector<ExternDecl> &exports;

        InstanceType(const std::vector<ExternDecl> &exports);
    };

    class ValType : public Type
    {
    public:
        const ValKind kind = ValKind::Unknown;
        virtual ~ValType() = default;
    };

    using Param = std::pair<std::string, ValType>;
    class FuncType : public ExternType
    {
    public:
        const std::vector<Param> params;
        std::vector<ValType> results;

        std::vector<ValType> param_types();
        std::vector<ValType> result_types();
    };

    //  ----------------------------------------------------------------
    class Bool : public ValType
    {
    public:
        const ValKind kind = ValKind::Bool;

        virtual ~Bool() = default;

        bool load(const CallContext &cx, uint32_t ptr);
        void store(const CallContext &cx, const bool &v, uint32_t ptr);
    };

    class S8 : public ValType
    {
    public:
        const ValKind kind = ValKind::S8;

        virtual ~S8() = default;

        int8_t load(const CallContext &cx, uint32_t ptr);
        void store(const CallContext &cx, const int8_t &v, uint32_t ptr);
    };

    class U8 : public ValType
    {
    public:
        const ValKind kind = ValKind::U8;

        virtual ~U8() = default;

        uint8_t load(const CallContext &cx, uint32_t ptr);
        void store(const CallContext &cx, const uint8_t &v, uint32_t ptr);
    };

    class S16 : public ValType
    {
    public:
        const ValKind kind = ValKind::S16;

        virtual ~S16() = default;

        int16_t load(const CallContext &cx, uint32_t ptr);
        void store(const CallContext &cx, const int16_t &v, uint32_t ptr);
    };

    class U16 : public ValType
    {
    public:
        const ValKind kind = ValKind::U16;

        virtual ~U16() = default;

        uint16_t load(const CallContext &cx, uint32_t ptr);
        void store(const CallContext &cx, const uint16_t &v, uint32_t ptr);
    };

    class S32 : public ValType
    {
    public:
        const ValKind kind = ValKind::S32;

        virtual ~S32() = default;

        int32_t load(const CallContext &cx, uint32_t ptr);
        void store(const CallContext &cx, const int32_t &v, uint32_t ptr);
    };

    class U32 : public ValType
    {
    public:
        const ValKind kind = ValKind::U32;

        virtual ~U32() = default;

        uint32_t load(const CallContext &cx, uint32_t ptr);
        void store(const CallContext &cx, const uint32_t &v, uint32_t ptr);
    };

    class S64 : public ValType
    {
    public:
        const ValKind kind = ValKind::S64;

        virtual ~S64() = default;

        int64_t load(const CallContext &cx, uint32_t ptr);
        void store(const CallContext &cx, const int64_t &v, uint32_t ptr);
    };

    class U64 : public ValType
    {
    public:
        const ValKind kind = ValKind::U64;

        virtual ~U64() = default;

        uint64_t load(const CallContext &cx, uint32_t ptr);
        void store(const CallContext &cx, const uint64_t &v, uint32_t ptr);
    };

    class Float32 : public ValType
    {
    public:
        const ValKind kind = ValKind::Float32;

        virtual ~Float32() = default;

        float load(const CallContext &cx, uint32_t ptr);
        void store(const CallContext &cx, const float &v, uint32_t ptr);
    };

    class Float64 : public ValType
    {
    public:
        const ValKind kind = ValKind::Float64;

        virtual ~Float64() = default;

        double load(const CallContext &cx, uint32_t ptr);
        void store(const CallContext &cx, const double &v, uint32_t ptr);
    };

    class Char : public ValType
    {
    public:
        const ValKind kind = ValKind::Char;

        virtual ~Char() = default;

        char load(const CallContext &cx, uint32_t ptr);
        void store(const CallContext &cx, const char &v, uint32_t ptr);
    };

    using HostStringTuple = std::tuple<const char * /*ptr*/, std::string /*encoding*/, size_t /*byte length*/>;
    using GuestStringTuple = std::tuple<uint32_t /*ptr*/, std::string /*encoding*/, uint32_t /*byte length*/>;
    using GuestStringPtr = std::tuple<uint32_t /*guest mem ptr*/, uint32_t /*byte length*/>;
    class String : public ValType
    {
    public:
        const ValKind kind = ValKind::String;

        virtual ~String() = default;

        HostStringTuple load(const CallContext &cx, uint32_t ptr);
        GuestStringPtr store(const CallContext &cx, const HostStringTuple &v);
    };

    class List : public ValType
    {
    public:
        const ValKind kind = ValKind::List;
        const ValType &t;

        List(const ValType &t);
        virtual ~List() = default;
    };

    class Field : public ValType
    {
    public:
        const ValKind kind = ValKind::Field;
        const std::string &label;
        const ValType &t;

        Field(const std::string &label, const ValType &t);
        virtual ~Field() = default;
    };

    class Record : public ValType
    {
    public:
        const ValKind kind = ValKind::Record;
        const std::vector<Field> &fields;

        Record(const std::vector<Field> &fields);
        virtual ~Record() = default;
    };

    class Tuple : public ValType
    {
    public:
        const ValKind kind = ValKind::Tuple;
        const std::vector<ValType> &ts;

        Tuple(const std::vector<ValType> &ts);
        virtual ~Tuple() = default;
    };

    class Case : public ValType
    {
    public:
        const ValKind kind = ValKind::Case;
        std::string label;
        std::optional<ValType> t;
        std::optional<std::string> refines;

        Case(const std::string &label, const std::optional<ValType> &t = std::nullopt, const std::optional<std::string> &refines = std::nullopt);
        virtual ~Case() = default;
    };

    class Variant : public ValType
    {
    public:
        const ValKind kind = ValKind::Variant;
        const std::vector<Case> &cases;

        Variant(const std::vector<Case> &cases);
        virtual ~Variant() = default;
    };

    class Enum : public ValType
    {
    public:
        const ValKind kind = ValKind::Enum;
        const std::vector<std::string> &labels;

        Enum(const std::vector<std::string> &labels);
        virtual ~Enum() = default;
    };

    class Option : public ValType
    {
    public:
        const ValKind kind = ValKind::Option;
        const ValType &t;

        Option(const ValType &t);
        virtual ~Option() = default;
    };

    class Result : public ValType
    {
    public:
        const ValKind kind = ValKind::Result;
        const std::optional<ValType> &ok;
        const std::optional<ValType> &error;

        Result(const std::optional<ValType> &ok, const std::optional<ValType> &error);
        virtual ~Result() = default;
    };

    class Flags : public ValType
    {
    public:
        const ValKind kind = ValKind::Flags;
        const std::vector<std::string> &labels;

        Flags(const std::vector<std::string> &labels);
        virtual ~Flags() = default;
    };

    class Own : public ValType
    {
    public:
        const ValKind kind = ValKind::Own;
        const ResourceType &rt;

        Own(const ResourceType &rt);
        virtual ~Own() = default;
    };

    class Borrow : public ValType
    {
    public:
        const ValKind kind = ValKind::Borrow;
        const ResourceType &rt;

        Borrow(const ResourceType &rt);
        virtual ~Borrow() = default;
    };

    //  ---
    template <typename T>
    T load_int(const CallContext &cx, uint32_t ptr, uint8_t nbytes);
    bool convert_int_to_bool(uint8_t i);

    template <typename T>
    void store_int(const CallContext &cx, const T &v, uint32_t ptr, uint8_t nbytes, bool isSigned = false);

    HostStringTuple load_string(const CallContext &cx, uint32_t ptr);
    GuestStringPtr store_string(const CallContext &cx, const HostStringTuple &v);
}
