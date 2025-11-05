#pragma once

#include <string>
#include <iostream>

namespace playback
{
  enum class LogLevel
  {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4
  };
  void log(LogLevel level, const std::string &message);
  void trace(const std::string &message);
  void debug(const std::string &message);
  void info(const std::string &message);
  void warn(const std::string &message);
  void error(const std::string &message);

  template <typename Tag>
  class LoggingMixin
  {
  protected:
    void log_trace(const std::string &message)
    {
      playback::trace("[" + std::string(Tag::prefix) + "] " + message);
    }

    void log_debug(const std::string &message)
    {
      playback::debug("[" + std::string(Tag::prefix) + "] " + message);
    }

    void log_info(const std::string &message)
    {
      playback::info("[" + std::string(Tag::prefix) + "] " + message);
    }

    void log_warn(const std::string &message)
    {
      playback::warn("[" + std::string(Tag::prefix) + "] " + message);
    }

    void log_error(const std::string &message)
    {
      playback::error("[" + std::string(Tag::prefix) + "] " + message);
    }
  };
}