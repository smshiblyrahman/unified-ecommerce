import { NextRequest } from "next/server";
import { sseService } from "@/services/sse.service";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") || "admin";
  const clientId = uuidv4();

  const stream = new ReadableStream({
    start(controller) {
      sseService.addClient(clientId, channel, controller);

      // Send initial connection confirmation
      const connectMsg = `event: CONNECTED\ndata: ${JSON.stringify({ clientId, channel, timestamp: new Date().toISOString() })}\n\n`;
      controller.enqueue(connectMsg);

      // Heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`: heartbeat\n\n`);
        } catch {
          clearInterval(heartbeat);
          sseService.removeClient(clientId);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        sseService.removeClient(clientId);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
    cancel() {
      sseService.removeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
