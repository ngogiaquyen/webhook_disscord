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
      return NextResponse.json({ ok: false, error: "Directory is required." }, { status: 400 });
    }

    if (!isValidDirectory(directory)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Directory may only contain a-z, A-Z, 0-9, underscore (_) and dash (-), with no spaces.",
        },
        { status: 400 },
      );
    }

    if (!webhookUrl) {
      return NextResponse.json({ ok: false, error: "Webhook URL is required." }, { status: 400 });
    }

    const siteUrl = getSiteUrl();
    if (!siteUrl) {
      return NextResponse.json(
        { ok: false, error: "Missing NEXT_PUBLIC_SITE_URL in environment variables." },
        { status: 500 },
      );
    }

    const fullLink = `${siteUrl}/${encodeURIComponent(directory)}`;

    // Send Discord notification first, only save to DB if Discord succeeds
    const discordPayload = {
      content: null,
      embeds: [
        {
          title: "✅ Directory created successfully",
          color: 0x22c55e,
          description: "A new Bloxtools directory has been created.",
          fields: [
            {
              name: "Directory",
              value: `\`\`\`\n${directory}\n\`\`\``,
              inline: true,
            },
            {
              name: "Link",
              value: `\`\`\`\n${fullLink}\n\`\`\``,
              inline: false,
            },
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
      // Discord failed, don't save to DB
      return NextResponse.json(
        {
          ok: false,
          error: `Failed to send to Discord. Directory not saved.`,
        },
        { status: 502 },
      );
    }

    // Discord succeeded, now insert into DB
    const { error: insertError } = await supabaseAdmin
      .from("directories")
      .insert({
        slug: directory.trim(),
        webhook_url: webhookUrl.trim(),
      })
      .select()
      .single();

    if (insertError) {
      const msg = insertError.message || "Insert failed.";
      const isDuplicate =
        insertError.code === "23505" || /duplicate key/i.test(msg) || /unique/i.test(msg);

      return NextResponse.json(
        { ok: false, error: isDuplicate ? "Directory already exists." : msg },
        { status: isDuplicate ? 409 : 500 },
      );
    }

    return NextResponse.json({ ok: true, directory, link: fullLink });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
