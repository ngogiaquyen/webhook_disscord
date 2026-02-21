import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
console.log("Using Supabase URL:", process.env.SUPABASE_URL);
console.log("Service Key length:", process.env.SUPABASE_SERVICE_ROLE_KEY?.length || "MISSING");
console.log("Service Key first 10 chars:", process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 10) || "MISSING");
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables!");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
