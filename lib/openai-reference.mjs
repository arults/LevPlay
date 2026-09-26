// OpenAI-only, deterministic reference ledger. No wallet, oracle or token transfer occurs here.
// Amounts are integer USDC base units; prices are positive integer micro-USD.
export const OPENAI_SOURCES = Object.freeze({
  prestocks: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
  tessera: "oPAiAikWTaFj9RYoRFD35ccfwhnMcB3ThgBZRHSkjTZ",
});
const MAX = (1n << 64n) - 1n;
const BPS = 10_000n;
const FEE_BPS = 50n;

function amount(value, name, positive = false) {
  if (typeof value !== "bigint" || value < 0n || value > MAX || (positive && value === 0n))
    throw new Error(`invalid ${name}`);
  return value;
}
function add(a, b) {
  const result = a + b;
  if (result > MAX) throw new Error("amount overflow");
  return result;
}
function ceil(n, d) { return (n + d - 1n) / d; }
function source(provider, mint) {
  if (!Object.hasOwn(OPENAI_SOURCES, provider) || OPENAI_SOURCES[provider] !== mint)
    throw new Error("unapproved OpenAI source identity");
}
function observation(observed, priorSlot = -1n) {
  if (!observed || typeof observed !== "object") throw new Error("missing settlement observation");
  const { price, slot, primary, secondary } = observed;
  amount(price, "price", true);
  amount(slot, "slot", true);
  if (slot <= priorSlot || primary !== true || secondary !== true)
    throw new Error("stale or unverified dual-oracle observation");
}

export function quoteOpen({ provider, mint, side, capital, observation: mark, makerEscrowAvailable, reserveVaultAvailable, expirySlot }) {
  source(provider, mint);
  if (side !== "long" && side !== "short") throw new Error("invalid side");
  amount(capital, "capital", true);
  amount(makerEscrowAvailable, "maker escrow available");
  amount(reserveVaultAvailable, "reserve vault available");
  amount(expirySlot, "expiry slot", true);
  observation(mark);
  if (mark.slot > expirySlot) throw new Error("quote expired");
  // Full one-interval 100% adverse/gain envelope requires 2x capital in
  // counterparty escrow, independent of holder capital and floor reserve.
  const makerRequired = add(capital, capital);
  const floorReserve = ceil(capital, 100n); // 1%; segregated, never a fee.
  if (makerRequired > makerEscrowAvailable) throw new Error("maker collateral insufficient");
  if (floorReserve > reserveVaultAvailable) throw new Error("floor reserve insufficient");
  const fee = capital * FEE_BPS / BPS;
  return Object.freeze({ makerRequired, floorReserve, fee, walletDebit: add(capital, fee) });
}

export function openPosition(input) {
  const { owner, nonce, observation: mark, capital, provider, mint, side, makerEscrowAvailable, reserveVaultAvailable, expirySlot } = input;
  if (typeof owner !== "string" || !owner.trim() || typeof nonce !== "string" || !nonce.trim())
    throw new Error("invalid position identity");
  const quote = quoteOpen({ provider, mint, side, capital, observation: mark, makerEscrowAvailable, reserveVaultAvailable, expirySlot });
  return Object.freeze({ owner, nonce, provider, mint, side, capital, entryPrice: mark.price,
    lastPrice: mark.price, lastSlot: mark.slot, nav: capital, exposure: add(capital, capital),
    makerLocked: quote.makerRequired, reserveLocked: quote.floorReserve, mode: "active", sequence: 0n,
    ...quote });
}

export function settlePosition(position, mark) {
  if (position.mode !== "active") throw new Error("position cannot settle");
  observation(mark, position.lastSlot);
  const move = mark.price - position.lastPrice;
  // A gap outside this funded interval has no safe settlement path. Halt until
  // a separately governed, funded wind-down; never silently clamp a price.
  if (move < -position.lastPrice || move > position.lastPrice)
    throw new Error("price gap exceeds funded interval");
  const signed = position.side === "long" ? move : -move;
  const pnl = position.exposure * signed / position.lastPrice;
  const rawNav = position.nav + pnl;
  const floor = ceil(position.capital, 100n);
  const reserveDraw = rawNav < floor ? floor - rawNav : 0n;
  if (reserveDraw > position.reserveLocked) throw new Error("unfunded floor");
  const nav = rawNav + reserveDraw;
  if (nav < 0n || nav > MAX) throw new Error("insolvent or overflowed settlement");
  const makerGain = pnl > 0n ? pnl : 0n;
  if (makerGain > position.makerLocked) throw new Error("unfunded gain");
  const standby = rawNav <= floor;
  return Object.freeze({ ...position, lastPrice: mark.price, lastSlot: mark.slot,
    nav, exposure: standby ? 0n : add(nav, nav),
    makerLocked: position.makerLocked - makerGain,
    reserveLocked: position.reserveLocked - reserveDraw,
    mode: standby ? "standby" : "active", sequence: position.sequence + 1n,
    lastPnl: pnl, reserveDraw });
}

export function closePosition(position, { owner, nonce, minAssets, expectedSequence }) {
  if (position.mode !== "active" && position.mode !== "standby") throw new Error("already closed");
  if (owner !== position.owner || nonce !== position.nonce || expectedSequence !== position.sequence)
    throw new Error("unauthorized or replayed close");
  amount(minAssets, "minimum assets");
  if (position.nav < minAssets) throw new Error("close slippage");
  // Cash availability and source unwind must be proven by the onchain handler.
  return Object.freeze({ ...position, mode: "closed", exposure: 0n, payoutDue: position.nav });
}
