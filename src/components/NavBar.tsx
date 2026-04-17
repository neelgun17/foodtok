"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useFoodMapStore } from "@/lib/store";
import CaptureSheet from "./CaptureSheet";

export default function NavBar() {
  const pathname = usePathname();
  const { savedSpots } = useFoodMapStore();
  const [captureOpen, setCaptureOpen] = useState(false);

  const navItems = [
    { href: "/", icon: "🏠", label: "For You", activeMatch: "/" },
    { href: "/map", icon: "🗺️", label: "Food Map", activeMatch: "/map", badge: savedSpots.length },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-black border-r border-gray-800/50 z-50 flex flex-col py-5 px-3">
      {/* Logo */}
      <div className="px-3 mb-6">
        <h1 className="text-white text-xl font-bold tracking-tight flex items-center gap-2">
          <span className="text-red-500">🍽</span> FoodTok
        </h1>
      </div>

      {/* Capture button */}
      <button
        onClick={() => setCaptureOpen(true)}
        className="mb-4 flex items-center gap-2 bg-[#fe2c55] hover:bg-[#e02650] text-white rounded-lg px-3 py-2.5 font-semibold text-sm transition-colors"
      >
        <span className="text-lg leading-none">+</span> Capture Spot
      </button>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.activeMatch;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-semibold transition-colors relative ${
                isActive
                  ? "text-[#fe2c55]"
                  : "text-gray-300 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
              {item.badge ? (
                <span className="ml-auto bg-[#fe2c55] text-white text-[11px] min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pt-4 border-t border-gray-800/50">
        <p className="text-gray-600 text-xs">TikTok Food Discovery</p>
        <p className="text-gray-700 text-[10px] mt-1">Demo App</p>
      </div>
      <CaptureSheet open={captureOpen} onClose={() => setCaptureOpen(false)} />
    </aside>
  );
}
