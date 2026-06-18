export class TokenBucket {
  readonly capacity: number;
  readonly refillRate: number;
  available: number;
  private lastRefill: number;

  constructor(capacity: number, refillRate: number, now = Date.now()) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.available = capacity;
    this.lastRefill = now;
  }

  refill(now = Date.now()): void {
    if (now <= this.lastRefill) {
      return;
    }
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    this.available = Math.min(
      this.capacity,
      this.available + elapsedSeconds * this.refillRate
    );
    this.lastRefill = now;
  }

  tryRemove(count: number): boolean {
    if (this.available < count) {
      return false;
    }
    this.available -= count;
    return true;
  }

  timeUntil(count: number, now = Date.now()): number {
    if (this.available >= count) {
      return 0;
    }
    const deficit = count - this.available;
    const seconds = deficit / this.refillRate;
    return Math.ceil(seconds * 1000);
  }

  toJSON(): TokenBucketState {
    return {
      capacity: this.capacity,
      refillRate: this.refillRate,
      available: this.available,
      lastRefill: this.lastRefill,
    };
  }

  static fromJSON(state: TokenBucketState): TokenBucket {
    const bucket = new TokenBucket(state.capacity, state.refillRate, state.lastRefill);
    bucket.available = state.available;
    return bucket;
  }
}

export interface TokenBucketState {
  capacity: number;
  refillRate: number;
  available: number;
  lastRefill: number;
}
