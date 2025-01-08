#include <utility>
#include "context.hpp"

using namespace cmcpp;

void trap(const char *msg = "");
bool isLatin1(const std::string &std);
std::pair<char8_t *, size_t> convert(char8_t *dest, uint32_t dest_byte_len, const char8_t *src, uint32_t src_byte_len, Encoding from_encoding, Encoding to_encoding);
