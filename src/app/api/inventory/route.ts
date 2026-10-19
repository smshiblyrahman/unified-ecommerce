import { NextRequest, NextResponse } from "next/server";
import { analyticsService } from "@/services/analytics.service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const data = await analyticsService.getInventoryDashboard();
  return NextResponse.json(data);
}
