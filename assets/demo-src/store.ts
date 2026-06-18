import { TokenBucket } from "./tokenBucket.js";

export interface Store<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export class MemoryStore implements Store<TokenBucket> {
  private readonly entries = new Map<string, { value: TokenBucket; expiresAt: number }>();
  private readonly ttlMs: number;

  constructor(ttlMs = 60_000) {
    this.ttlMs = ttlMs;
  }

  async get(key: string): Promise<TokenBucket | undefined> {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key: string, value: TokenBucket): Promise<void> {
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  prune(now = Date.now()): number {
    let removed = 0;
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(key);
        removed++;
      }
    }
    return removed;
  }

  get size(): number {
    return this.entries.size;
  }
}
