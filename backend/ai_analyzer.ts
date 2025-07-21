import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config({ path: path.resolve(__dirname, '/home/trendpup/trendpup/.env') });

const TWEETS_FILE = 'tweets.json';
export const OUTPUT_FILE = 'ai_analyzer.json';
export const SOLANA_TOKENS = 'solana_tokens.json';
const IO_INTELLIGENCE_API_KEY = process.env.IOINTEL_API_KEY || '';

const ioClient = new OpenAI({
  apiKey: IO_INTELLIGENCE_API_KEY,
  baseURL: 'https://api.intelligence.io.solutions/api/v1/',
});

let lastTokensModified = 0;
let isAnalyzerRunning = false;
let analysisSessionId = 0;
const MARKET_DATA_UPDATE_INTERVAL = 10000; // 10 seconds
let isMarketDataSyncing = false;
let marketDataSyncInterval: NodeJS.Timeout | null = null;
const RATE_LIMIT_DELAY = 12000; // 12 seconds between API calls
const RETRY_DELAY = 30000; // 30 seconds on rate limit
const MAX_RETRIES = 3;
interface SimplifiedTokenAnalysis {
  symbol: string;
  symbol1?: string;
  risk: number;                    // 1-10 (10 = highest risk RELATIVE TO OTHER MEMECOINS)
  investmentPotential: number;     // 1-10 (10 = highest potential)
  rationale: string;
  
  price: number;
  volume: string;
  marketCap: string;
  change24h: number;
  age: string;
  href: string;
  
  lastAnalyzed: string;
  rawRiskScore?: number;
}

async function syncMarketDataToAnalyzer(): Promise<void> {
  if (isMarketDataSyncing) {
    return;
  }
  
  isMarketDataSyncing = true;
  
  try {
    if (!fs.existsSync(SOLANA_TOKENS)) {
      return;
    }
    const freshTokenData = JSON.parse(fs.readFileSync(SOLANA_TOKENS, 'utf8'));
    if (!fs.existsSync(OUTPUT_FILE)) {
      return;
    }
    const analysisData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    if (!analysisData.results || !Array.isArray(analysisData.results)) {
      return;
    }

    let updatedCount = 0;
    analysisData.results = analysisData.results.map((result: any) => {
      const freshTokenInfo = freshTokenData.tokens?.find((t: any) => t.symbol === result.symbol);
      
      if (freshTokenInfo) {
        const parsePrice = (priceStr: string): number => {
          const cleaned = priceStr.replace(/,/g, '').replace(/[^\d.-]/g, '');
          const price = parseFloat(cleaned);
          return isNaN(price) ? 0 : price;
        };
        
        const parseChange = (changeStr: string): number => {
          if (changeStr === 'N/A' || !changeStr) return 0;
          const cleaned = changeStr.replace(/[^\d.-]/g, '');
          const change = parseFloat(cleaned);
          return isNaN(change) ? 0 : change;
        };
        
        const updatedResult = {
          ...result,
          price: freshTokenInfo.price ? parsePrice(freshTokenInfo.price) : result.price,
          volume: freshTokenInfo.volume || result.volume,
          marketCap: freshTokenInfo.mcap || result.marketCap,
          change24h: freshTokenInfo['change-24h'] ? parseChange(freshTokenInfo['change-24h']) : result.change24h,
          age: freshTokenInfo.age || result.age,
          href: freshTokenInfo.href || result.href,
          risk: result.risk,
          potential: result.potential,
        };
        
        updatedCount++;
        return updatedResult;
      }
      
      return result;
    });
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(analysisData, null, 2));
    if (updatedCount > 0) {
      console.log(`Market data synced: ${updatedCount} tokens updated in ai_analyzer.json`);
    }
  } catch (error) {
    console.error('Error syncing market data to analyzer:', error);
  } finally {
    isMarketDataSyncing = false;
  }
}

function startMarketDataSync(): void {
  syncMarketDataToAnalyzer();
  marketDataSyncInterval = setInterval(() => {
    syncMarketDataToAnalyzer();
  }, MARKET_DATA_UPDATE_INTERVAL);
}

function stopMarketDataSync(): void {
  if (marketDataSyncInterval) {
    clearInterval(marketDataSyncInterval);
    marketDataSyncInterval = null;
  }
}

