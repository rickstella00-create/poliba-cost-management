import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poliba Corse · Cost & Emissions",
  description:
    "Il registro unico di costi ed emissioni della monoposto del Poliba Corse: sistemi, assiemi e componenti in un database consultabile ed esportabile.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
