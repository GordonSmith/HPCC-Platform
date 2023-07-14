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

/*  canonical store_int (python)

def store_int(cx, v, ptr, nbytes, _signed = False):
  cx.opts.memory[ptr : ptr+nbytes] = int.to_bytes(v, nbytes, 'little', signed=_signed)

*/

void store_int(wasmtime::Span<uint8_t> &data, int v, int ptr, int nbytes, bool _signed = false)
{
    int i;
    for (i = 0; i < nbytes; i++)
    {
        data[ptr + i] = v & 0xff;
        v >>= 8;
    }
}

/* canonical store_string_copy (python)

MAX_STRING_BYTE_LENGTH = (1 << 31) - 1

def store_string_copy(cx, src, src_code_units, dst_code_unit_size, dst_alignment, dst_encoding):
  dst_byte_length = dst_code_unit_size * src_code_units
  trap_if(dst_byte_length > MAX_STRING_BYTE_LENGTH)
  ptr = cx.opts.realloc(0, 0, dst_alignment, dst_byte_length)
  trap_if(ptr != align_to(ptr, dst_alignment))
  trap_if(ptr + dst_byte_length > len(cx.opts.memory))
  encoded = src.encode(dst_encoding)
  assert(dst_byte_length == len(encoded))
  cx.opts.memory[ptr : ptr+len(encoded)] = encoded
  return (ptr, src_code_units)

*/

/* canonical store_string_into_range (python)

 def store_string_into_range(cx, v):
   src, src_encoding, src_tagged_code_units = v

   if src_encoding == 'latin1+utf16':
     if bool(src_tagged_code_units & UTF16_TAG):
       src_simple_encoding = 'utf16'
       src_code_units = src_tagged_code_units ^ UTF16_TAG
     else:
       src_simple_encoding = 'latin1'
       src_code_units = src_tagged_code_units
   else:
     src_simple_encoding = src_encoding
     src_code_units = src_tagged_code_units

   match cx.opts.string_encoding:
     case 'utf8':
       match src_simple_encoding:
         case 'utf8'         : return store_string_copy(cx, src, src_code_units, 1, 1, 'utf-8')
         case 'utf16'        : return store_utf16_to_utf8(cx, src, src_code_units)
         case 'latin1'       : return store_latin1_to_utf8(cx, src, src_code_units)
     case 'utf16':
       match src_simple_encoding:
         case 'utf8'         : return store_utf8_to_utf16(cx, src, src_code_units)
         case 'utf16'        : return store_string_copy(cx, src, src_code_units, 2, 2, 'utf-16-le')
         case 'latin1'       : return store_string_copy(cx, src, src_code_units, 2, 2, 'utf-16-le')
     case 'latin1+utf16':
       match src_encoding:
         case 'utf8'         : return store_string_to_latin1_or_utf16(cx, src, src_code_units)
         case 'utf16'        : return store_string_to_latin1_or_utf16(cx, src, src_code_units)
         case 'latin1+utf16' :
           match src_simple_encoding:
             case 'latin1'   : return store_string_copy(cx, src, src_code_units, 1, 2, 'latin-1')
             case 'utf16'    : return store_probably_utf16_to_latin1_or_utf16(cx, src, src_code_units)

 */

const uint64_t MAX_STRING_BYTE_LENGTH = (1 << 31) - 1;

