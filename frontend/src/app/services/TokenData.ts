// Updated interfaces to match AI analyzer output
interface TokenCoin {
  name: string;
  symbol: string;
  symbol1: string;
  price: string;
  volume: string;
  liquidity: string;
  mcap: string;
  transactions: string;
  age: string;
  'change-5m': string;
  'change-1h': string;
  'change-6h': string;
  'change-24h': string;
  href: string;
}

interface TokenDataResponse {
  data: TokenCoin[];
}

// Updated AI analyzer token interface to match actual output
interface AIAnalyzerToken {
  id: number;
  symbol: string;
  symbol1: string;
  price: number;                    // AI analyzer outputs number
  volume: string;
  marketCap: string;
  change24h: number;                // AI analyzer outputs number
  age: string;
  favorite: boolean;
  potential: number;                // AI analyzer uses 'potential', not 'investmentPotential'
  investmentPotential?: number;     // API server adds this for compatibility
  risk: number;
  href: string;
  rationale?: string;               // API server might add this
}

interface AIAnalyzerResponse {
  data: AIAnalyzerToken[];
}

export interface FormattedMemecoin {
  id: number;
  symbol: string;
  symbol1: string;
  price: number;
  volume: string;
  marketCap: string;
  change24h: number;
  age: string;
  favorite: boolean;
  potential: number;
  risk: number;
  href: string;
}

// Function to parse price strings, handling various formats
const parsePrice = (priceStr: string | number): number => {
  // If already a number, return it
  if (typeof priceStr === 'number') return priceStr;
  
  // Handle string conversion
  if (!priceStr || priceStr === 'N/A' || priceStr === '') return 0;
  
  // Remove commas and any non-numeric characters except dots and minus
  const cleaned = String(priceStr).replace(/,/g, '').replace(/[^\d.-]/g, '');
  
  // Parse the cleaned string
  const price = parseFloat(cleaned);
  
  // If parsing fails or results in NaN, return 0
  return isNaN(price) ? 0 : price;
};

// Function to parse percentage change
const parseChange = (changeStr: string | number): number => {
  // If already a number, return it
  if (typeof changeStr === 'number') return changeStr;
  
  if (!changeStr || changeStr === 'N/A' || changeStr === '') return 0;
  
  // Extract the number and remove the % sign and other characters
  const cleaned = String(changeStr).replace(/[^\d.-]/g, '');
  
  // Parse the cleaned string
  const change = parseFloat(cleaned);
  
  // If parsing fails or results in NaN, return 0
  return isNaN(change) ? 0 : change;
};

// Function to determine risk score based on price volatility and other factors (fallback)
const calculateRisk = (price: number, changeStr: string | number): number => {
  const change = parseChange(changeStr);
  // Higher volatility means higher risk
  const volatilityRisk = Math.min(Math.abs(change) / 20, 10); // Scale volatility
  // Very low-priced coins are generally riskier
  const priceRisk = price < 0.000001 ? 9 : price < 0.00001 ? 8 : price < 0.0001 ? 7 : price < 0.001 ? 6 : price < 0.01 ? 5 : 3;
  // Return weighted average
  return Math.min(Math.round((volatilityRisk * 0.4 + priceRisk * 0.6)), 10);
};

// Function to determine potential score (fallback)
const calculatePotential = (price: number, changeStr: string | number): number => {
  const change = parseChange(changeStr);
  // Coins with positive recent changes have higher potential
  const changePotential = change > 50 ? 9 : change > 20 ? 8 : change > 10 ? 7 : change > 5 ? 6 : change > 0 ? 5 : 3;
  // Low-priced coins have higher potential for big percentage moves
  const pricePotential = price < 0.000001 ? 9 : price < 0.00001 ? 8 : price < 0.0001 ? 7 : price < 0.001 ? 6 : price < 0.01 ? 5 : 4;
  // Return weighted average
  return Math.min(Math.round((changePotential * 0.3 + pricePotential * 0.7)), 10);
};

