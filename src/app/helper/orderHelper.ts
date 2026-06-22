import { ORDER_STATUS_TRANSITIONS } from "../constants";

const generateOrderNumber = (): string => {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(10000 + Math.random() * 90000).toString();
  return `GM-${datePart}-${randomPart}`;
};

const isValidTransition = (
  currentStatus: string,
  newStatus: string
): boolean => {
  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
};

export const orderHelper = {
  generateOrderNumber,
  isValidTransition,
};
