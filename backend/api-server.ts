import express, { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/api/token-data', (req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  const possiblePaths = [
    path.join(__dirname, 'ai_analyzer.json'),
    path.join(__dirname, '../ai_analyzer.json'),
    path.join(process.cwd(), 'ai_analyzer.json'),
  ];
  
  let filePath: string | null = null;
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      filePath = testPath;
      break;
    }
  }
  
  if (!filePath) {
    console.error('ai_analyzer.json not found in any of these paths:');
    possiblePaths.forEach(p => console.error(`   - ${p}`));
    return res.status(404).json({ 
      error: 'Token data file not found', 
      data: [],
      searchedPaths: possiblePaths 
    });
  }
  
  console.log(`Reading token data from: ${filePath}`);
  
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    let jsonData = JSON.parse(data);
    
    console.log('📊 Raw data structure:', {
      hasResults: !!jsonData.results,
      resultsLength: Array.isArray(jsonData.results) ? jsonData.results.length : 'not array',
      hasData: !!jsonData.data,
      dataLength: Array.isArray(jsonData.data) ? jsonData.data.length : 'not array',
      topLevelKeys: Object.keys(jsonData)
    });
    
    let allTokens: any[] = [];
    if (Array.isArray(jsonData.results)) {
      allTokens = jsonData.results;
    } else if (Array.isArray(jsonData.data)) {
      allTokens = jsonData.data;
    } else if (Array.isArray(jsonData)) {
      allTokens = jsonData;
    } else {
      console.error('❌ Unexpected data structure:', Object.keys(jsonData));
      return res.status(500).json({ 
        error: 'Unexpected data structure', 
        data: [],
        structure: Object.keys(jsonData)
      });
    }
    
    console.log(`Found ${allTokens.length} total tokens`);
    
    if (allTokens.length > 0) {
      console.log('🔍 Sample token structure:', {
        keys: Object.keys(allTokens[0]),
        sample: allTokens[0]
      });
    }
    
    const completeTokens = allTokens.filter((token: any) => {
      const hasSymbol = token.symbol && typeof token.symbol === 'string';
      const hasRisk = typeof token.risk === 'number' && !isNaN(token.risk);
      const hasPotential = typeof token.potential === 'number' && !isNaN(token.potential);
      
      const isComplete = hasSymbol && hasRisk && hasPotential;
      
      if (!isComplete) {
        console.log('Incomplete token:', {
          symbol: token.symbol,
          hasSymbol,
          hasRisk,
          hasPotential,
          risk: token.risk,
          potential: token.potential
        });
      }
      
      return isComplete;
    });
    
    console.log(`Filtered tokens: ${completeTokens.length} out of ${allTokens.length} total`);
    
    const transformedTokens = completeTokens.map(token => ({
      ...token,
      investmentPotential: token.potential || token.investmentPotential,
      rationale: token.rationale || `Risk: ${token.risk}/10, Potential: ${token.potential || token.investmentPotential}/10`
    }));
    
    res.json({ results: transformedTokens });
    
  } catch (err) {
    console.error('Error parsing token data:', err);
    res.status(500).json({ 
      error: 'Failed to parse token data', 
      data: [],
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/file-status', (req: Request, res: Response) => {
  const possiblePaths = [
    path.join(__dirname, 'ai_analyzer.json'),
    path.join(__dirname, '../ai_analyzer.json'),
    path.join(process.cwd(), 'ai_analyzer.json'),
  ];
  
  const fileStatus = possiblePaths.map(filePath => {
    let status = 'not found';
    let size = 0;
    let modified = null;
    
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        status = 'exists';
        size = stats.size;
        modified = stats.mtime.toISOString();
      }
    } catch (err) {
      status = 'error';
    }
    
    return {
      path: filePath,
      status,
      size,
      modified
    };
  });
  
  res.json({
    currentWorkingDirectory: process.cwd(),
    serverDirectory: __dirname,
    files: fileStatus
  });
});

app.listen(PORT, () => {
  console.log(`Backend API server running on port ${PORT}`);
  console.log(`Server directory: ${__dirname}`);
  console.log(`Working directory: ${process.cwd()}`);
  console.log(`Token data: http://localhost:${PORT}/api/token-data`);
});
