import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId");
  const status = searchParams.get("status") || "ACTIVE";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        inventory: true,
        variants: { include: { inventory: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ products, total, page, limit });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, sku, barcode, categoryId, basePrice, costPrice, comparePrice, taxRate, imageUrl, images, hasVariants, trackStock, status, tags, initialStock = 0 } = body;

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          name, slug, description, sku: sku || null, barcode: barcode || null,
          categoryId: categoryId || null, basePrice, costPrice: costPrice || null,
          comparePrice: comparePrice || null, taxRate: taxRate || 0,
          imageUrl: imageUrl || null, images: images || [],
          hasVariants: hasVariants || false, trackStock: trackStock !== false,
          status: status || "ACTIVE", tags: tags || [],
        },
      });

      // Create initial inventory
      const inv = await tx.inventory.create({
        data: { productId: p.id, quantity: initialStock },
      });

      if (initialStock > 0) {
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inv.id,
            type: "INITIAL",
            previousStock: 0,
            quantityChange: initialStock,
            newStock: initialStock,
            notes: "Initial stock",
          },
        });
      }

      return p;
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create product", detail: String(error) }, { status: 500 });
  }
}