// Updated function to process AI analyzer format
const processAIAnalyzerData = (data: AIAnalyzerToken[]): FormattedMemecoin[] => {
  return data.map((item, index) => {
    // Ensure all required fields are present and properly typed
    return {
      id: item.id || (index + 1),
      symbol: item.symbol || '',
      symbol1: item.symbol1 || '',
      price: parsePrice(item.price), // Handle both number and string inputs
      volume: item.volume || 'N/A',
      marketCap: item.marketCap || 'N/A',
      change24h: parseChange(item.change24h), // Handle both number and string inputs
      age: item.age || 'N/A',
      favorite: false, // Always start as false, frontend handles favorites
      // Prefer 'potential' field, fallback to 'investmentPotential' or calculate
      potential: item.potential || item.investmentPotential || calculatePotential(parsePrice(item.price), item.change24h),
      risk: item.risk || calculateRisk(parsePrice(item.price), item.change24h), // Use AI risk or calculate fallback
      href: item.href || '#'
    };
  });
};

// Legacy function to process old token format (kept for backward compatibility)
const processLegacyTokenData = (data: any[]): FormattedMemecoin[] => {
  return data.map((item, index) => {
    // Helper function to ensure price is a number
    const ensureNumber = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };
    
    // Helper function to ensure change is a number
    const ensureChangeNumber = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const cleaned = value.replace(/[^\d.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };
    
    // Handle legacy format - try to map old structure to new
    const price = ensureNumber(item.price);
    const change24h = ensureChangeNumber(item.change24h || item['change-24h']);
    
    return {
      id: index + 1,
      symbol: item.symbol || '',
      symbol1: item.symbol1 || '',
      price: price,
      volume: item.volume || 'N/A',
      marketCap: item.marketCap || item.mcap || 'N/A',
      change24h: change24h,
      age: item.age || 'N/A',
      favorite: false,
      // Use AI scores if available, otherwise calculate
      potential: item.investmentPotential || item.potential || calculatePotential(price, change24h),
      risk: item.risk || calculateRisk(price, change24h),
      href: item.href || '#'
    };
  });
};

// Smart processing function that detects format and processes accordingly
const processTokenData = (data: any[]): FormattedMemecoin[] => {
  if (!data || data.length === 0) return [];
  
  console.log('Processing token data:', { 
    length: data.length, 
    firstItem: data[0] ? Object.keys(data[0]) : 'none'
  });
  
  // Check if this looks like AI analyzer format
  const firstItem = data[0];
  
  // More robust detection - check for AI analyzer specific fields
  const isAIFormat = firstItem && (
    (typeof firstItem.id === 'number' && typeof firstItem.risk === 'number' && typeof firstItem.potential === 'number') ||
    (firstItem.hasOwnProperty('risk') && firstItem.hasOwnProperty('potential'))
  );
  
  console.log('Detected format:', isAIFormat ? 'AI Analyzer' : 'Legacy');
  console.log('Sample item:', firstItem);
  
  if (isAIFormat) {
    return processAIAnalyzerData(data as AIAnalyzerToken[]);
  } else {
    return processLegacyTokenData(data);
  }
};

