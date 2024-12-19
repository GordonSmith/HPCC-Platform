#include "context.hpp"

namespace cmcpp
{
    class CanonicalOptionsImpl : public CanonicalOptions
    {
    private:
        GuestPostReturn _post_return;

    public:
        CanonicalOptionsImpl(const GuestMemory &memory, Encoding encoding, const GuestPostReturn &post_return)
        {
            this->memory = memory;
            this->encoding = encoding;
            this->_post_return = post_return;
        }

        void post_return()
        {
            if (_post_return)
            {
                _post_return();
            }
        }
    };

    class CallContextImpl : public LiftLowerContext
    {
    public:
        CallContextImpl(const HostTrap &trap, const GuestRealloc &realloc)
        {
            this->trap = trap;
            this->realloc = realloc;
        }

        virtual void createCallContext(const GuestMemory &memory, const Encoding &encoding, const GuestPostReturn &post_return)
        {
            this->opts = std::make_unique<CanonicalOptionsImpl>(memory, encoding, post_return);
        }
    };

    std::unique_ptr<LiftLowerContext> createHostContext(const HostTrap &trap, const GuestRealloc &realloc)
    {
        return std::make_unique<CallContextImpl>(trap, realloc);
    }

}