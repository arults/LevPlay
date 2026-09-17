const market = (symbol: string, ticker: string, name: string, category: "Stocks" | "Commodities", tone: string, mint = "") => ({
  symbol, ticker, name, category, tone, mint, provider: "Ondo" as const,
  logo: `/brands/${ticker.toLowerCase()}.svg`,
});

export const CURATED_MARKETS = [
  market("AAPLon", "AAPL", "Apple", "Stocks", "#ff8a3d", "123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo"),
  market("MSFTon", "MSFT", "Microsoft", "Stocks", "#60a5fa"),
  market("NVDAon", "NVDA", "NVIDIA", "Stocks", "#9bd347"),
  market("GOOGLon", "GOOGL", "Alphabet", "Stocks", "#f5c451"),
  market("AMZNon", "AMZN", "Amazon", "Stocks", "#f59e0b"),
  market("TSLAon", "TSLA", "Tesla", "Stocks", "#ef6b5b"),
  market("AMDon", "AMD", "AMD", "Stocks", "#ed1c24"),
  market("NFLXon", "NFLX", "Netflix", "Stocks", "#e50914"),
  market("SPYon", "SPY", "SPDR S&P 500 ETF", "Stocks", "#3b82f6"),
  market("DISon", "DIS", "Disney", "Stocks", "#2563eb"),
  market("UBERon", "UBER", "Uber", "Stocks", "#111827"),
  market("HOODon", "HOOD", "Robinhood", "Stocks", "#62d091"),
  market("SOFIon", "SOFI", "SoFi", "Stocks", "#00a2c7"),
  market("ORCLon", "ORCL", "Oracle", "Stocks", "#c74634"),
  market("QQQon", "QQQ", "Invesco QQQ", "Stocks", "#7c3aed"),
  market("GLDon", "GLD", "Gold ETF", "Commodities", "#d8a73e"),
  market("SLVon", "SLV", "Silver ETF", "Commodities", "#a9b3bf"),
  market("PPLTon", "PPLT", "Platinum ETF", "Commodities", "#c9d3dc"),
  market("USOon", "USO", "Oil ETF", "Commodities", "#7c5a3c"),
  market("COPXon", "COPX", "Copper Miners ETF", "Commodities", "#bc704c"),
] as const;

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

export const ALL_MARKETS = [...CURATED_MARKETS, ...PREIPO_MARKETS] as const;
export type MarketSymbol = (typeof CURATED_MARKETS)[number]["symbol"];
export type MarketCategory = (typeof ALL_MARKETS)[number]["category"];

export const ONDO_API = "https://api.gm.ondo.finance/v1";
export const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
