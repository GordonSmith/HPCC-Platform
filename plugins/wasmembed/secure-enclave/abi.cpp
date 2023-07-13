/*
  See:  https://github.com/WebAssembly/component-model/blob/main/design/mvp/CanonicalABI.md
        https://github.com/WebAssembly/component-model/blob/main/design/mvp/canonical-abi/definitions.py
*/

#include "abi.hpp"
#include <cmath>
#include <fstream>
#include <iostream>
#include <sstream>
#include <vector>

auto UTF16_TAG = 1 << 31;

int align_to(int ptr, int alignment)
{
    return std::ceil(ptr / alignment) * alignment;
}

//  loading ---

/* canaonical load_int (python)

def load_int(cx, ptr, nbytes, signed = False):
  return int.from_bytes(cx.opts.memory[ptr : ptr+nbytes], 'little', signed=signed)

*/

template <typename T>
T load_int(const wasmtime::Span<uint8_t> &data, int32_t ptr)
{
    T retVal = 0;
    auto nbytes = sizeof(retVal);
    for (int i = 0; i < nbytes; ++i)
    {
        uint8_t b = data[ptr + i];
        if (i == nbytes - 1 && std::is_signed<T>::value && b >= 0x80)
            b -= 0x100;
        retVal += b << (i * 8);
    }
    return retVal;
}

/* canaonical load_string_from_range (python)

def load_string_from_range(cx, ptr, tagged_code_units):
  match cx.opts.string_encoding:
    case 'utf8':
      alignment = 1
      byte_length = tagged_code_units
      encoding = 'utf-8'
    case 'utf16':
      alignment = 2
      byte_length = 2 * tagged_code_units
      encoding = 'utf-16-le'
    case 'latin1+utf16':
      alignment = 2
      if bool(tagged_code_units & UTF16_TAG):
        byte_length = 2 * (tagged_code_units ^ UTF16_TAG)
        encoding = 'utf-16-le'
      else:
        byte_length = tagged_code_units
        encoding = 'latin-1'

  trap_if(ptr != align_to(ptr, alignment))
  trap_if(ptr + byte_length > len(cx.opts.memory))
  try:
    s = cx.opts.memory[ptr : ptr+byte_length].decode(encoding)
  except UnicodeError:
    trap()

  return (s, cx.opts.string_encoding, tagged_code_units)

*/

//  More:  Not currently available from the wasmtime::context object, see https://github.com/bytecodealliance/wasmtime/issues/6719
std::string global_encoding = "utf8";

std::string load_string_from_range(const wasmtime::Span<uint8_t> &data, uint32_t ptr, uint32_t tagged_code_units)
{
    std::string encoding = "utf-8";
    uint32_t byte_length = tagged_code_units;
    uint32_t alignment = 1;
    if (global_encoding.compare("utf8") == 0)
    {
        alignment = 1;
        byte_length = tagged_code_units;
        encoding = "utf-8";
    }
    else if (global_encoding.compare("utf16") == 0)
    {
        alignment = 2;
        byte_length = 2 * tagged_code_units;
        encoding = "utf-16-le";
    }
    else if (global_encoding.compare("latin1+utf16") == 0)
    {
        alignment = 2;
        if (tagged_code_units & UTF16_TAG)
        {
            byte_length = 2 * (tagged_code_units ^ UTF16_TAG);
            encoding = "utf-16-le";
        }
        else
        {
            byte_length = tagged_code_units;
            encoding = "latin-1";
        }
    }

    if (ptr != align_to(ptr, alignment))
    {
        throw std::runtime_error("Invalid alignment");
    }
    if (ptr + byte_length > data.size())
    {
        throw std::runtime_error("Out of bounds");
    }

    std::string s;
    s.resize(byte_length);
    memcpy(&s[0], &data[ptr], byte_length);
    return s;
}

std::string load_string(const wasmtime::Span<uint8_t> &data, uint32_t ptr)
{
    uint32_t begin = load_int<uint32_t>(data, ptr);
    uint32_t tagged_code_units = load_int<uint32_t>(data, ptr + 4);
    return load_string_from_range(data, begin, tagged_code_units);
}

//  Storing  ---
void store_int(const wasmtime::Span<uint8_t> &data, int64_t v, size_t ptr, size_t nbytes, bool _signed = false)
{
    // convert v to little-endian byte array
    std::vector<uint8_t> bytes(nbytes);
    for (size_t i = 0; i < nbytes; i++)
    {
        bytes[i] = (v >> (i * 8)) & 0xFF;
    }
    // copy bytes to memory
    memcpy(&data[ptr], bytes.data(), nbytes);
}

//  Other  ---
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

std::string extractContentInDoubleQuotes(const std::string &input)
{

    int firstQuote = input.find_first_of('"');
    int secondQuote = input.find('"', firstQuote + 1);
    if (firstQuote == std::string::npos || secondQuote == std::string::npos)
    {
        return "";
    }
    return input.substr(firstQuote + 1, secondQuote - firstQuote - 1);
}

std::pair<std::string, std::string> splitQualifiedID(const std::string &qualifiedName)
{
    std::istringstream iss(qualifiedName);
    std::vector<std::string> tokens;
    std::string token;

    while (std::getline(iss, token, '.'))
    {
        tokens.push_back(token);
    }
    if (tokens.size() != 2)
    {
        throw std::runtime_error("Invalid import function " + qualifiedName + ", expected format: <module>.<function>");
    }
    return std::make_pair(tokens[0], tokens[1]);
}

std::string createQualifiedID(const std::string &wasmName, const std::string &funcName)
{
    return wasmName + "." + funcName;
}