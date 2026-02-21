import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const cookie = searchParams.get("cookie");
  const mode = searchParams.get("mode") || "basic";

  console.log(`[DEBUG] API called - userId: ${userId}, mode: ${mode}, cookie len: ${cookie?.length || 0}`);

  if (!userId || isNaN(Number(userId))) {
    return NextResponse.json({ error: "Thiếu hoặc userId không hợp lệ" }, { status: 400 });
  }

  const commonHeaders = {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  };

  const result: any = { debug: {} };

  try {
    // Basic info
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
      result.debug.basic = `Fail ${userRes.status}`;
    }

    if (mode === "full" && cookie) {
      const authHeaders = { ...commonHeaders, Cookie: `.ROBLOSECURITY=${cookie}` };

      // Robux balance
      const robuxRes = await fetch("https://economy.roblox.com/v1/user/currency", { headers: authHeaders, cache: "no-store" });
      console.log(`[DEBUG] Robux API: ${robuxRes.status}`);
      if (robuxRes.ok) result.robux = (await robuxRes.json()).robux || 0;

      // Pending Robux
      const transRes = await fetch(
        `https://economy.roblox.com/v2/users/${userId}/transaction-totals?timeFrame=Month&transactionType=summary`,
        { headers: authHeaders, cache: "no-store" }
      );
      console.log(`[DEBUG] Pending Robux API: ${transRes.status}`);
      if (transRes.ok) {
        const data = await transRes.json();
        result.pendingRobux = data.pendingRobuxTotal || 0;
      }

      // Inventory + RAP
      let rap = 0, limiteds = 0;
      let cursor: string | null = null;
      do {
        const url: string = `https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?sortOrder=Asc&limit=100${cursor ? `&cursor=${cursor}` : ""}`;
        const invRes: Response = await fetch(url, { headers: authHeaders, cache: "no-store" });
        console.log(`[DEBUG] Inventory API: ${invRes.status}`);
        if (invRes.ok) {
          const inv: any = await invRes.json();
          limiteds += inv.data?.length || 0;
          inv.data?.forEach((i: any) => { if (i.recentAveragePrice) rap += Number(i.recentAveragePrice); });
          cursor = inv.nextPageCursor;
        } else break;
      } while (cursor);
      result.rap = rap;
      result.limiteds = limiteds;

      // Groups
      const groupsRes = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups`, { headers: authHeaders, cache: "no-store" });
      console.log(`[DEBUG] Groups API: ${groupsRes.status}`);
      if (groupsRes.ok) {
        const data = await groupsRes.json();
        result.groupsCount = data.data?.length || 0;
        result.ownedGroups = data.data?.filter((g: any) => g.role?.rank === 255)?.length || 0;
      }

      // Email
      const emailRes = await fetch("https://accountinformation.roblox.com/v1/email", { headers: authHeaders, cache: "no-store" });
      console.log(`[DEBUG] Email API: ${emailRes.status}`);
      if (emailRes.ok) result.emailVerified = (await emailRes.json()).verified;

      // 2FA/PIN
      const pinRes = await fetch("https://auth.roblox.com/v1/account/pin", { headers: authHeaders, cache: "no-store" });
      console.log(`[DEBUG] PIN/2FA API: ${pinRes.status}`);
      if (pinRes.ok) {
        const data = await pinRes.json();
        result.twoFA = data.isEnabled ? "Enabled" : "Not Set";
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[DEBUG] API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}