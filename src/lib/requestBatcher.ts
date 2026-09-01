
type BatchedRequest<T> = {
  id: string;
  fn: () => Promise<T>;
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

class RequestBatcher {
  private queue: Map<string, BatchedRequest<any>> = new Map();
  private batchScheduled = false;
  private batchDelay: number = 0; // 0ms = next microtask

  /**
   * Add a request to be batched
   * Returns a promise that resolves when the batch executes
   */
  batch<T>(id: string, fn: () => Promise<T>): Promise<T> {
    // Check if already queued
    if (this.queue.has(id)) {
      return this.queue.get(id)!.promise;
    }

    let resolve: (value: T) => void;
    let reject: (error: Error) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    this.queue.set(id, {
      id,
      fn,
      promise,
      resolve: resolve!,
      reject: reject!,
    });

    if (!this.batchScheduled) {
      this.batchScheduled = true;
      this.scheduleBatch();
    }

    return promise;
  }

  /**
   * Schedule batch execution in the next event loop
   */
  private scheduleBatch(): void {
    setTimeout(async () => {
      this.batchScheduled = false;

      // Get all pending requests
      const requests = Array.from(this.queue.values());
      this.queue.clear();

      if (requests.length === 0) return;

      // Execute all requests in parallel (batched)
      const results = await Promise.allSettled(
        requests.map((req) => req.fn())
      );

      // Resolve/reject each promise
      results.forEach((result, index) => {
        const req = requests[index];
        if (result.status === "fulfilled") {
          req.resolve(result.value);
        } else {
          req.reject(result.reason);
        }
      });
    }, this.batchDelay);
  }

  /**
   * Clear all pending batches
   */
  clear(): void {
    this.queue.clear();
  }

  /**
   * Get pending batch count
   */
  getPendingCount(): number {
    return this.queue.size;
  }
}

export const requestBatcher = new RequestBatcher();

/**
 * Helper to batch a function call
 * Example: await batchedCall("exam-centers", () => survivalApi.getExamCenters())
 */
export async function batchedCall<T>(
  id: string,
  fn: () => Promise<T>
): Promise<T> {
  return requestBatcher.batch(id, fn);
}
