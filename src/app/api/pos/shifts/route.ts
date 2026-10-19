import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/pos/shifts — list all shifts
export async function GET() {
  const shifts = await prisma.posShift.findMany({
    include: { terminal: true, user: true },
    orderBy: { openedAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ shifts });
}