async function rateLimitedDelay(retryCount: number = 0): Promise<void> {
  const delay = retryCount > 0 ? RETRY_DELAY * Math.pow(2, retryCount - 1) : RATE_LIMIT_DELAY;
  console.log(`Rate limit delay: ${delay}ms`);
  await new Promise(res => setTimeout(res, delay));
}

function parseNumericValue(valueStr: string): number {
  if (!valueStr || valueStr === 'N/A' || valueStr === '-') return 0;
  
  const cleaned = valueStr.toLowerCase().replace(/[,$\s]/g, '');
  let multiplier = 1;
  
  if (cleaned.includes('k')) {
    multiplier = 1000;
  } else if (cleaned.includes('m')) {
    multiplier = 1000000;
  } else if (cleaned.includes('b')) {
    multiplier = 1000000000;
  }
  
  const numStr = cleaned.replace(/[kmb]/g, '');
  const num = parseFloat(numStr);
  
  return isNaN(num) ? 0 : num * multiplier;
}

function parseAge(ageStr: string): number {
  if (!ageStr || ageStr === 'N/A') return Number.MAX_SAFE_INTEGER;
  const match = ageStr.match(/(\d+)(mo|[smhdy])/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    case 'mo': return value * 2592000;
    case 'y': return value * 31536000;
    default: return Number.MAX_SAFE_INTEGER;
  }
}

function calculateMemecoinRiskFactors(tokenInfo: any): {
  liquidityRisk: number,
  volatilityRisk: number,
  ageRisk: number,
  volumeRisk: number,
  totalRawRisk: number
} {
  const liquidity = parseNumericValue(tokenInfo.liquidity || '0');
  const volume = parseNumericValue(tokenInfo.volume || '0');
  const age = parseAge(tokenInfo.age || '1d');
  const change24h = Math.abs(parseFloat(tokenInfo['change-24h']?.replace(/[^\d.-]/g, '') || '0'));
  
  let liquidityRisk = 0;
  if (liquidity < 5000) liquidityRisk = 5;
  else if (liquidity < 20000) liquidityRisk = 4;
  else if (liquidity < 50000) liquidityRisk = 3;
  else if (liquidity < 100000) liquidityRisk = 2;
  else if (liquidity < 500000) liquidityRisk = 1;
  
  let volatilityRisk = 0;
  if (change24h > 500) volatilityRisk = 5;
  else if (change24h > 200) volatilityRisk = 4;
  else if (change24h > 100) volatilityRisk = 3;
  else if (change24h > 50) volatilityRisk = 2;
  else if (change24h > 20) volatilityRisk = 1;
  
  let ageRisk = 0;
  const ageInHours = age / 3600;
  if (ageInHours < 1) ageRisk = 5;
  else if (ageInHours < 6) ageRisk = 4;
  else if (ageInHours < 24) ageRisk = 3;
  else if (ageInHours < 168) ageRisk = 2; // 1 week
  else if (ageInHours < 720) ageRisk = 1; // 1 month
  
  let volumeRisk = 0;
  if (volume < 1000) volumeRisk = 5;
  else if (volume < 10000) volumeRisk = 4;
  else if (volume < 50000) volumeRisk = 3;
  else if (volume < 100000) volumeRisk = 2;
  else if (volume < 500000) volumeRisk = 1;
  
  const totalRawRisk = liquidityRisk + volatilityRisk + ageRisk + volumeRisk;
  
  return {
    liquidityRisk,
    volatilityRisk,
    ageRisk,
    volumeRisk,
    totalRawRisk
  };
}

