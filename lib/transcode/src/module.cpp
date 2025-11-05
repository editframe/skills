#include <napi.h>
#include "playback.h"

// Export the module's init function but remove the NODE_API_MODULE macro
// to avoid duplicate definitions with playback.cpp
namespace playback
{
    // This function is declared in playback.h and defined in playback.cpp
    Napi::Object Init(Napi::Env env, Napi::Object exports);

    // Export the init function for Node.js module system
    NODE_API_MODULE(playback, Init)
}