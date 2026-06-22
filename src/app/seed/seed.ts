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

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@krishibari.com" },
    create: {
      name: "Admin User",
      email: "admin@krishibari.com",
      phone: "+8801711111111",
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
      isEmailVerified: true,
      isPhoneVerified: true,
    },
    update: {
      name: "Admin User",
      phone: "+8801711111111",
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });

  const superAdminUser = await prisma.user.upsert({
    where: { email: "superadmin@krishibari.com" },
    create: {
      name: "Super Admin",
      email: "superadmin@krishibari.com",
      phone: "+8801700000000",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      isEmailVerified: true,
      isPhoneVerified: true,
    },
    update: {
      name: "Super Admin",
      phone: "+8801700000000",
      password: hashedPassword,
      role: "SUPER_ADMIN",
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
  const vegetablesCategory = await prisma.category.create({
    data: {
      name: "Fresh Vegetables",
      slug: "fresh-vegetables",
      description: "Fresh and organic vegetables",
      image:
        "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop",
      isActive: true,
    },
  });

  const fruitsCategory = await prisma.category.create({
    data: {
      name: "Fresh Fruits",
      slug: "fresh-fruits",
      description: "Seasonal fresh fruits",
      image:
        "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&auto=format&fit=crop",
      isActive: true,
    },
  });

  const dairyCategory = await prisma.category.create({
    data: {
      name: "Dairy & Eggs",
      slug: "dairy-eggs",
      description: "Milk, cheese, eggs, and dairy products",
      image:
        "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop",
      isActive: true,
    },
  });

  const beveragesCategory = await prisma.category.create({
    data: {
      name: "Beverages",
      slug: "beverages",
      description: "Drinks, juices, and beverages",
      image:
        "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop",
      isActive: true,
    },
  });

  const meatCategory = await prisma.category.create({
    data: {
      name: "Meat & Fish",
      slug: "meat-fish",
      description: "Fresh meat, poultry and seafood",
      image:
        "https://images.unsplash.com/photo-1690983325563-fe4412c4c347?w=1200&auto=format&fit=crop",
      isActive: true,
    },
  });

  const snacksCategory = await prisma.category.create({
    data: {
      name: "Snacks & Bakery",
      slug: "snacks-bakery",
      description: "Biscuits, breads, chips and more",
      image:
        "https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=1200&auto=format&fit=crop",
      isActive: true,
    },
  });

  const personalCareCategory = await prisma.category.create({
    data: {
      name: "Personal Care",
      slug: "personal-care",
      description: "Soaps, shampoos, and hygiene products",
      image:
        "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop",
      isActive: true,
    },
  });

  const frozenCategory = await prisma.category.create({
    data: {
      name: "Frozen Foods",
      slug: "frozen-foods",
      description: "Frozen meals, ice cream, and more",
      image:
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop",
      isActive: true,
    },
  });

  const cleaningCategory = await prisma.category.create({
    data: {
      name: "Cleaning Supplies",
      slug: "cleaning-supplies",
      description: "Detergents, cleaners, and household needs",
      image:
        "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=800&auto=format&fit=crop",
      isActive: true,
    },
  });

  const petCategory = await prisma.category.create({
    data: {
      name: "Pet Care",
      slug: "pet-care",
      description: "Food and supplies for your pets",
      image:
        "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&auto=format&fit=crop",
      isActive: true,
    },
  });

  const riceDalCategory = await prisma.category.create({
    data: {
      name: "Rice, Dal & Grains",
      slug: "rice-dal-grains",
      description: "Daily staples: rice, lentils, grains and pulses",
      image:
        "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=1200&auto=format&fit=crop",
      isActive: true,
    },
  });

  const spicesCategory = await prisma.category.create({
    data: {
      name: "Spices & Masala",
      slug: "spices-masala",
      description: "Essential spices and masala for Bangladeshi cooking",
      image:
        "https://images.unsplash.com/photo-1741521312797-28c6e5466e65?w=1200&auto=format&fit=crop",
      isActive: true,
    },
  });

  const oilGheeCategory = await prisma.category.create({
    data: {
      name: "Cooking Oil & Ghee",
      slug: "cooking-oil-ghee",
      description: "Healthy oils, ghee, and cooking essentials",
      image:
        "https://images.unsplash.com/photo-1666694890460-37ec16b0df47?w=1200&auto=format&fit=crop",
      isActive: true,
    },
  });

  const babyCareCategory = await prisma.category.create({
    data: {
      name: "Baby Care",
      slug: "baby-care",
      description: "Diapers, wipes, and baby daily essentials",
      image:
        "https://images.unsplash.com/photo-1661340653712-c0a71c546210?w=1200&auto=format&fit=crop",
      isActive: true,
    },
  });

  // 4. Create Products
  console.log("Creating products...");

  // Veg & Fruits
  const tomatoProduct = await prisma.product.create({
    data: {
      name: "Fresh Tomatoes",
      slug: "fresh-tomatoes",
      description: "Organic red tomatoes, 1kg",
      price: 80.0,
      salePrice: 70.0,
      sku: "VEG001",
      stock: 100,
      unit: "kg",
      weight: 1.0,
      status: "ACTIVE",
      isFeatured: true,
      categoryId: vegetablesCategory.id,
    },
  });
  const potatoProduct = await prisma.product.create({
    data: {
      name: "Potatoes",
      slug: "potatoes",
      description: "Fresh potatoes, 1kg",
      price: 40.0,
      sku: "VEG002",
      stock: 150,
      unit: "kg",
      weight: 1.0,
      status: "ACTIVE",
      categoryId: vegetablesCategory.id,
    },
  });
  const onionProduct = await prisma.product.create({
    data: {
      name: "Local Onions",
      slug: "local-onions",
      description: "Fresh local onions, 1kg",
      price: 60.0,
      sku: "VEG003",
      stock: 200,
      unit: "kg",
      weight: 1.0,
      status: "ACTIVE",
      categoryId: vegetablesCategory.id,
    },
  });
  const cucumberProduct = await prisma.product.create({
    data: {
      name: "Cucumber",
      slug: "cucumber",
      description: "Fresh green cucumber, 1kg",
      price: 50.0,
      sku: "VEG004",
      stock: 80,
      unit: "kg",
      weight: 1.0,
      status: "ACTIVE",
      categoryId: vegetablesCategory.id,
    },
  });

  const appleProduct = await prisma.product.create({
    data: {
      name: "Green Apples",
      slug: "green-apples",
      description: "Fresh green apples, 500g",
      price: 120.0,
      salePrice: 100.0,
      sku: "FRU001",
      stock: 80,
      unit: "g",
      weight: 500,
      status: "ACTIVE",
      isFeatured: true,
      categoryId: fruitsCategory.id,
    },
  });
  const bananaProduct = await prisma.product.create({
    data: {
      name: "Sweet Bananas",
      slug: "sweet-bananas",
      description: "Fresh sweet bananas, 1 dozen",
      price: 80.0,
      sku: "FRU002",
      stock: 100,
      unit: "dozen",
      weight: 1.0,
      status: "ACTIVE",
      categoryId: fruitsCategory.id,
    },
  });
  const grapeProduct = await prisma.product.create({
    data: {
      name: "Red Grapes",
      slug: "red-grapes",
      description: "Fresh seedless red grapes, 500g",
      price: 200.0,
      sku: "FRU003",
      stock: 60,
      unit: "g",
      weight: 500,
      status: "ACTIVE",
      isFeatured: true,
      categoryId: fruitsCategory.id,
    },
  });

  // Dairy & Beverages
  const milkProduct = await prisma.product.create({
    data: {
      name: "Fresh Milk",
      slug: "fresh-milk",
      description: "Pasteurized milk",
      price: 90.0,
      sku: "DAI001",
      stock: 200,
      unit: "L",
      weight: 1.0,
      status: "ACTIVE",
      categoryId: dairyCategory.id,
    },
  });
  const eggProduct = await prisma.product.create({
    data: {
      name: "Farm Eggs",
      slug: "farm-eggs",
      description: "Fresh farm eggs, 1 dozen",
      price: 140.0,
      sku: "DAI002",
      stock: 150,
      unit: "dozen",
      weight: 0.8,
      status: "ACTIVE",
      isFeatured: true,
      categoryId: dairyCategory.id,
    },
  });
  const yogurtProduct = await prisma.product.create({
    data: {
      name: "Greek Yogurt",
      slug: "greek-yogurt",
      description: "Plain greek yogurt, 500g",
      price: 250.0,
      sku: "DAI003",
      stock: 50,
      unit: "g",
      weight: 500,
      status: "ACTIVE",
      categoryId: dairyCategory.id,
    },
  });

  const juiceProduct = await prisma.product.create({
    data: {
      name: "Fruit Juice",
      slug: "fruit-juice",
      description: "100% pure fruit juice",
      price: 150.0,
      sku: "BEV001",
      stock: 50,
      unit: "L",
      weight: 1.0,
      status: "ACTIVE",
      categoryId: beveragesCategory.id,
    },
  });
  const colaProduct = await prisma.product.create({
    data: {
      name: "Cola Soft Drink",
      slug: "cola-soft-drink",
      description: "Refreshing cola",
      price: 60.0,
      sku: "BEV002",
      stock: 300,
      unit: "bottle",
      weight: 1.0,
      status: "ACTIVE",
      categoryId: beveragesCategory.id,
    },
  });
  const coffeeProduct = await prisma.product.create({
    data: {
      name: "Instant Coffee",
      slug: "instant-coffee",
      description: "Premium instant coffee, 100g",
      price: 350.0,
      sku: "BEV003",
      stock: 40,
      unit: "g",
      weight: 100,
      status: "ACTIVE",
      categoryId: beveragesCategory.id,
    },
  });

  // Meat & Snacks
  const chickenProduct = await prisma.product.create({
    data: {
      name: "Fresh Chicken",
      slug: "fresh-chicken",
      description: "Whole chicken, cleaned and cut, 1kg",
      price: 250.0,
      sku: "MEA001",
      stock: 50,
      unit: "kg",
      weight: 1.0,
      status: "ACTIVE",
      isFeatured: true,
      categoryId: meatCategory.id,
    },
  });
  const beefProduct = await prisma.product.create({
    data: {
      name: "Beef Steak",
      slug: "beef-steak",
      description: "Premium beef steak cuts",
      price: 800.0,
      sku: "MEA002",
      stock: 30,
      unit: "kg",
      weight: 1.0,
      status: "ACTIVE",
      isFeatured: true,
      categoryId: meatCategory.id,
    },
  });

  const breadProduct = await prisma.product.create({
    data: {
      name: "Whole Wheat Bread",
      slug: "whole-wheat-bread",
      description: "Freshly baked whole wheat bread",
      price: 60.0,
      sku: "SNA001",
      stock: 30,
      unit: "pack",
      weight: 0.4,
      status: "ACTIVE",
      categoryId: snacksCategory.id,
    },
  });
  const cookieProduct = await prisma.product.create({
    data: {
      name: "Premium Cookies",
      slug: "premium-cookies",
      description: "Delicious baked cookies, 200g",
      price: 150.0,
      sku: "SNA002",
      stock: 100,
      unit: "pack",
      weight: 200,
      status: "ACTIVE",
      categoryId: snacksCategory.id,
    },
  });
  const chipsProduct = await prisma.product.create({
    data: {
      name: "Potato Chips",
      slug: "potato-chips",
      description: "Crispy potato chips",
      price: 40.0,
      sku: "SNA003",
      stock: 250,
      unit: "pack",
      weight: 50,
      status: "ACTIVE",
      categoryId: snacksCategory.id,
    },
  });

  // Care & Frozen
  const soapProduct = await prisma.product.create({
    data: {
      name: "Beauty Soap",
      slug: "beauty-soap",
      description: "Moisturizing beauty soap, 100g",
      price: 45.0,
      sku: "PER001",
      stock: 150,
      unit: "pc",
      weight: 0.1,
      status: "ACTIVE",
      categoryId: personalCareCategory.id,
    },
  });
  const shampooProduct = await prisma.product.create({
    data: {
      name: "Anti-Dandruff Shampoo",
      slug: "anti-dandruff-shampoo",
      description: "Effective hair care",
      price: 320.0,
      sku: "PER002",
      stock: 80,
      unit: "bottle",
      weight: 0.3,
      status: "ACTIVE",
      categoryId: personalCareCategory.id,
    },
  });

  const pizzaProduct = await prisma.product.create({
    data: {
      name: "Frozen Margherita Pizza",
      slug: "frozen-pizza",
      description: "Ready to bake pizza",
      price: 450.0,
      sku: "FRO001",
      stock: 40,
      unit: "box",
      weight: 0.4,
      status: "ACTIVE",
      categoryId: frozenCategory.id,
    },
  });
  const iceCreamProduct = await prisma.product.create({
    data: {
      name: "Premium Ice Cream",
      slug: "premium-ice-cream",
      description: "Creamy delicious ice cream, 1L",
      price: 300.0,
      sku: "FRO002",
      stock: 60,
      unit: "box",
      weight: 1.0,
      status: "ACTIVE",
      isFeatured: true,
      categoryId: frozenCategory.id,
    },
  });

  // Cleaning & Pets
  const dishLiquidProduct = await prisma.product.create({
    data: {
      name: "Dishwashing Liquid",
      slug: "dishwashing-liquid",
      description: "Lemon fresh dishwashing liquid, 500ml",
      price: 120.0,
      sku: "CLE001",
      stock: 120,
      unit: "bottle",
      weight: 0.5,
      status: "ACTIVE",
      categoryId: cleaningCategory.id,
    },
  });
  const detergentProduct = await prisma.product.create({
    data: {
      name: "Laundry Detergent",
      slug: "laundry-detergent",
      description: "Top load washing powder, 1kg",
      price: 200.0,
      sku: "CLE002",
      stock: 90,
      unit: "pack",
      weight: 1.0,
      status: "ACTIVE",
      categoryId: cleaningCategory.id,
    },
  });

  const dogFoodProduct = await prisma.product.create({
    data: {
      name: "Premium Dog Food",
      slug: "dog-food",
      description: "Nutritious dry dog food",
      price: 1200.0,
      sku: "PET001",
      stock: 25,
      unit: "bag",
      weight: 3.0,
      status: "ACTIVE",
      categoryId: petCategory.id,
    },
  });
  const catFoodProduct = await prisma.product.create({
    data: {
      name: "Tuna Cat Food",
      slug: "cat-food",
      description: "Wet canned cat food, 80g",
      price: 80.0,
      sku: "PET002",
      stock: 200,
      unit: "can",
      weight: 0.08,
      status: "ACTIVE",
      categoryId: petCategory.id,
    },
  });

  // Rice, Dal, Spices, Oil, Baby Care
  const miniketRiceProduct = await prisma.product.create({
    data: {
      name: "Miniket Rice",
      slug: "miniket-rice",
      description: "Premium Miniket rice, 5kg bag",
      price: 620.0,
      salePrice: 590.0,
      sku: "RICE001",
      stock: 120,
      unit: "bag",
      weight: 5.0,
      status: "ACTIVE",
      isFeatured: true,
      categoryId: riceDalCategory.id,
    },
  });

  const basmatiRiceProduct = await prisma.product.create({
    data: {
      name: "Basmati Rice",
      slug: "basmati-rice",
      description: "Aromatic basmati rice, 1kg",
      price: 280.0,
      sku: "RICE002",
      stock: 90,
      unit: "kg",
      weight: 1.0,
      status: "ACTIVE",
      categoryId: riceDalCategory.id,
    },
  });

  const masoorDalProduct = await prisma.product.create({
    data: {
      name: "Masoor Dal",
      slug: "masoor-dal",
      description: "Clean red lentils, 1kg",
      price: 170.0,
      sku: "RICE003",
      stock: 160,
      unit: "kg",
      weight: 1.0,
      status: "ACTIVE",
      categoryId: riceDalCategory.id,
    },
  });

  const chickpeasProduct = await prisma.product.create({
    data: {
      name: "Chickpeas",
      slug: "chickpeas",
      description: "Premium chickpeas (boot), 1kg",
      price: 190.0,
      sku: "RICE004",
      stock: 110,
      unit: "kg",
      weight: 1.0,
      status: "ACTIVE",
      categoryId: riceDalCategory.id,
    },
  });

  const turmericPowderProduct = await prisma.product.create({
    data: {
      name: "Turmeric Powder",
      slug: "turmeric-powder",
      description: "Pure turmeric powder, 200g pack",
      price: 120.0,
      sku: "SPI001",
      stock: 130,
      unit: "pack",
      weight: 0.2,
      status: "ACTIVE",
      categoryId: spicesCategory.id,
    },
  });

  const redChiliPowderProduct = await prisma.product.create({
    data: {
      name: "Red Chili Powder",
      slug: "red-chili-powder",
      description: "Hot red chili powder, 200g pack",
      price: 140.0,
      sku: "SPI002",
      stock: 120,
      unit: "pack",
      weight: 0.2,
      status: "ACTIVE",
      categoryId: spicesCategory.id,
    },
  });

  const cuminPowderProduct = await prisma.product.create({
    data: {
      name: "Cumin Powder",
      slug: "cumin-powder",
      description: "Freshly ground cumin powder, 100g",
      price: 110.0,
      sku: "SPI003",
      stock: 100,
      unit: "pack",
      weight: 0.1,
      status: "ACTIVE",
      categoryId: spicesCategory.id,
    },
  });

  const soybeanOilProduct = await prisma.product.create({
    data: {
      name: "Soybean Oil",
      slug: "soybean-oil",
      description: "Refined soybean oil, 5L",
      price: 920.0,
      sku: "OIL001",
      stock: 95,
      unit: "bottle",
      weight: 5.0,
      status: "ACTIVE",
      isFeatured: true,
      categoryId: oilGheeCategory.id,
    },
  });

  const mustardOilProduct = await prisma.product.create({
    data: {
      name: "Mustard Oil",
      slug: "mustard-oil",
      description: "Pure mustard oil, 1L",
      price: 280.0,
      sku: "OIL002",
      stock: 85,
      unit: "bottle",
      weight: 1.0,
      status: "ACTIVE",
      categoryId: oilGheeCategory.id,
    },
  });

  const desiGheeProduct = await prisma.product.create({
    data: {
      name: "Desi Ghee",
      slug: "desi-ghee",
      description: "Traditional desi ghee, 500g jar",
      price: 780.0,
      sku: "OIL003",
      stock: 60,
      unit: "jar",
      weight: 0.5,
      status: "ACTIVE",
      categoryId: oilGheeCategory.id,
    },
  });

  const babyDiapersProduct = await prisma.product.create({
    data: {
      name: "Baby Diapers (M)",
      slug: "baby-diapers-m",
      description: "Soft baby diapers, size M, 50 pcs",
      price: 1250.0,
      salePrice: 1180.0,
      sku: "BABY001",
      stock: 70,
      unit: "pack",
      weight: 1.8,
      status: "ACTIVE",
      categoryId: babyCareCategory.id,
    },
  });

  const babyWipesProduct = await prisma.product.create({
    data: {
      name: "Baby Wipes",
      slug: "baby-wipes",
      description: "Gentle wet wipes, 120 sheets",
      price: 220.0,
      sku: "BABY002",
      stock: 140,
      unit: "pack",
      weight: 0.4,
      status: "ACTIVE",
      categoryId: babyCareCategory.id,
    },
  });

  // Create Product Variants
  console.log("Creating product variants...");
  await prisma.productVariant.createMany({
    data: [
      {
        productId: milkProduct.id,
        name: "Size",
        value: "500ml",
        price: 50.0,
        stock: 100,
        sku: "DAI001-500",
      },
      {
        productId: milkProduct.id,
        name: "Size",
        value: "1L",
        price: 90.0,
        stock: 100,
        sku: "DAI001-1L",
      },
      {
        productId: juiceProduct.id,
        name: "Flavor",
        value: "Orange",
        price: 150.0,
        stock: 25,
        sku: "BEV001-ORG",
      },
      {
        productId: juiceProduct.id,
        name: "Flavor",
        value: "Apple",
        price: 160.0,
        stock: 25,
        sku: "BEV001-APL",
      },
      {
        productId: juiceProduct.id,
        name: "Flavor",
        value: "Mango",
        price: 170.0,
        stock: 25,
        sku: "BEV001-MNG",
      },
      {
        productId: colaProduct.id,
        name: "Size",
        value: "500ml",
        price: 40.0,
        stock: 100,
        sku: "BEV002-500",
      },
      {
        productId: colaProduct.id,
        name: "Size",
        value: "1L",
        price: 60.0,
        stock: 150,
        sku: "BEV002-1L",
      },
      {
        productId: colaProduct.id,
        name: "Size",
        value: "2L",
        price: 110.0,
        stock: 50,
        sku: "BEV002-2L",
      },
      {
        productId: beefProduct.id,
        name: "Weight",
        value: "500g",
        price: 420.0,
        stock: 20,
        sku: "MEA002-500G",
      },
      {
        productId: beefProduct.id,
        name: "Weight",
        value: "1kg",
        price: 800.0,
        stock: 10,
        sku: "MEA002-1KG",
      },
      {
        productId: cookieProduct.id,
        name: "Flavor",
        value: "Choco Chip",
        price: 150.0,
        stock: 50,
        sku: "SNA002-CHOC",
      },
      {
        productId: cookieProduct.id,
        name: "Flavor",
        value: "Oatmeal",
        price: 160.0,
        stock: 50,
        sku: "SNA002-OAT",
      },
      {
        productId: shampooProduct.id,
        name: "Size",
        value: "200ml",
        price: 180.0,
        stock: 50,
        sku: "PER002-200",
      },
      {
        productId: shampooProduct.id,
        name: "Size",
        value: "500ml",
        price: 320.0,
        stock: 30,
        sku: "PER002-500",
      },
      {
        productId: iceCreamProduct.id,
        name: "Flavor",
        value: "Vanilla",
        price: 300.0,
        stock: 20,
        sku: "FRO002-VAN",
      },
      {
        productId: iceCreamProduct.id,
        name: "Flavor",
        value: "Chocolate",
        price: 320.0,
        stock: 20,
        sku: "FRO002-CHO",
      },
      {
        productId: iceCreamProduct.id,
        name: "Flavor",
        value: "Strawberry",
        price: 310.0,
        stock: 20,
        sku: "FRO002-STR",
      },
      {
        productId: dogFoodProduct.id,
        name: "Weight",
        value: "1kg",
        price: 450.0,
        stock: 15,
        sku: "PET001-1KG",
      },
      {
        productId: dogFoodProduct.id,
        name: "Weight",
        value: "3kg",
        price: 1200.0,
        stock: 10,
        sku: "PET001-3KG",
      },
      {
        productId: miniketRiceProduct.id,
        name: "Weight",
        value: "2kg",
        price: 260.0,
        stock: 80,
        sku: "RICE001-2KG",
      },
      {
        productId: miniketRiceProduct.id,
        name: "Weight",
        value: "5kg",
        price: 620.0,
        stock: 120,
        sku: "RICE001-5KG",
      },
      {
        productId: soybeanOilProduct.id,
        name: "Size",
        value: "2L",
        price: 390.0,
        stock: 70,
        sku: "OIL001-2L",
      },
      {
        productId: soybeanOilProduct.id,
        name: "Size",
        value: "5L",
        price: 920.0,
        stock: 95,
        sku: "OIL001-5L",
      },
      {
        productId: babyDiapersProduct.id,
        name: "Size",
        value: "M (50 pcs)",
        price: 1250.0,
        stock: 70,
        sku: "BABY001-M",
      },
      {
        productId: babyDiapersProduct.id,
        name: "Size",
        value: "L (44 pcs)",
        price: 1280.0,
        stock: 55,
        sku: "BABY001-L",
      },
    ],
  });

  // 5. Create Product Images
  console.log("Creating product images...");
  await prisma.productImage.createMany({
    data: [
      {
        productId: tomatoProduct.id,
        url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop",
        publicId: "tomato1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: potatoProduct.id,
        url: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&auto=format&fit=crop",
        publicId: "potato1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: onionProduct.id,
        url: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800&auto=format&fit=crop",
        publicId: "onion1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: cucumberProduct.id,
        url: "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=800&auto=format&fit=crop",
        publicId: "cucumber1",
        isPrimary: true,
        sortOrder: 0,
      },

      {
        productId: appleProduct.id,
        url: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&auto=format&fit=crop",
        publicId: "apple1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: bananaProduct.id,
        url: "https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=800&auto=format&fit=crop",
        publicId: "banana1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: grapeProduct.id,
        url: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=800&auto=format&fit=crop",
        publicId: "grape1",
        isPrimary: true,
        sortOrder: 0,
      },

      {
        productId: milkProduct.id,
        url: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800&auto=format&fit=crop",
        publicId: "milk1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: eggProduct.id,
        url: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=800&auto=format&fit=crop",
        publicId: "egg1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: yogurtProduct.id,
        url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&auto=format&fit=crop",
        publicId: "yogurt1",
        isPrimary: true,
        sortOrder: 0,
      },

      {
        productId: juiceProduct.id,
        url: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=800&auto=format&fit=crop",
        publicId: "juice1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: colaProduct.id,
        url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop",
        publicId: "cola1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: coffeeProduct.id,
        url: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=800&auto=format&fit=crop",
        publicId: "coffee1",
        isPrimary: true,
        sortOrder: 0,
      },

      {
        productId: chickenProduct.id,
        url: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800&auto=format&fit=crop",
        publicId: "chicken1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: beefProduct.id,
        url: "https://images.unsplash.com/photo-1690983325563-fe4412c4c347?w=1200&auto=format&fit=crop",
        publicId: "beef1",
        isPrimary: true,
        sortOrder: 0,
      },

      {
        productId: breadProduct.id,
        url: "https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=800&auto=format&fit=crop",
        publicId: "bread1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: cookieProduct.id,
        url: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop",
        publicId: "cookie1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: chipsProduct.id,
        url: "https://images.unsplash.com/photo-1566478989037-e924e50cb0ee?w=800&auto=format&fit=crop",
        publicId: "chips1",
        isPrimary: true,
        sortOrder: 0,
      },

      {
        productId: soapProduct.id,
        url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=1200&auto=format&fit=crop",
        publicId: "soap1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: shampooProduct.id,
        url: "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=800&auto=format&fit=crop",
        publicId: "shampoo1",
        isPrimary: true,
        sortOrder: 0,
      },

      {
        productId: pizzaProduct.id,
        url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop",
        publicId: "pizza1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: iceCreamProduct.id,
        url: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=800&auto=format&fit=crop",
        publicId: "icecream1",
        isPrimary: true,
        sortOrder: 0,
      },

      {
        productId: dishLiquidProduct.id,
        url: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=1200&auto=format&fit=crop",
        publicId: "dish1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: detergentProduct.id,
        url: "https://images.unsplash.com/photo-1610555356070-d0efb6505f81?w=800&auto=format&fit=crop",
        publicId: "detergent1",
        isPrimary: true,
        sortOrder: 0,
      },

      {
        productId: dogFoodProduct.id,
        url: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800&auto=format&fit=crop",
        publicId: "dogfood1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: catFoodProduct.id,
        url: "https://images.unsplash.com/photo-1666679062568-9407b8a784bc?w=1200&auto=format&fit=crop",
        publicId: "catfood1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: miniketRiceProduct.id,
        url: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=1200&auto=format&fit=crop",
        publicId: "rice1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: basmatiRiceProduct.id,
        url: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=1200&auto=format&fit=crop",
        publicId: "rice2",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: masoorDalProduct.id,
        url: "https://images.unsplash.com/photo-1708436477916-f97964f3ccf1?w=1200&auto=format&fit=crop",
        publicId: "dal1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: chickpeasProduct.id,
        url: "https://images.unsplash.com/photo-1710752703871-dfad6623cb18?w=1200&auto=format&fit=crop",
        publicId: "dal2",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: turmericPowderProduct.id,
        url: "https://images.unsplash.com/photo-1768729340164-7d83fe18384d?w=1200&auto=format&fit=crop",
        publicId: "spice1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: redChiliPowderProduct.id,
        url: "https://images.unsplash.com/photo-1741521312797-28c6e5466e65?w=1200&auto=format&fit=crop",
        publicId: "spice2",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: cuminPowderProduct.id,
        url: "https://images.unsplash.com/photo-1773869910193-c7ae23145ac9?w=1200&auto=format&fit=crop",
        publicId: "spice3",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: soybeanOilProduct.id,
        url: "https://images.unsplash.com/photo-1666694890460-37ec16b0df47?w=1200&auto=format&fit=crop",
        publicId: "oil1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: mustardOilProduct.id,
        url: "https://images.unsplash.com/photo-1666694890460-37ec16b0df47?w=1200&auto=format&fit=crop",
        publicId: "oil2",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: desiGheeProduct.id,
        url: "https://images.unsplash.com/photo-1666694890460-37ec16b0df47?w=1200&auto=format&fit=crop",
        publicId: "oil3",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: babyDiapersProduct.id,
        url: "https://images.unsplash.com/photo-1661340653712-c0a71c546210?w=1200&auto=format&fit=crop",
        publicId: "baby1",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: babyWipesProduct.id,
        url: "https://images.unsplash.com/photo-1706524077391-12206f155e94?w=1200&auto=format&fit=crop",
        publicId: "baby2",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  });

  // 6. Create Carts
  console.log("Creating carts...");
  const cart1 = await prisma.cart.create({ data: { userId: customerUser.id } });
  const cart2 = await prisma.cart.create({
    data: { userId: customerUser2.id },
  });

  // 7. Create Cart Items
  console.log("Creating cart items...");
  await prisma.cartItem.createMany({
    data: [
      { cartId: cart1.id, productId: tomatoProduct.id, quantity: 2 },
      { cartId: cart1.id, productId: appleProduct.id, quantity: 1 },
      { cartId: cart1.id, productId: pizzaProduct.id, quantity: 2 },
      { cartId: cart1.id, productId: colaProduct.id, quantity: 4 },

      { cartId: cart2.id, productId: milkProduct.id, quantity: 3 },
      { cartId: cart2.id, productId: juiceProduct.id, quantity: 1 },
      { cartId: cart2.id, productId: dogFoodProduct.id, quantity: 1 },
      { cartId: cart2.id, productId: soapProduct.id, quantity: 5 },
    ],
  });

  // 8. Create Coupons
  console.log("Creating coupons...");
  const coupon1 = await prisma.coupon.create({
    data: {
      code: "WELCOME10",
      description: "10% off on first order",
      type: "PERCENT",
      value: 10,
      minOrder: 500,
      maxDiscount: 200,
      usageLimit: 100,
      usedCount: 0,
      isActive: true,
      expiresAt: new Date("2026-12-31"),
    },
  });
  const coupon2 = await prisma.coupon.create({
    data: {
      code: "FREESHIP",
      description: "Free shipping on orders above 1000",
      type: "FLAT",
      value: 100,
      minOrder: 1000,
      isActive: true,
      expiresAt: new Date("2026-06-30"),
    },
  });
  const coupon3 = await prisma.coupon.create({
    data: {
      code: "KRISHI20",
      description: "20% off weekend special",
      type: "PERCENT",
      value: 20,
      minOrder: 2000,
      maxDiscount: 500,
      usageLimit: 50,
      usedCount: 0,
      isActive: true,
      expiresAt: new Date("2026-12-31"),
    },
  });

  // 9. Create Orders
  console.log("Creating orders...");
  const order1 = await prisma.order.create({
    data: {
      orderNumber: `ORD-${Date.now()}-001`,
      userId: customerUser.id,
      addressId: address1.id,
      status: "CONFIRMED",
      subtotal: 270.0,
      deliveryFee: 50.0,
      discount: 20.0,
      total: 300.0,
      notes: "Please deliver before 6 PM",
      couponId: coupon1.id,
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      paymentMethod: "BKASH",
      paymentStatus: "COMPLETED",
    },
  });

  const order2 = await prisma.order.create({
    data: {
      orderNumber: `ORD-${Date.now()}-002`,
      userId: customerUser2.id,
      addressId: address2.id,
      status: "DELIVERED",
      subtotal: 450.0,
      deliveryFee: 0.0,
      discount: 100.0,
      total: 350.0,
      couponId: coupon2.id,
      estimatedDelivery: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      paymentMethod: "CASH_ON_DELIVERY",
      paymentStatus: "COMPLETED",
    },
  });

  const order3 = await prisma.order.create({
    data: {
      orderNumber: `ORD-${Date.now()}-003`,
      userId: customerUser.id,
      addressId: address1.id,
      status: "PROCESSING",
      subtotal: 1250.0,
      deliveryFee: 50.0,
      discount: 0.0,
      total: 1300.0,
      estimatedDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      paymentMethod: "CARD",
      paymentStatus: "COMPLETED",
    },
  });

  // 10. Create Order Items
  console.log("Creating order items...");
  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order1.id,
        productId: tomatoProduct.id,
        quantity: 2,
        price: 70.0,
        name: "Fresh Tomatoes",
      },
      {
        orderId: order1.id,
        productId: appleProduct.id,
        quantity: 1,
        price: 100.0,
        name: "Green Apples",
      },

      {
        orderId: order2.id,
        productId: milkProduct.id,
        quantity: 3,
        price: 90.0,
        name: "Fresh Milk",
      },
      {
        orderId: order2.id,
        productId: juiceProduct.id,
        quantity: 1,
        price: 150.0,
        name: "Orange Juice",
      },

      {
        orderId: order3.id,
        productId: beefProduct.id,
        quantity: 1,
        price: 800.0,
        name: "Beef Steak",
      },
      {
        orderId: order3.id,
        productId: pizzaProduct.id,
        quantity: 1,
        price: 450.0,
        name: "Frozen Margherita Pizza",
      },
    ],
  });

  // 11. Create Order Tracking
  console.log("Creating order tracking...");
  await prisma.orderTracking.createMany({
    data: [
      { orderId: order1.id, status: "PENDING", message: "Order placed" },
      {
        orderId: order1.id,
        status: "CONFIRMED",
        message: "Order confirmed by store",
      },

      { orderId: order2.id, status: "PENDING", message: "Order placed" },
      { orderId: order2.id, status: "CONFIRMED", message: "Order confirmed" },
      {
        orderId: order2.id,
        status: "PROCESSING",
        message: "Preparing for shipment",
      },
      {
        orderId: order2.id,
        status: "DELIVERED",
        message: "Delivered successfully",
      },

      { orderId: order3.id, status: "PENDING", message: "Order placed" },
      { orderId: order3.id, status: "CONFIRMED", message: "Order confirmed" },
      {
        orderId: order3.id,
        status: "PROCESSING",
        message: "Preparing for shipment",
      },
    ],
  });

  // 12. Create Payments
  console.log("Creating payments...");
  await prisma.payment.create({
    data: {
      orderId: order1.id,
      method: "BKASH",
      status: "COMPLETED",
      amount: 300.0,
      transactionId: "TX123456789",
      bkashPaymentId: "BKA123456",
    },
  });
  await prisma.payment.create({
    data: {
      orderId: order2.id,
      method: "CASH_ON_DELIVERY",
      status: "COMPLETED",
      amount: 350.0,
    },
  });
  await prisma.payment.create({
    data: {
      orderId: order3.id,
      method: "CARD",
      status: "COMPLETED",
      amount: 1300.0,
      transactionId: "CARD987654321",
    },
  });

  // 13. Create Reviews
  console.log("Creating reviews...");
  await prisma.review.createMany({
    data: [
      {
        userId: customerUser.id,
        productId: tomatoProduct.id,
        orderId: order1.id,
        rating: 5,
        comment: "Excellent quality tomatoes!",
        isApproved: true,
      },
      {
        userId: customerUser.id,
        productId: appleProduct.id,
        orderId: order1.id,
        rating: 4,
        comment: "Good apples, slightly sour",
        isApproved: true,
      },
      {
        userId: customerUser2.id,
        productId: milkProduct.id,
        orderId: order2.id,
        rating: 5,
        comment: "Fresh and tasty milk",
        isApproved: true,
      },
      {
        userId: customerUser2.id,
        productId: juiceProduct.id,
        orderId: order2.id,
        rating: 5,
        comment: "Kids loved this juice",
        isApproved: true,
      },
      {
        userId: customerUser.id,
        productId: pizzaProduct.id,
        rating: 4,
        comment: "Great frozen pizza, highly recommend.",
        isApproved: true,
      },
    ],
  });

  // 14. Create Coupon Usages
  console.log("Creating coupon usages...");
  await prisma.couponUsage.create({
    data: { couponId: coupon1.id, userId: customerUser.id },
  });
  await prisma.couponUsage.create({
    data: { couponId: coupon2.id, userId: customerUser2.id },
  });

  // 15. Create Wishlist Items
  console.log("Creating wishlist items...");
  await prisma.wishlist.createMany({
    data: [
      { userId: customerUser.id, productId: juiceProduct.id },
      { userId: customerUser.id, productId: beefProduct.id },
      { userId: customerUser.id, productId: iceCreamProduct.id },

      { userId: customerUser2.id, productId: tomatoProduct.id },
      { userId: customerUser2.id, productId: appleProduct.id },
      { userId: customerUser2.id, productId: detergentProduct.id },
    ],
  });

  // 16. Create Notifications
  console.log("Creating notifications...");
  await prisma.notification.createMany({
    data: [
      {
        userId: customerUser.id,
        title: "Order Confirmed",
        message: "Your order ORD-001 has been confirmed",
        type: "ORDER",
        isRead: false,
      },
      {
        userId: customerUser.id,
        title: "Payment Successful",
        message: "Your payment of ৳300.00 was successful",
        type: "PAYMENT",
        isRead: true,
      },
      {
        userId: customerUser.id,
        title: "Order Processing",
        message: "Your order ORD-003 is now processing",
        type: "ORDER",
        isRead: false,
      },

      {
        userId: customerUser2.id,
        title: "Delivery Update",
        message: "Your order has been delivered",
        type: "ORDER",
        isRead: false,
      },

      {
        userId: adminUser.id,
        title: "System Alert",
        message: "New user registered: John Doe",
        type: "SYSTEM",
        isRead: false,
      },
    ],
  });

  // 17. Create OTP Verifications
  console.log("Creating OTP verifications...");
  await prisma.otpVerification.create({
    data: {
      email: "john.doe@example.com",
      otp: "123456",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log(`Created:
  - 3 users (1 admin, 2 customers)
  - 2 addresses
  - 14 categories
  - 38 products with images
  - 25 product variants
  - 2 carts with 8 items total
  - 3 coupons
  - 3 orders with 6 items total and 9 tracking updates
  - 3 payments
  - 5 reviews
  - 2 coupon usages
  - 6 wishlist items
  - 5 notifications
  - 1 OTP verification
  `);
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
