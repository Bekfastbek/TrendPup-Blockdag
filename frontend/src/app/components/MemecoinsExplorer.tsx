'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaSearch, FaChartLine, FaRegStar, FaStar, FaInfoCircle, FaSpinner, FaSync, FaExclamationTriangle, FaShieldAlt } from 'react-icons/fa';
import Image from 'next/image';
import { fetchTokenData, invalidateTokenCache, FormattedMemecoin, validateTokenData } from '../services/TokenData';

export default function MemecoinsExplorer() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('trending');
  const [memecoins, setMemecoins] = useState<FormattedMemecoin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [dataFormat, setDataFormat] = useState<string>('unknown');

  const loadTokenData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setIsLoading(!forceRefresh); // Don't show main loading if it's just a refresh
      if (forceRefresh) {
        setIsRefreshing(true);
      }
      
      console.log('Loading AI analyzer data, force refresh:', forceRefresh);
      
      const data = await fetchTokenData(forceRefresh);
      
      // Validate data format
      const validation = validateTokenData(data);
      setDataFormat(validation.format);
      
      // Debug: log the data we received
      console.log('AI analyzer data received:', data);
      console.log('Data format detected:', validation.format);
      console.log('Token data length:', data.length);
      if (data.length > 0) {
        console.log('Sample token:', data[0]);
      }
      
      // Debug UI: show the data for troubleshooting
      (window as any)._trendpupDebug = {
        tokenData: data,
        tokenDataLength: data.length,
        dataFormat: validation.format,
        validationErrors: validation.errors,
        lastRefresh: new Date().toISOString()
      };
      
      setMemecoins(data);
      setError(null);
      setLastRefresh(new Date());
      
    } catch (err) {
      console.error('Failed to fetch AI analyzer data:', err);
      setError('Failed to load memecoin data. Please try again later.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const forceRefresh = useCallback(async () => {
    try {
      console.log('Force refresh initiated');
      
      // First invalidate the cache
      const cacheInvalidated = await invalidateTokenCache();
      if (cacheInvalidated) {
        console.log('Cache invalidated successfully');
      }
      
      // Then reload data with force refresh
      await loadTokenData(true);
      
    } catch (error) {
      console.error('Failed to force refresh:', error);
      setError('Failed to refresh data. Please try again.');
    }
  }, [loadTokenData]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    // Initial load
    loadTokenData(false);
    
    // Set up interval for regular updates
    intervalId = setInterval(() => {
      loadTokenData(false);
    }, 60000); // Refresh every 1 minute
    
    return () => clearInterval(intervalId);
  }, [loadTokenData]);

  const toggleFavorite = (id: number) => {
    setMemecoins(prevCoins => 
      prevCoins.map(coin => 
        coin.id === id ? { ...coin, favorite: !coin.favorite } : coin
      )
    );
  };

  const filteredCoins = memecoins.filter(coin => 
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedCoins = activeTab === 'trending' 
    ? filteredCoins.sort((a, b) => b.potential - a.potential)
    : activeTab === 'favorites' 
    ? filteredCoins.filter(coin => coin.favorite)
    : activeTab === 'safe' 
    ? filteredCoins.sort((a, b) => a.risk - b.risk)
    : filteredCoins;

  // Sort by age (newest to oldest) for all tabs
  const parseAge = (ageStr: string) => {
    // Example: '2m', '1h', '3d', '5s', '8mo', '1y'
    if (!ageStr) return Number.MAX_SAFE_INTEGER;
    const match = ageStr.match(/(\d+)(mo|[smhdy])/); // 'mo' before 'm'!
    if (!match) return Number.MAX_SAFE_INTEGER;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      case 'mo': return value * 2592000; // 1 month = 30 days
      case 'y': return value * 31536000; // 1 year = 365 days
      default: return Number.MAX_SAFE_INTEGER;
    }
  };

  // Always sort by age (newest first), except for 'safe' tab which sorts by risk
  let sortedCoins: FormattedMemecoin[];
  if (activeTab === 'safe') {
    // Sort by risk ASC (safest first), then by age (newest first)
    sortedCoins = displayedCoins.slice().sort((a, b) => {
      if (a.risk !== b.risk) return a.risk - b.risk;
      return parseAge(a.age) - parseAge(b.age);
    });
  } else {
    // Default: sort by age (newest first)
    sortedCoins = displayedCoins.slice().sort((a, b) => parseAge(a.age) - parseAge(b.age));
  }

  // Helper function to get risk level styling
  const getRiskStyling = (risk: number) => {
    if (risk <= 3) return { color: 'text-white', bg: 'bg-green-600', icon: FaShieldAlt };
    if (risk <= 6) return { color: 'text-yellow-800', bg: 'bg-yellow-100', icon: FaInfoCircle };
    return { color: 'text-red-800', bg: 'bg-red-100', icon: FaExclamationTriangle };
  };
  
  // Helper function to get potential level styling
  const getPotentialStyling = (potential: number) => {
    if (potential >= 8) return { color: 'text-white', bg: 'bg-green-600' };
    if (potential >= 5) return { color: 'text-blue-800', bg: 'bg-blue-100' };
    return { color: 'text-gray-800', bg: 'bg-gray-100' };
  };

  // Create a helper function for opening token links
  const openTokenLink = useCallback((url: string) => {
    if (!url || url === '#') {
      console.error("No valid URL available for this token");
      return;
    }
    
    console.log("Opening token link:", url);
    
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error("Error opening link:", error);
    }
  }, []);

  // Get tab counts
  const trendingCount = filteredCoins.length;
  const favoritesCount = filteredCoins.filter(coin => coin.favorite).length;
  const safeCount = filteredCoins.filter(coin => coin.risk <= 4).length;

  return (
    <>
      {/* Solana Purple Header Bar */}
      <div className="bg-purple-600 text-white rounded-t-xl px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Memecoin Explorer</h2>
          <p className="text-base opacity-90">Discover trending memecoins with Trendpup AI intelligence</p>
        </div>
        <div className="text-sm opacity-80 flex items-center space-x-2">
          <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
          <button onClick={forceRefresh} disabled={isRefreshing} className="ml-2 p-2 rounded-full hover:bg-purple-700 disabled:opacity-50 transition-colors">
            <FaSync className={`${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <div className="bg-white rounded-b-xl shadow-lg border border-purple-200 overflow-hidden resize-x min-w-[400px] max-w-none">


      <div className="p-4">
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search memecoins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 pl-10 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-gray-800"
          />
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        
        <div className="flex mb-4 border-b border-purple-200">
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-4 py-2 font-medium flex items-center space-x-2 ${
              activeTab === 'trending' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-purple-600'
            }`}
          >
            <span>Trending</span>
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              {trendingCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 font-medium flex items-center space-x-2 ${
              activeTab === 'favorites' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-purple-600'
            }`}
          >
            <span>Favorites</span>
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              {favoritesCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('safe')}
            className={`px-4 py-2 font-medium flex items-center space-x-2 ${
              activeTab === 'safe' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-purple-600'
            }`}
          >
            <span>Safest</span>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            {safeCount}
           </span>
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <FaSpinner className="animate-spin text-purple-600 text-3xl" />
            <span className="ml-2 text-gray-600">Loading AI-analyzed memecoin data...</span>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">
            <FaInfoCircle className="text-3xl mb-2 inline-block" />
            <p>{error}</p>
            <button 
              onClick={forceRefresh}
              className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full min-w-[1000px]">
            <table className="w-full table-fixed border-collapse">
              <thead className="bg-purple-100">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-[12%]">Symbol</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider w-[14%]">Price</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider w-[10%]">Volume</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider w-[12%]">Market Cap</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider w-[12%]">24h Change</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider w-[8%]">Age</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-800 uppercase tracking-wider w-[10%]">AI Potential</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-800 uppercase tracking-wider w-[8%]">AI Risk</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-800 uppercase tracking-wider w-[12%]">Favorite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100">
                {sortedCoins.length > 0 ? (
                  sortedCoins.map((coin) => {
                    const riskStyling = getRiskStyling(coin.risk);
                    const potentialStyling = getPotentialStyling(coin.potential);
                    const RiskIcon = riskStyling.icon;
                    
                    return (
                    <tr key={coin.id} className="hover:bg-purple-50 cursor-pointer"
                        onClick={() => openTokenLink(coin.href)}
                    >
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-800 w-[12%]">
                          {coin.symbol}{coin.symbol1 ? `/${coin.symbol1}` : ''}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-800 w-[14%]">
                          ${coin.price.toFixed(coin.price < 0.001 ? 8 : 6)}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-800 w-[10%]">
                          {coin.volume}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-500 w-[12%]">
                          {coin.marketCap}
                        </td>
                        <td className={`px-3 py-4 whitespace-nowrap text-right text-sm font-medium w-[12%] ${coin.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {coin.change24h >= 0 ? '+' : ''}{coin.change24h}%
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-500 w-[8%]">
                          {coin.age}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center w-[10%]">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${potentialStyling.bg} ${potentialStyling.color}`}>
                            {coin.potential}/10
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center w-[8%]">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${riskStyling.bg} ${riskStyling.color}`}>
                            <RiskIcon className="w-3 h-3 mr-1" />
                            {coin.risk}/10
                          </span>
                        </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center w-[12%]">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(coin.id);
                          }}
                          className="text-lg"
                        >
                          {coin.favorite ? 
                            <FaStar className="text-purple-600" /> : 
                            <FaRegStar className="text-gray-400 hover:text-purple-600" />
                          }
                        </button>
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                      No memecoins found matching your search criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
