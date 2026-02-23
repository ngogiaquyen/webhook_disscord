// app/api/roblox-user/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let userId = searchParams.get("userId");
  const cookieRaw = searchParams.get("cookie");
  const mode = searchParams.get("mode") || "basic";

  console.log({
    requestedUserId: userId,
    cookieRaw: cookieRaw ? "[REDACTED]" : null,
    mode,
  });

  if (!userId || isNaN(Number(userId))) {
    return NextResponse.json({ error: "Thiếu hoặc userId không hợp lệ" }, { status: 400 });
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
  };

  const commonHeaders = {
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  try {
    // Basic info (public)
    const userRes = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
      headers: commonHeaders,
      cache: "no-store",
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      result.basic = userData;
      // console.log("user data: ", userData);
      if (userData.created) {
        result.accountAgeDays = Math.floor(
          (Date.now() - new Date(userData.created).getTime()) / 86400000
        );
      }
    }

    // Avatar headshot
    try {
      const thumbRes = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`,
        { headers: commonHeaders, cache: "no-store" }
      );
      if (thumbRes.ok) {
        const thumbJson = await thumbRes.json();
        result.avatarHeadshotUrl = thumbJson?.data?.[0]?.imageUrl || null;
      }
    } catch {}

    if (mode === "full" && cookieRaw) {
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
          if (
            !url.includes("inventory.roblox.com") &&
            !url.includes("accountsettings.roblox.com") &&
            !url.includes("economy.roblox.com") &&
            !url.includes("premiumfeatures.roblox.com") &&
            !url.includes("billing.roblox.com")
          ) {
            fetchUrl = url.replace(/roblox\.com/g, "roproxy.com");
          }

          const res = await fetch(fetchUrl, { ...opts, headers: authHeaders, cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            console.log(`${new URL(url).pathname.split("/").pop()} success:`, JSON.stringify(data, null, 2));
            return data;
          } else {
            console.log(`${new URL(url).pathname.split("/").pop()} fail: ${url} - Status ${res.status}`);
            return null;
          }
        } catch (e) {
          console.log(`Fetch error: ${url}`);
          return null;
        }
      };

      // Lấy chủ cookie
      const selfData = await safeFetch("https://users.roblox.com/v1/users/authenticated");
      let authenticatedUserId: number | null = null;
      if (selfData && selfData.id) {
        authenticatedUserId = selfData.id;
        console.log(`Cookie owner: ID ${authenticatedUserId} - Name: ${selfData.name} - DisplayName: ${selfData.displayName}`);
      }

      // Luôn override sang owner cookie
      if (authenticatedUserId) {
        if (Number(userId) !== authenticatedUserId) {
          console.log(`Override userId từ ${userId} → ${authenticatedUserId}`);
          userId = authenticatedUserId.toString();
          result.note = "Đã tự động lấy thông tin của tài khoản chủ cookie";
        }
      }

      // Robux
      const robuxData = await safeFetch("https://economy.roblox.com/v1/user/currency");
      if (robuxData?.robux !== undefined) result.robux = robuxData.robux;

      // Pending Robux + Summary mới (tính từ các field trong transaction-totals)
      const pendingData = await safeFetch(
        `https://economy.roblox.com/v2/users/${userId}/transaction-totals?timeFrame=Month&transactionType=summary`
      );
      if (pendingData) {
        if (pendingData.pendingRobuxTotal !== undefined) {
          result.pendingRobux = pendingData.pendingRobuxTotal;
        }

        // Tính summary theo công thức bạn yêu cầu
        result.summary =
          (pendingData.salesTotal || 0) +
          (pendingData.affiliateSalesTotal || 0) +
          (pendingData.groupPayoutsTotal || 0) +
          (pendingData.premiumPayoutsTotal || 0) +
          (pendingData.tradeSystemEarningsTotal || 0) +
          (pendingData.incomingRobuxTotal || 0);
      }

      // Inventory + RAP + Limiteds
      let rap = 0;
      let limiteds = 0;
      let invCursor: string | null = null;
      do {
        const invUrl = `https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?sortOrder=Asc&limit=100${invCursor ? `&cursor=${invCursor}` : ""}`;
        const invData = await safeFetch(invUrl);
        if (invData) {
          limiteds += invData.data?.length || 0;
          invData.data?.forEach((item: any) => {
            if (item.recentAveragePrice !== undefined) rap += Number(item.recentAveragePrice);
          });
          invCursor = invData.nextPageCursor;
        }
      } while (invCursor);

      result.rap = rap;
      result.limiteds = limiteds;
      result.hasInventory = limiteds > 0;

      // Premium
      const premiumData = await safeFetch(`https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`);
      result.premium = premiumData ? "Premium" : "N/A";

      // Credit Balance
      const creditData = await safeFetch("https://billing.roblox.com/v1/credit");
      if (creditData?.robuxAmount !== undefined) result.creditBalance = creditData.robuxAmount;

      // Groups + Group Balances
      const groupsData = await safeFetch(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
      if (groupsData?.data) {
        result.groupsCount = groupsData.data.length;
        const owned = groupsData.data.filter((g: any) => g.role?.rank === 255);
        result.ownedGroups = owned.length;

        for (const group of owned) {
          const groupId = group.group?.id;
          const groupName = group.group?.name;
          if (groupId) {
            const groupCurrency = await safeFetch(`https://economy.roblox.com/v1/groups/${groupId}/currency`);
            if (groupCurrency?.robux !== undefined) {
              result.groupBalances.push({
                groupId,
                name: groupName || "Unknown",
                robux: groupCurrency.robux,
              });
            }
          }
        }
      }

      // Games + tags
      let games: any[] = [];
      let gameCursor: string | null = null;
      let totalVisits = 0;

      do {
        const gamesUrl = `https://games.roblox.com/v2/users/${userId}/games?sortOrder=Asc&limit=50${gameCursor ? `&cursor=${gameCursor}` : ""}`;
        const gamesData = await safeFetch(gamesUrl);
        if (gamesData?.data) {
          games = games.concat(gamesData.data);
          gamesData.data.forEach((g: any) => {
            totalVisits += Number(g.placeVisits || g.visits || 0);
          });
          gameCursor = gamesData.nextPageCursor;
        }
      } while (gameCursor);

      if (games.length > 0) {
        const universeIds = games.map((g: any) => g.universeId || g.id).filter(Boolean).join(",");
        if (universeIds) {
          const detailData = await safeFetch(`https://games.roblox.com/v1/games?universeIds=${universeIds}`);
          if (detailData?.data) {
            detailData.data.forEach((d: any) => {
              totalVisits += Number(d.visits || d.placeVisits || 0);
            });
          }
        }

        result.games = games.map((g: any) => ({
          name: g.name,
          universeId: g.universeId,
          placeId: g.id,
          visits: Number(g.placeVisits || g.visits || 0),
          created: g.created,
        }));
        result.gamesCount = games.length;
        result.visits = totalVisits;

        const firstGame = games[0];
        if (firstGame?.creator?.id && Number(firstGame.creator.id) === Number(userId) && firstGame.creator.type === "User") {
          result.isDeveloper = true;
        }

        const lowerNames = games.map((g: any) => g.name.toLowerCase());
        result.mm2_count = lowerNames.filter(n => 
          n.includes("mm2") || 
          n.includes("murder mystery") || 
          n.includes("murderer") || 
          n.includes("innocent") || 
          n.includes("sheriff")
        ).length;

        result.adm_count = lowerNames.filter(n => 
          n.includes("admin") || 
          n.includes("fe admin") || 
          n.includes("kohls") || 
          n.includes("hd admin") || 
          n.includes("commands")
        ).length;

        result.sab_count = lowerNames.filter(n => 
          n.includes("sab") || 
          n.includes("sabotage") || 
          n.includes("impostor") || 
          n.includes("traitor") || 
          n.includes("among us") || 
          n.includes("betrayal")
        ).length;
      }

      // Email & 2FA
      const emailData = await safeFetch("https://accountsettings.roblox.com/v1/email");
      if (emailData?.verified !== undefined) result.emailVerified = emailData.verified;

      const pinData = await safeFetch("https://auth.roblox.com/v1/account/pin");
      if (pinData?.isEnabled !== undefined) {
        result.twoFA = pinData.isEnabled ? "Authenticator Enabled" : "No 2FA";
      }

      // === LOG TỔNG HỢP ===
      const summaryLog = {
        username: result.basic?.name || "Unknown",
        displayName: result.basic?.displayName || "Unknown",
        accountAgeDays: result.accountAgeDays || 0,
        isDeveloper: result.isDeveloper === true ? "True" : "False",
        gameVisits: result.visits || 0,
        groupsCount: result.groupsCount || 0,
        robuxBalance: result.robux || 0,
        pendingRobux: result.pendingRobux || 0,
        rap: result.rap || 0,
        limiteds: result.limiteds || 0,
        summaryValue: result.summary || 0,
        creditBalance: result.creditBalance || 0,
        inUnknown: 0,
        premium: result.premium,
        emailVerified: result.emailVerified ? "Verified" : "Not Verified",
        twoFA: result.twoFA || "No 2FA",
        ownedGroups: result.ownedGroups || 0,
        groupBalanceTotal: result.groupBalances.reduce((sum: number, g: any) => sum + (g.robux || 0), 0),
        mm2_games: result.mm2_count > 0 ? `True | ${result.mm2_count}` : "False | 0",
        adm_games: result.adm_count > 0 ? `True | ${result.adm_count}` : "False | 0",
        sab_games: result.sab_count > 0 ? `True | ${result.sab_count}` : "False | 0",
        hasInventory: result.hasInventory ? "True" : "False",
      };

      console.log("User Info Summary (từ data fetch được):", JSON.stringify(summaryLog, null, 2));
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Global error:", err.message);
    return NextResponse.json(result, { status: 200 });
  }
}