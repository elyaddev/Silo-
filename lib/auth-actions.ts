import supabase from "@/lib/supabaseClient";
import { getBaseUrl } from "./getBaseUrl";

export async function signUpWithEmail(email: string, password?: string | null) {
  const emailRedirectTo = `${getBaseUrl()}/auth/callback`;

  // If a password is provided -> normal sign-up
  if (password && password.length > 0) {
    return supabase.auth.signUp({
      email,
      password, // TS OK: guaranteed string here
      options: { emailRedirectTo },
    });
  }

  // No password -> send a magic link (passwordless)
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo },
  });
}

export async function signInWithMagicLink(email: string) {
  const emailRedirectTo = `${getBaseUrl()}/auth/callback`;
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo },
  });
}
