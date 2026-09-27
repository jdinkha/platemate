import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PlateMate: the workout tracker for lifters",
    template: "%s · PlateMate",
  },
  description:
    "Pick a proven split, log every set in seconds, and keep a training diary that shows your progress and the days you missed.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b09" },
  ],
};

// Runs before first paint so the page never flashes the wrong theme.
// Uses the saved choice if there is one, otherwise the OS preference.
const themeScript = `(function(){var d=window.matchMedia("(prefers-color-scheme: dark)").matches;try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")d=t==="dark"}catch(e){}document.documentElement.classList.toggle("dark",d)})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The theme script adds the `dark` class before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
