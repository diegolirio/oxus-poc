import { repassar } from "@/lib/repasse";

export async function POST(request: Request) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return repassar("/transfers", { method: "POST", headers, body: await request.text() });
}
