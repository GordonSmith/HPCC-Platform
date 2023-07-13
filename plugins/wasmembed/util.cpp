#include "util.hpp"
#include <jexcept.hpp>

#include <fstream>
#include <sstream>

std::vector<uint8_t> read_wasm_binary_to_buffer(const std::string &filename)
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
        throw makeStringExceptionV(3, "Invalid import function %s, expected format: <module>.<function>", qualifiedName.c_str());
    }
    return std::make_pair(tokens[0], tokens[1]);
}

std::string createQualifiedID(const std::string &wasmName, const std::string &funcName)
{
    return wasmName + "." + funcName;
}