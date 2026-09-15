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
  { symbol: "GLDx", ticker: "GLD", name: "Gold", category: "Commodities", tone: "#d8a73e", mint: "Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re" },
  { symbol: "SLVx", ticker: "SLV", name: "Silver", category: "Commodities", tone: "#a9b3bf", mint: "XsxAd6okt8y1RRK6gNg7iJaqiWNiq5Md5EDf3ZrF2dm" },
  { symbol: "PPLTx", ticker: "PPLT", name: "Platinum", category: "Commodities", tone: "#c9d3dc", mint: "Xst6eFD4YT6sz9RLMysN9SyvaZWtraSdVJQGu5ZkAme" },
  { symbol: "GDXx", ticker: "GDX", name: "Gold miners", category: "Commodities", tone: "#c78936", mint: "XsVRhRg9eRE9PrsoPsAt5Mifa8mfjm9R3vdw6orp54j" },
  { symbol: "COPXx", ticker: "COPX", name: "Copper miners", category: "Commodities", tone: "#bc704c", mint: "XsybfiKkD4UmjkAGT2uR8X2sq9AWFtvGJM2KTffoALZ" },
] as const;

export type MarketSymbol = (typeof CURATED_MARKETS)[number]["symbol"];
export type MarketCategory = (typeof CURATED_MARKETS)[number]["category"];

export const XSTOCKS_API = "https://api.xstocks.fi/api/v2";
export const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
