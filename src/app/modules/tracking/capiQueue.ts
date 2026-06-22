import { Queue, Worker } from "bullmq";
import type { CAPIServerPayload } from "./tracking.types";
import { sendWithRetry } from "./capiRetry";
import config from "../../config";

const redisUrl = config.redis_url;
const connection = redisUrl
  ? {
      url: redisUrl,
    }
  : undefined;

export const capiQueue = connection
  ? new Queue<CAPIServerPayload>("capi-events", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    })
  : null;

let worker: Worker<CAPIServerPayload> | null = null;

export async function addToRetryQueue(payload: CAPIServerPayload) {
  if (!capiQueue) {
    await sendWithRetry(payload);
    return;
  }
  await capiQueue.add("send-event", payload, {
    jobId: payload.eventId,
    priority: payload.eventName === "Purchase" ? 1 : 2,
  });
}

export function startCapiWorker() {
  if (!connection || worker) return;
  worker = new Worker<CAPIServerPayload>(
    "capi-events",
    async (job) => {
      await sendWithRetry(job.data, job.attemptsMade + 1);
    },
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on("failed", (job, err) => {
    console.error(`[CAPI Worker] Job ${job?.id} failed: ${err.message}`);
  });
}
