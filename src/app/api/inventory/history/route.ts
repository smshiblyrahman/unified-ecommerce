import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const channel = searchParams.get("channel");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (channel) where.channel = channel;

  const [transactions, total] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where,
      include: {
        inventory: { include: { product: true, variant: true } },
        order: { select: { orderNumber: true } },
        user: { select: { name: true } },
        orderReturn: { select: { returnNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.inventoryTransaction.count({ where }),
  ]);

  return NextResponse.json({ transactions, total, page, limit });
}
