export interface TrackingEventPayload {
  eventName: string;
  eventId: string;
  eventTime?: number;
  isCustom?: boolean;
  contentIds?: string[];
  contentType?: string;
  contentName?: string;
  contentCategory?: string;
  value?: number;
  currency?: string;
  numItems?: number;
  orderId?: string;
  fbp?: string;
  fbc?: string;
  userAgent?: string;
  pageUrl?: string;
}

export interface RawUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  ip: string;
  userAgent: string;
  externalId?: string;
}

export interface HashedUserData {
  em?: string;
  ph?: string;
  fn?: string;
  ln?: string;
  ct?: string;
  st?: string;
  zp?: string;
  country?: string;
  external_id?: string;
  client_ip_address: string;
  client_user_agent: string;
}

export interface CAPIServerPayload {
  eventName: string;
  eventId: string;
  eventTime: number;
  userData: HashedUserData;
  customData?: {
    content_ids?: string[];
    content_type?: string;
    content_name?: string;
    content_category?: string;
    value?: number;
    currency?: string;
    num_items?: number;
    order_id?: string;
  };
  fbp?: string;
  fbc?: string;
  pageUrl?: string;
  isCustom?: boolean;
  userId?: string;
  orderId?: string;
}
