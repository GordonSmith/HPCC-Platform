#include "host.hpp"

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

std::string wat =
    "(module\n"
    "  (func $gcd (param i32 i32) (result i32)\n"
    "    (local i32)\n"
    "    block  ;; label = @1\n"
    "      block  ;; label = @2\n"
    "        local.get 0\n"
    "        br_if 0 (;@2;)\n"
    "        local.get 1\n"
    "        local.set 2\n"
    "        br 1 (;@1;)\n"
    "      end\n"
    "      loop ;; label = @2\n"
    "        local.get 1\n"
    "        local.get 0\n"
    "        local.tee 2\n"
    "        i32.rem_u\n"
    "        local.set 0\n"
    "        local.get 2\n"
    "        local.set 1\n"
    "        local.get 0\n"
    "        br_if 0 (;@2;)\n"
    "      end\n"
    "    end\n"
    "    local.get 2\n"
    "  )\n"
    "  (export \"gcd\" (func $gcd))\n"
    ")\n";

std::shared_ptr<IHost> instance;
std::once_flag initFlag;

class Host : public IHost
{
protected:
    Host(std::function<void(const char *)> dbglog)
    {
        Engine engine;
        Store store(engine);

        dbglog("Compiling module");
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
        // auto host_func = linker.func_wrap("global", "print",
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
    Host(const Host &) = delete;
    Host &operator=(const Host &) = delete;
    ~Host()
    {
    }

    static std::shared_ptr<IHost> getInstance(std::function<void(const char *)> dbglog)
    {
        std::call_once(initFlag, [dbglog]()
                       { instance = std::shared_ptr<Host>(new Host(dbglog)); });
        return instance;
    }
};

std::shared_ptr<IHost> createIHost(std::function<void(const char *)> dbglog)
{
    return Host::getInstance(dbglog);
}
