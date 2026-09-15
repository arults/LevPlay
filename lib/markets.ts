export const CURATED_MARKETS = [
  { symbol: "AAPLx", ticker: "AAPL", name: "Apple", category: "Stocks", tone: "#ff8a3d", mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp" },
  { symbol: "MSFTx", ticker: "MSFT", name: "Microsoft", category: "Stocks", tone: "#60a5fa", mint: "XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX" },
  { symbol: "NVDAx", ticker: "NVDA", name: "NVIDIA", category: "Stocks", tone: "#9bd347", mint: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh" },
  { symbol: "GOOGLx", ticker: "GOOGL", name: "Alphabet", category: "Stocks", tone: "#f5c451", mint: "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN" },
  { symbol: "AMZNx", ticker: "AMZN", name: "Amazon", category: "Stocks", tone: "#f59e0b", mint: "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg" },
  { symbol: "METAx", ticker: "META", name: "Meta", category: "Stocks", tone: "#7c8cff", mint: "Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu" },
  { symbol: "TSLAx", ticker: "TSLA", name: "Tesla", category: "Stocks", tone: "#ef6b5b", mint: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB" },
  { symbol: "MSTRx", ticker: "MSTR", name: "MicroStrategy", category: "Stocks", tone: "#b9a897", mint: "XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ" },
  { symbol: "COINx", ticker: "COIN", name: "Coinbase", category: "Stocks", tone: "#688cff", mint: "Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu" },
  { symbol: "HOODx", ticker: "HOOD", name: "Robinhood", category: "Stocks", tone: "#62d091", mint: "XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg" },
  { symbol: "NFLXx", ticker: "NFLX", name: "Netflix", category: "Stocks", tone: "#e50914", mint: "XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL" },
  { symbol: "AMDx", ticker: "AMD", name: "AMD", category: "Stocks", tone: "#ed1c24", mint: "XsXcJ6GZ9kVnjqGsjBnktRcuwMBmvKWh8S93RefZ1rF" },
  { symbol: "AVGOx", ticker: "AVGO", name: "Broadcom", category: "Stocks", tone: "#cc1f36", mint: "XsgSaSvNSqLTtFuyWPBhK9196Xb9Bbdyjj4fH3cPJGo" },
  { symbol: "JPMx", ticker: "JPM", name: "JPMorgan Chase", category: "Stocks", tone: "#246eb9", mint: "XsMAqkcKsUewDrzVkait4e5u4y8REgtyS7jWgCpLV2C" },
  { symbol: "PLTRx", ticker: "PLTR", name: "Palantir", category: "Stocks", tone: "#595959", mint: "XsoBhf2ufR8fTyNSjqfU71DYGaE6Z3SUGAidpzriAA4" },
  { symbol: "GLDx", ticker: "GLD", name: "Gold", category: "Commodities", tone: "#d8a73e", mint: "Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re" },
  { symbol: "SLVx", ticker: "SLV", name: "Silver", category: "Commodities", tone: "#a9b3bf", mint: "XsxAd6okt8y1RRK6gNg7iJaqiWNiq5Md5EDf3ZrF2dm" },
  { symbol: "PPLTx", ticker: "PPLT", name: "Platinum", category: "Commodities", tone: "#c9d3dc", mint: "Xst6eFD4YT6sz9RLMysN9SyvaZWtraSdVJQGu5ZkAme" },
  { symbol: "GDXx", ticker: "GDX", name: "Gold miners", category: "Commodities", tone: "#c78936", mint: "XsVRhRg9eRE9PrsoPsAt5Mifa8mfjm9R3vdw6orp54j" },
  { symbol: "COPXx", ticker: "COPX", name: "Copper miners", category: "Commodities", tone: "#bc704c", mint: "XsybfiKkD4UmjkAGT2uR8X2sq9AWFtvGJM2KTffoALZ" },
] as const;

export const PREIPO_MARKETS = [
  { symbol: "ANTHROPIC", ticker: "ANTH", name: "Anthropic", category: "Pre-IPO", tone: "#d97757", mint: "Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw" },
  { symbol: "OPENAI", ticker: "OPENAI", name: "OpenAI", category: "Pre-IPO", tone: "#10a37f", mint: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF" },
  { symbol: "ANDURIL", ticker: "ANDURIL", name: "Anduril", category: "Pre-IPO", tone: "#83745f", mint: "PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB" },
  { symbol: "NEURALINK", ticker: "NEURAL", name: "Neuralink", category: "Pre-IPO", tone: "#8b5cf6", mint: "PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S" },
  { symbol: "KALSHI", ticker: "KALSHI", name: "Kalshi", category: "Pre-IPO", tone: "#0ca678", mint: "PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua" },
  { symbol: "POLYMARKET", ticker: "POLY", name: "Polymarket", category: "Pre-IPO", tone: "#4c6fff", mint: "Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP" },
  { symbol: "SPACEX", ticker: "SPACEX", name: "SpaceX", category: "Pre-IPO", tone: "#69727d", mint: "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh" },
] as const;

export const ALL_MARKETS = [...CURATED_MARKETS, ...PREIPO_MARKETS] as const;

export type MarketSymbol = (typeof CURATED_MARKETS)[number]["symbol"];
export type MarketCategory = (typeof ALL_MARKETS)[number]["category"];

export const XSTOCKS_API = "https://api.xstocks.fi/api/v2";
export const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
