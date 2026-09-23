import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BarChart3, Boxes, Check, CircleAlert, Coins, ExternalLink, Layers3, LockKeyhole, RefreshCw, ShieldCheck, Sparkles, Wallet } from "lucide-react";

function LogoMark() { return <span className="logo-mark" aria-hidden="true"><i/><b/></span>; }

const products = [
  { token: "ANTH2L", name: "Anthropic 2× long", tone: "#ff8a3d", move: "+2× daily", logo: "/brands/anth.svg" },
  { token: "ANTH2S", name: "Anthropic 2× short", tone: "#9b4c1c", move: "−2× daily", logo: "/brands/anth.svg" },
  { token: "tOPENAI2L", name: "Tessera OpenAI 2×", tone: "#10a37f", move: "+2× candidate", logo: "/brands/openai.svg" },
];

function BrandIcon({ name, logo, size = 26 }: { name: string; logo: string; size?: number }) { return <Image src={logo} alt={`${name} logo`} width={size} height={size}/>; }

const APP_URL = "https://app.levplay.tech";

export default function LandingPage() {
  return <main className="landing-shell">
    <header className="landing-nav">
      <Link className="brand" href="/"><LogoMark/><span>LevPlay</span></Link>
      <nav aria-label="Homepage"><a href="#why">Why LevPlay</a><a href="#mechanics">How it works</a><Link href="/proof">Proof</Link><a href="#risk">Risk</a></nav>
      <Link className="enter-app compact" href={APP_URL}>Enter app <ArrowRight size={16}/></Link>
    </header>

    <section className="landing-hero">
      <div className="landing-copy">
        <span className="landing-kicker"><Sparkles size={14}/> Solana-native · PreStocks + Tessera</span>
        <h1>Defined risk.<br/><em>Leveraged stocks.</em></h1>
        <p className="hero-boundary">No holder margin account.</p>
        <p>Direct-wallet Solana tokens targeting daily 2× long or short exposure to selected pre-IPO references—with isolated backing and visible risk controls.</p>
        <div className="landing-actions"><Link className="enter-app" href={APP_URL}>Enter app <ArrowRight size={18}/></Link><a className="learn-link" href="#mechanics">See how it works</a></div>
        <div className="hero-disclosure"><CircleAlert size={16}/><span>No margin liquidation. Funded Standby is designed to preserve residual NAV, but principal and recovery are never guaranteed.</span></div>
      </div>
      <div className="token-stage" aria-label="Example LevPlay tokens">
        <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
        {products.map((product, index) => <article key={product.token} className={`token-card token-${index + 1}`}><i style={{ background: product.tone }}><BrandIcon name={product.name} logo={product.logo}/></i><span><small>LevPlay token</small><strong>{product.token}</strong><em>{product.name}</em></span><b>{product.move}</b></article>)}
        <div className="stage-core"><LogoMark/><span>One token.<br/><strong>Managed leverage.</strong></span></div>
      </div>
    </section>

    <section className="ticker-band" aria-label="Product facts"><span>8 PreStocks references</span><i/><span>2 Tessera references</span><i/><span>20 isolated candidates</span><i/><span>2× long and short</span><i/><span>0.5% disclosed entry fee</span></section>

    <section className="landing-section" id="why">
      <div className="section-heading"><span className="eyebrow">Why LevPlay</span><h2>Proof, not promises.</h2><p>A simpler way to take leveraged stock exposure—without hiding how the product is priced, backed or stopped.</p></div>
      <div className="benefit-grid">
        <article><Wallet/><span>01</span><h3>Direct wallet</h3><p>Use wallet USDC and receive a transferable Solana token. No separate LevPlay deposit account.</p></article>
        <article><LockKeyhole/><span>02</span><h3>Defined holder risk</h3><p>No margin call, personal debt or seizure of other wallet assets. Loss is limited to the token purchase.</p></article>
        <article><ShieldCheck/><span>03</span><h3>Visible backing</h3><p>Every market must expose its NAV, collateral, leverage, oracle state and capacity—or remain blocked.</p></article>
      </div>
    </section>

    <section className="landing-section">
      <div className="section-heading"><span className="eyebrow">Built for the gap</span><h2>Pre-IPO exposure meets onchain leverage.</h2><p>Existing products offer tokenized private-market economic exposure without managed leverage, while leveraged trading usually requires margin and liquidations. LevPlay is designed for the space between them.</p></div>
      <div className="benefit-grid">
        <article><Boxes/><span>01</span><h3>One position token</h3><p>Fixed daily-target long or short exposure in an asset held directly in your wallet.</p></article>
        <article><Layers3/><span>02</span><h3>Isolated by market</h3><p>Each product has separate accounting, collateral, capacity and wind-down rules.</p></article>
        <article><RefreshCw/><span>03</span><h3>Fail closed</h3><p>Stale prices, market halts, unsupported corporate actions or missing backing stop new value movement.</p></article>
      </div>
    </section>

    <section className="dark-section" id="mechanics">
      <div className="mechanics-intro"><span className="eyebrow">One simple position</span><h2>Leverage you can inspect.</h2><p>Each market packages a managed daily target into a Solana token. The ticket names the source asset, fee, target, oracle state and settlement status before you act. Provider listings never make a market executable by themselves.</p></div>
      <div className="mechanics-flow">
        <article><span>1</span><Wallet/><h3>Use wallet USDC</h3><p>No LevPlay balance or separate deposit. Choose position capital and review the 0.5% fee added on top.</p></article>
        <article><span>2</span><Coins/><h3>Receive LevPlay tokens</h3><p>The isolated vault mints leveraged-token shares from conservative net asset value.</p></article>
        <article><span>3</span><Layers3/><h3>Vault manages exposure</h3><p>Permissionless keepers rebalance or enter Standby; real reserve collateral—not token decimals—funds any residual floor.</p></article>
        <article><span>4</span><BarChart3/><h3>Close when ready</h3><p>Burn the position token for its available USDC redemption value. Profit or loss is shown before confirmation.</p></article>
      </div>
    </section>

    <section className="landing-section survival-section">
      <div className="survival-number">−99.99%</div>
      <div><span className="eyebrow">Still your position</span><h2>No forced wallet liquidation.</h2><p>A severe adverse move triggers deleveraging. At the funded safety floor, the series enters Standby with zero directional exposure and its remaining collateral stays isolated. The holder is not margin-called and other wallet assets are never seized.</p><div className="survival-note"><CircleAlert size={16}/><span>Standby does not guarantee recovery. Reactivation requires new collateral, valid prices and available backing; an unfunded gap must be disclosed as insolvency.</span></div></div>
    </section>

    <section className="landing-section proof-section">
      <div className="section-heading"><span className="eyebrow">Designed to fail closed</span><h2>Prices must agree before value moves.</h2></div>
      <div className="proof-card"><div><ShieldCheck/><span><small>Settlement policy</small><strong>Pyth-first · two sources</strong></span></div><p>Pyth is primary where an exact feed exists; an independently operated onchain source must also pass freshness, confidence, publisher-count and deviation limits. Provider API and DEX marks are display-only.</p><ul><li><Check/>Issuer halt and Token-2022 pause gates</li><li><Check/>Exact mint, feed and program pinning</li><li><Check/>No invented or server-relayed settlement feeds</li></ul></div>
    </section>

    <section className="landing-section preipo-section">
      <div><span className="eyebrow">Private markets, explicit limits</span><h2>Pre-IPO leverage—verified product by product.</h2><p>LevPlay catalogs eight pinned PreStocks references and two pinned Tessera references. Missing or unverifiable references remain visibly blocked instead of displaying a misleading price.</p></div>
      <div className="preipo-proof"><strong>Why execution is gated</strong><p>PreStocks provide economic exposure without company ownership rights. Tessera T-Tokens are unsecured loan participation rights, not equity. Each LevPlay market remains blocked until two independent settlement feeds, funded 2× long and short routes, capacity and deterministic unwind are proven.</p><span><LockKeyhole size={15}/>Paper flow live · real-money signing evidence-gated</span></div>
    </section>

    <section className="risk-banner" id="risk"><div><span className="eyebrow">The honest boundary</span><h2>No margin call.<br/><em>Not no risk.</em></h2></div><p>The holder cannot owe more than the amount paid, but token NAV can fall toward zero. Daily compounding, overnight gaps, volatility drag, backing liquidity, issuer controls, oracle failures and smart-contract risk remain material. Real-money signing stays locked until every release gate is independently proven.</p><Link className="enter-app light" href={APP_URL}>Try the paper flow <ArrowRight size={17}/></Link></section>

    <footer className="landing-footer"><div><span className="footer-logo"><LogoMark/>LevPlay</span><p>Solana’s proof-first, defined-risk leveraged pre-IPO token layer.</p></div><nav><strong>Product</strong><a href="#why">Why LevPlay</a><a href="#mechanics">How it works</a><a href="#risk">Risks</a><Link href={APP_URL}>Enter app</Link></nav><nav><strong>Protocol</strong><Link href="/proof">Public proof</Link><Link href="/docs">Documentation</Link><Link href="/docs#oracles">Oracle policy</Link><Link href="/docs#security">Security gates</Link><Link href="/docs#treasury">Fee treasury</Link></nav><nav className="brand-links"><strong>Resources</strong><a href="https://prestocks.com/products" target="_blank" rel="noreferrer"><BrandIcon name="PreStocks" logo="/brands/prestocks.svg" size={18}/>PreStocks products <ExternalLink size={11}/></a><a href="https://docs.tessera.pe/overview/how-do-tessera-token-work" target="_blank" rel="noreferrer">Tessera docs <ExternalLink size={11}/></a><a href="https://solana.com/docs" target="_blank" rel="noreferrer"><BrandIcon name="Solana" logo="/brands/solana.svg" size={18}/>Solana docs <ExternalLink size={11}/></a><a href="https://hackathons.solana.com/hackathons/stocklana" target="_blank" rel="noreferrer">Stocklana <ExternalLink size={11}/></a><a href="https://x.com/lev__play" target="_blank" rel="noreferrer">X / @lev__play <ExternalLink size={11}/></a><a href="mailto:info@levplay.tech">info@levplay.tech</a></nav><div className="landing-legal"><span>© 2026 LevPlay</span><p>Experimental software. Not investment advice. Tokenized economic-exposure products are subject to issuer terms and jurisdiction restrictions.</p></div></footer>
  </main>;
}
