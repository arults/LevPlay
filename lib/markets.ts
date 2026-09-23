export const PREIPO_MARKETS = [
  { symbol: "ANTHROPIC", ticker: "ANTH", name: "Anthropic", category: "Pre-IPO", tone: "#d97757", mint: "Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw", provider: "PreStocks", logo: "/brands/anth.svg" },
  { symbol: "OPENAI", ticker: "OPENAI", name: "OpenAI", category: "Pre-IPO", tone: "#10a37f", mint: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF", provider: "PreStocks", logo: "/brands/openai.svg" },
  { symbol: "ANDURIL", ticker: "ANDURIL", name: "Anduril", category: "Pre-IPO", tone: "#83745f", mint: "PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB", provider: "PreStocks", logo: "/brands/anduril.svg" },
  { symbol: "NEURALINK", ticker: "NEURAL", name: "Neuralink", category: "Pre-IPO", tone: "#8b5cf6", mint: "PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S", provider: "PreStocks", logo: "/brands/neural.svg" },
  { symbol: "FIGUREAI", ticker: "FIGURE", name: "Figure AI", category: "Pre-IPO", tone: "#2563eb", mint: "PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd", provider: "PreStocks", logo: "/brands/figure.svg" },
  { symbol: "KALSHI", ticker: "KALSHI", name: "Kalshi", category: "Pre-IPO", tone: "#0ca678", mint: "PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua", provider: "PreStocks", logo: "/brands/kalshi.svg" },
  { symbol: "POLYMARKET", ticker: "POLY", name: "Polymarket", category: "Pre-IPO", tone: "#4c6fff", mint: "Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP", provider: "PreStocks", logo: "/brands/poly.svg" },
  { symbol: "SPACEX", ticker: "SPACEX", name: "SpaceX", category: "Pre-IPO", tone: "#69727d", mint: "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh", provider: "PreStocks", logo: "/brands/spacex.svg" },
] as const;

// Pinned from Tessera's public token-details API and verified against the
// Token-2022 metadata stored on Solana. These are issuer tokens, not LevPlay
// products; LevPlay's 2x long/short candidates remain paper-only until their
// backing, settlement-oracle and audit gates pass.
export const TESSERA_MARKETS = [
  { symbol: "TESSERA_OPENAI", ticker: "tOPENAI", name: "OpenAI · Tessera", category: "Pre-IPO", tone: "#10a37f", mint: "oPAiAikWTaFj9RYoRFD35ccfwhnMcB3ThgBZRHSkjTZ", provider: "Tessera", logo: "/brands/openai.svg" },
  { symbol: "TESSERA_KALSHI", ticker: "tKALSHI", name: "Kalshi · Tessera", category: "Pre-IPO", tone: "#0ca678", mint: "TKLSidmLVt3cqGaaodG8tyRzoANfQwoh67AccjmubeZ", provider: "Tessera", logo: "/brands/kalshi.svg" },
] as const;

export const ALL_MARKETS = [...PREIPO_MARKETS, ...TESSERA_MARKETS] as const;
export type MarketSymbol = (typeof ALL_MARKETS)[number]["symbol"];
export type MarketCategory = (typeof ALL_MARKETS)[number]["category"];

export const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
