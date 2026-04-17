import { NextRequest } from "next/server";
import { runPlanAgent } from "@/lib/agent";
import type { SavedSpot } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { brief?: string; spots?: SavedSpot[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const brief = (body.brief ?? "").trim();
  const spots = Array.isArray(body.spots) ? body.spots : [];
  if (!brief) {
    return new Response(JSON.stringify({ error: "Missing brief" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (type: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };
      try {
        for await (const evt of runPlanAgent(brief, spots)) {
          const { type, ...rest } = evt;
          send(type, rest);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        send("error", { message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
