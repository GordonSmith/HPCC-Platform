#ifdef _MSC_VER
#define DECL_EXPORT __declspec(dllexport)
#define DECL_IMPORT __declspec(dllimport)
#define DECL_LOCAL
#define DECL_EXCEPTION
#elif __GNUC__ >= 4
#define DECL_EXPORT __attribute__((visibility("default")))
#define DECL_IMPORT __attribute__((visibility("default")))
#define DECL_LOCAL __attribute__((visibility("hidden")))
#define DECL_EXCEPTION DECL_EXPORT
#else
#define DECL_EXPORT
#define DECL_IMPORT
#define DECL_LOCAL
#define DECL_EXCEPTION
#endif

#include "secure-enclave.hpp"

#include <wasmtime.hh>

#include <mutex>
#include <fstream>
#include <iostream>
#include <sstream>

using namespace wasmtime;

std::vector<uint8_t> read_wasm_binary_to_buffer(const std::string &filename)
{
    std::ifstream file(filename, std::ios::binary | std::ios::ate);
    if (!file)
    {
        throw std::runtime_error("Failed to open file");
    }

    std::streamsize size = file.tellg();
    file.seekg(0, std::ios::beg);

    std::vector<uint8_t> buffer(size);
    if (!file.read(reinterpret_cast<char *>(buffer.data()), size))
    {
        throw std::runtime_error("Failed to read file");
    }

    return buffer;
}

std::shared_ptr<ISecureEnclave> instance;
std::once_flag initFlag;

class SecureEnclave : public ISecureEnclave
{
protected:
    Engine engine;
    Store store;
    Linker linker;
    std::vector<wasmtime::Val> results;
    std::function<void(const char *)> dbglog;

    SecureEnclave(std::function<void(const char *)> _dbglog) : store(engine),
                                                               linker(engine),
                                                               dbglog(_dbglog)
    {
        dbglog("Create wasi");
        WasiConfig wasi;
        // wasi.inherit_argv();
        // wasi.inherit_env();
        // wasi.inherit_stdin();
        // wasi.inherit_stdout();
        // wasi.inherit_stderr();
        store.context().set_wasi(std::move(wasi)).unwrap();

        dbglog("Linking");
        linker.define_wasi().unwrap();
    }

public:
    SecureEnclave(const SecureEnclave &) = delete;
    SecureEnclave &operator=(const SecureEnclave &) = delete;
    ~SecureEnclave()
    {
    }

    static std::shared_ptr<ISecureEnclave> getInstance(std::function<void(const char *)> dbglog)
    {
        std::call_once(initFlag, [dbglog]()
                       { instance = std::shared_ptr<SecureEnclave>(new SecureEnclave(dbglog)); });
        instance = std::shared_ptr<SecureEnclave>(new SecureEnclave(dbglog));
        return instance;
    }

    //  ISecureEnclave  ---
    virtual void appendWatModule(const char *wat, Values values)
    {
        dbglog("Compiling module");
        auto module = Module::compile(engine, wat).unwrap();

        // std::cout << "Creating callback...\n";
        // auto secureEnclave_func = linker.func_wrap("global", "print",
        //                                   [](Caller caller, uint32_t msg, uint32_t msg_len)
        //                                   {

        //                                       // const uint8_t* data = memory.data();
        //                                       //     std::string str(reinterpret_cast<const char*>(data + msg), reinterpret_cast<const char*>(data + msg + msg_len));

        //                                       // auto memory = std::get<Memory>(*caller.get_export("memory"));
        //                                       // auto type = memory.type(caller.context());
        //                                       // auto data = memory.data(caller.context());
        //                                       // auto size = memory.size(caller.context());

        //                                       // std::string str(data[msg], data[msg] + msg_len);

        //                                       // Copy the string from the Wasm memory into the C++ string
        //                                       // const char *msg_ptr = reinterpret_cast<const char *>(data[msg]);
        //                                       // auto memory = std::get<Memory>(caller.get_export("memory")).unwrap();
        //                                       // auto xxx = memory[msg];
        //                                       // auto msg = memory.data(store)[msg];

        //     auto memory = std::get<Memory>(*caller.get_export("memory"));
        //     auto data = memory.data(caller.context());
        //     auto msg_ptr = (char *)&data[msg];
        //     std::string str(msg_ptr, msg_len);
        //     printf("print: %s\n", str.c_str()); })
        //                      .unwrap();

        // Once we've got that all set up we can then move to the instantiation
        // phase, pairing together a compiled module as well as a set of imports.
        // Note that this is where the wasm `start` function, if any, would run.
        dbglog("Instantiating module...");
        Instance wasmInstance = linker.instantiate(store, module).unwrap();
        linker.define_instance(store, "linking", wasmInstance).unwrap();

        // std::cout << "Extracting memory...\n";
        // auto memory = std::get<Memory>(*wasmInstance.get(store, "memory"));

        dbglog("Extracting myfunc...");
        auto myFunc = std::get<Func>(*wasmInstance.get(store, "myFunc"));

        // And last but not least we can call it!
        dbglog("Calling myFunc...");
        std::vector<wasmtime::Val> args;
        for (auto value : values)
        {
            switch (value.first)
            {
            case DataType::INT32:
                args.push_back(wasmtime::Val(std::get<int32_t>(value.second)));
                break;
            case DataType::INT64:
                args.push_back(wasmtime::Val(std::get<int64_t>(value.second)));
                break;
            case DataType::FLOAT32:
                args.push_back(wasmtime::Val(std::get<float32_t>(value.second)));
                break;
            case DataType::FLOAT64:
                args.push_back(wasmtime::Val(std::get<float64_t>(value.second)));
                break;
            }
        }
        results = myFunc.call(store, args).unwrap();
        dbglog(std::to_string(results[0].i32()).c_str());
        dbglog("Done");
    }

    virtual int32_t i32Result()
    {
        if (results[0].kind() == wasmtime::ValKind::I64)
            return (int32_t)results[0].i64();
        return results[0].i32();
    };

    virtual int64_t i64Result()
    {
        if (results[0].kind() == wasmtime::ValKind::I32)
            return (int64_t)results[0].i32();
        return results[0].i64();
    }
    virtual float32_t f32Result()
    {
        if (results[0].kind() == wasmtime::ValKind::F64)
            return (float32_t)results[0].f64();
        return results[0].f32();
    }
    virtual float64_t f64Result()
    {
        if (results[0].kind() == wasmtime::ValKind::F32)
            return (float64_t)results[0].f32();
        return results[0].f64();
    }
};

std::shared_ptr<ISecureEnclave> createISecureEnclave(std::function<void(const char *)> dbglog)
{
    return SecureEnclave::getInstance(dbglog);
}
