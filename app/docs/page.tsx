import Link from "next/link";
import { ArrowRight, CircleAlert, ShieldCheck } from "lucide-react";

const APP_URL = "https://app.levplay.tech";

export const metadata = {
  title: "Documentation · LevPlay",
  description: "LevPlay product, oracle, security and treasury documentation.",
};

export default function DocsPage() {
  return <main className="landing-shell">
    <header className="landing-nav">
      <Link className="brand" href="/"><span className="logo-mark" aria-hidden="true"><i/><b/></span><span>LevPlay</span></Link>
      <nav aria-label="Documentation"><a href="#product">Product</a><a href="#oracles">Oracles</a><a href="#security">Security</a></nav>
      <a className="enter-app compact" href={APP_URL}>Enter app <ArrowRight size={16}/></a>
    </header>
    <section className="landing-section" id="product">
      <div className="section-heading"><span className="eyebrow">LevPlay documentation</span><h1>Proof-first pre-IPO leverage.</h1><p>LevPlay is designed as a defined-risk 2× long/short tokenized pre-IPO layer on Solana. Holders receive a token—not a margin debt account—and can never owe more than they paid.</p></div>
      <div className="benefit-grid">
        <article><span>01</span><h3>Wallet-funded entry</h3><p>Position capital and the disclosed 0.5% entry fee are reviewed before one atomic transaction. Deposits to a LevPlay account are not required.</p></article>
        <article><span>02</span><h3>Isolated risk vault</h3><p>Each market and direction has bounded collateral, capacity and deterministic standby rules. Other wallet assets are never collateral.</p></article>
        <article><span>03</span><h3>Tokenized position</h3><p>Holders receive a Solana token representing NAV. Daily targets compound and can diverge materially from a simple multiple over longer periods.</p></article>
      </div>
    </section>
    <section className="landing-section" id="difference">
      <div className="section-heading"><span className="eyebrow">The LevPlay difference</span><h2>Built between pre-IPO tokens and margin trading.</h2><p>PreStocks and Tessera provide private-market economic-exposure instruments. Perpetual venues provide leverage through collateral accounts and liquidation engines. LevPlay is designed to package managed daily 2× leverage into a directly held token with isolated, inspectable backing.</p></div>
      <div className="benefit-grid">
        <article><span>01</span><h3>No holder margin call</h3><p>No personal debt, collateral top-up or seizure of unrelated wallet assets. Token NAV can still fall toward zero.</p></article>
        <article><span>02</span><h3>Product-level isolation</h3><p>Long and short markets require separate collateral, capacity, accounting and deterministic wind-down rules.</p></article>
        <article><span>03</span><h3>Public proof surface</h3><p>NAV, supply, collateral, effective leverage, oracle health, program identity and release evidence must be independently verifiable.</p></article>
      </div>
    </section>
    <section className="dark-section" id="oracles">
      <div className="mechanics-intro"><span className="eyebrow">Oracle policy</span><h2>Display is not settlement.</h2><p>Provider APIs and DEX marks may explain a market, but cannot authorize mint, redeem or rebalance. Settlement is designed to require native Pyth data plus an independent onchain source, exact identity pinning, freshness, confidence, publisher-count, timestamp-skew and deviation checks. Market halts and unsupported corporate actions lock value movement.</p></div>
    </section>
    <section className="landing-section" id="security">
      <div className="section-heading"><span className="eyebrow">Security gates</span><h2>Blocked until proven.</h2><p>Execution remains disabled until deployed program identities, immutable V2 product configuration, vault-balance and token-supply reconciliation, independent audit evidence, RPC quorum, funded backing, operational monitoring and legal eligibility gates all pass.</p></div>
      <div className="proof-card"><div><ShieldCheck/><span><small>Current release posture</small><strong>Signing locked</strong></span></div><p>A functioning preview is not evidence that real-money settlement is safe. The app exposes missing provider or oracle evidence instead of substituting a price.</p></div>
    </section>
    <section className="landing-section" id="treasury">
      <div className="section-heading"><span className="eyebrow">Fee treasury</span><h2>0.5% on entry capital.</h2><p>The fee is charged when a position is opened—not when a wallet connects and not as a deposit fee. Production requires a disclosed treasury address controlled by a separate multisig; placeholder recipients cannot unlock execution.</p></div>
      <div className="hero-disclosure"><CircleAlert size={16}/><span>“No holder margin call” describes the non-recourse holder structure. It does not guarantee non-zero NAV, backing solvency or recovery.</span></div>
    </section>
    <footer className="landing-footer"><div><strong>LevPlay</strong><p>Solana’s proof-first, defined-risk leveraged pre-IPO token layer.</p></div><nav><strong>Contact</strong><a href="mailto:info@levplay.tech">info@levplay.tech</a><a href="https://x.com/lev__play" target="_blank" rel="noreferrer">X / @lev__play</a></nav><nav><strong>Links</strong><Link href="/">Homepage</Link><a href={APP_URL}>Trading app</a><a href="https://prestocks.com/products" target="_blank" rel="noreferrer">PreStocks</a><a href="https://docs.tessera.pe/overview/how-do-tessera-token-work" target="_blank" rel="noreferrer">Tessera</a></nav><div className="landing-legal"><span>© 2026 LevPlay</span><p>Experimental software. Not investment advice. Availability is jurisdiction-dependent.</p></div></footer>
  </main>;
}