std::pair<uint32_t, uint32_t> store_string_copy(const wasmtime::Span<uint8_t> &data, const std::string &src, uint32_t src_code_units, uint32_t dst_code_unit_size, uint32_t dst_alignment, const std::string &dst_encoding)
{
    uint32_t dst_byte_length = dst_code_unit_size * src_code_units;
    if (dst_byte_length > MAX_STRING_BYTE_LENGTH)
    {
        throw std::runtime_error("String too long");
    }
    uint32_t ptr = cx.realloc(0, 0, dst_alignment, dst_byte_length);
    if (ptr != align_to(ptr, dst_alignment))
    {
        throw std::runtime_error("Invalid alignment");
    }
    if (ptr + dst_byte_length > cx.memory().data().size())
    {
        throw std::runtime_error("Out of memory");
    }
    std::vector<uint8_t> encoded(src.size() * 4);
    auto it = std::back_inserter(encoded);
    std::wstring_convert<std::codecvt_utf8_utf16<char16_t>, char16_t> convert;
    std::u16string utf16 = convert.from_bytes(src);
    for (char16_t c : utf16)
    {
        if (dst_encoding == "utf-8")
        {
            if (c < 0x80)
            {
                *it++ = c;
            }
            else if (c < 0x800)
            {
                *it++ = 0xC0 | (c >> 6);
                *it++ = 0x80 | (c & 0x3F);
            }
            else
            {
                *it++ = 0xE0 | (c >> 12);
                *it++ = 0x80 | ((c >> 6) & 0x3F);
                *it++ = 0x80 | (c & 0x3F);
            }
        }
        else if (dst_encoding == "utf-16-le")
        {
            *it++ = c & 0xFF;
            *it++ = c >> 8;
        }
        else if (dst_encoding == "latin-1")
        {
            if (c < 0x100)
            {
                *it++ = c;
            }
            else
            {
                *it++ = '?';
            }
        }
        else
        {
            throw std::runtime_error("Unsupported encoding");
        }
    }
    assert(dst_byte_length == encoded.size());
    std::copy(encoded.begin(), encoded.end(), cx.memory().data().begin() + ptr);
    return std::make_pair(ptr, src_code_units);
}

void store_string_into_range(const wasmtime::Span<uint8_t> &data, const std::tuple<std::string, std::string, uint32_t> &v)
{
    std::string src = std::get<0>(v);
    std::string src_encoding = std::get<1>(v);
    uint32_t src_tagged_code_units = std::get<2>(v);

    std::string src_simple_encoding;
    uint32_t src_code_units;

    if (src_encoding == "latin1+utf16")
    {
        if (src_tagged_code_units & UTF16_TAG)
        {
            src_simple_encoding = "utf16";
            src_code_units = src_tagged_code_units ^ UTF16_TAG;
        }
        else
        {
            src_simple_encoding = "latin1";
            src_code_units = src_tagged_code_units;
        }
    }
    else
    {
        src_simple_encoding = src_encoding;
        src_code_units = src_tagged_code_units;
    }

    std::string encoding = "utf-8";
    uint32_t byte_length = src_code_units;
    uint32_t alignment = 1;

    if (global_encoding.compare("utf8") == 0)
    {
        alignment = 1;
        byte_length = src_code_units;
        encoding = "utf-8";
    }
    else if (global_encoding.compare("utf16") == 0)
    {
        alignment = 2;
        byte_length = 2 * src_code_units;
        encoding = "utf-16-le";
    }
    else if (global_encoding.compare("latin1+utf16") == 0)
    {
        alignment = 2;
        if (src_tagged_code_units & UTF16_TAG)
        {
            byte_length = 2 * (src_tagged_code_units ^ UTF16_TAG);
            encoding = "utf-16-le";
        }
        else
        {
            byte_length = src_code_units;
            encoding = "latin-1";
        }
    }

    uint32_t begin = data.size();
    data.resize(data.size() + byte_length);
    uint8_t *dst = data.data() + begin;

    if (encoding == "utf-8")
    {
        memcpy(dst, src.c_str(), byte_length);
    }
    else if (encoding == "utf-16-le")
    {
        for (uint32_t i = 0; i < src_code_units; i++)
        {
            uint16_t c = src[i];
            dst[2 * i] = c & 0xff;
            dst[2 * i + 1] = c >> 8;
        }
    }
    else if (encoding == "latin-1")
    {
        for (uint32_t i = 0; i < src_code_units; i++)
        {
            dst[i] = src[i];
        }
    }

    uint32_t tagged_code_units = src_tagged_code_units;
    if (src_simple_encoding == "utf16")
    {
        tagged_code_units |= UTF16_TAG;
    }

    store_int<uint32_t>(data, begin, tagged_code_units);
}

/* canaonical store_string (python)

def store_string(cx, v, ptr):
  begin, tagged_code_units = store_string_into_range(cx, v)
  store_int(cx, begin, ptr, 4)
  store_int(cx, tagged_code_units, ptr + 4, 4)

*/

void store_string(const wasmtime::Span<uint8_t> &data, const std::string &v, uint32_t ptr)
{
    uint32_t begin, tagged_code_units;
    std::tie(begin, tagged_code_units) = store_string_into_range(data, v);
    store_int(data, begin, ptr, 4);
    store_int(data, tagged_code_units, ptr + 4, 4);
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

    auto firstQuote = input.find_first_of('"');
    auto secondQuote = input.find('"', firstQuote + 1);
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