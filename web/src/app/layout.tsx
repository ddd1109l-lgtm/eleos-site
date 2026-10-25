import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Fredoka } from "next/font/google";
import { I18nProvider } from "@/i18n/I18nProvider";
import "./globals.css";

// Atkinson Hyperlegible was designed by the Braille Institute for low-vision readers.
const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
});

// Rounded display face for headings.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Eleos · Medicare Savings helper",
  description:
    "Tap any word on Louisiana's Medicare Savings Program application to hear and read what it means in plain language, in your language, and ask Dr. Fawn questions as you fill it out.",
};

export const viewport: Viewport = {
  themeColor: "#fff7ec",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-US" className={`${atkinson.variable} ${fredoka.variable} h-full antialiased`}>
      <body className="h-full">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
