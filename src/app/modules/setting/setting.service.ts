import { prisma } from "../../shared/prisma";

const getSetting = async (key: string) => {
  return prisma.systemSetting.findUnique({ where: { key } });
};

const getAllSettings = async () => {
  return prisma.systemSetting.findMany();
};

const upsertSetting = async (payload: { key: string; value: string; type?: string; group?: string }) => {
  return prisma.systemSetting.upsert({
    where: { key: payload.key },
    update: payload,
    create: {
      key: payload.key,
      value: payload.value,
      type: payload.type || "string",
      group: payload.group || "GENERAL",
    },
  });
};

const isMaintenanceMode = async (): Promise<boolean> => {
  const setting = await getSetting("MAINTENANCE_MODE");
  return setting?.value === "true";
};

export const SettingService = {
  getSetting,
  getAllSettings,
  upsertSetting,
  isMaintenanceMode,
};
