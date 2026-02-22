"use client";

import NavBar from "@/components/NavBar";
import { Toaster } from "react-hot-toast";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: "#1f2937", color: "#fff", borderRadius: "12px" },
        }}
      />
      <NavBar />
      <main className="ml-[240px]">{children}</main>
    </>
  );
}
