import type { AuthResponse } from "@ai-review/shared";
import { mapProfile } from "../../utils/mappers";
import { unauthorized } from "../../utils/http";
import type { ProfileRow } from "../../types/database";
import { supabaseAdmin, supabaseAuthClient } from "../../services/supabase/client";

export class AuthService {
  async signup(input: { email: string; password: string; fullName: string }): Promise<AuthResponse> {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
      },
    });

    if (error || !data.user) {
      throw unauthorized(error?.message ?? "Unable to sign up");
    }

    await this.upsertProfile({
      userId: data.user.id,
      email: data.user.email ?? input.email,
      fullName: input.fullName,
    });

    const loginResult = await supabaseAuthClient.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (loginResult.error || !loginResult.data.user || !loginResult.data.session) {
      throw unauthorized(loginResult.error?.message ?? "Account created, but sign in failed");
    }

    const profile = await this.fetchProfile(loginResult.data.user.id);

    return {
      user: {
        id: loginResult.data.user.id,
        email: loginResult.data.user.email ?? input.email,
        fullName: profile.fullName,
      },
      session: {
        accessToken: loginResult.data.session.access_token,
        refreshToken: loginResult.data.session.refresh_token,
        expiresAt: loginResult.data.session.expires_at ?? null,
      },
    };
  }

  async login(input: { email: string; password: string }): Promise<AuthResponse> {
    const { data, error } = await supabaseAuthClient.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error || !data.user || !data.session) {
      throw unauthorized(error?.message ?? "Invalid credentials");
    }

    const profile = await this.fetchProfile(data.user.id);

    return {
      user: {
        id: data.user.id,
        email: data.user.email ?? input.email,
        fullName: profile.fullName,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ?? null,
      },
    };
  }

  async logout(userId: string) {
    const { error } = await supabaseAdmin.auth.admin.signOut(userId);
    if (error) {
      throw unauthorized(error.message);
    }

    return { success: true };
  }

  async getCurrentProfile(userId: string) {
    return this.fetchProfile(userId);
  }

  private async upsertProfile(input: { userId: string; email: string; fullName: string }) {
    const { error } = await supabaseAdmin.from("profiles").upsert({
      id: input.userId,
      email: input.email,
      full_name: input.fullName,
    });

    if (error) {
      throw unauthorized(error.message);
    }
  }

  private async fetchProfile(userId: string) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single<ProfileRow>();

    if (error || !data) {
      throw unauthorized("Profile not found");
    }

    return mapProfile(data);
  }
}
