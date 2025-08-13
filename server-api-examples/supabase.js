// setup supabase for using it at different places
import { createClient } from "@supabase/supabase-js";
import { configDotenv } from "dotenv";

configDotenv();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "Supabase environment variables not set - Supabase features will be disabled"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
