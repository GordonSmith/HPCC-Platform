#include "util.hpp"
#include <jexcept.hpp>

#include <fstream>
#include <sstream>

std::vector<uint8_t> readWasmBinaryToBuffer(const std::string &filename)
{
    std::ifstream file(filename, std::ios::binary | std::ios::ate);
    if (!file)
    {
        throw makeStringException(0, "Failed to open file");
    }

    std::streamsize size = file.tellg();
    file.seekg(0, std::ios::beg);

    std::vector<uint8_t> buffer(size);
    if (!file.read(reinterpret_cast<char *>(buffer.data()), size))
    {
        throw makeStringException(1, "Failed to read file");
    }

    return buffer;
}

std::string extractContentInDoubleQuotes(const std::string &input)
{

    std::size_t firstQuote = input.find_first_of('"');
    if (firstQuote == std::string::npos)
        return "";

    std::size_t secondQuote = input.find('"', firstQuote + 1);
    if (secondQuote == std::string::npos)
        return "";

    return input.substr(firstQuote + 1, secondQuote - firstQuote - 1);
}

std::pair<std::string, std::string> splitQualifiedID(const std::string &qualifiedName)
{
    std::size_t firstDot = qualifiedName.find_first_of('.');
    if (firstDot == std::string::npos || firstDot == 0 || firstDot == qualifiedName.size() - 1)
        throw makeStringExceptionV(3, "Invalid import function '%s', expected format: <module>.<function>", qualifiedName.c_str());

    return std::make_pair(qualifiedName.substr(0, firstDot), qualifiedName.substr(firstDot + 1));
}

std::string createQualifiedID(const std::string &wasmName, const std::string &funcName)
{
    return wasmName + "." + funcName;
}