#include "util.hpp"

#include "jfile.hpp"
#include "jlog.hpp"

#include <unicode/ucnv.h>
#include <unicode/unistr.h>

std::vector<uint8_t> readWasmBinaryToBuffer(const char *filename)
{
    Owned<IFile> file = createIFile(filename);
    Owned<IFileIO> fileIO = file->open(IFOread);
    if (!fileIO)
        throw makeStringExceptionV(0, "Failed to open %s", filename);

    MemoryBuffer mb;
    size32_t count = read(fileIO, 0, (size32_t)-1, mb);
    uint8_t *ptr = (uint8_t *)mb.detach();
    return std::vector<uint8_t>(ptr, ptr + count);
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

using namespace cmcpp;

const char *const LATIN1 = "ISO-8859-1";
const char *const UTF8 = "UTF-8";
const char *const UTF16 = "UTF-16-LE";

const char *encodingToICU(const Encoding encoding)
{
    switch (encoding)
    {
    case Encoding::Latin1:
        return LATIN1;
    case Encoding::Utf8:
        return UTF8;
    case Encoding::Utf16:
        return UTF16;
    default:
        return "";
    }
}

std::pair<void *, size_t> convert(void *dest, uint32_t dest_byte_len, const void *src, uint32_t src_byte_len, Encoding from_encoding, Encoding to_encoding)
{
    if (from_encoding == to_encoding)
    {
        assert(dest_byte_len >= src_byte_len);
        if (src_byte_len > 0){
            memcpy(dest, src, src_byte_len);
            return std::make_pair(dest, src_byte_len);
        }
        return std::make_pair(nullptr, 0);
    }

    UErrorCode status = U_ZERO_ERROR;
    const char *sourceEncoding = encodingToICU(from_encoding);
    const char *targetEncoding = encodingToICU(to_encoding);

    // Create a converter for the source encoding
    UConverter *sourceConverter = ucnv_open(sourceEncoding, &status);
    if (U_FAILURE(status))
    {
        DBGLOG("Error opening source converter: %s", u_errorName(status));
        return std::make_pair(nullptr, 0);
    }

    // Create a converter for the target encoding
    UConverter *targetConverter = ucnv_open(targetEncoding, &status);
    if (U_FAILURE(status))
    {
        DBGLOG("Error opening target converter: %s", u_errorName(status));
        ucnv_close(sourceConverter);
        return std::make_pair(nullptr, 0);
    }

    // Convert source string to UnicodeString
    icu::UnicodeString unicodeString((const char *)src, src_byte_len, sourceConverter, status);
    if (U_FAILURE(status))
    {
        DBGLOG("Error converting to UnicodeString: %s", u_errorName(status));
        ucnv_close(sourceConverter);
        ucnv_close(targetConverter);
        return std::make_pair(nullptr, 0);
    }

    status = U_ZERO_ERROR;
    auto targetLength = unicodeString.extract((char *)dest, dest_byte_len, targetConverter, status);
    if (U_FAILURE(status))
    {
        DBGLOG("Error extracting target string: %s", u_errorName(status));
        ucnv_close(sourceConverter);
        ucnv_close(targetConverter);
        return std::make_pair(nullptr, 0);
    }

    auto retVal = std::make_pair(dest, targetLength);
    ucnv_close(sourceConverter);
    ucnv_close(targetConverter);

    return retVal;
}
