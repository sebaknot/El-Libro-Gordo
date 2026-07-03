import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "El Libro Gordo",
  description: "Insurance agency management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
