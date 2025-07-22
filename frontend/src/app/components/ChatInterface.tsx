'use client';

import { useState, useEffect, useRef } from 'react';
import { IoSendSharp } from 'react-icons/io5';
import { FaDog, FaUser, FaMicrophone, FaVolumeUp, FaVolumeMute, FaMicrophoneSlash } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';

interface Message {
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  fullPage?: boolean;
}

export default function ChatInterface({ fullPage = false }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech synthesis and recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      
      // Initialize speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
      }
    }
  }, []);

  // Stop speaking when component unmounts
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const speakText = (text: string) => {
    if (!voiceMode || !synthRef.current) return;
    
    // Cancel any ongoing speech
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser');
      return;
    }
    
    setIsListening(true);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleVoiceMode = () => {
    const newVoiceMode = !voiceMode;
    setVoiceMode(newVoiceMode);
    
    if (!newVoiceMode && synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const messageText = input.trim();
    setMessages(prev => [...prev, {
      type: 'user',
      content: messageText,
      timestamp: new Date()
    }]);
    setIsTyping(true);
    setInput('');
    inputRef.current?.focus();
    let assistantMsg = '';
    let assistantMsgIdx = -1;
    try {
      const res = await fetch('/api/agent-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: messageText })
      });
      const data = await res.json();
      assistantMsg = data.response || data.error || '';
      setMessages(prev => {
        assistantMsgIdx = prev.length;
        return [
          ...prev,
          {
            type: 'assistant',
            content: assistantMsg,
            timestamp: new Date()
          }
        ];
      });
      
      // Speak the response if voice mode is enabled
      if (voiceMode && assistantMsg) {
        speakText(assistantMsg);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: `Error: ${error.message || 'Failed to contact agent.'}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const containerHeight = fullPage ? 'h-[calc(100vh-8rem)]' : 'h-full';

  return (
    <div className={`flex flex-col ${containerHeight} max-w-none mx-0 rounded-none shadow-none overflow-hidden border-0 bg-white`}>
      {!fullPage && (
        <div className="bg-solana-purple text-white p-4 flex items-center justify-between">
          <div className="flex items-center">          <div className="flex-shrink-0 mr-3">
            <Image 
              src="/sniffle-logo.png" 
              alt="Sniffle Logo" 
              width={32} 
              height={32}
            />
          </div>
            <div>
              <h1 className="text-xl font-semibold">Sniffle Assistant</h1>
              <p className="text-sm opacity-75">
                Connected to Sniffle Agent - Ready to chat
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleVoiceMode}
              className={`p-2 rounded-lg transition-colors ${
                voiceMode 
                  ? 'bg-purple-700 text-white' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
              title={voiceMode ? 'Disable Voice Mode' : 'Enable Voice Mode'}
            >
              {voiceMode ? <FaVolumeUp className="text-lg" /> : <FaVolumeMute className="text-lg" />}
            </button>
            {isSpeaking && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs">Speaking...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-purple-50">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start max-w-[80%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                  msg.type === 'user' ? 'bg-solana-purple ml-2' : 'bg-purple-600 mr-2'
                }`}>
                  {msg.type === 'user' ? (
                    <FaUser className="text-white text-sm" />
                  ) : (
                    <FaDog className="text-white text-sm" />
                  )}
                </div>
                <div
                  className={`rounded-lg p-3 ${
                    msg.type === 'user'
                      ? 'bg-solana-purple text-white'
                      : 'bg-white text-gray-800 border border-purple-200 shadow-sm'
                  }`}
                >
                  {msg.type === 'assistant' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-line">{msg.content}</p>
                  )}
                  <span className="text-xs opacity-75 mt-1 block">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-start">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-600 mr-2 flex items-center justify-center">
                  <FaDog className="text-white text-sm" />
                </div>
                <div className="bg-white text-gray-800 rounded-lg p-3 border border-purple-200 shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-purple-200">
        <div className="flex items-end space-x-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Ask about memecoins, trends, or market insights..." : "Connecting..."}
            disabled={!isConnected}
            className="flex-1 p-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-solana-purple resize-none h-12 max-h-32 min-h-[3rem] text-gray-800"
            rows={1}
          />
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={!isConnected}
            className={`p-3 rounded-lg transition-colors ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                : 'bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed'
            }`}
            title={isListening ? 'Stop Listening' : 'Voice Input'}
          >
            {isListening ? <FaMicrophoneSlash className="text-xl" /> : <FaMicrophone className="text-xl" />}
          </button>
          <button
            onClick={sendMessage}
            disabled={!isConnected || !input.trim()}
            className="p-3 bg-solana-purple text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <IoSendSharp className="text-xl" />
          </button>
        </div>
        {isListening && (
          <div className="mt-2 flex items-center justify-center space-x-2 text-purple-600">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="text-sm">Listening...</span>
          </div>
        )}
      </div>
    </div>
  );
}