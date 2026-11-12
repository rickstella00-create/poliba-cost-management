import type { Metadata } from "next";
import { RegistryView } from "@/components/registry-view";

export const metadata: Metadata = {
  title: "Registry · Cost & Emissions",
  description: "Dashboard, assemblies and BOM for the car's costs and emissions.",
};

export default function RegistryPage() {
  return <RegistryView />;
}