async function analyzeTokenSimplified(symbol: string, tweets: any[], tokenInfo: any, retryCount: number = 0): Promise<SimplifiedTokenAnalysis | null> {
  if (!tokenInfo) {
    console.log(`Token ${symbol} not found in token file. Skipping analysis.`);
    return null;
  }

  const tokenInfoStr = tokenInfo ? `Token Data: ${JSON.stringify(tokenInfo, null, 2)}\n` : '';
  const tweetsText = tweets.map(t => t.text).slice(0, 10).join(' | ');
  
  const riskFactors = calculateMemecoinRiskFactors(tokenInfo);
  
  const simplifiedPrompt = `
MEMECOIN ANALYSIS - RELATIVE RISK ASSESSMENT

Token: ${symbol}
${tokenInfoStr}
Social Data: ${tweetsText}

CONTEXT: You are analyzing MEMECOINS specifically. All memecoins are inherently risky, so assess risk RELATIVE to other memecoins.

ANALYSIS REQUIREMENTS:
1. Risk Level (1-10): Compare to OTHER MEMECOINS, not traditional investments
   - 1 = Lower risk memecoin (established, good liquidity, stable community)
   - 5 = Average memecoin risk
   - 10 = Extremely risky even for a memecoin (rug pull potential, very new, no liquidity)

2. Investment Potential (1-10): Upside potential within memecoin space
   - Consider community engagement, trend momentum, uniqueness
   - 10 = Very high viral/growth potential

RESPOND WITH VALID JSON ONLY:
{
  "symbol": "${symbol}",
  "is_memecoin": true,
  "risk": number,
  "potential": number,
  "rationale": "Brief analysis focusing on RELATIVE memecoin risk and viral potential"
}`;

  try {
    const response = await ioClient.chat.completions.create({
      model: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
      messages: [
        {
          role: 'system',
          content: 'You are a memecoin specialist. Assess risk RELATIVE to other memecoins, not traditional investments. All your responses must be valid JSON only.'
        },
        {
          role: 'user',
          content: simplifiedPrompt
        }
      ],
      temperature: 0.2, // IMPORTANT TO REMOVE HALLUCINATIONS
      max_tokens: 600,
      stream: false
    });

    const responseText = response.choices[0]?.message?.content || '';
    
    let text = responseText.replace(/``````/g, '').trim();
    text = text.replace(/([\x00-\x08\x0B\x0C\x0E-\x1F])/g, ' ');
    
    const match = text.match(/\{[\s\S]*?\}/);
    let parsed;
    try {
      parsed = match ? JSON.parse(match[0]) : JSON.parse(text);
    } catch (e) {
      console.error(`JSON parsing error for ${symbol}:`, e);
      return null;
    }
    
    if (!parsed.is_memecoin) {
      console.log(`Token ${symbol} is not classified as a memecoin. Skipping.`);
      return null;
    }

    const parsePrice = (priceStr: string): number => {
      const cleaned = priceStr.replace(/,/g, '').replace(/[^\d.-]/g, '');
      const price = parseFloat(cleaned);
      return isNaN(price) ? 0 : price;
    };
    
    const parseChange = (changeStr: string): number => {
      if (changeStr === 'N/A' || !changeStr) return 0;
      const cleaned = changeStr.replace(/[^\d.-]/g, '');
      const change = parseFloat(cleaned);
      return isNaN(change) ? 0 : change;
    };

    const price = tokenInfo?.price ? parsePrice(tokenInfo.price) : 0;
    const volume = tokenInfo?.volume || 'N/A';
    const marketCap = tokenInfo?.mcap || 'N/A';
    const change24h = tokenInfo?.['change-24h'] ? parseChange(tokenInfo['change-24h']) : 0;
    const age = tokenInfo?.age || 'N/A';

    const aiRisk = Math.max(1, Math.min(10, parsed.risk || 5));
    const fundamentalRisk = Math.max(1, Math.min(10, (riskFactors.totalRawRisk / 20) * 10)); // Normalize to 1-10
    const combinedRisk = Math.round((aiRisk * 0.6 + fundamentalRisk * 0.4) * 10) / 10;

    return {
      symbol: parsed.symbol || symbol,
      symbol1: tokenInfo?.symbol1 || '',
      risk: combinedRisk,
      investmentPotential: Math.max(1, Math.min(10, parsed.potential || 1)),
      rationale: parsed.rationale || 'Analysis completed',
      rawRiskScore: combinedRisk,
      price,
      volume,
      marketCap,
      change24h,
      age,
      href: tokenInfo?.href || '#',
      
      lastAnalyzed: new Date().toISOString()
    };

  } catch (e: any) {
    console.error(`Analysis error for ${symbol}:`, e);
    if (e.status === 429 || e.code === 429 || e.message?.includes('rate limit')) {
      if (retryCount < MAX_RETRIES) {
        console.log(`Rate limit hit for ${symbol}, retry ${retryCount + 1}/${MAX_RETRIES}`);
        await rateLimitedDelay(retryCount + 1);
        return analyzeTokenSimplified(symbol, tweets, tokenInfo, retryCount + 1);
      }
      throw new Error('RATE_LIMIT_EXCEEDED');
    }
    return null;
  }
}

