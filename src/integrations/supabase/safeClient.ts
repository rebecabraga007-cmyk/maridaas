// Safe wrapper around the auto-generated Supabase client.
// Uses publishable fallback values so the app never crashes with
// "supabaseUrl is required" if the bundler did not inject VITE_* vars.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const FALLBACK_URL = "https://yzrrlxnnqwihkkmokrso.supabase.co";
const FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6cnJseG5ucXdpaGtrbW9rcnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjgwOTksImV4cCI6MjA4MzI0NDA5OX0.il8s5XJGn5QN23xqiQXfuctXyF18uNu9UHuFIhRmZrA";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY;

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
