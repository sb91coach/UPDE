import OAuth from "oauth-1.0a";
import crypto from "crypto";

export function createGarminOAuth() {
  return new OAuth({
    consumer: {
      key: process.env.GARMIN_CONSUMER_KEY!,
      secret: process.env.GARMIN_CONSUMER_SECRET!,
    },
    signature_method: "HMAC-SHA1",
    hash_function(base_string, key) {
      return crypto.createHmac("sha1", key).update(base_string).digest("base64");
    },
  });
}

export async function getGarminRequestToken(): Promise<{ token: string; secret: string }> {
  const oauth = createGarminOAuth();
  const url = "https://connectapi.garmin.com/oauth-service/oauth/request_token";
  const requestData = { url, method: "POST" as const };
  const headers = oauth.toHeader(oauth.authorize(requestData));

  const res = await fetch(url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
  });

  const text = await res.text();
  const params = new URLSearchParams(text);
  return {
    token: params.get("oauth_token")!,
    secret: params.get("oauth_token_secret")!,
  };
}

export async function getGarminAccessToken(
  requestToken: string,
  requestSecret: string,
  verifier: string
): Promise<{ token: string; secret: string }> {
  const oauth = createGarminOAuth();
  const url = "https://connectapi.garmin.com/oauth-service/oauth/access_token";
  const requestData = { url, method: "POST" as const };
  const token = { key: requestToken, secret: requestSecret };
  const headers = oauth.toHeader(oauth.authorize(requestData, token));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `oauth_verifier=${verifier}`,
  });

  const text = await res.text();
  const params = new URLSearchParams(text);
  return {
    token: params.get("oauth_token")!,
    secret: params.get("oauth_token_secret")!,
  };
}

export function signGarminRequest(
  url: string,
  method: string,
  accessToken: string,
  accessSecret: string
) {
  const oauth = createGarminOAuth();
  const requestData = { url, method };
  const token = { key: accessToken, secret: accessSecret };
  return oauth.toHeader(oauth.authorize(requestData, token));
}

