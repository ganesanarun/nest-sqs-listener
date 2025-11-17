import {Semaphore} from '../../src/container/semaphore';

describe('Semaphore', () => {
    describe('acquire and release', () => {
        it('should acquire immediately when permits are available', async () => {
            const semaphore = new Semaphore(3);
            const startTime = Date.now();

            await semaphore.acquire();

            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(10);
        });

        it('should wait when no permits are available', async () => {
            const semaphore = new Semaphore(1);
            await semaphore.acquire();
            let acquired = false;
            const acquirePromise = semaphore.acquire().then(() => {
                acquired = true;
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(acquired).toBe(false);
            semaphore.release();
            await acquirePromise;
            expect(acquired).toBe(true);
        });

        it('should grant permit to waiting acquirer when released', async () => {
            const semaphore = new Semaphore(1);
            await semaphore.acquire();
            const results: number[] = [];
            const waitingPromise = semaphore.acquire().then(() => {
                results.push(1);
            });

            await new Promise(resolve => setTimeout(resolve, 10));

            expect(results).toEqual([]);
            semaphore.release();
            await waitingPromise;
            expect(results).toEqual([1]);
        });
    });

    describe('multiple concurrent operations', () => {
        it('should handle multiple concurrent acquire and release operations', async () => {
            const semaphore = new Semaphore(2);
            const results: number[] = [];
            await semaphore.acquire();
            await semaphore.acquire();
            const promise1 = semaphore.acquire().then(() => results.push(1));
            const promise2 = semaphore.acquire().then(() => results.push(2));
            const promise3 = semaphore.acquire().then(() => results.push(3));

            await new Promise(resolve => setTimeout(resolve, 10));

            expect(results).toEqual([]);
            semaphore.release();
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(results).toEqual([1]);
            semaphore.release();
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(results).toEqual([1, 2]);
            semaphore.release();
            await promise3;
            expect(results).toEqual([1, 2, 3]);
        });

        it('should handle rapid acquire and release cycles', async () => {
            const semaphore = new Semaphore(5);
            const operations = 20;
            let completed = 0;
            const tasks = Array.from({length: operations}, async (_, i) => {
                await semaphore.acquire();
                completed++;
                await new Promise(resolve => setTimeout(resolve, 1));
                semaphore.release();
            });

            await Promise.all(tasks);

            expect(completed).toBe(operations);
        });
    });

    describe('initial permits count', () => {
        it('should respect initial permits count', async () => {
            const maxPermits = 5;
            const semaphore = new Semaphore(maxPermits);
            const acquirePromises = Array.from({length: maxPermits}, () =>
                semaphore.acquire()
            );

            await Promise.all(acquirePromises);

            let acquired = false;
            const waitingPromise = semaphore.acquire().then(() => {
                acquired = true;
            });
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(acquired).toBe(false);
            semaphore.release();
            await waitingPromise;
            expect(acquired).toBe(true);
        });

        it('should allow setting different initial permit counts', async () => {
            const semaphore1 = new Semaphore(1);
            const semaphore2 = new Semaphore(10);
            const semaphore3 = new Semaphore(100);

            await semaphore1.acquire();

            const acquires2 = Array.from({length: 10}, () => semaphore2.acquire());
            await Promise.all(acquires2);
            const acquires3 = Array.from({length: 100}, () => semaphore3.acquire());
            await Promise.all(acquires3);

            expect(true).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle release without waiting acquirers', () => {
            const semaphore = new Semaphore(2);

            semaphore.release();

            expect(true).toBe(true);
        });

        it('should maintain FIFO order for waiting acquirers', async () => {
            const semaphore = new Semaphore(1);
            await semaphore.acquire();
            const order: number[] = [];
            const p1 = semaphore.acquire().then(() => order.push(1));
            const p2 = semaphore.acquire().then(() => order.push(2));
            const p3 = semaphore.acquire().then(() => order.push(3));

            semaphore.release();

            await new Promise(resolve => setTimeout(resolve, 10));
            semaphore.release();
            await new Promise(resolve => setTimeout(resolve, 10));
            semaphore.release();
            await Promise.all([p1, p2, p3]);
            expect(order).toEqual([1, 2, 3]);
        });
    });
});
