import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BarChart3, Boxes, Check, CircleAlert, Coins, ExternalLink, Layers3, LockKeyhole, RefreshCw, ShieldCheck, Sparkles, Wallet } from "lucide-react";

function LogoMark() { return <span className="logo-mark" aria-hidden="true"><i/><b/></span>; }

const products = [
  { token: "AAPL2L", name: "Apple 2×", tone: "#ff8a3d", move: "+2× daily", domain: "apple.com" },
  { token: "AAPL2S", name: "Apple inverse 2×", tone: "#9b4c1c", move: "−2× daily", domain: "apple.com" },
  { token: "OPENAI3L", name: "OpenAI pre-IPO model", tone: "#10a37f", move: "+3× paper", domain: "openai.com" },
];

function BrandIcon({ name, domain, size = 26 }: { name: string; domain: string; size?: number }) { return <Image src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`} alt={`${name} logo`} width={size} height={size} unoptimized/>; }

export default function LandingPage() {
  return <main className="landing-shell">
    <header className="landing-nav">
      <Link className="brand" href="/"><LogoMark/><span>LevPlay</span></Link>
      <nav aria-label="Homepage"><a href="#why">Why LevPlay</a><a href="#mechanics">How it works</a><a href="#risk">Risk</a></nav>
      <Link className="enter-app compact" href="/trade">Enter app <ArrowRight size={16}/></Link>
    </header>

    <section className="landing-hero">
      <div className="landing-copy">
        <span className="landing-kicker"><Sparkles size={14}/> Solana-native · xStocks + PreStocks references</span>
        <h1>Liquidation-Free<br/><em>Leveraged Stocks.</em></h1>
        <p>Explore 2× or 3× daily long and short exposure to public stocks and pre-IPO companies in one self-custodial Solana token—without opening a margin account.</p>
        <div className="landing-actions"><Link className="enter-app" href="/trade">Enter app <ArrowRight size={18}/></Link><a className="learn-link" href="#mechanics">See how it works</a></div>
        <div className="hero-disclosure"><CircleAlert size={16}/><span>No margin liquidation. Funded Standby is designed to preserve residual NAV, but principal and recovery are never guaranteed.</span></div>
      </div>
      <div className="token-stage" aria-label="Example LevPlay tokens">
        <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
        {products.map((product, index) => <article key={product.token} className={`token-card token-${index + 1}`}><i style={{ background: product.tone }}><BrandIcon name={product.name} domain={product.domain}/></i><span><small>LevPlay token</small><strong>{product.token}</strong><em>{product.name}</em></span><b>{product.move}</b></article>)}
        <div className="stage-core"><LogoMark/><span>One token.<br/><strong>Managed leverage.</strong></span></div>
      </div>
    </section>

    <section className="ticker-band" aria-label="Product facts"><span>15 US + 15 Hong Kong stocks</span><i/><span>7 live-priced pre-IPO references</span><i/><span>2× and 3× · Long and short</span><i/><span>0.5% disclosed entry fee</span></section>

    <section className="landing-section" id="why">
      <div className="section-heading"><span className="eyebrow">Why LevPlay</span><h2>Leverage without managing margin.</h2><p>LevPlay turns a managed leverage strategy into a token you can hold in your Solana wallet.</p></div>
      <div className="benefit-grid">
        <article><LockKeyhole/><span>01</span><h3>No holder liquidation</h3><p>No margin call, negative balance or forced sale of other wallet assets. Your loss is bounded by the amount paid for the token.</p></article>
        <article><RefreshCw/><span>02</span><h3>Rebalance, then Standby</h3><p>The vault targets 2× or 3× exposure, deleverages as risk rises, and stops exposure at its funded residual-NAV floor.</p></article>
        <article><Boxes/><span>03</span><h3>Hold the position</h3><p>Your position is a transferable Solana token, not a brokerage margin account. Keep it in your wallet or close it for its available redemption value.</p></article>
      </div>
    </section>

    <section className="dark-section" id="mechanics">
      <div className="mechanics-intro"><span className="eyebrow">One simple position</span><h2>Leveraged stock tokens, made clear.</h2><p>Each LevPlay market packages a managed daily leverage target into a token. xStocks provide US and Hong Kong public-stock references; PreStocks add pre-IPO research references. The ticket shows the exact provider, product, fee, target exposure and settlement status.</p></div>
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
      <div className="proof-card"><div><ShieldCheck/><span><small>Settlement policy</small><strong>Pyth + Chainlink</strong></span></div><p>Freshness, confidence, publisher count and deviation limits are checked before mint, redeem and rebalance. xStocks API quotes are display-only.</p><ul><li><Check/>Issuer halt and Token-2022 pause gates</li><li><Check/>Exact mint and program pinning</li><li><Check/>Separate governance and guardian roles</li></ul></div>
    </section>

    <section className="landing-section preipo-section">
      <div><span className="eyebrow">Private markets, explicit limits</span><h2>Pre-IPO leverage—researched, not presumed.</h2><p>LevPlay includes paper models for currently priced Anthropic, OpenAI, Anduril, Neuralink, Kalshi, Polymarket and SpaceX PreStocks references. Unpriced catalog entries stay hidden instead of displaying a misleading market.</p></div>
      <div className="preipo-proof"><strong>Why execution is locked</strong><p>PreStocks provide bearer tokens tracking private-company economic exposure, not company shares or ownership rights. They may have no guaranteed secondary liquidity and retain administrative controls. A LevPlay market remains blocked until two independent settlement feeds, an audited 2×/3× long route, a separately funded short route, capacity and deterministic unwind are proven.</p><span><LockKeyhole size={15}/>Paper preview available · real-money signing disabled</span></div>
    </section>

    <section className="risk-banner" id="risk"><div><span className="eyebrow">Know the boundary</span><h2>Liquidation-free.<br/><em>Not loss-free.</em></h2></div><p>Daily leverage compounds. Standby preserves value only to the extent its isolated reserve is genuinely funded. Overnight gaps, volatility drag, oracle failures, backing liquidity, issuer controls and smart-contract bugs remain material risks. Real-money signing stays locked until deployed programs and independent audit evidence pass every release gate.</p><Link className="enter-app light" href="/trade">Try the paper flow <ArrowRight size={17}/></Link></section>

    <footer className="landing-footer"><div><span className="footer-logo"><LogoMark/>LevPlay</span><p>Liquidation-free leveraged public-stock and pre-IPO reference tokens on Solana.</p></div><nav><strong>Product</strong><a href="#why">Why LevPlay</a><a href="#mechanics">How it works</a><a href="#risk">Risks</a><Link href="/trade">Enter app</Link></nav><nav><strong>Protocol</strong><Link href="/trade#docs">How it works</Link><Link href="/trade#oracles">Oracle policy</Link><Link href="/trade#security">Security gates</Link><Link href="/trade#treasury">Fee treasury</Link></nav><nav className="brand-links"><strong>Resources</strong><a href="https://docs.xstocks.fi/docs" target="_blank" rel="noreferrer"><BrandIcon name="xStocks" domain="xstocks.fi" size={18}/>xStocks docs <ExternalLink size={11}/></a><a href="https://prestocks.com/products" target="_blank" rel="noreferrer"><BrandIcon name="PreStocks" domain="prestocks.com" size={18}/>PreStocks products <ExternalLink size={11}/></a><a href="https://solana.com/docs" target="_blank" rel="noreferrer"><BrandIcon name="Solana" domain="solana.com" size={18}/>Solana docs <ExternalLink size={11}/></a><a href="https://hackathons.solana.com/hackathons/stocklana" target="_blank" rel="noreferrer">Stocklana <ExternalLink size={11}/></a></nav><div className="landing-legal"><span>© 2026 LevPlay</span><p>Experimental software. Not investment advice. Tokenized securities are subject to issuer terms and jurisdiction restrictions.</p></div></footer>
  </main>;
}
