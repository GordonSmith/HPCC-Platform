#include <wit/test.h>

#include <string>

void dbglog(const std::string str)
{
    test_string_t msg;
    test_string_set(&msg, str.c_str());
    test_dbglog(&msg);
    test_string_free(&msg);
}

uint32_t test_add3(uint32_t a)
{
    return a + 3;
}

uint32_t test_add(uint32_t a, uint32_t b)
{
    return a + b;
}

uint32_t test_sub(uint32_t a, uint32_t b)
{
    return a - b;
}

void test_echo(test_string_t *str, test_string_t *ret)
{
    std::string s(str->ptr, str->len);
    test_string_free(str);
    std::string r = s + s;
    test_string_set(ret, r.c_str());
}
