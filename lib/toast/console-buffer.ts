"use client";

export type ConsoleLevel = "log" | "info" | "warn" | "error";

export interface ConsoleEntry {
  level: ConsoleLevel;
  timestamp: string;
  values: unknown[];
}

const MAX_CONSOLE_ENTRIES = 120;
const CONSOLE_BUFFER: ConsoleEntry[] = [];

let consoleInstalled = false;

function addEntry(level: ConsoleLevel, values: unknown[]) {
  CONSOLE_BUFFER.push({
    level,
    timestamp: new Date().toISOString(),
    values,
  });

  if (CONSOLE_BUFFER.length > MAX_CONSOLE_ENTRIES) {
    CONSOLE_BUFFER.splice(0, CONSOLE_BUFFER.length - MAX_CONSOLE_ENTRIES);
  }
}

export function installConsoleBuffer() {
  if (consoleInstalled || typeof window === "undefined") {
    return;
  }
  consoleInstalled = true;

  const original = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  console.log = (...args: unknown[]) => {
    addEntry("log", args);
    original.log(...args);
  };

  console.info = (...args: unknown[]) => {
    addEntry("info", args);
    original.info(...args);
  };

  console.warn = (...args: unknown[]) => {
    addEntry("warn", args);
    original.warn(...args);
  };

  console.error = (...args: unknown[]) => {
    addEntry("error", args);
    original.error(...args);
  };
}

export function getConsoleLogsSnapshot() {
  return CONSOLE_BUFFER.slice(-60);
}
