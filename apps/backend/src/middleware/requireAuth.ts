import type { NextFunction, Request, Response } from "express";
import { unauthorized } from "../utils/http";
import type { ProfileRow } from "../types/database";
import { mapProfile } from "../utils/mappers";
import { supabaseAdmin, supabaseAuthClient } from "../services/supabase/client";

const getBearerToken = (authorizationHeader?: string) => {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw unauthorized();
  }

  return authorizationHeader.slice("Bearer ".length).trim();
};

export const requireAuth = async (request: Request, _response: Response, next: NextFunction) => {
  try {
    const token = getBearerToken(request.headers.authorization);
    const { data: userData, error: userError } = await supabaseAuthClient.auth.getUser(token);

    if (userError || !userData.user) {
      throw unauthorized();
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .single<ProfileRow>();

    if (profileError || !profile) {
      throw unauthorized("Profile missing");
    }

    request.auth = {
      token,
      user: {
        id: userData.user.id,
        email: userData.user.email ?? "",
      },
      profile: mapProfile(profile),
    };

    next();
  } catch (error) {
    next(error);
  }
};
