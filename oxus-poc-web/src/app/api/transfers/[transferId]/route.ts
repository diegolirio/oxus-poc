import type { NextRequest } from "next/server";
import { repassar } from "@/lib/repasse";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/transfers/[transferId]">) {
  const { transferId } = await ctx.params;
  return repassar(`/transfers/${encodeURIComponent(transferId)}`);
}
