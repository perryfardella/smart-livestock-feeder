import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SmartFeeder - Smart Animal Feeder Management",
  description:
    "Empowering hobby farmers with smart, remote feeder management. Monitor your animals, control feeding, and ensure their well-being from anywhere.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Analytics />
        <SpeedInsights />
        <Toaster />
        <div className="flex flex-col min-h-screen">
          <Header />
          {children}
          <footer className="py-8 px-4 sm:px-6 lg:px-8 ">
            <div className="max-w-7xl mx-auto text-center">
              <p>© 2025 SmartFeeder. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
