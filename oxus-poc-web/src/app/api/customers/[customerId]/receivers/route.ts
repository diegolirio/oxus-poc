import type { NextRequest } from "next/server";
import { repassar } from "@/lib/repasse";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/customers/[customerId]/receivers">) {
  const { customerId } = await ctx.params;
  return repassar(`/customers/${encodeURIComponent(customerId)}/receivers`);
}
