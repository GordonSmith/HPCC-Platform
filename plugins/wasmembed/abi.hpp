#include <wasmtime.hh>

//  ABI
int align_to(int ptr, int alignment);

//  ABI Loading ---
template <typename T>
T load_int(const wasmtime::Span<uint8_t> &data, int32_t ptr);

std::pair<uint32_t /*ptr*/, uint32_t /*byte length*/> load_string(const wasmtime::Span<uint8_t> &data, uint32_t ptr);

//  ABI Storing  ---
