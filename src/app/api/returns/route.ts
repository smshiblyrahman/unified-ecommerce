import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderService } from "@/services/order.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, reason, items, refundMethod, addToStock, userId } = body;

    const result = await orderService.processReturn({
      orderId,
      reason,
      items,
      refundMethod,
      addToStock: addToStock !== false,
      userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const [returns, total] = await Promise.all([
    prisma.orderReturn.findMany({
      include: { order: true, items: { include: { orderItem: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.orderReturn.count(),
  ]);

  return NextResponse.json({ returns, total });
}
