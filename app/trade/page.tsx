"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getWallets } from "@wallet-standard/app";
import type { Wallet as StandardWallet } from "@wallet-standard/base";
import { Activity, ArrowUpRight, BookOpen, BriefcaseBusiness, Check, ChevronRight, CircleAlert, Code2, ExternalLink, Eye, Gem, History as HistoryIcon, Info, Landmark, Layers3, LoaderCircle, LockKeyhole, LogOut, PlayCircle, RefreshCw, RotateCw, Scale, Search, ShieldCheck, Sparkles, TrendingDown, TrendingUp, Wallet, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ALL_MARKETS, SOLANA_USDC_MINT, type MarketCategory } from "@/lib/markets";
import { MarketDecisionChart, type DisplayPriceUpdate } from "@/components/market-decision-chart";

type Oracle = { provider: string; feedId: string; minPublishers: number };
type ReferenceStatus = "live" | "stale" | "provider_unconfigured" | "provider_offline" | "not_admitted" | "timestamp_unavailable";
type LiveMarket = (typeof ALL_MARKETS)[number] & { provider?: string; price?: number; logo?: string; liquidityUsd?: number; mint?: string; atomic?: boolean; halted?: boolean; marketOpen?: boolean; period?: string; multiplier?: number; pendingMultiplier?: number; multiplierActivation?: number; oracles?: Oracle[]; verified: boolean; unavailable?: boolean; verificationNote?: string; referenceStatus?: ReferenceStatus; referenceLabel?: string; referenceTimestamp?: number; sourceMintVerified?: boolean; pythFeedId?: string | null; pricingPolicy?: string };
type ProtocolCheck = { id: string; label: string; passed: boolean };
type Protocol = { executionEnabled: boolean; feeBps: number; maxPilotUsd: number; feeRecipient: string | null; treasuryAuthority: string | null; rpcQuorum: number; configuredMarkets: string[]; checks: ProtocolCheck[]; blockers: string[] };
type MarketResponse = { markets: LiveMarket[]; checkedAt?: string | null };
type AppView = "trade" | "portfolio" | "history";
type Direction = "Long" | "Short";
type PaperPosition = { id: string; symbol: string; ticker: string; name: string; leverage: number; direction: Direction; capital: number; fee: number; costBasis: number; entryPrice: number; openedAt: string };
type PaperTrade = { id: string; positionId: string; action: "Buy" | "Sell"; productId: string; amount: number; fee: number; price: number; pnl: number; at: string };
type EligibilityCheck = "adult" | "jurisdiction" | "rights" | "loss" | "finality";
type EligibilityAttestation = { version: string; walletAddress: string; acceptedAt: string };
type SolanaProvider = { isConnected?: boolean; publicKey?: { toString(): string }; connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>; disconnect?(): Promise<void> };
type ModelTool = { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute(input: unknown): unknown };

declare global {
  interface Window { solana?: SolanaProvider; phantom?: { solana?: SolanaProvider }; backpack?: SolanaProvider & { solana?: SolanaProvider }; jupiter?: { solana?: SolanaProvider }; rabby?: SolanaProvider & { solana?: SolanaProvider }; okxwallet?: { solana?: SolanaProvider } }
  interface Document { modelContext?: { registerTool(tool: ModelTool, options?: { signal?: AbortSignal }): void | Promise<void> } }
}

const formatUsd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const short = (value: string) => value ? `${value.slice(0, 4)}…${value.slice(-4)}` : "";
const marketId = (market: LiveMarket, leverage: number, direction: Direction) => `${market.ticker}${leverage}${direction === "Long" ? "L" : "S"}`;
const paperId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
const ELIGIBILITY_ATTESTATION_VERSION = "levplay-eligibility-2026-09-17-v1";
const ELIGIBILITY_STORAGE_KEY = "levplay-mainnet-eligibility-v1";
const TRANSACTION_HANDLER_IMPLEMENTED = false;
const EMPTY_ELIGIBILITY_CHECKS: Record<EligibilityCheck, boolean> = { adult: false, jurisdiction: false, rights: false, loss: false, finality: false };

const WALLET_OPTIONS = [
  { id: "phantom", name: "Phantom", aliases: ["phantom"], domain: "phantom.com", install: "https://phantom.com/download" },
  { id: "backpack", name: "Backpack", aliases: ["backpack"], domain: "backpack.app", install: "https://backpack.app/download" },
  { id: "jupiter", name: "Jupiter", aliases: ["jupiter"], domain: "jup.ag", install: "https://jup.ag/mobile" },
  { id: "rabby", name: "Rabby", aliases: ["rabby"], domain: "rabby.io", install: "https://rabby.io/" },
  { id: "okx", name: "OKX Wallet", aliases: ["okx"], domain: "okx.com", install: "https://www.okx.com/web3" },
] as const;

const favicon = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

function AssetLogo({ market, size = 42 }: { market: LiveMarket; size?: number }) {
  const source = market.logo || "";
  const [failure, setFailure] = useState<{ source: string; attempts: number } | null>(null);
  const attempts = failure?.source === source ? failure.attempts : 0;
  const localBrand = source.startsWith("/brands/");
  const renderedSource = localBrand ? `${source}?v=20260917-${attempts}` : source;
  const failed = attempts >= 2;

  if (!source || failed) return <i className="asset-logo-fallback" style={{ background: market.tone, width: size, height: size }}>{market.ticker[0]}</i>;
  return <span className="asset-logo" style={{ width: size, height: size }}><Image key={renderedSource} src={renderedSource} alt={`${market.name} logo`} width={size} height={size} unoptimized onLoad={() => setFailure(null)} onError={() => setFailure({ source, attempts: attempts + 1 })}/></span>;
}

function WalletLogo({ name, icon, domain }: { name: string; icon?: string; domain: string }) {
  return <span className="wallet-logo"><Image src={icon || favicon(domain)} alt={`${name} logo`} width={38} height={38} unoptimized/></span>;
}

function PartnerLogo({ name, domain }: { name: string; domain: string }) {
  return <Image className="partner-logo" src={favicon(domain)} alt={`${name} logo`} width={18} height={18} unoptimized/>;
}

function LogoMark() { return <span className="logo-mark" aria-hidden="true"><i/><b/></span>; }

function ExposureCurve({ leverage, direction }: { leverage: number; direction: Direction }) {
  const sign = direction === "Long" ? 1 : -1;
  const points = Array.from({ length: 21 }, (_, index) => { const underlying = -20 + index * 2; const product = Math.max(-100, underlying * leverage * sign); return `${8 + index * 4.2},${Math.max(8, Math.min(84, 46 - product * .32))}`; }).join(" ");
  return <div className="curve"><div className="curve-labels"><span>−20%</span><strong>Underlying move</strong><span>+20%</span></div><svg viewBox="0 0 100 92" preserveAspectRatio="none" role="img" aria-label={`${leverage} times ${direction.toLowerCase()} leveraged outcome illustration`}><line x1="8" y1="46" x2="92" y2="46"/><line x1="50" y1="8" x2="50" y2="84"/><polyline points={points}/><circle cx="50" cy="46" r="2.2"/></svg></div>;
}