function normalizeRiskScores(analyses: SimplifiedTokenAnalysis[]): SimplifiedTokenAnalysis[] {
  if (analyses.length < 2) return analyses;
  
  const rawRisks = analyses.map(a => a.rawRiskScore || a.risk).filter(r => r > 0);
  
  if (rawRisks.length === 0) return analyses;
  
  const minRisk = Math.min(...rawRisks);
  const maxRisk = Math.max(...rawRisks);
  
  if (maxRisk === minRisk) {
    return analyses.map((analysis, index) => ({
      ...analysis,
      risk: Math.max(1, Math.min(10, 5 + (Math.random() - 0.5) * 2))
    }));
  }
  
  return analyses.map(analysis => {
    const rawRisk = analysis.rawRiskScore || analysis.risk;
    let normalizedRisk = 1 + ((rawRisk - minRisk) / (maxRisk - minRisk)) * 9;
    normalizedRisk = Math.max(1, Math.min(10, normalizedRisk + (Math.random() - 0.5) * 0.5));
    
    return {
      ...analysis,
      risk: Math.round(normalizedRisk * 10) / 10
    };
  });
}

function writeSimplifiedResults(results: SimplifiedTokenAnalysis[], outputFile: string) {
  if (!results.length) {
    const output = { results: [] };
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    return;
  }
  
  const normalizedResults = normalizeRiskScores(results);
  const formattedResults = normalizedResults.map((analysis, index) => ({
    id: index + 1,
    symbol: analysis.symbol,
    symbol1: analysis.symbol1 || '',
    price: analysis.price,
    volume: analysis.volume,
    marketCap: analysis.marketCap,
    change24h: analysis.change24h,
    age: analysis.age,
    favorite: false,
    potential: analysis.investmentPotential,
    risk: analysis.risk,
    href: analysis.href
  }));
  
  formattedResults.sort((a, b) => {
    if (Math.abs(a.risk - b.risk) < 0.1) return b.potential - a.potential;
    return a.risk - b.risk;
  });
  
  const output = { results: formattedResults };
  
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  console.log(`Written ${formattedResults.length} normalized analyses`);
}

