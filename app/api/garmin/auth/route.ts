import { NextResponse } from "next/server";
import { getGarminRequestToken } from "@/lib/garminOAuth";

export async function GET() {
  const { token, secret } = await getGarminRequestToken();

  const res = NextResponse.redirect(
    `https://connect.garmin.com/oauthConfirm?oauth_token=${encodeURIComponent(token)}`
  );
  res.cookies.set("garmin_request_secret", secret, {
    httpOnly: true,
    secure: true,
    path: "/",
    maxAge: 600,
  });
  return res;
}