export default function TradingApp() {
  const [category, setCategory] = useState<MarketCategory>("Stocks");
  const [preIpoProvider, setPreIpoProvider] = useState<"PreStocks" | "Tessera">("PreStocks");
  const [query, setQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("AAPLon");
  const [markets, setMarkets] = useState<LiveMarket[]>(ALL_MARKETS.map((market) => ({ ...market, verified: false })));
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<Protocol>({ executionEnabled: false, feeBps: 50, maxPilotUsd: 100, feeRecipient: null, treasuryAuthority: null, rpcQuorum: 0, configuredMarkets: [], checks: [], blockers: ["Checking release gates"] });
  const [leverage, setLeverage] = useState(2);
  const [direction, setDirection] = useState<Direction>("Long");
  const [amount, setAmount] = useState(50);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [installedWallets, setInstalledWallets] = useState<readonly StandardWallet[]>([]);
  const [balance, setBalance] = useState<{ sol: number; usdc: number; rpc?: string } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<AppView>("trade");
  const [paperMode, setPaperMode] = useState(false);
  const [paperCash, setPaperCash] = useState(1_000);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [history, setHistory] = useState<PaperTrade[]>([]);
  const [scenarioBps, setScenarioBps] = useState(0);
  const [exitPosition, setExitPosition] = useState<PaperPosition | null>(null);
  const [eligibilityOpen, setEligibilityOpen] = useState(false);
  const [eligibilityChecks, setEligibilityChecks] = useState<Record<EligibilityCheck, boolean>>(EMPTY_ELIGIBILITY_CHECKS);
  const [eligibilityAttestation, setEligibilityAttestation] = useState<EligibilityAttestation | null>(null);
  const paperHydrated = useRef(false);

  const applyDisplayPrice = useCallback((update: DisplayPriceUpdate) => {
    setMarkets((current) => current.map((market) => market.symbol === update.symbol ? {
      ...market,
      price: update.price,
      unavailable: false,
      referenceStatus: "live",
      referenceLabel: update.label,
      referenceTimestamp: update.timestamp,
      period: update.period,
      marketOpen: update.marketOpen,
      verificationNote: "Public chart reference available for research; it is never accepted for settlement",
    } : market));
  }, []);

  const selected = markets.find((market) => market.symbol === selectedSymbol) || markets[0];
  const productId = marketId(selected, leverage, direction);
  const marketConfigured = protocol.configuredMarkets.includes(productId);
  const oracleReady = Boolean(selected.verified && !selected.halted && selected.price);
  const fee = amount * protocol.feeBps / 10_000;
  const totalDebit = amount + fee;
  const exposure = amount * leverage;
  const managedExposure = Math.max(0, exposure - amount);
  const releaseReady = protocol.executionEnabled && marketConfigured && oracleReady && amount >= 10 && amount <= protocol.maxPilotUsd && Boolean(balance && balance.usdc >= totalDebit && balance.sol >= 0.002);
  const eligibilityAccepted = Boolean(walletAddress && eligibilityAttestation?.version === ELIGIBILITY_ATTESTATION_VERSION && eligibilityAttestation.walletAddress === walletAddress);
  const canExecute = releaseReady && eligibilityAccepted && TRANSACTION_HANDLER_IMPLEMENTED;
  const marketState = protocol.executionEnabled && marketConfigured && oracleReady ? "OPEN" : selected.price ? "DISCOVER" : "BLOCKED";
  const referenceFreshness = selected.referenceTimestamp && checkedAt
    ? `${Math.max(0, Math.floor((Date.parse(checkedAt) - selected.referenceTimestamp) / 1_000))}s old at check`
    : selected.referenceStatus === "timestamp_unavailable" ? "No source timestamp" : "Unavailable";
  const referenceSession = selected.marketOpen ? (selected.period || "Open") : selected.period ? `${selected.period} · closed` : "Closed or unknown";
  const blockedReason = selected.price
    ? protocol.blockers[0] || selected.verificationNote || "Release-level execution gates remain locked."
    : selected.verificationNote || selected.referenceLabel || protocol.blockers[0] || "No verified settlement route is admitted.";
  const maxCapital = (available: number) => Math.max(0, Math.min(protocol.maxPilotUsd, Math.floor(available / (1 + protocol.feeBps / 10_000) * 100) / 100));
  const referenceFor = useCallback((position: PaperPosition) => markets.find((market) => market.symbol === position.symbol)?.price || position.entryPrice, [markets]);
  const positionValue = useCallback((position: PaperPosition) => {
    const current = referenceFor(position) * (1 + scenarioBps / 10_000);
    const move = current / position.entryPrice - 1;
    const directionSign = position.direction === "Long" ? 1 : -1;
    return Math.max(0, position.capital * (1 + directionSign * position.leverage * move));
  }, [referenceFor, scenarioBps]);
  const totalInvested = positions.reduce((sum, position) => sum + position.costBasis, 0);
  const totalValue = positions.reduce((sum, position) => sum + positionValue(position), 0);
  const unrealizedPnl = totalValue - totalInvested;
  const realizedPnl = history.filter((trade) => trade.action === "Sell").reduce((sum, trade) => sum + trade.pnl, 0);
  const totalPnl = realizedPnl + unrealizedPnl;
  const paperEquity = paperCash + totalValue;

  const refresh = useCallback(async () => {
    setLoadingMarkets(true);
    const [marketResponse, protocolResponse] = await Promise.allSettled([
      fetch("/api/markets", { cache: "no-store", signal: AbortSignal.timeout(12_000) }).then((response) => response.ok ? response.json() as Promise<MarketResponse> : Promise.reject()),
      fetch("/api/protocol", { cache: "no-store", signal: AbortSignal.timeout(12_000) }).then((response) => response.ok ? response.json() as Promise<Protocol> : Promise.reject()),
    ]);
    if (marketResponse.status === "fulfilled" && Array.isArray(marketResponse.value.markets)) { setMarkets(marketResponse.value.markets); setCheckedAt(marketResponse.value.checkedAt || null); }
    else setNotice("Live market data is unavailable. Try again shortly.");
    if (protocolResponse.status === "fulfilled") setProtocol(protocolResponse.value);
    else setNotice("Launch-safety checks are unavailable. Trading remains locked.");
    setLoadingMarkets(false);
  }, []);

  const readWallet = useCallback(async (address: string) => {
    try {
      const response = await fetch("/api/wallet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address }) });
      if (!response.ok) throw new Error();
      const value = await response.json() as { sol: number; tokens: Array<{ mint: string; amount: string }>; rpc?: string };
      const usdc = value.tokens.filter((token) => token.mint === SOLANA_USDC_MINT).reduce((sum, token) => sum + Number(token.amount || 0), 0);
      setBalance({ sol: value.sol, usdc, rpc: value.rpc });
      if (usdc <= 0) setNotice("No USDC is available in this wallet on Solana.");
      else if (value.sol < 0.002) setNotice("Add a small amount of SOL to cover network fees.");
    } catch { setBalance(null); setNotice("Wallet connected, but balance providers did not respond."); }
  }, []);

  const injectedProvider = useCallback((id: string): SolanaProvider | undefined => {
    if (typeof window === "undefined") return undefined;
    if (id === "phantom") return window.phantom?.solana;
    if (id === "backpack") return window.backpack?.solana || window.backpack;
    if (id === "jupiter") return window.jupiter?.solana;
    if (id === "rabby") return window.rabby?.solana || window.rabby;
    if (id === "okx") return window.okxwallet?.solana;
    return undefined;
  }, []);

  const standardWalletFor = useCallback((aliases: readonly string[]) => installedWallets.find((wallet) => aliases.some((alias) => wallet.name.toLowerCase().includes(alias))), [installedWallets]);

  const loadEligibilityPrototype = useCallback((address: string) => {
    setEligibilityAttestation(null);
    setEligibilityChecks(EMPTY_ELIGIBILITY_CHECKS);
    try {
      const saved = JSON.parse(window.localStorage.getItem(ELIGIBILITY_STORAGE_KEY) || "null") as EligibilityAttestation | null;
      if (saved?.version === ELIGIBILITY_ATTESTATION_VERSION && saved.walletAddress === address && !Number.isNaN(Date.parse(saved.acceptedAt))) setEligibilityAttestation(saved);
    } catch { window.localStorage.removeItem(ELIGIBILITY_STORAGE_KEY); }
  }, []);

  const connectWallet = useCallback(async (option: (typeof WALLET_OPTIONS)[number]) => {
    const standardWallet = standardWalletFor(option.aliases);
    const provider = injectedProvider(option.id);
    if (!standardWallet && !provider) { window.open(option.install, "_blank", "noopener,noreferrer"); setNotice(`${option.name} was not detected. Its official setup page is open.`); return; }
    setWalletBusy(true);
    try {
      let address = "";
      if (standardWallet) {
        const feature = standardWallet.features["standard:connect"] as { connect(input?: { silent?: boolean }): Promise<{ accounts: readonly { address: string; chains?: readonly string[] }[] }> } | undefined;
        if (!feature) throw new Error("Wallet does not expose the standard connect feature");
        const result = await feature.connect();
        const account = result.accounts.find((item) => !item.chains || item.chains.some((chain) => chain.startsWith("solana:"))) || result.accounts[0];
        address = account?.address || "";
      } else if (provider) {
        const result = await provider.connect();
        address = result.publicKey?.toString() || provider.publicKey?.toString() || "";
      }
      if (!address) throw new Error("Wallet returned no Solana account");
      loadEligibilityPrototype(address);
      setWalletAddress(address);
      setWalletOpen(false);
      await readWallet(address);
    } catch { setNotice("Wallet connection was cancelled or no Solana account was returned."); }
    finally { setWalletBusy(false); }
  }, [injectedProvider, loadEligibilityPrototype, readWallet, standardWalletFor]);

  const rescanWallets = useCallback(() => {
    setInstalledWallets([...getWallets().get()]);
    setNotice("Wallets rescanned.");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  useEffect(() => {
    const wallets = getWallets();
    const sync = () => setInstalledWallets([...wallets.get()]);
    sync();
    const offRegister = wallets.on("register", sync);
    const offUnregister = wallets.on("unregister", sync);
    return () => { offRegister(); offUnregister(); };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3_000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem("levplay-paper-v3") || "{}") as { cash?: number; positions?: PaperPosition[]; history?: PaperTrade[] };
        if (Number.isFinite(saved.cash) && saved.cash! >= 0) setPaperCash(saved.cash!);
        if (Array.isArray(saved.positions)) setPositions(saved.positions.filter((position) => ["Long", "Short"].includes(position.direction) && Number.isFinite(position.capital) && position.capital > 0 && Number.isFinite(position.costBasis) && position.costBasis >= position.capital));
        if (Array.isArray(saved.history)) setHistory(saved.history);
      } catch { window.localStorage.removeItem("levplay-paper-v3"); }
      paperHydrated.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!paperHydrated.current) return;
    window.localStorage.setItem("levplay-paper-v3", JSON.stringify({ cash: paperCash, positions, history }));
  }, [paperCash, positions, history]);
  useEffect(() => {
    const controller = new AbortController(); const context = document.modelContext; if (!context?.registerTool) return;
    const register = (tool: ModelTool) => Promise.resolve(context.registerTool(tool, { signal: controller.signal })).catch(() => undefined);
    void register({ name: "select_levplay_market", title: "Select market", description: "Select one supported public or pre-IPO reference in the visible LevPlay trade ticket.", inputSchema: { type: "object", properties: { symbol: { type: "string", enum: ALL_MARKETS.map((market) => market.symbol) } }, required: ["symbol"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) { const symbol = String((input as { symbol?: string }).symbol || ""); if (!ALL_MARKETS.some((market) => market.symbol === symbol)) throw new Error("Unsupported market"); setSelectedSymbol(symbol); return { selected: symbol }; } });
    void register({ name: "stage_levplay_position", title: "Stage position", description: "Configure, but never submit, a capped leveraged-token order for review.", inputSchema: { type: "object", properties: { amountUsd: { type: "number", minimum: 10, maximum: 100 }, leverage: { type: "integer", enum: [2, 3, 5] }, direction: { type: "string", enum: ["Long", "Short"] } }, required: ["amountUsd", "leverage", "direction"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) { const value = input as { amountUsd?: number; leverage?: number; direction?: Direction }; if (!value.amountUsd || value.amountUsd < 10 || value.amountUsd > 100 || ![2, 3, 5].includes(value.leverage || 0) || !["Long", "Short"].includes(value.direction || "")) throw new Error("Invalid pilot order"); setAmount(value.amountUsd); setLeverage(value.leverage!); setDirection(value.direction!); setReviewOpen(true); return { staged: true, amountUsd: value.amountUsd, leverage: value.leverage, direction: value.direction, submitted: false }; } });
    return () => controller.abort();
  }, []);

  const visible = useMemo(() => markets.filter((market) => market.category === category && (category !== "Pre-IPO" || market.provider === preIpoProvider) && `${market.ticker} ${market.name}`.toLowerCase().includes(query.toLowerCase())), [markets, category, preIpoProvider, query]);
  const categoryCounts = useMemo(() => ({ Stocks: markets.filter((market) => market.category === "Stocks").length, "Pre-IPO": markets.filter((market) => market.category === "Pre-IPO").length, Commodities: markets.filter((market) => market.category === "Commodities").length }), [markets]);
  const verifiedCount = markets.filter((market) => market.verified).length;
  const displayCount = markets.filter((market) => Boolean(market.price)).length;
  const oracles = selected.oracles || [];
  const review = () => {
    if (!walletAddress && !paperMode) { setNotice("Connect a wallet or use paper preview first."); return; }
    if (!paperMode && !balance) { setNotice("Wallet balances are unavailable. Refresh and try again."); return; }
    if (amount < 10) { setNotice("The minimum pilot order is $10."); return; }
    if (amount > protocol.maxPilotUsd) { setNotice(`The pilot limit is $${protocol.maxPilotUsd}.`); return; }
    if (!paperMode && balance && balance.usdc < totalDebit) { setNotice(`Insufficient USDC. ${totalDebit.toFixed(2)} USDC is required including the fee.`); return; }
    if (paperMode && paperCash < totalDebit) { setNotice(`Insufficient paper USDC. ${totalDebit.toFixed(2)} USDC is required including the fee.`); return; }
    if (!paperMode && balance && balance.sol < 0.002) { setNotice("Insufficient SOL for network fees."); return; }
    setReviewOpen(true);
  };
  const acceptEligibility = () => {
    if (!walletAddress || !Object.values(eligibilityChecks).every(Boolean)) { setNotice("Confirm every eligibility and holder-risk statement before signing."); return; }
    const attestation = { version: ELIGIBILITY_ATTESTATION_VERSION, walletAddress, acceptedAt: new Date().toISOString() };
    window.localStorage.setItem(ELIGIBILITY_STORAGE_KEY, JSON.stringify(attestation));
    setEligibilityAttestation(attestation);
    setEligibilityOpen(false);
    setNotice("Client acknowledgement saved for this wallet and policy version. It is not production eligibility approval.");
  };
  const startPaper = () => { setPaperMode(true); setBalance({ sol: 0.05, usdc: paperCash }); setNotice("Paper preview active. No real funds will move."); };
  const stopPaper = () => { setPaperMode(false); setBalance(null); if (walletAddress) void readWallet(walletAddress); setNotice("Paper preview closed."); setView("trade"); };
  const openPaperPosition = () => {
    const entryPrice = selected.price || 100;
    const id = paperId();
    const openedAt = new Date().toISOString();
    const position: PaperPosition = { id, symbol: selected.symbol, ticker: selected.ticker, name: selected.name, leverage, direction, capital: amount, fee, costBasis: totalDebit, entryPrice, openedAt };
    setPositions((items) => [position, ...items]);
    setPaperCash(paperCash - totalDebit);
    setBalance({ sol: 0.05, usdc: paperCash - totalDebit });
    setHistory((items) => [{ id: paperId(), positionId: id, action: "Buy", productId, amount, fee, price: entryPrice, pnl: 0, at: openedAt }, ...items]);
    setReviewOpen(false); setView("portfolio"); setNotice(`${productId} paper position opened.`);
  };
  const sellPaperPosition = () => {
    if (!exitPosition) return;
    const value = positionValue(exitPosition);
    const pnl = value - exitPosition.costBasis;
    const currentPrice = referenceFor(exitPosition) * (1 + scenarioBps / 10_000);
    setPositions((items) => items.filter((position) => position.id !== exitPosition.id));
    setPaperCash(paperCash + value);
    setBalance({ sol: 0.05, usdc: paperCash + value });
    setHistory((items) => [{ id: paperId(), positionId: exitPosition.id, action: "Sell", productId: `${exitPosition.ticker}${exitPosition.leverage}${exitPosition.direction === "Long" ? "L" : "S"}`, amount: value, fee: 0, price: currentPrice, pnl, at: new Date().toISOString() }, ...items]);
    setExitPosition(null); setNotice(`Position sold for ${formatUsd(value)} paper USDC.`);
  };

  return <main className="app-shell">
    <header className="topbar">
      <Link className="brand" href="/"><LogoMark/><span>LevPlay</span></Link>
      <nav className="app-nav" aria-label="Application"><button className={view === "trade" ? "active" : ""} onClick={() => setView("trade")}><Activity/>Trade</button><button className={view === "portfolio" ? "active" : ""} onClick={() => setView("portfolio")}><BriefcaseBusiness/>Portfolio{positions.length > 0 && <i>{positions.length}</i>}</button><button className={view === "history" ? "active" : ""} onClick={() => setView("history")}><HistoryIcon/>History</button></nav>
      <div className="header-actions"><div className="network-state"><i/><span>{paperMode ? "Paper preview" : "Solana mainnet"}</span></div>{paperMode ? <button className="demo-button active" onClick={stopPaper}><LogOut size={16}/>Exit preview</button> : !walletAddress && <button className="demo-button" onClick={startPaper}><PlayCircle size={16}/>Try demo</button>}<button className={walletAddress ? "wallet-button connected" : "wallet-button"} onClick={() => setWalletOpen(true)} disabled={walletBusy || paperMode}>{walletBusy ? <LoaderCircle className="spin" size={17}/> : <Wallet size={17}/>} {paperMode ? "Preview wallet" : walletAddress ? <><span>{short(walletAddress)}</span><b>{balance ? `${balance.usdc.toFixed(2)} USDC` : "Connected"}</b></> : "Connect wallet"}</button></div>
    </header>

    {notice && <div className="notice" role="status" aria-live="polite"><CircleAlert size={17}/><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss message">×</button></div>}

    {view === "trade" && <><section className="market-hero">
      <div><span className="eyebrow">Public stocks + commodities via Ondo · pre-IPO via PreStocks + Tessera · Pyth-first · Solana</span><h1>Trade leveraged tokens.<br/><em>Not margin accounts.</em></h1></div>
      <div className="hero-metrics"><span><small>Holder liquidation</small><strong>None</strong></span><span><small>Pilot cap</small><strong>$100</strong></span><span><small>Protocol fee</small><strong>0.5%</strong></span></div>
    </section>

    <section className="trading-grid">
      <div className="market-panel">
        <div className="panel-tools">
          <Tabs value={category} onValueChange={(value) => { const next = value as MarketCategory; setCategory(next); const first = markets.find((market) => market.category === next && (next !== "Pre-IPO" || market.provider === preIpoProvider)); if (first) { setSelectedSymbol(first.symbol); if (next === "Pre-IPO") setLeverage(2); } }}><TabsList className="category-tabs"><TabsTrigger value="Stocks"><Landmark size={15}/>US <span>{categoryCounts.Stocks}</span></TabsTrigger><TabsTrigger value="Pre-IPO"><Sparkles size={15}/>Pre-IPO <span>{categoryCounts["Pre-IPO"]}</span></TabsTrigger><TabsTrigger value="Commodities"><Gem size={15}/>Commodities <span>{categoryCounts.Commodities}</span></TabsTrigger></TabsList></Tabs>
          <label className="search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search markets"/></label>
          <button className="refresh" onClick={() => void refresh()} aria-label="Refresh verified market data"><RefreshCw className={loadingMarkets ? "spin" : ""} size={16}/></button>
        </div>
        {category === "Pre-IPO" && <div className="provider-switch" aria-label="Pre-IPO source"><button className={preIpoProvider === "PreStocks" ? "active" : ""} onClick={() => { setPreIpoProvider("PreStocks"); const first = markets.find((market) => market.category === "Pre-IPO" && market.provider === "PreStocks"); if (first) setSelectedSymbol(first.symbol); }}>PreStocks <span>8</span></button><button className={preIpoProvider === "Tessera" ? "active" : ""} onClick={() => { setPreIpoProvider("Tessera"); const first = markets.find((market) => market.category === "Pre-IPO" && market.provider === "Tessera"); if (first) setSelectedSymbol(first.symbol); }}>Tessera <span>2</span></button></div>}
        <div className="table-head"><span>Market</span><span>Reference</span><span>Status</span><span>Feeds</span></div>
        <div className="market-list">
          {visible.map((market) => <button key={market.symbol} className={market.symbol === selectedSymbol ? "market-row selected" : "market-row"} onClick={() => { setSelectedSymbol(market.symbol); if (market.category === "Pre-IPO") setLeverage(2); }}><span className="asset"><AssetLogo market={market}/><span><strong>{market.ticker}</strong><small>{market.name}</small></span></span><strong className="price">{market.price ? formatUsd(market.price) : loadingMarkets ? "Checking…" : market.referenceLabel || "Reference unavailable"}</strong><span className={market.marketOpen ? "session open" : "session"}>{market.referenceStatus === "live" ? "Fresh" : market.referenceStatus === "stale" ? "Stale" : market.referenceStatus === "timestamp_unavailable" ? "No time" : market.category !== "Pre-IPO" ? "Chart" : "Blocked"}</span><span className={market.verified ? "feed verified" : market.price || market.category !== "Pre-IPO" ? "feed display" : "feed blocked"}>{market.verified ? <><Check size={13}/>2/2</> : market.price ? <><Eye size={13}/>Display</> : market.category !== "Pre-IPO" ? <><BarChart3 size={13}/>On select</> : <><LockKeyhole size={13}/>Block</>}</span></button>)}
          {visible.length === 0 && <div className="empty">No matching markets.</div>}
        </div>
        <div className="source-line"><span>{checkedAt ? `Checked ${new Date(checkedAt).toLocaleTimeString()}` : "Checking reference providers"}</span><span><a href="https://docs.ondo.finance/ondo-stocks" target="_blank" rel="noreferrer"><PartnerLogo name="Ondo" domain="ondo.finance"/>Ondo</a><a href="https://prestocks.com/products" target="_blank" rel="noreferrer"><PartnerLogo name="PreStocks" domain="prestocks.com"/>PreStocks</a><a href="https://docs.tessera.pe/overview/how-do-tessera-token-work" target="_blank" rel="noreferrer"><PartnerLogo name="Tessera" domain="tessera.pe"/>Tessera <ExternalLink size={12}/></a></span></div>
      </div>

      <div className="detail-panel">
        <div className="detail-top"><div className="selected-asset"><AssetLogo market={selected} size={58}/><div><small>LevPlay · {selected.category}</small><h2>{selected.ticker}<em>{leverage}{direction === "Long" ? "L" : "S"}</em></h2><p>Liquidation-free holder structure</p></div></div><div className="selected-price"><small>{selected.category === "Pre-IPO" ? `${selected.provider} market reference` : "Underlying Ondo reference"}</small><strong>{selected.price ? formatUsd(selected.price) : selected.referenceLabel || "Reference unavailable"}</strong><span>{selected.referenceLabel || "Checking reference provider"} · settlement {selected.verified ? "ready" : "locked"}</span></div></div>
        <div className="oracle-strip"><span><ShieldCheck size={18}/><span><small>Settlement guard</small><strong>{selected.verified ? "Dual-source ready" : "Fail-closed"}</strong></span></span>{selected.category === "Pre-IPO" ? <span><Eye size={18}/><span><small>Display source</small><strong>{selected.referenceLabel || "Checking provider"}</strong></span></span> : oracles.slice(0, 2).map((oracle) => <span key={oracle.provider}><i className={oracle.provider.toLowerCase()}/><span><small>{oracle.provider}</small><strong>{oracle.feedId ? short(oracle.feedId) : "Unavailable"}</strong></span></span>)}</div>
        <div className="truth-panel" aria-label="Market truth"><span><small>Market state</small><strong className={marketState.toLowerCase()}>{marketState}</strong></span><span><small>Reference use</small><strong>{selected.verified ? "Settlement admitted" : "Display only"}</strong></span><span><small>Source mint</small><strong>{selected.sourceMintVerified ? "Verified onchain" : "Not admitted"}</strong></span><span><small>Backing + hedge</small><strong>{marketConfigured ? "Manifest supplied" : "Not admitted"}</strong></span></div>
        <MarketDecisionChart symbol={selected.symbol} name={selected.name} category={selected.category} onDisplayPrice={applyDisplayPrice}/>
        <div className="curve-card"><div><span className="eyebrow">Outcome preview</span><h3>{leverage}× {direction.toLowerCase()} daily target</h3><p>The vault rebalances exposure; returns compound and will not equal {leverage}× over longer periods.</p></div><ExposureCurve leverage={leverage} direction={direction}/></div>
        <div className="mechanic-grid"><span><Activity size={17}/><small>Rebalance band</small><strong>±10% target drift</strong></span><span><Layers3 size={17}/><small>Underlying</small><strong>{selected.symbol} on Solana</strong></span><span><Zap size={17}/><small>Keeper model</small><strong>Permissionless calls</strong></span></div>
      </div>

      <aside className="trade-ticket">
        <div className="ticket-heading"><div><span>LevPlay token</span><strong>{productId}</strong></div><span className={protocol.executionEnabled ? "live-pill" : "lock-pill"}>{protocol.executionEnabled ? <><Check size={12}/>Live</> : <><LockKeyhole size={12}/>Guarded</>}</span></div>
        <p className="product-boundary">Your position is {productId}; {selected.symbol} is its {selected.provider} stock reference. {selected.provider === "Tessera" && "Issuer marks lack an observation timestamp and cannot settle a LevPlay trade."}</p>
        <div className="ticket-evidence" aria-label="Reference and execution status"><div><span><small>Reference</small><strong>{selected.provider || "Unconfigured"}</strong></span><span><small>Freshness</small><strong>{referenceFreshness}</strong></span><span><small>Session</small><strong>{referenceSession}</strong></span></div>{marketState !== "OPEN" && <p><LockKeyhole size={13}/><span><strong>Trading blocked</strong>{blockedReason}</span></p>}</div>
        <div className="direction"><button className={direction === "Long" ? "active" : ""} onClick={() => setDirection("Long")}>Long</button><button className={direction === "Short" ? "active" : ""} onClick={() => setDirection("Short")}>Short</button></div>
        <div className="field-label"><span>Leverage</span><Info size={14}/></div>
        <div className="leverage-buttons">{(selected.category === "Pre-IPO" ? [2] : [2, 3, 5]).map((value) => <button key={value} className={leverage === value ? "active" : ""} onClick={() => setLeverage(value)}>{value}×</button>)}</div>
        <label className="amount"><span>Position capital</span><div><b>$</b><input value={amount} onChange={(event) => setAmount(Math.min(protocol.maxPilotUsd, Math.max(0, Number(event.target.value))))} inputMode="decimal" aria-label="Position capital in US dollars"/><small>USDC</small></div></label>
        <div className="quick-amounts">{[25, 50, 100].map((value) => <button key={value} onClick={() => setAmount(Math.min(value, protocol.maxPilotUsd))}>${value}</button>)}<button onClick={() => setAmount(maxCapital(paperMode ? paperCash : balance?.usdc || 0))}>Max</button></div>
        {(walletAddress || paperMode) && <div className="wallet-balance"><Wallet size={16}/><span><small>{paperMode ? "Paper balance" : "Available on Solana"}</small><strong>{balance ? `${balance.usdc.toFixed(2)} USDC · ${balance.sol.toFixed(3)} SOL` : "Balance unavailable"}</strong></span></div>}
        <div className="breakdown"><span><small>Position capital</small><strong>{formatUsd(amount)}</strong></span><span><small>LevPlay entry fee · 0.5%</small><strong>{formatUsd(fee)}</strong></span><span><small>Total wallet debit</small><strong>{formatUsd(totalDebit)}</strong></span><span><small>Fee destination</small><strong>{protocol.feeRecipient ? short(protocol.feeRecipient) : "Not configured"}</strong></span><span><small>Target exposure</small><strong>{formatUsd(exposure)}</strong></span><span><small>Managed exposure</small><strong>{formatUsd(managedExposure)}</strong></span></div>
        <button className="review-button" onClick={review}>{walletAddress || paperMode ? "Review order" : "Connect wallet to continue"} <ArrowUpRight size={17}/></button>
        <p className="ticket-risk"><CircleAlert size={14}/>No margin call applies to the holder. The token can lose nearly all value; any displayed floor must be fully funded.</p>
      </aside>
    </section></>}

    {view === "portfolio" && <section className="workspace-page portfolio-page">
      <div className="workspace-heading"><div><span className="eyebrow">Your positions</span><h1>Portfolio</h1><p>{paperMode ? "Paper preview · no real funds" : walletAddress ? `Wallet ${short(walletAddress)}` : "Connect a wallet to view positions"}</p></div><button onClick={() => setView("trade")}>New position <ArrowUpRight size={16}/></button></div>
      <div className="workspace-tabs" aria-label="Position activity"><button className="active" onClick={() => setView("portfolio")}>Open positions ({positions.length})</button><button onClick={() => setView("history")}>Trade history</button></div>
      <div className="portfolio-summary"><span><small>{paperMode ? "Paper equity" : "Open-position value"}</small><strong>{formatUsd(paperMode ? paperEquity : totalValue)}</strong></span><span><small>{paperMode ? "Available cash" : "Capital invested"}</small><strong>{formatUsd(paperMode ? paperCash : totalInvested)}</strong></span><span className={unrealizedPnl >= 0 ? "positive" : "negative"}><small>Unrealized P/L</small><strong>{unrealizedPnl >= 0 ? "+" : ""}{formatUsd(unrealizedPnl)}</strong></span><span className={realizedPnl >= 0 ? "positive" : "negative"}><small>Realized P/L</small><strong>{realizedPnl >= 0 ? "+" : ""}{formatUsd(realizedPnl)}</strong></span><span className={totalPnl >= 0 ? "positive" : "negative"}><small>Total P/L</small><strong>{totalPnl >= 0 ? "+" : ""}{formatUsd(totalPnl)}</strong></span></div>
      {paperMode && <div className="scenario-control"><span><small>Paper market scenario</small><strong>One-period price test · not a multi-day return forecast</strong></span><div>{[-500, 0, 500].map((value) => <button key={value} className={scenarioBps === value ? "active" : ""} onClick={() => setScenarioBps(value)}>{value < 0 ? "−5%" : value > 0 ? "+5%" : "Current"}</button>)}</div></div>}
      <div className="position-list">
        {positions.map((position) => { const value = positionValue(position); const pnl = value - position.costBasis; const pnlPercent = position.costBasis > 0 ? pnl / position.costBasis * 100 : 0; const currentPrice = referenceFor(position) * (1 + scenarioBps / 10_000); const positionMarket = markets.find((market) => market.symbol === position.symbol) || selected; return <article className="position-card" key={position.id}><div className="position-identity"><AssetLogo market={positionMarket}/><span><small>{position.name}</small><strong>{position.ticker}{position.leverage}{position.direction === "Long" ? "L" : "S"}</strong><em>{position.leverage}× {position.direction}</em></span></div><div><small>Entry / current</small><strong>{formatUsd(position.entryPrice)} <i>→</i> {formatUsd(currentPrice)}</strong></div><div><small>Nominal value</small><strong>{formatUsd(value)}</strong></div><div className={pnl >= 0 ? "position-pnl positive" : "position-pnl negative"}>{pnl >= 0 ? <TrendingUp/> : <TrendingDown/>}<span><small>Unrealized P/L</small><strong>{pnl >= 0 ? "+" : ""}{formatUsd(pnl)} <em>({pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)</em></strong></span></div><button onClick={() => paperMode ? setExitPosition(position) : startPaper()}>{paperMode ? "Close" : "Resume preview"}</button></article>; })}
        {positions.length === 0 && <div className="workspace-empty"><BriefcaseBusiness/><h2>No open positions</h2><p>{paperMode ? "Open a paper position to test the complete buy-to-sell flow." : "Connect your wallet when audited LevPlay market tokens are deployed."}</p><button onClick={() => setView("trade")}>Browse markets</button>{!paperMode && !walletAddress && <button className="secondary" onClick={startPaper}>Try paper preview</button>}</div>}
      </div>
    </section>}

    {view === "history" && <section className="workspace-page history-page">
      <div className="workspace-heading"><div><span className="eyebrow">Complete activity</span><h1>Trade history</h1><p>Every entry, exit, fee and realized result in one place.</p></div><button onClick={() => setView("trade")}>Trade <ArrowUpRight size={16}/></button></div>
      <div className="workspace-tabs" aria-label="Position activity"><button onClick={() => setView("portfolio")}>Open positions ({positions.length})</button><button className="active" onClick={() => setView("history")}>Trade history</button></div>
      <div className="history-summary"><span><small>Total trades</small><strong>{history.length}</strong></span><span><small>Open positions</small><strong>{positions.length}</strong></span><span className={realizedPnl >= 0 ? "positive" : "negative"}><small>Total realized P/L</small><strong>{realizedPnl >= 0 ? "+" : ""}{formatUsd(realizedPnl)}</strong></span></div>
      <div className="history-table"><div className="history-head"><span>Trade</span><span>Time</span><span>Reference</span><span>Amount</span><span>Fee</span><span>Realized P/L</span></div>{history.map((trade) => <div className="history-row" key={trade.id}><span><i className={trade.action.toLowerCase()}>{trade.action === "Buy" ? "B" : "S"}</i><span><strong>{trade.action} {trade.productId}</strong><small>Paper preview</small></span></span><span>{new Date(trade.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span><strong>{formatUsd(trade.price)}</strong><strong>{formatUsd(trade.amount)}</strong><span>{formatUsd(trade.fee)}</span><strong className={trade.pnl >= 0 ? "positive" : "negative"}>{trade.action === "Sell" ? `${trade.pnl >= 0 ? "+" : ""}${formatUsd(trade.pnl)}` : "—"}</strong></div>)}{history.length === 0 && <div className="workspace-empty compact"><HistoryIcon/><h2>No trade history</h2><p>Completed paper and future onchain trades will appear here.</p></div>}</div>
    </section>}

    {view === "trade" && <><section className="safety-section" id="security">
      <div><span className="eyebrow">Launch integrity</span><h2>Mainnet stays locked until every proof is onchain.</h2></div>
      <div className="safety-grid"><article><ShieldCheck/><h3>Two independent prices</h3><p>Pyth is primary where an exact feed exists and a separately admitted onchain source must agree inside the configured deviation band. Stale, missing or disputed prices stop mint, redeem and rebalance.</p></article><article><Layers3/><h3>No keeper custody</h3><p>Anyone may call deterministic rebalancing. Vault assets remain in program-derived token accounts; a keeper key cannot withdraw them.</p></article><article><LockKeyhole/><h3>Funded Standby floor</h3><p>Emergency deleveraging removes exposure at the safety floor. The UI may show residual NAV only when isolated USDC actually backs it.</p></article></div>
      <div className="release-bar"><span><i className={protocol.executionEnabled ? "ready" : ""}/><span><small>Current release</small><strong>{protocol.executionEnabled ? "Mainnet gates passed" : "Hackathon preview · signing disabled"}</strong></span></span><button onClick={() => setReviewOpen(true)}>Inspect {protocol.blockers.length} gates <ChevronRight size={15}/></button></div>
      <div className="readiness-checks" aria-label="Mainnet release gates">{protocol.checks.map((check) => <span className={check.passed ? "passed" : "blocked"} key={check.id}>{check.passed ? <Check size={14}/> : <LockKeyhole size={14}/>}<b>{check.label}</b><small>{check.passed ? "Evidence present" : "Required"}</small></span>)}</div>
    </section>

    <section className="docs-section" id="docs">
      <div className="docs-intro"><span className="eyebrow">Protocol brief</span><h2>Understand the position before you play it.</h2><p>LevPlay packages a daily leverage target into a transferable Solana token. The holder never opens a margin account; funded Standby can preserve residual NAV, but it cannot guarantee principal or recovery.</p></div>
      <div className="docs-cards">
        <article id="how-it-works"><BookOpen/><span><small>01 · Mechanics</small><h3>One wallet signature</h3></span><ol><li>Choose a position using USDC already in your wallet.</li><li>One atomic transaction sends position capital to its isolated vault and the 0.5% fee on top to the pinned treasury.</li><li>Vault shares mint from conservative net asset value back to the same wallet.</li><li>Permissionless keepers restore the daily leverage target inside strict bounds.</li><li>Closing burns shares before USDC returns to the same wallet.</li></ol></article>
        <article id="risk"><Scale/><span><small>02 · Risk</small><h3>Liquidation-free, not loss-free</h3></span><p>No creditor can liquidate the holder&apos;s wallet and the holder cannot owe more than invested capital. A funded Standby floor removes exposure and isolates residual collateral; it cannot promise recovery, and an overnight gap can exceed its reserve. Compounding, volatility drag, oracle failure, issuer controls and backing liquidity remain material risks.</p></article>
        <article id="oracles"><ShieldCheck/><span><small>03 · Pricing</small><h3>Pyth-first prices fail closed</h3></span><p>Pyth is primary only where an exact product feed exists and passes owner, freshness and confidence checks; an independently admitted onchain source must also agree. Ondo, PreStocks, Tessera and DEX/API marks are display-only, and Tessera currently supplies no observation timestamp. Missing corroboration, stale prices or mismatched identities stop activity.</p></article>
        <article id="developers"><Code2/><span><small>04 · Build</small><h3>Solana-native controls</h3></span><p>Exact Token-2022 mints, deterministic program accounts, allowlisted adapters, pre/post balance checks and capped slippage define every value-moving instruction. Governance and emergency pause must use separate multisigs; keepers never receive custody.</p></article>
      </div>
      <div className="faq-grid">
        <details><summary>What does daily target mean?</summary><p>The vault aims to restore its leverage each rebalance period. Over several days, compounding means performance can differ materially from leverage multiplied by the underlying&apos;s total return.</p></details>
        <details><summary>Why are some markets blocked?</summary><p>A market stays research-only until its exact mint, two independent settlement feeds, long and short backing routes, capacity, unwind path and audited deployment pass. PreStocks currently adds useful pre-IPO references, but not those missing leverage and oracle proofs.</p></details>
        <details><summary>Can I trade when stocks are closed?</summary><p>Source tokens may trade on secondary venues outside the primary session, but minting, redemption and price formation can differ. LevPlay displays session state and still enforces independent settlement checks.</p></details>
        <details><summary>Who controls the source token?</summary><p>Ondo, PreStocks and Tessera may retain issuer controls. Tessera T-Tokens are loan participation rights rather than equity and include mint, freeze and transfer-fee authorities. LevPlay treats every provider as an external trust boundary, stops new mints on source changes, isolates every product and preserves close-only pro-rata exits.</p></details>
        <details id="treasury"><summary>Where does the 0.5% fee go?</summary><p>The fee applies only when opening a position and is added on top of the chosen capital. In this preview it is calculated for testing but no funds move. Mainnet must send USDC directly to the pinned token account owned by the treasury multisig; both addresses are verified on Solana and displayed before signing.</p></details>
        <details><summary>Who holds the treasury private key?</summary><p>The planned treasury is a program-controlled multisig vault, so the vault itself has no private key. Independent members keep their own hardware-wallet keys and a threshold of approvals is required to move funds.</p></details>
      </div>
    </section></>}

    <footer className="site-footer">
      <div className="footer-brand"><span><LogoMark/>LevPlay</span><p>Liquidation-free leveraged stocks on Solana. Experimental software; not investment advice.</p></div>
      <nav><strong>Protocol</strong><a href="#how-it-works">How it works</a><a href="#oracles">Oracle policy</a><a href="#risk">Risk disclosure</a><a href="#security">Security gates</a></nav>
      <nav><strong>Resources</strong><a href="https://docs.ondo.finance/ondo-stocks" target="_blank" rel="noreferrer">Ondo docs <ExternalLink size={11}/></a><a href="https://solana.com/docs" target="_blank" rel="noreferrer">Solana docs <ExternalLink size={11}/></a><a href="https://hackathons.solana.com/hackathons/stocklana" target="_blank" rel="noreferrer">Stocklana <ExternalLink size={11}/></a></nav>
      <nav><strong>Launch status</strong><span>{protocol.executionEnabled ? "Mainnet gates passed" : "Preview · signing locked"}</span><span>{verifiedCount}/{markets.length} settlement-ready · {displayCount}/{markets.length} display references online</span><span>2×, 3× and 5× · long and short · individually gated</span></nav>
      <div className="footer-legal"><span>© 2026 LevPlay</span><p>Ondo and PreStocks are tokenized economic exposures subject to issuer controls, liquidity risks and jurisdiction restrictions. PreStocks confer no equity ownership rights. Availability does not imply eligibility.</p></div>
    </footer>

    <Dialog open={walletOpen} onOpenChange={setWalletOpen}><DialogContent className="wallet-dialog"><DialogHeader><DialogTitle>Connect a Solana wallet</DialogTitle><DialogDescription>Detected wallets appear first. LevPlay requests your public account only; never enter a seed phrase.</DialogDescription></DialogHeader><div className="wallet-options">{WALLET_OPTIONS.map((option) => { const wallet = standardWalletFor(option.aliases); const detected = Boolean(wallet || injectedProvider(option.id)); return <button key={option.id} className="wallet-option" onClick={() => void connectWallet(option)} disabled={walletBusy}><WalletLogo name={option.name} icon={wallet?.icon} domain={option.domain}/><span><strong>{option.name}</strong><small>{detected ? "Detected on this device" : "Not detected · open official setup"}</small></span><em className={detected ? "detected" : ""}>{detected ? "Connect" : "Get"}</em></button>; })}</div><a className="walletconnect-option" href="https://explorer.walletconnect.com/?type=wallet&chains=solana%3A5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" target="_blank" rel="noreferrer"><WalletLogo name="WalletConnect" domain="walletconnect.network"/><span><strong>Search with WalletConnect</strong><small>Browse compatible wallets, then return and rescan.</small></span><ExternalLink size={16}/></a><button className="rescan-wallets" onClick={rescanWallets}><RotateCw size={15}/>Rescan installed wallets</button><p className="wallet-safety"><ShieldCheck size={14}/>Connecting does not approve a trade or move funds.</p></DialogContent></Dialog>
    <Dialog open={reviewOpen} onOpenChange={setReviewOpen}><DialogContent className="review-dialog"><DialogHeader><DialogTitle>Review {productId}</DialogTitle><DialogDescription>{paperMode ? "Paper preview only. No funds or transactions will move." : "One atomic, wallet-funded leveraged-token position on Solana."}</DialogDescription></DialogHeader><div className="review-asset"><AssetLogo market={selected}/><div><strong>{selected.name} {leverage}× {direction}</strong><small>{selected.symbol} · {selected.category === "Pre-IPO" ? `${selected.provider} research reference` : `${selected.provider} Token-2022 candidate`}</small></div><b>{formatUsd(amount)}</b></div><div className="review-grid"><span><small>Position capital</small><strong>{formatUsd(amount)}</strong></span><span><small>Entry fee · 0.5%</small><strong>{formatUsd(fee)}</strong></span><span><small>Total wallet debit</small><strong>{formatUsd(totalDebit)}</strong></span><span><small>Target exposure</small><strong>{formatUsd(exposure)}</strong></span><span><small>Oracle guard</small><strong>{selected.verified ? "Pyth + independent source" : "Unavailable"}</strong></span><span><small>Pilot limit</small><strong>$100 / wallet</strong></span></div><div className="recipient-row"><small>Fee recipient</small><code>{protocol.feeRecipient || "Not configured"}</code><small>Treasury owner</small><code>{protocol.treasuryAuthority || "Not configured"}</code></div>{paperMode ? <div className="gate-box paper"><PlayCircle/><div><strong>Paper preview</strong><p>This records a local practice position and never submits a Solana transaction.</p></div></div> : <><div className={canExecute ? "gate-box ready" : "gate-box"}>{canExecute ? <ShieldCheck/> : <LockKeyhole/>}<div><strong>{canExecute ? "All release gates passed" : releaseReady && !eligibilityAccepted ? "Eligibility acknowledgement required" : releaseReady ? "Transaction builder unavailable" : "Transaction signing is disabled"}</strong><p>{canExecute ? `Two RPCs verified the program, treasury and ${productId} deployment.` : releaseReady && !eligibilityAccepted ? `Review client policy ${ELIGIBILITY_ATTESTATION_VERSION}; production still requires signed eligibility evidence.` : releaseReady ? "No audited transaction construction or signing handler exists in this release." : (protocol.blockers[0] || (!oracleReady ? "Dual-oracle verification failed." : `${productId} is not an audited deployment.`))}</p></div></div>{!releaseReady && <div className="gate-list">{protocol.blockers.slice(0, 5).map((blocker) => <span key={blocker}><i/>{blocker}</span>)}</div>}<Progress value={canExecute ? 100 : Math.max(12, 100 - protocol.blockers.length * 13)} /></>}<button className="review-button" onClick={paperMode ? openPaperPosition : releaseReady && !eligibilityAccepted ? () => setEligibilityOpen(true) : undefined} disabled={!paperMode && (!releaseReady || eligibilityAccepted)}>{paperMode ? "Open paper position" : releaseReady && !eligibilityAccepted ? "Review eligibility statements" : releaseReady ? "Signing not implemented" : "Mainnet safety lock active"}</button><p className="dialog-note">Liquidation-free describes the holder experience, not risk-free returns. Rebalancing, oracle, liquidity, custody and smart-contract risks remain.</p></DialogContent></Dialog>
    <Dialog open={eligibilityOpen} onOpenChange={setEligibilityOpen}><DialogContent className="eligibility-dialog"><DialogHeader><DialogTitle>Eligibility and holder-risk acknowledgement</DialogTitle><DialogDescription>Client-side prototype for a future real-money flow. Paper preview never requires this acknowledgement.</DialogDescription></DialogHeader><div className="policy-version"><ShieldCheck size={16}/><span><small>Policy version</small><code>{ELIGIBILITY_ATTESTATION_VERSION}</code></span></div><div className="eligibility-checks">{([
      ["adult", "I am at least 18 and legally able to enter this transaction."],
      ["jurisdiction", "I am not a U.S. Person, sanctioned person or located where this product is unlawful; I will not use technology to evade eligibility controls."],
      ["rights", "I understand the reference token may provide economic exposure only and may not confer stock ownership, voting, dividend or information rights."],
      ["loss", "I understand leverage, compounding, gaps, issuer controls and liquidity failures can cause loss of most or all invested capital; liquidation-free does not mean loss-free."],
      ["finality", "I understand wallet signatures and confirmed Solana transactions are final, and this acknowledgement is not investment advice or a suitability assessment."],
    ] as [EligibilityCheck, string][]).map(([id, label]) => <label key={id}><input type="checkbox" checked={eligibilityChecks[id]} onChange={(event) => setEligibilityChecks((checks) => ({ ...checks, [id]: event.target.checked }))}/><span>{label}</span></label>)}</div><div className="eligibility-boundary"><CircleAlert size={15}/><p>This forgeable browser record is a UX prototype, not a security control or legal approval. Production requires a wallet-signed, nonce-bound, expiring attestation verified by an independent eligibility service and enforced by the admitted transaction/onchain boundary.</p></div><button className="review-button" onClick={acceptEligibility} disabled={!walletAddress || !Object.values(eligibilityChecks).every(Boolean)}>Save client acknowledgement</button></DialogContent></Dialog>
    <Dialog open={Boolean(exitPosition)} onOpenChange={(open) => { if (!open) setExitPosition(null); }}><DialogContent className="review-dialog"><DialogHeader><DialogTitle>Sell {exitPosition ? `${exitPosition.ticker}${exitPosition.leverage}${exitPosition.direction === "Long" ? "L" : "S"}` : "position"}</DialogTitle><DialogDescription>Burn the paper position and return simulated USDC to the same wallet.</DialogDescription></DialogHeader>{exitPosition && <><div className="review-grid"><span><small>Total cost paid</small><strong>{formatUsd(exitPosition.costBasis)}</strong></span><span><small>Estimated proceeds</small><strong>{formatUsd(positionValue(exitPosition))}</strong></span><span><small>Entry reference</small><strong>{formatUsd(exitPosition.entryPrice)}</strong></span><span><small>Realized P/L</small><strong className={positionValue(exitPosition) - exitPosition.costBasis >= 0 ? "positive" : "negative"}>{positionValue(exitPosition) - exitPosition.costBasis >= 0 ? "+" : ""}{formatUsd(positionValue(exitPosition) - exitPosition.costBasis)}</strong></span></div><button className="review-button" onClick={sellPaperPosition}>Confirm paper sale</button></>}</DialogContent></Dialog>
  </main>;
}