// Updated fetch function with better error handling and debugging
export const fetchTokenData = async (forceRefresh: boolean = false): Promise<FormattedMemecoin[]> => {
  try {
    console.log('🔄 Fetching token data at:', new Date().toISOString());
    
    // More aggressive cache busting
    const cacheBuster = `_=${Date.now()}&r=${Math.random()}${forceRefresh ? '&force=1' : ''}`;
    const url = `/api/token-data?${cacheBuster}`;
    
    console.log('📡 Fetch URL:', url);
    
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
    console.log('📊 Response status:', response.status);
    
    if (!response.ok) {
      console.error('❌ API request failed:', response.status, response.statusText);
      
      // Try to get error details
      try {
        const errorData = await response.json();
        console.error('❌ Error details:', errorData);
      } catch (e) {
        console.error('❌ Could not parse error response');
      }
      
      return [];
    }
    
    const raw = await response.json();
    console.log('📄 Raw response structure:', {
      topLevelKeys: Object.keys(raw),
      hasData: Array.isArray(raw.data),
      hasResults: Array.isArray(raw.results),
      dataLength: raw.data?.length || 0,
      resultsLength: raw.results?.length || 0,
    });
    
    // Log first item for debugging
    const firstItem = raw.data?.[0] || raw.results?.[0];
    if (firstItem) {
      console.log('📋 First item structure:', {
        keys: Object.keys(firstItem),
        sample: {
          symbol: firstItem.symbol,
          price: firstItem.price,
          risk: firstItem.risk,
          potential: firstItem.potential,
          investmentPotential: firstItem.investmentPotential
        }
      });
    }
    
    // Support multiple response formats
    let tokens: any[] = [];
    
    if (Array.isArray(raw.data)) {
      tokens = raw.data;
      console.log('✅ Using raw.data array');
    } else if (Array.isArray(raw.results)) {
      tokens = raw.results;
      console.log('✅ Using raw.results array');
    } else if (Array.isArray(raw)) {
      tokens = raw; // Direct array response
      console.log('✅ Using direct array response');
    } else {
      console.error('❌ No valid token array found in response');
      console.error('Response structure:', raw);
      return [];
    }
    
    console.log(`📈 Tokens found: ${tokens.length}`);
    
    if (!tokens.length) {
      console.warn('⚠️ No token data found in API response');
      return [];
    }
    
    const processed = processTokenData(tokens);
    console.log(`✅ Processed tokens: ${processed.length}`);
    
    if (processed.length > 0) {
      console.log('📊 Sample processed token:', {
        symbol: processed[0].symbol,
        price: processed[0].price,
        risk: processed[0].risk,
        potential: processed[0].potential
      });
    }
    
    return processed;
  } catch (error) {
    console.error('💥 Error fetching token data:', error);
    return [];
  }
};

// Function to force cache invalidation
export const invalidateTokenCache = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/revalidate', { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Cache invalidation failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Cache invalidation result:', result);
    return true;
  } catch (error) {
    console.error('❌ Failed to invalidate cache:', error);
    return false;
  }
};

// Utility function to validate token data format
export const validateTokenData = (data: any[]): { isValid: boolean, format: string, errors: string[] } => {
  const errors: string[] = [];
  
  if (!Array.isArray(data)) {
    errors.push('Data is not an array');
    return { isValid: false, format: 'unknown', errors };
  }
  
  if (data.length === 0) {
    return { isValid: true, format: 'empty', errors };
  }
  
  const firstItem = data[0];
  
  // Check for AI analyzer format
  if (firstItem.risk !== undefined && firstItem.potential !== undefined) {
    const requiredFields = ['symbol', 'price', 'volume', 'marketCap', 'change24h', 'age', 'potential', 'risk', 'href'];
    const missingFields = requiredFields.filter(field => firstItem[field] === undefined);
    
    if (missingFields.length > 0) {
      errors.push(`Missing AI format fields: ${missingFields.join(', ')}`);
    }
    
    // Check data types
    if (typeof firstItem.risk !== 'number') errors.push('risk should be a number');
    if (typeof firstItem.potential !== 'number') errors.push('potential should be a number');
    if (typeof firstItem.price !== 'number' && typeof firstItem.price !== 'string') errors.push('price should be a number or string');
    
    return { 
      isValid: missingFields.length === 0 && errors.length === 0, 
      format: 'AI Analyzer', 
      errors 
    };
  }
  
  // Check for legacy format
  if (firstItem.symbol !== undefined) {
    return { isValid: true, format: 'Legacy', errors };
  }
  
  errors.push('Unknown data format - missing required fields');
  return { isValid: false, format: 'unknown', errors };
};

// Helper function to check if data looks like it's from AI analyzer
export const isAIAnalyzerFormat = (data: any[]): boolean => {
  if (!data || data.length === 0) return false;
  const firstItem = data[0];
  return !!(firstItem.risk !== undefined && firstItem.potential !== undefined);
};

// Debug function to log data structure
export const debugTokenData = (data: any): void => {
  console.group('🔍 Token Data Debug');
  console.log('Data type:', typeof data);
  console.log('Is array:', Array.isArray(data));
  
  if (Array.isArray(data) && data.length > 0) {
    console.log('Length:', data.length);
    console.log('First item keys:', Object.keys(data[0]));
    console.log('First item:', data[0]);
    
    const validation = validateTokenData(data);
    console.log('Validation:', validation);
  }
  
  console.groupEnd();
};
