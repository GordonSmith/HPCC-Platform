#include "util.hpp"

namespace cmcpp 
{

    void trap_if(CallContext *cx, bool condition, const char *message)
    {
        if (condition)
        {
            cx->trap(message);
        }
    }

    uint32_t align_to(uint32_t ptr, uint32_t alignment)
    {
        return (ptr + alignment - 1) & ~(alignment - 1);
    }

    int alignment(ValType t)
    {
        switch (t)
        {
        case ValType::Bool:
        case ValType::S8:
        case ValType::U8:
            return 1;
        case ValType::S16:
        case ValType::U16:
            return 2;
        case ValType::S32:
        case ValType::U32:
        case ValType::F32:
        case ValType::Char:
            return 4;
        case ValType::S64:
        case ValType::U64:
        case ValType::F64:
            return 8;
        case ValType::String:
        case ValType::List:
            return 4;
            // case ValType::Own:
            // case ValType::Borrow:
            //     return 4;
        default:
            throw std::runtime_error("Invalid type");
        }
    }

    ValType despecialize(const ValType t)
    {
        switch (t)
        {
        case ValType::Tuple:
            return ValType::Record;
        case ValType::Enum:
            return ValType::Variant;
        case ValType::Option:
            return ValType::Variant;
        case ValType::Result:
            return ValType::Variant;
        }
        return t;
    }

    uint8_t elem_size(ValType t)
    {
        switch (despecialize(t))
        {
        case ValType::Bool:
        case ValType::S8:
        case ValType::U8:
            return 1;
        case ValType::S16:
        case ValType::U16:
            return 2;
        case ValType::S32:
        case ValType::U32:
        case ValType::F32:
        case ValType::Char:
            return 4;
        case ValType::S64:
        case ValType::U64:
        case ValType::F64:
            return 8;
        case ValType::String:
        case ValType::List:
            return 8;
        default:
            throw std::runtime_error("Invalid type");
        }
    }
}