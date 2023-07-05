#ifdef _MSC_VER
 #define DECL_EXPORT __declspec(dllexport)
 #define DECL_IMPORT __declspec(dllimport)
 #define DECL_LOCAL
 #define DECL_EXCEPTION
#elif __GNUC__ >= 4
 #define DECL_EXPORT __attribute__ ((visibility ("default")))
 #define DECL_IMPORT __attribute__ ((visibility ("default")))
 #define DECL_LOCAL  __attribute__ ((visibility ("hidden")))
 #define DECL_EXCEPTION DECL_EXPORT
#else
 #define DECL_EXPORT
 #define DECL_IMPORT
 #define DECL_LOCAL
 #define DECL_EXCEPTION
#endif

#include "secureenclave.hpp"

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
    SecureEnclave(const char * _wat, std::function<void(const char *)> dbglog)
    {
        Engine engine;
        Store store(engine);

        dbglog("Compiling module");
        std::string wat = "(module\n" + std::string(_wat) + "\n)\n";

        auto module = Module::compile(engine, wat).unwrap();

        dbglog("Create wasi");
        WasiConfig wasi;
        // wasi.inherit_argv();
        // wasi.inherit_env();
        // wasi.inherit_stdin();
        // wasi.inherit_stdout();
        // wasi.inherit_stderr();
        store.context().set_wasi(std::move(wasi)).unwrap();

        dbglog("Linking");
        Linker linker(engine);
        linker.define_wasi().unwrap();

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

        dbglog("Extracting add...");
        auto gcd = std::get<Func>(*wasmInstance.get(store, "gcd"));

        // And last but not least we can call it!
        dbglog("Calling gcd(22, 11)...");
        dbglog(std::to_string(gcd.call(store, {22, 11}).unwrap()[0].i32()).c_str());

        dbglog("Done");
    }

public:
    SecureEnclave(const SecureEnclave &) = delete;
    SecureEnclave &operator=(const SecureEnclave &) = delete;
    ~SecureEnclave()
    {
    }

    static std::shared_ptr<ISecureEnclave> getInstance(const char * wat, std::function<void(const char *)> dbglog)
    {
        std::call_once(initFlag, [wat, dbglog]()
                       { instance = std::shared_ptr<SecureEnclave>(new SecureEnclave(wat, dbglog)); });
        return instance;
    }
};

std::shared_ptr<ISecureEnclave> createISecureEnclave(const char * wat, std::function<void(const char *)> dbglog)
{
    return SecureEnclave::getInstance(wat, dbglog);
}
