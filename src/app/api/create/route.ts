import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Body = {
  directory?: string;
  webhookUrl?: string;
};

function isValidDirectory(input: string) {
  // allow letters, numbers, underscore, dash. no spaces, no special chars.
  return /^[A-Za-z0-9_-]+$/.test(input);
}

function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "";
  return raw.replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const directory = (body.directory || "").trim();
    const webhookUrl = (body.webhookUrl || "").trim();

    if (!directory) {
      return NextResponse.json({ ok: false, error: "Directory is required" }, { status: 400 });
    }

    if (!isValidDirectory(directory)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Directory chỉ cho phép a-zA-Z0-9 _ - và không có dấu cách.",
        },
        { status: 400 },
      );
    }

    if (!webhookUrl) {
      return NextResponse.json({ ok: false, error: "Webhook URL is required" }, { status: 400 });
    }

    const siteUrl = getSiteUrl();
    if (!siteUrl) {
      return NextResponse.json(
        { ok: false, error: "Thiếu NEXT_PUBLIC_SITE_URL trong env" },
        { status: 500 },
      );
    }

    // Insert into DB (option A: error if directory exists)
    const { error: insertError } = await supabaseAdmin
      .from("directories")
      .insert({
        slug: directory.trim(),          // dir từ form là directory người dùng nhập
        webhook_url: webhookUrl.trim(),
      })
      .select()
      .single();

    if (insertError) {
      const msg = insertError.message || "Insert failed";
      const isDuplicate =
        insertError.code === "23505" || /duplicate key/i.test(msg) || /unique/i.test(msg);

      return NextResponse.json(
        { ok: false, error: isDuplicate ? "Directory đã tồn tại" : msg },
        { status: isDuplicate ? 409 : 500 },
      );
    }

    const fullLink = `${siteUrl}/${encodeURIComponent(directory)}`;

    // Send Discord notification to the provided webhook URL
    const discordPayload = {
      content: null,
      embeds: [
        {
          title: "✅ Create thành công",
          color: 0x22c55e,
          fields: [
            { name: "Directory", value: directory, inline: true },
            { name: "Link", value: fullLink, inline: false },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const discordRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload),
    });

    if (!discordRes.ok) {
      // DB inserted but webhook failed
      return NextResponse.json(
        {
          ok: false,
          error: `Lưu DB thành công nhưng gửi Discord thất bại: ${discordRes.status}`,
          directory,
          link: fullLink,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, directory, link: fullLink });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
