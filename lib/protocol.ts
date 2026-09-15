import { CURATED_MARKETS } from "@/lib/markets";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const HASH = /^[a-fA-F0-9]{64}$/;

export function isSolanaAddress(value: unknown): value is string {
  return typeof value === "string" && BASE58.test(value);
}

type Deployment = {
  vault: string;
  productMint: string;
  xStockMint: string;
  pythFeedId: string;
  chainlinkFeedId: string;
  leverage: 2 | 3 | 5;
};

function deployments(): Record<string, Deployment> {
  try {
    const value = JSON.parse(process.env.LEVPLAY_SVM_MARKETS_JSON || "{}") as Record<string, Deployment>;
    const accepted: Record<string, Deployment> = {};
    const vaults = new Set<string>();
    const productMints = new Set<string>();
    for (const [key, item] of Object.entries(value)) {
      const match = key.match(/^(AAPL|MSFT|NVDA|GOOGL|AMZN|META|TSLA|MSTR|COIN|HOOD|GLD|SLV|PPLT|GDX|COPX)(2|3|5)L$/);
      const expected = match ? CURATED_MARKETS.find((market) => market.ticker === match[1]) : undefined;
      const leverage = Number(match?.[2]);
      if (!expected || item?.xStockMint !== expected.mint || item?.leverage !== leverage ||
        !isSolanaAddress(item?.vault) || !isSolanaAddress(item?.productMint) ||
        item.vault === item.productMint || vaults.has(item.vault) || productMints.has(item.productMint) ||
        typeof item?.pythFeedId !== "string" || !/^[a-fA-F0-9]{64}$/.test(item.pythFeedId) ||
        typeof item?.chainlinkFeedId !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(item.chainlinkFeedId)) continue;
      vaults.add(item.vault);
      productMints.add(item.productMint);
      accepted[key] = item;
    }
    return accepted;
  } catch {
    return {};
  }
}

export function protocolStatus() {
  const programId = process.env.LEVPLAY_SVM_PROGRAM_ID || "";
  const feeRecipient = process.env.LEVPLAY_SVM_FEE_RECIPIENT || "";
  const governance = process.env.LEVPLAY_SVM_GOVERNANCE_MULTISIG || "";
  const guardian = process.env.LEVPLAY_SVM_GUARDIAN_MULTISIG || "";
  const auditHash = (process.env.LEVPLAY_SVM_AUDIT_HASH || "").replace(/^0x/, "");
  const releaseHash = (process.env.LEVPLAY_SVM_RELEASE_HASH || "").replace(/^0x/, "");
  const markets = deployments();
  const checks = [
    { id: "program", label: "Verified SVM program", passed: isSolanaAddress(programId), failure: "SVM program is not deployed" },
    { id: "treasury", label: "Fee treasury", passed: isSolanaAddress(feeRecipient), failure: "Fee treasury is not configured" },
    { id: "multisigs", label: "Independent multisigs", passed: isSolanaAddress(governance) && isSolanaAddress(guardian) && governance !== guardian, failure: "Independent governance and guardian multisigs are required" },
    { id: "audit", label: "Independent audit", passed: HASH.test(auditHash), failure: "Independent audit hash is missing" },
    { id: "release", label: "Frozen release hash", passed: HASH.test(releaseHash), failure: "Frozen release hash is missing" },
    { id: "frozen", label: "Program authority frozen", passed: process.env.LEVPLAY_SVM_PROGRAM_FROZEN === "true", failure: "Audited program release is not frozen" },
    { id: "markets", label: "Audited vault deployment", passed: Object.keys(markets).length > 0, failure: "No audited vault deployment is configured" },
    { id: "switch", label: "Operator go-live vote", passed: process.env.LEVPLAY_SVM_EXECUTION_ENABLED === "true", failure: "Mainnet execution switch is off" },
  ];
  const blockers = checks.filter((check) => !check.passed).map((check) => check.failure);

  return {
    executionEnabled: blockers.length === 0,
    feeBps: 50,
    maxPilotUsd: 100,
    programId: isSolanaAddress(programId) ? programId : null,
    feeRecipient: isSolanaAddress(feeRecipient) ? feeRecipient : null,
    configuredMarkets: Object.keys(markets),
    checks: checks.map((check) => ({ id: check.id, label: check.label, passed: check.passed })),
    blockers,
  };
}
