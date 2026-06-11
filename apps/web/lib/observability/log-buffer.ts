import "server-only";

export type LogLevel = "info" | "warn" | "error" | "debug";

export type LogEntry = {
  ts: number;
  level: LogLevel;
  msg: string;
};

type Subscriber = (entry: LogEntry) => void;

type Bag = {
  buffer: LogEntry[];
  subscribers: Set<Subscriber>;
  patched: boolean;
};

const CAPACITY = 500;

const globalForLogs = globalThis as unknown as {
  __coursebridgeLogBuffer?: Bag;
};

function init(): Bag {
  const bag: Bag = {
    buffer: [],
    subscribers: new Set(),
    patched: false,
  };
  patchConsole(bag);
  return bag;
}

function patchConsole(bag: Bag): void {
  if (bag.patched) return;
  bag.patched = true;

  const levels: Array<[LogLevel, "log" | "info" | "warn" | "error" | "debug"]> = [
    ["info", "log"],
    ["info", "info"],
    ["warn", "warn"],
    ["error", "error"],
    ["debug", "debug"],
  ];

  for (const [level, method] of levels) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      try {
        record(bag, level, formatArgs(args));
      } catch {
        // never let logging crash the app
      }
      original(...args);
    };
  }
}

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === "string") return a;
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(" ");
}

function record(bag: Bag, level: LogLevel, msg: string): void {
  const entry: LogEntry = { ts: Date.now(), level, msg };
  bag.buffer.push(entry);
  if (bag.buffer.length > CAPACITY) bag.buffer.shift();
  for (const sub of bag.subscribers) {
    try {
      sub(entry);
    } catch {
      // ignore subscriber faults
    }
  }
}

const bag: Bag = globalForLogs.__coursebridgeLogBuffer ?? init();
globalForLogs.__coursebridgeLogBuffer = bag;

export function recentLogs(limit = 200): LogEntry[] {
  return bag.buffer.slice(-limit);
}

export function subscribeLogs(fn: Subscriber): () => void {
  bag.subscribers.add(fn);
  return () => {
    bag.subscribers.delete(fn);
  };
}
