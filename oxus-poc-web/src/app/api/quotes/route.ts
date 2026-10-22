import { repassar } from "@/lib/repasse";

export async function POST(request: Request) {
  return repassar("/quotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });
}
