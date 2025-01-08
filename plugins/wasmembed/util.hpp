#include <cstdint>
#include <string>
#include <vector>
#include "component-model/src/context.hpp"

std::vector<uint8_t> readWasmBinaryToBuffer(const char *filename);
std::string extractContentInDoubleQuotes(const std::string &input);
std::pair<std::string, std::string> splitQualifiedID(const std::string &qualifiedName);
std::string createQualifiedID(const std::string &wasmName, const std::string &funcName);

const char * encodingToICU(const cmcpp::Encoding encoding);
std::pair<void *, size_t> convert(void *dest, uint32_t dest_byte_len, const void *src, uint32_t src_byte_len, cmcpp::Encoding from_encoding, cmcpp::Encoding to_encoding);
