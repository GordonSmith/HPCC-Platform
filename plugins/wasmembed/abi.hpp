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
        HandleElem &get(int i);
        int add(const HandleElem &h);
        HandleElem remove(int i);
    };

    class ResourceType;
    class HandleTables
    {
    public:
        std::map<std::shared_ptr<ResourceType>, HandleTable> rt_to_table;

        HandleTable &table(std::shared_ptr<ResourceType> rt);
        HandleElem &get(std::shared_ptr<ResourceType> rt, int i);
        int add(std::shared_ptr<ResourceType> rt, const HandleElem &h);
        HandleElem remove(std::shared_ptr<ResourceType> rt, int i);
    };

    class ComponentInstance
    {
    public:
        bool may_leave;
        bool may_enter;
        HandleTables handles;

        ComponentInstance();
    };

    class ResourceType
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

    template <typename T>
    T load_int(const CallContext &cx, uint32_t ptr, uint8_t nbytes);
    bool convert_int_to_bool(uint8_t i);

    template <typename T>
    void store_int(const CallContext &cx, const T &v, uint32_t ptr, uint8_t nbytes, bool isSigned = false);

    std::tuple<uint32_t /*ptr*/, std::string /*encoding*/, uint32_t /*byte length*/> load_string(const CallContext &cx, uint32_t ptr);
    std::tuple<wasmtime::Val, wasmtime::Val> store_string(const CallContext &cx, const std::string &v);
}
