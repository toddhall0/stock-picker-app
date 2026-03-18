declare module 'yahoo-finance2' {
  interface Quote {
    symbol?: string;
    shortName?: string;
    longName?: string;
    exchange?: string;
    regularMarketPrice?: number;
    regularMarketOpen?: number;
    regularMarketDayHigh?: number;
    regularMarketDayLow?: number;
    regularMarketPreviousClose?: number;
    regularMarketVolume?: number;
    regularMarketChange?: number;
    regularMarketChangePercent?: number;
    averageDailyVolume3Month?: number;
    averageDailyVolume10Day?: number;
    marketCap?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
  }

  interface ChartQuote {
    date: Date;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
  }

  interface ChartResult {
    quotes: ChartQuote[];
  }

  interface ScreenResult {
    quotes: Quote[];
  }

  interface YahooFinance {
    quote(symbol: string): Promise<Quote>;
    chart(symbol: string, options: { period1: Date; interval: string }): Promise<ChartResult>;
    screen(options: { scrIds: string; count: number }): Promise<ScreenResult>;
    setGlobalConfig(config: { validation?: { logErrors?: boolean } }): void;
  }

  const yahooFinance: YahooFinance;
  export default yahooFinance;
}
