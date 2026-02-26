import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function getUserProfileData(userId: string) {
  const { data, error } = await supabase
    .from("questionnaire_responses")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error) {
    console.error("Error fetching questionnaire:", error)
    return null
  }

  return data
}