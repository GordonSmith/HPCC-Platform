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

/* canonical load_int (python)

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

/* canonical load_string_from_range (python)

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

std::pair<uint32_t /*ptr*/, uint32_t /*byte length*/> load_string_from_range(const wasmtime::Span<uint8_t> &data, uint32_t ptr, uint32_t tagged_code_units)
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

  return std::make_pair(ptr, byte_length);
}

/*  canonical load_string (python)

def load_string(cx, ptr):
  begin = load_int(cx, ptr, 4)
  tagged_code_units = load_int(cx, ptr + 4, 4)
  return load_string_from_range(cx, begin, tagged_code_units)

*/
std::pair<uint32_t /*ptr*/, uint32_t /*byte length*/> load_string(const wasmtime::Span<uint8_t> &data, uint32_t ptr)
{
  uint32_t begin = load_int<uint32_t>(data, ptr);
  uint32_t tagged_code_units = load_int<uint32_t>(data, ptr + 4);
  return load_string_from_range(data, begin, tagged_code_units);
}

//  Storing  ---
