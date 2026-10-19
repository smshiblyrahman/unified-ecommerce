import { PrismaClient, SalesChannel, UserRole, ProductStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Unified Ecommerce database...");

  // ─── Default Location ───
  const location = await prisma.location.upsert({
    where: { id: "loc-default" },
    update: {},
    create: {
      id: "loc-default",
      name: "Main Store",
      address: "Dhaka, Bangladesh",
      isDefault: true,
    },
  });
  console.log("✅ Location created:", location.name);

  // ─── Admin User ───
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@devicenagar.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@devicenagar.com",
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // ─── Cashier User ───
  const cashierPwd = await bcrypt.hash("cashier123", 12);
  const cashier = await prisma.user.upsert({
    where: { email: "cashier@devicenagar.com" },
    update: {},
    create: {
      name: "John Cashier",
      email: "cashier@devicenagar.com",
      password: cashierPwd,
      role: UserRole.CASHIER,
    },
  });
  console.log("✅ Cashier user created:", cashier.email);

  // ─── Walk-in Customer ───
  const walkIn = await prisma.customer.upsert({
    where: { id: "customer-walkin" },
    update: {},
    create: {
      id: "customer-walkin",
      name: "Walk-in Customer",
      isWalkIn: true,
    },
  });
  console.log("✅ Walk-in customer created");

  // ─── POS Terminal ───
  const terminal = await prisma.posTerminal.upsert({
    where: { identifier: "POS-01" },
    update: {},
    create: {
      name: "POS Terminal 01",
      identifier: "POS-01",
      locationId: location.id,
    },
  });
  console.log("✅ POS Terminal created:", terminal.name);

  // ─── Categories ───
  const categories = [
    { id: "cat-electronics", name: "Electronics", slug: "electronics" },
    { id: "cat-mobiles", name: "Mobile Phones", slug: "mobile-phones", parentId: "cat-electronics" },
    { id: "cat-laptops", name: "Laptops", slug: "laptops", parentId: "cat-electronics" },
    { id: "cat-accessories", name: "Accessories", slug: "accessories" },
    { id: "cat-audio", name: "Audio", slug: "audio" },
    { id: "cat-fashion", name: "Fashion", slug: "fashion" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log("✅ Categories created");

  // ─── Sample Products ───
  const products = [
    {
      id: "prod-wireless-headphones",
      name: "Wireless Headphones",
      slug: "wireless-headphones",
      sku: "WH-001",
      barcode: "8801234567890",
      categoryId: "cat-audio",
      basePrice: 5000,
      costPrice: 3000,
      taxRate: 5,
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
      initialStock: 100,
    },
    {
      id: "prod-iphone-15",
      name: "iPhone 15 Pro",
      slug: "iphone-15-pro",
      sku: "IP15P-001",
      barcode: "8809876543210",
      categoryId: "cat-mobiles",
      basePrice: 145000,
      costPrice: 120000,
      taxRate: 5,
      imageUrl: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400",
      initialStock: 25,
    },
    {
      id: "prod-macbook-pro",
      name: "MacBook Pro M3",
      slug: "macbook-pro-m3",
      sku: "MBP-M3-001",
      categoryId: "cat-laptops",
      basePrice: 280000,
      costPrice: 240000,
      taxRate: 5,
      imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400",
      initialStock: 10,
    },
    {
      id: "prod-nike-air-max",
      name: "Nike Air Max 270",
      slug: "nike-air-max-270",
      sku: "NAM-270",
      categoryId: "cat-fashion",
      basePrice: 12000,
      costPrice: 7000,
      taxRate: 0,
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
      initialStock: 80,
    },
    {
      id: "prod-samsung-s24",
      name: "Samsung Galaxy S24 Ultra",
      slug: "samsung-galaxy-s24-ultra",
      sku: "SS-S24U",
      categoryId: "cat-mobiles",
      basePrice: 135000,
      costPrice: 110000,
      taxRate: 5,
      imageUrl: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400",
      initialStock: 30,
    },
    {
      id: "prod-usb-hub",
      name: "USB-C Hub 7-in-1",
      slug: "usb-c-hub-7in1",
      sku: "USB-7IN1",
      categoryId: "cat-accessories",
      basePrice: 2500,
      costPrice: 1200,
      taxRate: 5,
      imageUrl: "https://images.unsplash.com/photo-1625314887424-9f190599bd56?w=400",
      initialStock: 3, // Low stock for demo
    },
  ];

  for (const { initialStock, ...productData } of products) {
    await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {},
      create: productData as Parameters<typeof prisma.product.create>[0]["data"],
    });

    // Create or update inventory
    const existingInv = await prisma.inventory.findFirst({
      where: { productId: productData.id, variantId: null, locationId: null },
    });

    if (!existingInv) {
      const inv = await prisma.inventory.create({
        data: { productId: productData.id, quantity: initialStock },
      });
      await prisma.inventoryTransaction.create({
        data: {
          inventoryId: inv.id,
          type: "INITIAL",
          previousStock: 0,
          quantityChange: initialStock,
          newStock: initialStock,
          notes: "Initial seed stock",
        },
      });
    }
  }
  console.log("✅ Products and inventory created");

  // ─── Sample Customers ───
  const customers = [
    { name: "Rahim Ahmed", email: "rahim@example.com", phone: "01711234567", city: "Dhaka" },
    { name: "Fatima Khatun", email: "fatima@example.com", phone: "01822345678", city: "Chittagong" },
    { name: "Karim Hassan", email: "karim@example.com", phone: "01933456789", city: "Sylhet" },
  ];

  for (const cust of customers) {
    await prisma.customer.upsert({
      where: { email: cust.email },
      update: {},
      create: cust,
    });
  }
  console.log("✅ Sample customers created");

  // ─── Store Settings ───
  await prisma.setting.upsert({
    where: { key: "store" },
    update: {},
    create: {
      key: "store",
      value: {
        name: "Unified Ecommerce",
        tagline: "Your Trusted Tech Partner",
        address: "House 12, Road 5, Banani, Dhaka-1213",
        phone: "01700000000",
        email: "info@devicenagar.com",
        currency: "BDT",
        currencySymbol: "৳",
        taxLabel: "VAT",
        defaultTaxRate: 5,
        invoiceFooter: "Thank you for shopping at Unified Ecommerce!",
        posDefaultTerminal: "POS-01",
      },
    },
  });
  console.log("✅ Store settings created");

  console.log("🎉 Seed complete!");
  console.log("📧 Admin login: admin@devicenagar.com / admin123");
  console.log("📧 Cashier login: cashier@devicenagar.com / cashier123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
