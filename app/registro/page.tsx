import type { Metadata } from "next";
import { RegistryView } from "@/components/registry-view";

export const metadata: Metadata = {
  title: "Registro · Cost & Emissions",
  description: "Dashboard, assiemi e BOM di costi ed emissioni della monoposto.",
};

export default function RegistroPage() {
  return <RegistryView />;
}
