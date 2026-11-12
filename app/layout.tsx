import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cost & Emissions · Registro dati",
  description:
    "Registro di costi ed emissioni della monoposto: sistemi, assiemi e componenti in un database consultabile ed esportabile.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
