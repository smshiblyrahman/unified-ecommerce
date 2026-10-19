import { NextRequest, NextResponse } from "next/server";
import { analyticsService, DateRange } from "@/services/analytics.service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") || "30d") as DateRange;
  const data = await analyticsService.getRevenueChart(range);
  return NextResponse.json(data);
}
