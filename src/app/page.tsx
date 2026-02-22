"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const lastSlug = window.localStorage.getItem("lastSlug");
      if (lastSlug) {
        router.replace(`/${lastSlug}`);
      } else {
        router.replace("/create");
      }
    } catch {
      router.replace("/create");
    }
  }, [router]);

  // Home only renders background while redirecting
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <ConstellationBackground />
    </div>
  );
}
