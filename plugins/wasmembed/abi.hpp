#if __has_include(<span>)
#include <span>
#else
#include <string>
#include <sstream>
#endif

#include <wasmtime.hh>

namespace abi
{
    std::tuple<uint32_t /*ptr*/, std::string /*encoding*/, uint32_t /*byte length*/> load_string(const wasmtime::Span<uint8_t> &data, uint32_t ptr);
    void store_string(const wasmtime::Span<uint8_t> &data, const std::string &utf8Str);
}
