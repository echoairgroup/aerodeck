import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AeroDeck — Flight Simulation Command Center",
  description: "A professional flight simulation command center for flight planning, weather, VATSIM, training and flight logs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
