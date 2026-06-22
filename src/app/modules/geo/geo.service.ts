import { prisma } from "../../shared/prisma";

const getDivisions = async () => {
  return prisma.division.findMany({ orderBy: { name: "asc" } });
};

const getDistricts = async (divisionId?: string) => {
  return prisma.district.findMany({
    where: divisionId ? { divisionId } : undefined,
    orderBy: { name: "asc" },
  });
};

const getUpazilas = async (districtId?: string) => {
  return prisma.upazila.findMany({
    where: districtId ? { districtId } : undefined,
    orderBy: { name: "asc" },
  });
};

export const GeoService = {
  getDivisions,
  getDistricts,
  getUpazilas,
};
