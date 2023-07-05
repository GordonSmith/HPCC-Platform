//  See:  https://github.com/WebAssembly/component-model/blob/main/design/mvp/CanonicalABI.md

#include <wasmtime.hh>
#include <regex>
#include <cmath>
#include <fstream>
#include <iostream>
#include <sstream>

auto UTF16_TAG = 1 << 31;

int align_to(int ptr, int alignment)
{
    return std::ceil(ptr / alignment) * alignment;
}

//  loading ---

int load_int(const wasmtime::Span<uint8_t> &data, int32_t ptr, int32_t nbytes, bool is_signed = false)
{
    int result = 0;
    for (int i = 0; i < nbytes; i++)
    {
        int b = data[ptr + i];
        if (i == 3 && is_signed && b >= 0x80)
        {
            b -= 0x100;
        }
        result += b << (i * 8);
    }
    return result;
}

std::string load_string_from_range(const wasmtime::Span<uint8_t> &data, uint32_t ptr, uint32_t tagged_code_units)
{
    std::string global_encoding = "utf8";
    std::string encoding;
    uint32_t byte_length;
    uint32_t alignment;
    if (global_encoding.compare("utf8") == 0)
    {
        alignment = 1;
        byte_length = tagged_code_units;
        encoding = "utf-8";
    }
    else if (global_encoding.compare("utf16") == 0)
    {
        throw std::runtime_error("utf16 not supported");
        alignment = 2;
        byte_length = 2 * tagged_code_units;
        encoding = "utf-16-le";
    }
    else if (global_encoding.compare("latin1+utf16") == 0)
    {
        throw std::runtime_error("latin1+utf16 not supported");
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
    try
    {
        s.resize(byte_length);
        for (const char *p = (const char *)data.begin() + ptr; p < (const char *)data.begin() + ptr + byte_length; p++)
        {
            s += *p;
        }
    }
    catch (const std::exception &unicodeError)
    {
        // trap();
    }
    return s;
}

std::string load_string(const wasmtime::Span<uint8_t> &data, uint32_t ptr)
{
    uint32_t begin = load_int(data, ptr, 4);
    uint32_t tagged_code_units = load_int(data, ptr + 4, 4);
    return load_string_from_range(data, begin, tagged_code_units);
}

//  Storing  ---
void store_int(const wasmtime::Span<uint8_t> &data, int64_t v, size_t ptr, size_t nbytes, bool _signed = false)
{
    // convert v to little-endian byte array
    uint8_t bytes[nbytes];
    for (size_t i = 0; i < nbytes; i++)
    {
        bytes[i] = (v >> (i * 8)) & 0xFF;
    }
    // copy bytes to memory
    memcpy(&data[ptr], bytes, nbytes);
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
    std::regex pattern("export \"([^\"]*)\"");
    std::smatch match;

    if (std::regex_search(input, match, pattern) && match.size() > 1)
    {
        return match.str(1);
    }

    return "";
}

std::pair<std::string, std::string> splitQualifiedName(const std::string &qualifiedName)
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

std::string joinQualifiedName(const std::string &wasmName, const std::string &funcName)
{
    return wasmName + "." + funcName;
}