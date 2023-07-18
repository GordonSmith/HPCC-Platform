#include <string>
#include <vector>

std::vector<uint8_t> read_wasm_binary_to_buffer(const std::string &filename);
std::string extractContentInDoubleQuotes(const std::string &input);
std::pair<std::string, std::string> splitQualifiedID(const std::string &qualifiedName);
std::string createQualifiedID(const std::string &wasmName, const std::string &funcName);
