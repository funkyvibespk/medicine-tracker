import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MedicineProvider } from "@/contexts/MedicineContext";
import BackToTop from "@/components/BackToTop";
import DemoSessionBoundary from "@/components/DemoSessionBoundary";
import InitialAppHydrationGate from "@/components/InitialAppHydrationGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChillDose — Take your dose with chill",
  description: "Keep track of medicines, doses, schedules, and stock in one calm place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MedicineProvider>
          <InitialAppHydrationGate>
            <DemoSessionBoundary>{children}</DemoSessionBoundary>
            <BackToTop />
          </InitialAppHydrationGate>
        </MedicineProvider>
      </body>
    </html>
  );
}
