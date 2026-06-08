import { EventEmitter } from "node:events";

type ChatEvent = { type: string; payload: unknown };
type Handler = (e: ChatEvent) => void;

const bus = new EventEmitter();
bus.setMaxListeners(0); // every active tab adds one listener; unbounded is fine

export const events = {
  publish(conversationId: string, type: string, payload: unknown): void {
    bus.emit(conversationId, { type, payload });
  },
  subscribe(conversationId: string, fn: Handler): () => void {
    bus.on(conversationId, fn);
    return () => bus.off(conversationId, fn);
  },
  __listenerCount(conversationId: string): number {
    return bus.listenerCount(conversationId);
  },
  __resetForTests(): void {
    bus.removeAllListeners();
  },
};
