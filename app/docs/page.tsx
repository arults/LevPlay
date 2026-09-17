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
      <div className="section-heading"><span className="eyebrow">LevPlay documentation</span><h1>How the protocol is designed.</h1><p>LevPlay packages isolated, fully collateralized managed leverage into Solana tokens. It does not create a margin debt account for the holder.</p></div>
      <div className="benefit-grid">
        <article><span>01</span><h3>Wallet-funded entry</h3><p>Position capital and the disclosed 0.5% entry fee are reviewed before one atomic transaction. Deposits to a LevPlay account are not required.</p></article>
        <article><span>02</span><h3>Isolated risk vault</h3><p>Each market and direction has bounded collateral, capacity and deterministic standby rules. Other wallet assets are never collateral.</p></article>
        <article><span>03</span><h3>Tokenized position</h3><p>Holders receive a Solana token representing NAV. Daily targets compound and can diverge materially from a simple multiple over longer periods.</p></article>
      </div>
    </section>
    <section className="dark-section" id="oracles">
      <div className="mechanics-intro"><span className="eyebrow">Oracle policy</span><h2>Display is not settlement.</h2><p>Ondo API and PreStocks DEX data may explain a market, but cannot authorize mint, redeem or rebalance. Settlement requires two independently admitted onchain sources, exact feed and owner pinning, freshness, confidence, publisher-count and deviation checks. Failure of any required check locks value movement.</p></div>
    </section>
    <section className="landing-section" id="security">
      <div className="section-heading"><span className="eyebrow">Security gates</span><h2>Fail closed by default.</h2><p>Execution remains disabled until deployed program identities, immutable product configuration, independent audit evidence, RPC quorum, funded backing, operational monitoring and legal eligibility gates all pass.</p></div>
      <div className="proof-card"><div><ShieldCheck/><span><small>Current release posture</small><strong>Signing locked</strong></span></div><p>A functioning preview is not evidence that real-money settlement is safe. The app exposes missing provider or oracle evidence instead of substituting a price.</p></div>
    </section>
    <section className="landing-section" id="treasury">
      <div className="section-heading"><span className="eyebrow">Fee treasury</span><h2>0.5% on entry capital.</h2><p>The fee is charged when a position is opened—not when a wallet connects and not as a deposit fee. Production requires a disclosed treasury address controlled by a separate multisig; placeholder recipients cannot unlock execution.</p></div>
      <div className="hero-disclosure"><CircleAlert size={16}/><span>Liquidation-free describes the holder structure. Principal, NAV floors and recovery are not guaranteed.</span></div>
    </section>
    <footer className="landing-footer"><div><strong>LevPlay</strong><p>Liquidation-free leveraged stock infrastructure on Solana.</p></div><nav><strong>Contact</strong><a href="mailto:info@levplay.tech">info@levplay.tech</a><a href="https://x.com/lev__play" target="_blank" rel="noreferrer">X / @lev__play</a></nav><nav><strong>Links</strong><Link href="/">Homepage</Link><a href={APP_URL}>Trading app</a></nav><div className="landing-legal"><span>© 2026 LevPlay</span><p>Experimental software. Not investment advice. Availability is jurisdiction-dependent.</p></div></footer>
  </main>;
}
