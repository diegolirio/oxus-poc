import type { Metadata } from "next";
import CambioFlow from "@/components/CambioFlow";

export const metadata: Metadata = { title: "Câmbio · oxus-poc" };

export default function CambioPage() {
  return <CambioFlow />;
}
