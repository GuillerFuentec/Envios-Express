"use strict";

const quietLogs = process.env.QUIET_LOGS === "true";

const makeLogger = (scope = "app") => {
  const startedAt = Date.now();
  const prefix = `[${scope}]`;

  const info = (message, meta = {}) => {
    if (quietLogs) return;
    console.info(prefix, message, meta);
  };

  const warn = (message, meta = {}) => {
    if (quietLogs) return;
    console.warn(prefix, message, meta);
  };

  const error = (message, meta = {}) => {
    console.error(prefix, message, meta);
  };

  const end = (message = "done", meta = {}) => {
    const durationMs = Date.now() - startedAt;
    info(message, { ...meta, durationMs });
  };

  return { info, warn, error, end, startedAt };
};

module.exports = {
  makeLogger,
};
