/**
 * Async Job Poller with Timeout & Retry Protection
 * Prevents infinite polling for MAXENT and other long-running jobs
 */

class AsyncJobPoller {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 120; // Default 2 hours with 1-min intervals
    this.pollIntervalMs = options.pollIntervalMs || 60000; // 1 minute
    this.timeoutMs = options.timeoutMs || 7200000; // 2 hours total
    this.backoffMultiplier = options.backoffMultiplier || 1; // Linear by default
  }

  async poll(jobId, pollFn, checkCompleteFn) {
    const startTime = Date.now();
    let attempt = 0;

    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        attempt++;
        const elapsedMs = Date.now() - startTime;

        // Check total timeout
        if (elapsedMs > this.timeoutMs) {
          clearInterval(pollInterval);
          reject(new Error(
            `Job ${jobId} exceeded max timeout of ${Math.floor(this.timeoutMs / 1000)}s`
          ));
          return;
        }

        // Check max attempts
        if (attempt > this.maxAttempts) {
          clearInterval(pollInterval);
          reject(new Error(
            `Job ${jobId} exceeded max attempts (${this.maxAttempts})`
          ));
          return;
        }

        try {
          const jobStatus = await pollFn(jobId);

          if (checkCompleteFn(jobStatus)) {
            clearInterval(pollInterval);
            resolve(jobStatus);
            return;
          }

          // Log progress every 5 attempts
          if (attempt % 5 === 0) {
            console.log(
              `Job ${jobId}: Attempt ${attempt}/${this.maxAttempts}, Elapsed: ${Math.floor(elapsedMs / 1000)}s`
            );
          }
        } catch (error) {
          clearInterval(pollInterval);
          reject(new Error(`Job polling failed: ${error.message}`));
        }
      }, this.pollIntervalMs);

      // Safety: clear interval after timeout
      setTimeout(() => clearInterval(pollInterval), this.timeoutMs + 5000);
    });
  }
}

/**
 * Higher-level helper for MAXENT-style jobs
 */
export const pollMaxentJob = async (jobId, maxentService) => {
  const poller = new AsyncJobPoller({
    maxAttempts: 120,
    pollIntervalMs: 60000, // 1 minute
    timeoutMs: 7200000 // 2 hours
  });

  return poller.poll(
    jobId,
    (id) => maxentService.getJobStatus(id),
    (status) => {
      // Complete when status is 'completed', 'failed', or 'cancelled'
      return ['completed', 'failed', 'cancelled'].includes(status.state?.toLowerCase());
    }
  );
};

export default AsyncJobPoller;