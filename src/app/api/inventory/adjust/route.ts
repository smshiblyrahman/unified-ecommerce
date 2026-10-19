import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/services/inventory.service";

export async function PATCH(request: NextRequest) {
  try {
    const { productId, variantId, quantityChange, reason, userId } = await request.json();
    if (!productId || quantityChange === undefined || !reason) {
      return NextResponse.json({ error: "productId, quantityChange, and reason are required" }, { status: 400 });
    }
    const result = await inventoryService.adjustStock({ productId, variantId, quantityChange, reason, userId });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
