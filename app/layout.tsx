import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cost & Emissions · Data registry",
  description:
    "Cost and emissions registry for the car: systems, assemblies and components in one database you can browse and export.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
