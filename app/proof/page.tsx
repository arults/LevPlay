import Link from "next/link";
import { ArrowLeft, Check, CircleAlert, ExternalLink, LockKeyhole, ShieldCheck } from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_LEVPLAY_APP_URL || "/trade";

const evidence = [
  { title: "Application", state: "PASS", detail: "Responsive wallet, paper trade, portfolio, P/L, close and history flows are deployed.", proof: "GitHub quality workflow" },
  { title: "Reference data", state: "PASS", detail: "Ondo, PreStocks and Tessera marks are isolated as display-only and cannot authorize value movement.", proof: "REFERENCE_DATA_POLICY.md" },
  { title: "Settlement oracles", state: "LOCKED", detail: "Exact Pyth plus an independently operated onchain source is required per market. No market currently has two admitted feeds.", proof: "ORACLE_ARCHITECTURE.md" },
  { title: "Solana program", state: "LOCKED", detail: "The reproducible SBF boundary is execution-locked. Final value-moving handlers and deployment are not complete.", proof: "programs/levplay-sbf" },
  { title: "Backing and reserve", state: "LOCKED", detail: "Risk Vault economics are modeled, but no production venue capacity, short hedge or funded Standby reserve is admitted.", proof: "RISK_VAULT_V1.md" },
  { title: "Independent audit", state: "LOCKED", detail: "Internal engineering review exists. A Solana specialist audit, economic review and retest are still required.", proof: "SECURITY_AUDIT.md" },
] as const;

export default function ProofPage() {
  return <main className="proof-page">
    <header className="proof-nav"><Link href="/"><ArrowLeft size={16}/>LevPlay</Link><div><Link href="/docs">Docs</Link><a href={APP_URL}>Open app</a></div></header>
    <section className="proof-hero"><span>PUBLIC RELEASE EVIDENCE</span><h1>Proof, not promises.</h1><p>LevPlay separates working product evidence from future protocol claims. A green website deployment never unlocks real-money signing by itself.</p><div className="proof-release"><LockKeyhole/><span><small>Current release state</small><strong>Demo ready · real-money execution locked</strong></span></div></section>
    <section className="proof-grid" aria-label="LevPlay release evidence">{evidence.map((item) => <article key={item.title} className={item.state === "PASS" ? "passed" : "locked"}><div>{item.state === "PASS" ? <Check/> : <LockKeyhole/>}<span>{item.state}</span></div><h2>{item.title}</h2><p>{item.detail}</p><code>{item.proof}</code></article>)}</section>
    <section className="proof-policy"><div><ShieldCheck/><span><small>Release rule</small><strong>Every critical gate binds to one frozen release hash.</strong></span></div><p>Missing collateral, oracle, program, multisig, legal or audit evidence fails closed. Configuration placeholders and screenshots do not count.</p><ul><li>15 public-stock references</li><li>5 commodity-linked references</li><li>8 PreStocks audit references</li><li>2 Tessera paper references</li></ul></section>
    <section className="proof-links"><div><CircleAlert/><p>“Liquidation-free” describes the holder: no margin call, personal debt or seizure of other wallet assets. LevPlay tokens can still lose most or all of their NAV.</p></div><nav><a href="https://github.com/arults/LevPlay" target="_blank" rel="noreferrer">Public source <ExternalLink/></a><Link href="/docs">Protocol documentation</Link><a href="mailto:info@levplay.tech">info@levplay.tech</a></nav></section>
  </main>;
}
