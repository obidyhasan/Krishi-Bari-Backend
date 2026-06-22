import config from "../../config";
import type { CAPIServerPayload } from "./tracking.types";

const API_VERSION = "v21.0";

export async function sendCAPIEvent(payload: CAPIServerPayload): Promise<void> {
  if (!config.meta.pixel_id || !config.meta.capi_access_token) {
    throw new Error("Meta tracking is not configured.");
  }

  const userData: Record<string, unknown> = {
    em: payload.userData.em ? [payload.userData.em] : undefined,
    ph: payload.userData.ph ? [payload.userData.ph] : undefined,
    fn: payload.userData.fn ? [payload.userData.fn] : undefined,
    ln: payload.userData.ln ? [payload.userData.ln] : undefined,
    ct: payload.userData.ct ? [payload.userData.ct] : undefined,
    st: payload.userData.st ? [payload.userData.st] : undefined,
    zp: payload.userData.zp ? [payload.userData.zp] : undefined,
    country: payload.userData.country ? [payload.userData.country] : undefined,
    external_id: payload.userData.external_id
      ? [payload.userData.external_id]
      : undefined,
    client_ip_address: payload.userData.client_ip_address,
    client_user_agent: payload.userData.client_user_agent,
    fbp: payload.fbp,
    fbc: payload.fbc,
  };

  const body = {
    data: [
      {
        event_name: payload.eventName,
        event_time: payload.eventTime,
        event_id: payload.eventId,
        action_source: "website",
        event_source_url: payload.pageUrl,
        user_data: userData,
        custom_data: payload.customData,
      },
    ],
    test_event_code: config.meta.test_event_code || undefined,
  };

  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${config.meta.pixel_id}/events?access_token=${encodeURIComponent(config.meta.capi_access_token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(errorJson?.error ?? errorJson));
  }
}
