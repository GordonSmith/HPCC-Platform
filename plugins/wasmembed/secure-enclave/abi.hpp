#include <wasmtime.hh>

//  ABI
int align_to(int ptr, int alignment);

//  ABI Loading ---
template <typename T>
T load_int(const wasmtime::Span<uint8_t> &data, int32_t ptr);

std::string load_string(const wasmtime::Span<uint8_t> &data, uint32_t ptr);

//  ABI Storing  ---
// void store_string(const wasmtime::Span<uint8_t> &data, uint32_t ptr);

//  Other Helpers ---
std::vector<uint8_t> read_wasm_binary_to_buffer(const std::string &filename);
std::string extractContentInDoubleQuotes(const std::string &input);
std::pair<std::string, std::string> splitQualifiedID(const std::string &qualifiedName);
std::string createQualifiedID(const std::string &wasmName, const std::string &funcName);
