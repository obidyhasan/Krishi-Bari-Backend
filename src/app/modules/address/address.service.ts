import httpStatus from "http-status";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";

const getAddresses = async (userId: string) => {
  return prisma.address.findMany({
    where: { userId },
    include: {
      division: true,
      district: true,
      upazila: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
};

const createAddress = async (userId: string, payload: any) => {
  const count = await prisma.address.count({ where: { userId } });
  if (count >= 5) throw new ApiError(httpStatus.BAD_REQUEST, "Maximum 5 addresses allowed.");

  // If new address is default, unset others
  if (payload.isDefault) {
    await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
  }

  // First address is automatically default
  const isDefault = count === 0 ? true : payload.isDefault ?? false;

  return prisma.address.create({ data: { ...payload, userId, isDefault } });
};

const updateAddress = async (id: string, userId: string, payload: any) => {
  const address = await prisma.address.findFirst({ where: { id, userId } });
  if (!address) throw new ApiError(httpStatus.NOT_FOUND, "Address not found.");

  if (payload.isDefault) {
    await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
  }

  return prisma.address.update({ where: { id }, data: payload });
};

const deleteAddress = async (id: string, userId: string) => {
  const address = await prisma.address.findFirst({ where: { id, userId } });
  if (!address) throw new ApiError(httpStatus.NOT_FOUND, "Address not found.");
  if (address.isDefault) throw new ApiError(httpStatus.BAD_REQUEST, "Cannot delete your default address. Set another as default first.");
  return prisma.address.delete({ where: { id } });
};

const setDefaultAddress = async (id: string, userId: string) => {
  const address = await prisma.address.findFirst({ where: { id, userId } });
  if (!address) throw new ApiError(httpStatus.NOT_FOUND, "Address not found.");
  await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  return prisma.address.update({ where: { id }, data: { isDefault: true } });
};

export const AddressService = { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress };
