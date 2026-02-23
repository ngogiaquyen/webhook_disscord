import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Client sẽ gửi trường này chứa nguyên payload giống hệt cái gửi webhook chính
    const { discordPayload, slug } = body;

    if (!discordPayload) {
      console.error("[send-admin-hit] Missing discordPayload");
      return NextResponse.json({ error: "Missing discordPayload" }, { status: 400 });
    }

    const adminWebhook = process.env.ADMIN_WEBHOOK_URL;

    if (!adminWebhook) {
      console.warn("[Admin Webhook] ADMIN_WEBHOOK_URL not set in .env → skipping admin log");
      return NextResponse.json({ success: true });
    }

    // Tạo payload cho admin: giữ nguyên cấu trúc embed của client, chỉ chỉnh nhẹ content để phân biệt
    const adminPayload = {
      ...discordPayload,
      // Chỉnh content để dễ nhận biết đây là log admin backup
      content: `${discordPayload.content || ""}`,
      // Nếu bạn KHÔNG muốn thay đổi content, comment dòng trên và dùng dòng này:
      // content: discordPayload.content || "@everyone NEW HIT (Admin Backup)",
      
      // Giữ nguyên embeds, attachments, username/avatar nếu client có gửi
      embeds: discordPayload.embeds,
      attachments: discordPayload.attachments || [],
    };

    // Gửi tới admin webhook
    const res = await fetch(adminWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adminPayload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      console.error(`[Admin Webhook Failed] ${res.status} - ${errText}`);
      // Vẫn trả success về client để không làm gián đoạn flow chính
    } else {
      console.log(`[Admin Webhook] Success - Hit từ /${slug || "unknown"}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API /send-admin-hit] Error:", err);
    // Không leak lỗi chi tiết ra client
    return NextResponse.json({ success: true });
  }
}