#include <string>

extern "C"
{
    uint32_t strLength(const std::string &msg)
    {
        return msg.length();
    }

    uint32_t add3(uint32_t a)
    {
        return a + 3;
    }

    uint32_t add(uint32_t a, uint32_t b)
    {
        return a + b;
    }

    uint32_t sub(uint32_t a, uint32_t b)
    {
        return a - b;
    }
}