import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cookieRaw = searchParams.get("cookie");
  const mode = searchParams.get("mode") || "basic";

  if (!cookieRaw && mode === "full") {
    return NextResponse.json({ error: "Thiếu cookie cho chế độ full" }, { status: 400 });
  }

  const result: any = {
    basic: null,
    accountAgeDays: null,
    avatarHeadshotUrl: null,
    robux: null,
    pendingRobux: null,
    summary: null,
    premium: "N/A",
    creditBalance: null,
    groupBalances: [],
    rap: null,
    limiteds: null,
    hasInventory: null,
    groupsCount: null,
    ownedGroups: null,
    emailVerified: null,
    twoFA: null,
    games: [],
    gamesCount: null,
    visits: null,
    isDeveloper: null,
    mm2_count: null,
    adm_count: null,
    sab_count: null,
    note: null,

    // Thêm field để page.tsx dùng render title
    displayName: null,
    isUnder13: null,
  };

  const commonHeaders = {
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  try {
    const cookie = `.ROBLOSECURITY=${cookieRaw}`;

    let csrfToken = "";
    try {
      const csrfRes = await fetch("https://auth.roblox.com/v2/logout", {
        method: "POST",
        headers: { ...commonHeaders, Cookie: cookie },
        cache: "no-store",
      });
      if (csrfRes.headers.has("x-csrf-token")) {
        csrfToken = csrfRes.headers.get("x-csrf-token") || "";
      }
    } catch {}

    const authHeaders = {
      ...commonHeaders,
      Cookie: cookie,
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
    };

    const safeFetch = async (url: string, opts: any = {}) => {
      try {
        let fetchUrl = url;
        const isSensitive = 
          url.includes("economy.roblox.com") || 
          url.includes("billing.roblox.com") || 
          url.includes("accountsettings.roblox.com") ||
          url.includes("auth.roblox.com") ||
          url.includes("users.roblox.com/v1/users/authenticated");

        if (!isSensitive) {
          if (
            !url.includes("inventory.roblox.com") &&
            !url.includes("accountsettings.roblox.com") &&
            !url.includes("economy.roblox.com") &&
            !url.includes("premiumfeatures.roblox.com") &&
            !url.includes("billing.roblox.com")
          ) {
            fetchUrl = url.replace(/roblox\.com/g, "roproxy.com");
          }
        }

        const res = await fetch(fetchUrl, { 
          ...opts, 
          headers: authHeaders, 
          cache: "no-store",
          redirect: "follow" 
        });

        if (res.ok) return await res.json();
        return null;
      } catch (e) {
        return null;
      }
    };

    const selfData = await safeFetch("https://users.roblox.com/v1/users/authenticated");

    if (selfData && selfData.id) {
      const userId = selfData.id.toString();
      result.displayName = selfData.displayName || selfData.name;
      
      const userRes = await fetch(`https://users.roproxy.com/v1/users/${userId}`, {
        headers: commonHeaders,
        cache: "no-store",
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        console.log("userData: ", userData);
        result.basic = userData;
        if (userData.created) {
          result.accountAgeDays = Math.floor((Date.now() - new Date(userData.created).getTime()) / 86400000);
        }
      }

      // Check age bracket (Under13 or Over13)
      const ageRes = await safeFetch("https://users.roblox.com/v1/users/authenticated/age-bracket");
      if (ageRes && ageRes.ageBracket !== undefined) {
        // ageBracket: 0 = <13, 1 = >=13 (based on Roblox API docs/common knowledge)
        // Or sometimes it returns "AgeUnderThirteen" or "AgeOverThirteen"
        console.log("ageRes: ", ageRes)
        result.isUnder13 = ageRes.ageBracket === 1 || ageRes.ageBracket === "AgeUnderThirteen";
      }

      const thumbRes = await fetch(
        `https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`,
        { headers: commonHeaders, cache: "no-store" }
      );
      if (thumbRes.ok) {
        const thumbJson = await thumbRes.json();
        result.avatarHeadshotUrl = thumbJson?.data?.[0]?.imageUrl || null;
      }

      const robuxData = await safeFetch("https://economy.roblox.com/v1/user/currency");
      if (robuxData?.robux !== undefined) result.robux = robuxData.robux;

      const pendingData = await safeFetch(`https://economy.roblox.com/v2/users/${userId}/transaction-totals?timeFrame=Month&transactionType=summary`);
      if (pendingData) {
        result.pendingRobux = pendingData.pendingRobuxTotal ?? 0;
        result.summary = Math.abs(pendingData.outgoingRobuxTotal || 0);
      }

      const invData = await safeFetch(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=100`);
      if (invData?.data) {
        result.limiteds = invData.data.length;
        result.rap = invData.data.reduce((sum: number, i: any) => sum + (i.recentAveragePrice || 0), 0);
        result.hasInventory = result.limiteds > 0;
      }

      const premData = await safeFetch(`https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`);
      result.premium = premData ? "Premium" : "N/A";

      const creditData = await safeFetch("https://billing.roblox.com/v1/credit");
      if (creditData?.robuxAmount !== undefined) result.creditBalance = creditData.robuxAmount;

      const groupsData = await safeFetch(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
      if (groupsData?.data) {
        result.groupsCount = groupsData.data.length;
        const owned = groupsData.data.filter((g: any) => g.role?.rank === 255);
        result.ownedGroups = owned.length;
        for (const group of owned) {
          const currency = await safeFetch(`https://economy.roblox.com/v1/groups/${group.group.id}/currency`);
          if (currency?.robux !== undefined) {
            result.groupBalances.push({ groupId: group.group.id, name: group.group.name, robux: currency.robux });
          }
        }
      }

      // Games (phân trang để lấy đầy đủ)
      let gamesAll: any[] = [];
      let gamesCursor: string | null = null;
      do {
        const pageUrl = `https://games.roblox.com/v2/users/${userId}/games?sortOrder=Asc&limit=50${gamesCursor ? `&cursor=${gamesCursor}` : ""}`;
        const pageData = await safeFetch(pageUrl);
        console.log("pageData: ", pageData)
        if (pageData?.data) {
          gamesAll = gamesAll.concat(pageData.data);
          gamesCursor = pageData.nextPageCursor;
        } else {
          gamesCursor = null;
        }
      } while (gamesCursor);

      if (gamesAll.length > 0) {
        result.gamesCount = gamesAll.length;
        result.visits = gamesAll.reduce((sum: number, g: any) => sum + Number(g.placeVisits || g.visits || 0), 0);

        // Build a lightweight games list (optional)
        result.games = gamesAll.map((g: any) => ({
          name: g.name,
          visits: Number(g.placeVisits || g.visits || 0),
          created: g.created,
          placeId: g.id,
          universeId: g.universeId,
        }));

        // Keyword detection (mở rộng)
        const lowerNames = gamesAll.map((g: any) => String(g.name || "").toLowerCase());


        const mm2Keywords = ["mm2", "murder mystery", "murder", "innocent", "sheriff", "murderer"];
        const admKeywords = ["admin", "admins", "commands", "hd admin", "kohls", "kohl", "fe admin"];
        const sabKeywords = ["sab", "sabotage", "impostor", "among us", "betrayal", "traitor", "steal a brainrot", "brainrot"];

        result.mm2_count = lowerNames.filter((n: string) => mm2Keywords.some(k => n.includes(k))).length;
        result.adm_count = lowerNames.filter((n: string) => admKeywords.some(k => n.includes(k))).length;
        result.sab_count = lowerNames.filter((n: string) => sabKeywords.some(k => n.includes(k))).length;

        // isDeveloper: kiểm tra creator của từng game (không chỉ game đầu)
        result.isDeveloper = gamesAll.some((g: any) => String(g.creator?.id ?? "") === String(userId) && g.creator?.type === "User");
      }

      const emailData = await safeFetch("https://accountsettings.roblox.com/v1/email");
      if (emailData?.verified !== undefined) result.emailVerified = emailData.verified;

      // Lấy thông tin 2FA chi tiết
      const twoStepData = await safeFetch(`https://twostepverification.roblox.com/v1/users/${userId}/configuration`);
      console.log(twoStepData)
      console.log("twoStepData: ", twoStepData)
      if (twoStepData && twoStepData.methods) {
        const enabledMethods = twoStepData.methods
          .filter((m: any) => m.enabled)
          .map((m: any) => {
            // Chuẩn hóa tên phương thức hiển thị
            if (m.name === "authenticator") return "Authenticator App";
            if (m.name === "email") return "Email";
            if (m.name === "securityKey") return "Security Key";
            if (m.name === "recoveryCode") return "Recovery Codes";
            return m.name;
          });

        
        result.twoFA = enabledMethods.length > 0 
          ? enabledMethods.join(", ") 
          : "No 2FA";
      } else {
        // Fallback về check PIN nếu API 2FA không trả về dữ liệu
        const pinData = await safeFetch("https://auth.roblox.com/v1/account/pin");
        if (pinData?.isEnabled !== undefined) {
          result.twoFA = pinData.isEnabled ? "Authenticator" : "Not Set";
        }
      }

    } else {
      result.note = "Cookie không hợp lệ";
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(result, { status: 200 });
  }
}
