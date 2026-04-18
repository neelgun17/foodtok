import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  title: "Food Map — Save TikTok Food Spots",
  description: "Save food spots from your TikTok feed to an interactive map",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-black">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
