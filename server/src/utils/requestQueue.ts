type QueuedRequest<T> = {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

export class RequestQueue {
  private queue: QueuedRequest<unknown>[] = [];
  private processing = false;
  private delayMs: number;
  private name: string;

  constructor(delayMs: number, name: string) {
    this.delayMs = delayMs;
    this.name = name;
  }

  async add<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: execute as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      try {
        const result = await item.execute();
        item.resolve(result);
      } catch (error) {
        console.error(`[${this.name}] Request failed:`, error instanceof Error ? error.message : error);
        item.reject(error);
      }
      if (this.queue.length > 0) {
        await new Promise((r) => setTimeout(r, this.delayMs));
      }
    }

    this.processing = false;
  }

  get pending(): number {
    return this.queue.length;
  }
}
