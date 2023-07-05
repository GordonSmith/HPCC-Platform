#include <wit/test.h>

#include <string>

uint32_t test_add3(uint32_t a)
{
    // test_string_t msg;
    // test_string_set(&msg, "test_add3");
    // global_print(&msg);
    return a + 3;
}

uint32_t test_add(uint32_t a, uint32_t b)
{
    // test_string_t msg;
    // test_string_set(&msg, "test_add");
    // global_print(&msg);
    return a + b;
}

uint32_t test_sub(uint32_t a, uint32_t b)
{
    // test_string_t msg;
    // test_string_set(&msg, "test_sub");
    // global_print(&msg);
    return a - b;
}

void test_echo(test_string_t *msg, test_string_t *ret)
{
    std::string s(msg->ptr, msg->len);
    s += ":echo:" + std::to_string(msg->len) + ":" + std::to_string(strlen(msg->ptr));

    test_string_set(ret, s.c_str());
    // global_print(ret);
}
