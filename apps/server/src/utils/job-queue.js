"use strict";

// Lightweight in-process job queue to keep web handlers non-blocking.

const MAX_CONCURRENCY = Math.max(1, Number(process.env.JOB_QUEUE_CONCURRENCY || 2));
const queue = [];
let active = 0;

const getLogger = () => (global.strapi?.log || console);

const runNext = () => {
  if (active >= MAX_CONCURRENCY) {
    return;
  }
  const job = queue.shift();
  if (!job) return;

  active += 1;

  Promise.resolve()
    .then(() => job.fn(job.payload))
    .catch((error) => {
      getLogger().error(`[jobs] Job ${job.name} failed`, {
        id: job.id,
        error: error.message,
      });
    })
    .finally(() => {
      active -= 1;
      runNext();
    });
};

const enqueueJob = (name, fn, payload = {}) => {
  const job = {
    id: `${name}:${Date.now()}:${Math.random().toString(16).slice(2, 8)}`,
    name,
    fn,
    payload,
    enqueuedAt: Date.now(),
  };
  queue.push(job);
  // concurrency: offload heavy work away from request cycle
  setImmediate(runNext);
  return job.id;
};

const queueSize = () => queue.length + active;

module.exports = {
  enqueueJob,
  queueSize,
};
