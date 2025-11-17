/**
 * Semaphore for controlling concurrent access to resources.
 * Implements a counting semaphore that limits the number of concurrent operations.
 */
export class Semaphore {
    private permits: number;
    private readonly waiting: Array<() => void> = [];

    /**
     * Creates a new Semaphore with the specified number of permits.
     * @param maxPermits The maximum number of concurrent permits available
     */
    constructor(private readonly maxPermits: number) {
        this.permits = maxPermits;
    }

    /**
     * Acquires a permit from this semaphore.
     * If a permit is available, it is acquired immediately and the method returns.
     * If no permit is available, the method waits until a permit is released.
     * @returns A promise that resolves when a permit is acquired
     */
    async acquire(): Promise<void> {
        if (this.waiting.length > 0 || this.permits === 0) {
            return new Promise<void>((resolve) => {
                this.waiting.push(resolve);
            });
        }

        this.permits--;
    }

    /**
     * Releases a permit, returning it to the semaphore.
     * If there are waiting acquirers, the first one in the queue is granted the permit.
     * Otherwise, the permit count is incremented.
     */
    release(): void {
        const next = this.waiting.shift();
        if (next) {
            next();
        } else {
            if (this.permits < this.maxPermits) {
                this.permits++;
            }
        }
    }
}
