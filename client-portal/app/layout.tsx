import type { Metadata } from "next";
import { Playfair_Display, Lato } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair"
});

const lato = Lato({ 
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-lato"
});

export const metadata: Metadata = {
  title: "Sheila Gutierrez Designs - Client Portal",
  description: "Client portal for interior design projects",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${lato.variable} scroll-smooth`}>
      <body className="antialiased font-[var(--font-lato)] overflow-x-hidden">
        <div className="min-h-screen bg-gray-50 overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}