export interface WriteQueueOptions {
  /** Awaited ahead of every task (CollectionService waits on CardService.flush()). */
  before?: () => Promise<unknown>;
  /** Receives the failure of an `enqueue` task; never called for `run` tasks. */
  onError?: (error: unknown) => void;
}

/**
 * One service's serialized writes: tasks run in order, one at a time, and a failure never breaks
 * the chain, so later saves still run (FR-003).
 */
export class WriteQueue {
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly options: WriteQueueOptions = {}) {}

  /** Fire-and-forget. A failure goes to onError and later tasks still run. onLanded runs after success only. */
  enqueue(task: () => Promise<unknown>, onLanded?: () => void): void {
    this.tail = this.tail.then(() => this.runTask(task)).then(
      () => onLanded?.(),
      (error: unknown) => this.options.onError?.(error),
    );
  }

  /** Caller-reported: resolves or rejects with the task. onError is NOT called. Later tasks still run. */
  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(() => this.runTask(task));
    this.tail = result.catch(() => undefined);
    return result;
  }

  /** Resolves once every task queued so far has settled (success or failure). Never rejects. */
  flush(): Promise<void> {
    return this.tail.then(
      () => undefined,
      () => undefined,
    );
  }

  private async runTask<T>(task: () => Promise<T>): Promise<T> {
    await this.options.before?.();
    return task();
  }
}