function checkTokensUpdated(): boolean {
  try {
    if (!fs.existsSync(SOLANA_TOKENS)) return false;
    const stats = fs.statSync(SOLANA_TOKENS);
    const currentModified = stats.mtimeMs;
    if (currentModified > lastTokensModified) {
      lastTokensModified = currentModified;
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

function getTokenInfo(symbol: string, tokenData: any): any {
  if (!tokenData?.tokens) return null;
  return tokenData.tokens.find((t: any) => t.symbol === symbol) || null;
}

async function main() {
  if (isAnalyzerRunning) {
    console.log('Analyzer already running, skipping...');
    return;
  }
  
  isAnalyzerRunning = true;
  analysisSessionId++;
  const currentSessionId = analysisSessionId;
  
  console.log(`Starting AI Analyzer Session #${currentSessionId}`);

  startMarketDataSync();

  let tweetsObj: any = {};
  let tokenData: any = {};
  
  try {
    if (!fs.existsSync(TWEETS_FILE)) {
      console.log('tweets.json not found.');
      return;
    }
    tweetsObj = JSON.parse(fs.readFileSync(TWEETS_FILE, 'utf8'));
    console.log(`Loaded tweets for ${Object.keys(tweetsObj).length} symbols`);
  } catch (e) {
    console.error('Error reading tweets.json:', e);
    return;
  }
  
  try {
    if (fs.existsSync(SOLANA_TOKENS)) {
      tokenData = JSON.parse(fs.readFileSync(SOLANA_TOKENS, 'utf8'));
      console.log(`Loaded ${tokenData.tokens?.length || 0} tokens from BSC data`);
    } else {
      console.log(`${SOLANA_TOKENS} not found.`);
      return;
    }
  } catch (e) {
    console.error(`Error reading ${SOLANA_TOKENS}:`, e);
    return;
  }

  let analysisResults: SimplifiedTokenAnalysis[] = [];
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      const fileContent = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
      if (fileContent.results && Array.isArray(fileContent.results)) {
        analysisResults = fileContent.results.map((item: any) => ({
          symbol: item.symbol,
          symbol1: item.symbol1 || '',
          risk: item.risk,
          investmentPotential: item.potential,
          rationale: 'Existing analysis',
          rawRiskScore: item.risk,
          price: item.price,
          volume: item.volume,
          marketCap: item.marketCap,
          change24h: item.change24h,
          age: item.age,
          href: item.href,
          lastAnalyzed: new Date().toISOString()
        }));
        console.log(`Loaded ${analysisResults.length} existing analyses`);
      }
    }
  } catch (e) {
    console.error('Error reading existing results:', e);
    analysisResults = [];
  }

  try {
    if (fs.existsSync(SOLANA_TOKENS)) {
      const stats = fs.statSync(SOLANA_TOKENS);
      lastTokensModified = stats.mtimeMs;
    }
  } catch (e) {
    console.error('Error getting token file stats:', e);
  }

  const availableTokens = tokenData?.tokens ? 
    new Set(tokenData.tokens.map((t: any) => t.symbol)) : 
    new Set();
  
  const tokenQueue = Object.keys(tweetsObj).filter(symbol => availableTokens.has(symbol));
  
  console.log(`Tokens to analyze: ${tokenQueue.length}`);
  console.log(`Estimated time: ${Math.round((tokenQueue.length * RATE_LIMIT_DELAY) / 1000 / 60)} minutes`);

  for (let i = 0; i < tokenQueue.length; i++) {
    if (currentSessionId !== analysisSessionId) {
      console.log('Session superseded, stopping...');
      break;
    }
    
    const currentSymbol = tokenQueue[i];
    
    try {
      console.log(`\n[${i + 1}/${tokenQueue.length}] 🔍 Analyzing ${currentSymbol}...`);
      
      const tweets = tweetsObj[currentSymbol]?.tweets || [];
      const tokenInfo = getTokenInfo(currentSymbol, tokenData);
      
      if (!tokenInfo) {
        console.log(`${currentSymbol} not found in token data. Skipping.`);
        continue;
      }
      
      const existing = analysisResults.find(a => a.symbol === currentSymbol);
      if (existing && existing.lastAnalyzed) {
        const lastAnalyzed = new Date(existing.lastAnalyzed).getTime();
        const now = Date.now();
        const hoursAgo = (now - lastAnalyzed) / (1000 * 60 * 60);
        
        if (hoursAgo < 24) {
          console.log(`${currentSymbol} analyzed ${Math.round(hoursAgo)}h ago, skipping...`);
          continue;
        }
      }
      
      const analysis = await analyzeTokenSimplified(currentSymbol, tweets, tokenInfo);
      
      if (analysis && analysis.rationale.trim()) {
        const existingIndex = analysisResults.findIndex(a => a.symbol === currentSymbol);
        
        if (existingIndex >= 0) {
          analysisResults[existingIndex] = analysis;
          console.log(`Updated ${currentSymbol} - Risk: ${analysis.risk}/10, Potential: ${analysis.investmentPotential}/10`);
        } else {
          analysisResults.push(analysis);
          console.log(`Added ${currentSymbol} - Risk: ${analysis.risk}/10, Potential: ${analysis.investmentPotential}/10`);
        }
        
        writeSimplifiedResults(analysisResults, OUTPUT_FILE);
      } else {
        console.log(`Skipped ${currentSymbol}: Invalid analysis`);
      }
      
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        console.log('Rate limit exceeded. Stopping session.');
        break;
      }
      console.error(`Error analyzing ${currentSymbol}:`, e.message);
    }
    
    if (i < tokenQueue.length - 1) {
      await rateLimitedDelay();
    }
  }
  
  console.log(`🎉 Analysis session #${currentSessionId} complete`);
  console.log(`📊 Total tokens analyzed: ${analysisResults.length}`);

  isAnalyzerRunning = false;
}

process.on('SIGINT', () => {
  stopMarketDataSync();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopMarketDataSync();
  process.exit(0);
});

process.on('exit', () => {
  stopMarketDataSync();
});

console.log('Analyzer Starting...');
main().catch(error => {
  console.error('Fatal error:', error);
  isAnalyzerRunning = false;
  stopMarketDataSync();
});
