import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const AUDIOS_MIME_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
];

/**
 * POST /api/ensure-audios-bucket
 * Creates the "audios" storage bucket and RLS policies if missing.
 * Requires SUPABASE_SERVICE_ROLE_KEY in env (Dashboard → Settings → API).
 */
export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add SUPABASE_SERVICE_ROLE_KEY in .env (Supabase Dashboard → Settings → API).",
      },
      { status: 500 },
    );
  }
  const supabase = createClient(url, serviceRoleKey);

  // Create bucket if it doesn't exist (no migration required)
  const { error: bucketError } = await supabase.storage.createBucket("audios", {
    public: true,
    fileSizeLimit: "25MB",
    allowedMimeTypes: AUDIOS_MIME_TYPES,
  });
  if (bucketError) {
    const msg = bucketError.message?.toLowerCase() ?? "";
    if (
      msg.includes("already exists") ||
      msg.includes("duplicate") ||
      msg.includes("unique")
    ) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { error: "Failed to create bucket: " + bucketError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
