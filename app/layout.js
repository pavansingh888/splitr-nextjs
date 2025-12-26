import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { ClerkProvider } from "@clerk/nextjs/dist/types/components.server";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Splitr",
  description: "Smartest way to split bills and expenses with friends",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          href="/logos/logo-s.png"
          sizes="any"
          type="image/x-icon"
        />
      </head>
      <body
        className={`${inter.className}`}
      >
        <ClerkProvider>
        <ConvexClientProvider>
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
        </ConvexClientProvider>
        </ClerkProvider>


      </body>
    </html>
  );
}
