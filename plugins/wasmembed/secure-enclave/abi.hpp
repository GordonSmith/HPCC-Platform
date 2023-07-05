//  See:  https://github.com/WebAssembly/component-model/blob/main/design/mvp/CanonicalABI.md

#include <wasmtime.hh>
#include <cmath>

auto UTF16_TAG = 1 << 31;

int align_to(int ptr, int alignment)
{
    return std::ceil(ptr / alignment) * alignment;
}

int load_int(const wasmtime::Span<uint8_t> &memory, int32_t ptr, int32_t nbytes, bool is_signed = false)
{
    int result = 0;
    for (int i = 0; i < nbytes; i++)
    {
        int b = memory[ptr + i];
        if (i == 3 && is_signed && b >= 0x80)
        {
            b -= 0x100;
        }
        result += b << (i * 8);
    }
    return result;
}

std::string load_string_from_range(const wasmtime::Span<uint8_t> &memory, uint32_t ptr, uint32_t tagged_code_units)
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
    if (ptr + byte_length > memory.size())
    {
        throw std::runtime_error("Out of bounds");
    }

    std::string s;
    try
    {
        s.resize(byte_length);
        for (const char *p = (const char *)memory.begin() + ptr; p < (const char *)memory.begin() + ptr + byte_length; p++)
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

std::string load_string(const wasmtime::Span<uint8_t> &memory, int32_t ptr)
{
    uint32_t begin = load_int(memory, (int32_t)ptr, 4);
    uint32_t tagged_code_units = load_int(memory, (int32_t)ptr + 4, 4);
    return load_string_from_range(memory, begin, tagged_code_units);
}
