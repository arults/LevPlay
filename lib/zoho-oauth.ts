import { readJsonResponseBounded } from "@/lib/http-safety";

const DEFAULT_ACCOUNTS_BASE = "https://accounts.zoho.in";
const DEFAULT_MAIL_API_BASE = "https://mail.zoho.in/api";
const DEFAULT_REDIRECT_URI = "https://app.levplay.tech/api/integrations/zoho/callback";
const DEFAULT_MAIL_ADDRESS = "info@levplay.tech";
const STATE_TTL_SECONDS = 10 * 60;

export const ZOHO_STATE_COOKIE = "levplay_zoho_oauth_state";
export const ZOHO_SCOPES = [
  "ZohoMail.accounts.READ",
  "ZohoMail.messages.READ",
  "ZohoMail.messages.CREATE",
] as const;

type TokenPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
};

type ZohoAccount = {
  primaryEmailAddress?: string;
  mailboxAddress?: string;
  emailAddress?: Array<{ mailId?: string }>;
};

type AccountsPayload = {
  data?: ZohoAccount[];
  status?: { code?: number; description?: string };
};

export function getZohoConfig() {
  const clientId = required("ZOHO_CLIENT_ID");
  const clientSecret = required("ZOHO_CLIENT_SECRET");
  const accountsBase = officialZohoIndiaUrl(process.env.ZOHO_ACCOUNTS_BASE_URL || DEFAULT_ACCOUNTS_BASE, "accounts.zoho.in");
  const mailApiBase = officialZohoIndiaUrl(process.env.ZOHO_MAIL_API_BASE_URL || DEFAULT_MAIL_API_BASE, "mail.zoho.in");
  const redirectUri = process.env.ZOHO_REDIRECT_URI || DEFAULT_REDIRECT_URI;
  const mailboxAddress = (process.env.ZOHO_MAIL_ADDRESS || DEFAULT_MAIL_ADDRESS).trim().toLowerCase();

  if (redirectUri !== DEFAULT_REDIRECT_URI) throw new Error("Invalid Zoho redirect URI configuration");
  if (mailboxAddress !== DEFAULT_MAIL_ADDRESS) throw new Error("Invalid Zoho mailbox configuration");

  return { clientId, clientSecret, accountsBase, mailApiBase, redirectUri, mailboxAddress };
}

export async function createOAuthState() {
  const { clientSecret } = getZohoConfig();
  const nonce = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(24)));
  const expiresAt = Math.floor(Date.now() / 1_000) + STATE_TTL_SECONDS;
  const unsigned = `${nonce}.${expiresAt}`;
  const signature = await sign(unsigned, clientSecret);
  return `${unsigned}.${signature}`;
}

export async function validateOAuthState(state: string) {
  const { clientSecret } = getZohoConfig();
  const parts = state.split(".");
  if (parts.length !== 3 || !/^[A-Za-z0-9_-]{32}$/.test(parts[0]) || !/^\d{10}$/.test(parts[1])) return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1_000)) return false;
  const expected = await sign(`${parts[0]}.${parts[1]}`, clientSecret);
  return timingSafeEqual(parts[2], expected);
}

export function buildAuthorizationUrl(state: string) {
  const { clientId, accountsBase, redirectUri } = getZohoConfig();
  const url = new URL("/oauth/v2/auth", accountsBase);
  url.searchParams.set("scope", ZOHO_SCOPES.join(","));
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url;
}

export async function exchangeAuthorizationCode(code: string) {
  const { clientId, clientSecret, accountsBase, redirectUri } = getZohoConfig();
  if (!/^[A-Za-z0-9._-]{8,2048}$/.test(code)) throw new Error("Invalid Zoho authorization code");
  const url = new URL("/oauth/v2/token", accountsBase);
  url.searchParams.set("grant_type", "authorization_code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);
  const response = await fetch(url, {
    method: "POST",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  const payload = await readJsonResponseBounded(response, 64_000) as TokenPayload;
  if (!response.ok || payload.error || !payload.access_token || !payload.refresh_token) {
    const safeError = typeof payload.error === "string" && /^[a-z_]{3,64}$/.test(payload.error)
      ? payload.error
      : `http_${response.status}`;
    throw new Error(`Zoho token exchange failed (${safeError})`);
  }
  return { accessToken: payload.access_token, refreshToken: payload.refresh_token };
}

export async function verifyLevPlayMailbox(accessToken: string) {
  const { mailApiBase, mailboxAddress } = getZohoConfig();
  const response = await fetch(new URL("accounts", `${mailApiBase.toString().replace(/\/?$/, "/")}`), {
    headers: { accept: "application/json", authorization: `Zoho-oauthtoken ${accessToken}` },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  const payload = await readJsonResponseBounded(response, 512_000) as AccountsPayload;
  if (!response.ok || payload.status?.code && payload.status.code >= 400) throw new Error("Zoho account verification failed");
  const accounts = Array.isArray(payload.data) ? payload.data : [];
  const matched = accounts.some((account) => [
    account.primaryEmailAddress,
    account.mailboxAddress,
    ...(account.emailAddress || []).map((entry) => entry.mailId),
  ].some((value) => value?.trim().toLowerCase() === mailboxAddress));
  if (!matched) throw new Error("The authorized Zoho account does not contain the LevPlay mailbox");
}

export function zohoNoStoreHeaders(contentType = "text/html; charset=utf-8") {
  return {
    "cache-control": "no-store, max-age=0",
    "content-type": contentType,
    "content-security-policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; style-src 'unsafe-inline'",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
}

export function parseCookie(request: Request, name: string) {
  const cookies = request.headers.get("cookie") || "";
  for (const item of cookies.split(";")) {
    const [key, ...value] = item.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function officialZohoIndiaUrl(value: string, expectedHost: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== expectedHost || url.username || url.password) {
    throw new Error("Invalid Zoho India endpoint configuration");
  }
  return url;
}

function required(name: "ZOHO_CLIENT_ID" | "ZOHO_CLIENT_SECRET") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(bytes));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}
