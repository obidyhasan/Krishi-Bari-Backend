import * as bcrypt from "bcrypt";
import { prisma } from "../shared/prisma";
import { seedGeoData } from "./geoSeed";

async function main() {
  console.log("🌱 Starting seed...");

  // Clear existing data in correct order
  console.log("Cleaning database...");
  await prisma.otpVerification.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.couponUsage.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderTracking.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.searchHistory.deleteMany();
  await prisma.user.deleteMany();

  // Clear geo data
  await prisma.upazila.deleteMany();
  await prisma.district.deleteMany();
  await prisma.division.deleteMany();

  // Seed geo data
  console.log("Seeding geo data...");
  await seedGeoData(false);

  // 1. Create Users
  console.log("Creating users...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  const adminUser = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@krishibari.com",
      phone: "+8801711111111",
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+8801722222222",
      password: hashedPassword,
      role: "CUSTOMER",
      status: "ACTIVE",
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });

  const customerUser2 = await prisma.user.create({
    data: {
      name: "Jane Smith",
      email: "jane.smith@example.com",
      phone: "+8801733333333",
      password: hashedPassword,
      role: "CUSTOMER",
      status: "ACTIVE",
      isEmailVerified: true,
      isPhoneVerified: false,
    },
  });

  // 2. Create Addresses
  console.log("Creating addresses...");
  
  // IDs from geoSeed.ts
  const dhakaDivisionId = "6ec60ece-9563-5152-91db-d7e2df666a29";
  const dhakaDistrictId = "71669645-508c-56ba-bf5d-71cc670dd0ec";
  const savarUpazilaId = "25cc5e21-4151-59f2-b1ed-908f6519a7dd";

  const chattogramDivisionId = "99defb7b-5e29-5e3c-bbda-f7a0807e9010";
  const chattogramDistrictId = "03e477c0-9011-51e5-97f4-8afabb3c4a24";
  const anwaraUpazilaId = "638cfe18-1a66-5f8e-8292-3cd58771f947";

  const address1 = await prisma.address.create({
    data: {
      userId: customerUser.id,
      label: "Home",
      fullName: "John Doe",
      phone: "+8801722222222",
      line1: "123 Main Street, Savar",
      line2: "House No. 5A",
      divisionId: dhakaDivisionId,
      districtId: dhakaDistrictId,
      upazilaId: savarUpazilaId,
      postalCode: "1340",
      country: "Bangladesh",
      isDefault: true,
    },
  });

  const address2 = await prisma.address.create({
    data: {
      userId: customerUser2.id,
      label: "Work",
      fullName: "Jane Smith",
      phone: "+8801733333333",
      line1: "456 Office Road, Anwara",
      line2: "Level 7, Tower B",
      divisionId: chattogramDivisionId,
      districtId: chattogramDistrictId,
      upazilaId: anwaraUpazilaId,
      postalCode: "4376",
      country: "Bangladesh",
      isDefault: true,
    },
  });

  // 3. Create Categories
  console.log("Creating categories...");
}