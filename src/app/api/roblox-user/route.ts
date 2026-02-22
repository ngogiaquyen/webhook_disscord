import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const cookieRaw = searchParams.get("cookie");
  const mode = searchParams.get("mode") || "basic";

  console.log(`[DEBUG] API called - userId: ${userId}, mode: ${mode}, cookie len: ${cookieRaw?.length || 0}`);

  if (!userId || isNaN(Number(userId))) {
    return NextResponse.json({ error: "Thiếu hoặc userId không hợp lệ" }, { status: 400 });
  }

  const result: any = {
    debug: {},
    basic: null,
    accountAgeDays: null,
    avatarHeadshotUrl: null,
    robux: 0,
    pendingRobux: 0,
    rap: 0,
    limiteds: 0,
    groupsCount: 0,
    ownedGroups: 0,
    emailVerified: false,
    twoFA: "(Not Set)",
    hasInventory: false,
  };

  const commonHeaders = {
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  try {
    // Basic info - public, không cần cookie
    const userRes = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
      headers: commonHeaders,
      cache: "no-store",
    });
    console.log(`[DEBUG] Basic users API: ${userRes.status}`);
    if (userRes.ok) {
      const userData = await userRes.json();
      result.basic = {
        id: userData.id,
        name: userData.name,
        displayName: userData.displayName,
        created: userData.created,
        isBanned: userData.isBanned,
        hasVerifiedBadge: userData.hasVerifiedBadge,
        isPremium: userData.isPremium || false,
      };
      result.accountAgeDays = Math.floor((Date.now() - new Date(userData.created).getTime()) / 86400000);
    } else {
      result.debug.basic = `Fail ${userRes.status} - ${await userRes.text().catch(() => "no body")}`;
    }

    // Avatar headshot (public) -> tránh CORS bằng cách proxy qua server
    try {
      const thumbRes = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`,
        { headers: commonHeaders, cache: "no-store" }
      );
      console.log(`[DEBUG] Headshot API: ${thumbRes.status}`);
      if (thumbRes.ok) {
        const thumbJson = await thumbRes.json();
        result.avatarHeadshotUrl = thumbJson?.data?.[0]?.imageUrl || null;
      }
    } catch (e: any) {
      console.error("[DEBUG] Headshot fetch error:", e.message);
    }

    if (mode === "full" && cookieRaw) {
      const cookie = `.ROBLOSECURITY=${cookieRaw}`;

      // Thử lấy X-CSRF-Token (dùng auth/logout POST)
      let csrfToken = "";
      try {
        const csrfRes = await fetch("https://auth.roblox.com/v2/logout", {
          method: "POST",
          headers: { ...commonHeaders, Cookie: cookie },
          cache: "no-store",
        });
        console.log(`[DEBUG] CSRF logout status: ${csrfRes.status}`);
        if (csrfRes.headers.has("x-csrf-token")) {
          csrfToken = csrfRes.headers.get("x-csrf-token") || "";
          console.log("[DEBUG] X-CSRF-Token obtained successfully");
        } else {
          const text = await csrfRes.text().catch(() => "");
          console.log(`[DEBUG] No CSRF token - response: ${csrfRes.status} ${text.slice(0, 100)}`);
        }
      } catch (csrfErr: any) {
        console.error("[DEBUG] CSRF fetch error:", csrfErr.message);
      }

      const authHeaders = {
        ...commonHeaders,
        Cookie: cookie,
        ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
      };

      // Helper function để fetch với fallback
      const safeFetch = async (url: string, opts: any = {}) => {
        try {
          const res = await fetch(url, { ...opts, headers: authHeaders, cache: "no-store" });
          console.log(`[DEBUG] ${url.split("/").pop()} API: ${res.status}`);
          if (res.ok) return await res.json();
          const errText = await res.text().catch(() => "");
          console.log(`[DEBUG] Fail ${res.status}: ${errText.slice(0, 100)}`);
          return null;
        } catch (e: any) {
          console.error(`[DEBUG] Fetch error ${url}:`, e.message);
          return null;
        }
      };

      // Robux
      const robuxData = await safeFetch("https://economy.roblox.com/v1/user/currency");
      if (robuxData) result.robux = robuxData.robux || 0;

      // Pending
      const pendingData = await safeFetch(
        `https://economy.roblox.com/v2/users/${userId}/transaction-totals?timeFrame=Month&transactionType=summary`
      );
      if (pendingData) result.pendingRobux = pendingData.pendingRobuxTotal || 0;

      // Inventory + RAP (pagination)
      let rap = 0,
        limiteds = 0,
        cursor: string | null = null;
      do {
        const invUrl = `https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?sortOrder=Asc&limit=100${
          cursor ? `&cursor=${cursor}` : ""
        }`;
        const invData = await safeFetch(invUrl);
        if (invData) {
          limiteds += invData.data?.length || 0;
          invData.data?.forEach((item: any) => {
            if (item.recentAveragePrice) rap += Number(item.recentAveragePrice);
          });
          cursor = invData.nextPageCursor;
        } else {
          break;
        }
      } while (cursor);
      result.rap = rap;
      result.limiteds = limiteds;
      result.hasInventory = limiteds > 0;

      // Groups
      const groupsData = await safeFetch(`https://groups.roblox.com/v1/users/${userId}/groups`);
      if (groupsData) {
        result.groupsCount = groupsData.data?.length || 0;
        result.ownedGroups = groupsData.data?.filter((g: any) => g.role?.rank === 255)?.length || 0;
      }

      // (Email / 2FA bỏ qua để tránh đụng endpoint nhạy cảm)
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[DEBUG] Global API error:", err.message);
    return NextResponse.json(result, { status: 200 });
  }
}
