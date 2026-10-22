import { connection } from "next/server";
import { repassar } from "@/lib/repasse";

export async function GET() {
  await connection();
  return repassar("/customers");
}
