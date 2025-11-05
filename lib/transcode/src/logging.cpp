#include "logging.h"

namespace playback
{
  LogLevel getInitialLogLevel()
  {
    const char* envLevel = std::getenv("EF_LOG_LEVEL");
    if (!envLevel) return LogLevel::INFO;

    std::string level(envLevel);
    if (level == "TRACE") return LogLevel::TRACE;
    if (level == "DEBUG") return LogLevel::DEBUG;
    if (level == "INFO") return LogLevel::INFO;
    if (level == "WARN") return LogLevel::WARN;
    if (level == "ERROR") return LogLevel::ERROR;
    return LogLevel::DEBUG;
  }

  // Initialize once at startup
  LogLevel currentLogLevel = getInitialLogLevel();

  void log(LogLevel level, const std::string &message)
  {
    if (level >= currentLogLevel)
    {
      std::cerr << message << std::endl;
    }
  }

  void trace(const std::string &message)
  {
    log(LogLevel::TRACE, message);
  }

  void debug(const std::string &message)
  {
    log(LogLevel::DEBUG, message);
  }

  void info(const std::string &message)
  {
    log(LogLevel::INFO, message);
  }

  void warn(const std::string &message)
  {
    log(LogLevel::WARN, message);
  }

  void error(const std::string &message)
  {
    log(LogLevel::ERROR, message);
  }
}