import type { CAPIServerPayload } from "./tracking.types";
import { sendCAPIEvent } from "./capi.service";
import { updateEventStatus } from "./eventLog.service";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;
const NON_RETRYABLE_CODES = new Set([100, 190, 200, 368]);

export async function sendWithRetry(
  payload: CAPIServerPayload,
  attempt = 1,
): Promise<void> {
  try {
    await sendCAPIEvent(payload);
    await updateEventStatus(payload.eventId, "delivered", attempt);
  } catch (error) {
    const code = extractErrorCode(error);
    if (NON_RETRYABLE_CODES.has(code)) {
      await updateEventStatus(
        payload.eventId,
        "failed_permanent",
        attempt,
        (error as Error).message,
      );
      console.error(
        `[CAPI] Non-retryable error ${code} for event ${payload.eventId}`,
      );
      return;
    }
    if (attempt < MAX_ATTEMPTS) {
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
      await sendWithRetry(payload, attempt + 1);
      return;
    }
    await updateEventStatus(payload.eventId, "failed", attempt, (error as Error).message);
    console.error(`[CAPI] Exhausted retries for event ${payload.eventId}`, error);
  }
}

function extractErrorCode(err: unknown): number {
  try {
    const parsed = JSON.parse((err as Error)?.message ?? "{}");
    return parsed?.code ?? 0;
  } catch {
    return 0;
  }
}
