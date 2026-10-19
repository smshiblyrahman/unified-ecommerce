import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventBus } from "@/services/event-bus";

// POST /api/pos/shifts/open — open a new shift
export async function POST(request: NextRequest) {
  try {
    const { terminalId, userId, openingBalance } = await request.json();

    // Find terminal (use default if not provided)
    let terminal = terminalId
      ? await prisma.posTerminal.findUnique({ where: { id: terminalId } })
      : await prisma.posTerminal.findFirst({ where: { isActive: true } });

    if (!terminal) {
      terminal = await prisma.posTerminal.create({
        data: { name: "POS Terminal 01", identifier: "POS-01" },
      });
    }

    // Find user (use first admin if not provided)
    let user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findFirst({ where: { isActive: true } });

    if (!user) {
      return NextResponse.json({ error: "No active user found" }, { status: 400 });
    }

    const shift = await prisma.posShift.create({
      data: {
        terminalId: terminal.id,
        userId: user.id,
        openingBalance: openingBalance || 0,
        expectedBalance: openingBalance || 0,
        status: "OPEN",
      },
      include: { terminal: true, user: true },
    });

    eventBus.publish("SHIFT_OPENED", { shiftId: shift.id, terminalId: terminal.id, userId: user.id });

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
