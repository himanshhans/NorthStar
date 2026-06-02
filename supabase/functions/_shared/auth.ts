// @ts-nocheck — Deno runtime.
// Verifies the Clerk session JWT sent as `Authorization: Bearer <token>`.
// Functions are deployed with --no-verify-jwt (the Supabase gateway can't validate
// Clerk tokens), so we validate here instead — closing the open-endpoint hole.
import { createRemoteJWKSet, jwtVerify, decodeJwt } from "npm:jose@5";

const ENV_ISSUER = Deno.env.get("CLERK_ISSUER"); // e.g. https://your-app.clerk.accounts.dev
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwksFor(issuer: string) {
  if (!jwksCache.has(issuer)) {
    jwksCache.set(issuer, createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)));
  }
  return jwksCache.get(issuer)!;
}

/** Returns the Clerk user id (sub) if the token is valid, else null. */
export async function getUserId(req: Request): Promise<string | null> {
  try {
    const header = req.headers.get("Authorization") || "";
    const token = header.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;

    // Pin to CLERK_ISSUER if set; otherwise trust the token's own issuer (still
    // cryptographically verified against that issuer's JWKS).
    const issuer = ENV_ISSUER || decodeJwt(token).iss;
    if (!issuer) return null;

    const { payload } = await jwtVerify(token, jwksFor(issuer), { issuer });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
