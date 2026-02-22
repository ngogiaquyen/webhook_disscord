"use client";

import { useMemo, useState } from "react";
import { Folder, Link as LinkIcon, Plus } from "lucide-react";
import Link from "next/link";
import ConstellationBackground from "@/components/ConstellationBackground";

type StatusType = "idle" | "loading" | "success" | "error";

export default function CreateAccountPage() {
  const [directory, setDirectory] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [status, setStatus] = useState<{ type: StatusType; message: string; link?: string }>({
    type: "idle",
    message: "",
  });

  const isValidDirectory = useMemo(() => {
    if (!directory) return true;
    return /^[A-Za-z0-9_-]+$/.test(directory);
  }, [directory]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const dir = directory.trim();
    const hook = webhookUrl.trim();

    if (!dir) {
      setStatus({ type: "error", message: "Please enter a directory." });
      return;
    }

    if (!/^[A-Za-z0-9_-]+$/.test(dir)) {
      setStatus({
        type: "error",
        message: "Directory may only contain a-z, A-Z, 0-9, underscore (_) and dash (-), with no spaces.",
      });
      return;
    }

    if (!hook) {
      setStatus({ type: "error", message: "Please enter a Webhook URL." });
      return;
    }

    setStatus({ type: "loading", message: "Creating..." });

    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directory: dir, webhookUrl: hook }),
      });

      const data = (await res.json()) as { ok: boolean; error?: string; link?: string };

      if (!res.ok || !data.ok) {
        setStatus({ type: "error", message: data.error || "Something went wrong." });
        return;
      }

      setStatus({
        type: "success",
        message: "Thành công!",
        link: data.link,
      });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <ConstellationBackground />

      <div className="z-10 w-full max-w-md flex flex-col items-center">
        <div className="bg-[#e22d2d] p-3 rounded-xl mb-8 shadow-[0_0_20px_rgba(226,45,45,0.4)]">
          <Plus className="w-8 h-8 text-white" />
        </div>

        <div className="bg-[#121212] border border-[#1e1e1e] rounded-2xl p-8 w-full shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Create Directory</h1>
            <p className="text-gray-400 text-sm">Save a directory + Webhook URL and send a notification to Discord.</p>
          </div>

          {status.type !== "idle" && (
            <div
              className={`mb-5 rounded-lg border px-4 py-3 text-sm ${status.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : status.type === "error"
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : "border-blue-500/30 bg-blue-500/10 text-blue-300"
                }`}
            >
              <div>{status.message}</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Folder className="w-4 h-4 text-red-500" />
                Directory
              </label>
              <input
                value={directory}
                onChange={(e) => setDirectory(e.target.value)}
                type="text"
                placeholder="e.g. my-directory_01"
                className={`w-full bg-[#1a1a1a] border rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-600 ${isValidDirectory ? "border-[#2a2a2a] focus:border-red-500" : "border-red-500 focus:border-red-500"
                  }`}
              />
              {!isValidDirectory && (
                <p className="text-xs text-red-400">
                  Only a-z, A-Z, 0-9, underscore (_) and dash (-) are allowed. No spaces.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <LinkIcon className="w-4 h-4 text-red-500" />
                Webhook URL
              </label>
              <input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                type="text"
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors placeholder:text-gray-600"
              />
            </div>

            <button
              type="submit"
              disabled={status.type === "loading"}
              className="w-full bg-[#e22d2d] disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[#c92828] text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-900/20"
            >
              <Plus className="w-5 h-5" />
              {status.type === "loading" ? "Creating..." : "Create"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            View page by slug:{" "}
            <Link href={directory ? `/${directory}` : "/create"} className="text-red-500 hover:text-red-400 font-medium">
              /{directory || "<directory>"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
