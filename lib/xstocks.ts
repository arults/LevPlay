import { readJsonResponseBounded } from "./http-safety.ts";

export const XSTOCKS_API = "https://api.xstocks.fi/api/v2";
export const XSTOCKS_TOKEN_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

const SYMBOL = /^[A-Z0-9.]{1,16}x$/;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type XStocksDeployment = {
  address: string;
  network: string;
  wrapperAddress?: string;
  wrapperAddressV2?: string;
  supportsAtomicSwaps?: boolean;
};

export type XStocksAsset = {
  symbol: string;
  name: string;
  isTradingHalted: boolean;
  deployments: XStocksDeployment[];
  trading?: {
    openNow?: boolean;
    currentPeriod?: string;
    nextChangeAt?: string | null;
  } | null;
};

export type XStocksMultiplier = {
  multiplier: string;
  effectiveAt?: string;
};

export function normalizeXStocksSymbol(value: string) {
  const symbol = value.trim();
  if (!SYMBOL.test(symbol)) throw new Error("invalid_xstocks_symbol");
  return symbol;
}

export function solanaDeployment(asset: XStocksAsset) {
  const deployment = asset.deployments.find((item) => item.network === "Solana");
  if (!deployment || !BASE58.test(deployment.address)) throw new Error("solana_deployment_unavailable");
  return deployment;
}

export function scaledUiAmount(rawAmount: bigint, decimals: number, multiplier: string) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error("invalid_decimals");
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,18})?$/.test(multiplier)) throw new Error("invalid_multiplier");
  const [whole, fraction = ""] = multiplier.split(".");
  const scale = 10n ** 18n;
  const multiplier18 = BigInt(whole) * scale + BigInt(fraction.padEnd(18, "0"));
  const scaledBaseUnits = rawAmount * multiplier18 / scale;
  const tokenScale = 10n ** BigInt(decimals);
  const integer = scaledBaseUnits / tokenScale;
  const remainder = (scaledBaseUnits % tokenScale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return remainder ? `${integer}.${remainder}` : integer.toString();
}

export function corporateActionPause(nowMs: number, activationIso: string, windowMinutes = 15) {
  const activationMs = Date.parse(activationIso);
  if (!Number.isFinite(activationMs) || !Number.isInteger(windowMinutes) || windowMinutes < 1 || windowMinutes > 120) return true;
  return Math.abs(nowMs - activationMs) <= windowMinutes * 60_000;
}

async function publicGet(path: string) {
  const response = await fetch(`${XSTOCKS_API}${path}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`xstocks_${response.status}`);
  return readJsonResponseBounded(response, 1_000_000);
}

export async function getXStocksPublicSnapshot(symbolInput: string) {
  const symbol = normalizeXStocksSymbol(symbolInput);
  const encoded = encodeURIComponent(symbol);
  const [asset, multiplier, upcoming] = await Promise.all([
    publicGet(`/public/assets/${encoded}`) as Promise<XStocksAsset>,
    publicGet(`/public/assets/${encoded}/multiplier`) as Promise<XStocksMultiplier>,
    publicGet(`/public/corporate-actions/upcoming?page=1&pageSize=20&symbol=${encoded}`) as Promise<unknown>,
  ]);
  if (!asset || asset.symbol !== symbol || !Array.isArray(asset.deployments)) throw new Error("xstocks_invalid_asset");
  const deployment = solanaDeployment(asset);
  return { asset, multiplier, upcoming, deployment };
}
