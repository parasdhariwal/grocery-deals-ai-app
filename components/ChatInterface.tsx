
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Message, Offer, Purchase, Sender } from '../types';
import { mockApiService } from '../services/mockApi';
import { OfferCard } from './OfferCard';

interface ChatInterfaceProps {
  onOffersClipped: (ids: string[]) => void;
  clippedIds: string[];
}

interface MessageFilters {
  category: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onOffersClipped, clippedIds }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBatchClippingId, setIsBatchClippingId] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, MessageFilters>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const welcome: Message = {
      id: 'welcome-1',
      sender: 'system',
      text: "Hello! I'm your Grocery Deals AI. I can help you find the best grocery deals and coupons for our store. What are you looking for today?",
      timestamp: new Date(),
    };
    setMessages([welcome]);
    mockApiService.getPurchases().then(setPurchases);
  }, []);

  useEffect(() => {
    if (scrollRef.current && !searchTerm) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isBatchClippingId, searchTerm]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setShowHistory(false); 
    setSearchTerm(''); 

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: text,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              showOffers: { type: Type.BOOLEAN },
              isOutOfScope: { type: Type.BOOLEAN, description: "True if the user prompt is NOT related to grocery deals, food prices, or department offers." },
              category: { 
                type: Type.STRING, 
                enum: ["all", "Produce", "Dairy", "Meat & Seafood", "Bakery", "Deli", "Pantry", "Frozen", "Beverages", "Snacks", "Household"],
                description: "The primary department intended."
              },
              suggestedAlternatives: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Alternative departments for ambiguous queries like Almond Milk (e.g. ['Dairy'])."
              }
            },
            required: ["reply", "showOffers", "isOutOfScope", "category"]
          },
          systemInstruction: `
            You are "Grocery Deals AI", a specialized grocery deal assistant and Best Value Expert.
            
            STRICT GUARDRAILS:
            You ONLY respond to grocery items, store deals, food offers, and shopping queries.
            If the user asks about ANYTHING outside this scope:
            1. Set "isOutOfScope" to true.
            2. Set "reply" to EXACTLY: "I'm sorry, I specialize in finding the best grocery deals and value for you. I don't have information on the weather, but I can help you find deals in Produce, Dairy, or any other grocery department!"
            
            SMART CATEGORY LOGIC:
            1. 'Almond Milk' is in the 'Beverages' department. If searching for it, set category to 'Beverages' but ALWAYS suggest 'Dairy' in suggestedAlternatives because users often confuse the two.
            2. If searching for any dairy-alternative, suggest the corresponding main department (e.g. for Tofu, suggest Meat & Seafood).
            3. If no specific department matches well, use 'all'.
          `,
          temperature: 0.1,
        },
      });

      const aiJson = JSON.parse(response.text || "{}");
      
      let cleanText = aiJson.reply || "Here are the best deals matching your request:";
      
      if (aiJson.isOutOfScope) {
        cleanText = "I'm sorry, I specialize in finding the best grocery deals and value for you. I don't have information on the weather, but I can help you find deals in Produce, Dairy, or any other grocery department!";
      }

      let offers: Offer[] | undefined = undefined;
      if (aiJson.showOffers && !aiJson.isOutOfScope) {
        const allOffers = await mockApiService.getOffers();
        const now = new Date();
        offers = allOffers.filter(o => new Date(o.expiry) >= now);
        
        if (aiJson.category && aiJson.category !== 'all') {
          const itemSearch = text.toLowerCase();
          const categoryOffers = offers.filter(o => o.category === aiJson.category);
          const itemSpecificOffers = offers.filter(o => 
            o.deal.toLowerCase().includes(itemSearch) || 
            o.description.toLowerCase().includes(itemSearch)
          );
          
          if (itemSpecificOffers.length > 0) {
            offers = itemSpecificOffers;
          } else {
            offers = categoryOffers;
          }
        }
      }

      const systemResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'system',
        text: cleanText,
        offers,
        suggestedAlternatives: aiJson.suggestedAlternatives,
        timestamp: new Date(),
        isGuardrail: aiJson.isOutOfScope,
      };

      setMessages(prev => [...prev, systemResponse]);
    } catch (error) {
      console.error("Gemini API Error:", error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        sender: 'system',
        text: "I'm having a bit of trouble connecting to my deal database. Please try again in a moment!",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleClip = async (offerId: string) => {
    const isAlreadyClipped = clippedIds.includes(offerId);
    try {
      if (isAlreadyClipped) {
        await mockApiService.unclipOffer(offerId);
        onOffersClipped(clippedIds.filter(id => id !== offerId));
      } else {
        await mockApiService.clipOffer(offerId);
        onOffersClipped([...clippedIds, offerId]);
      }
    } catch (error) {
      console.error("Failed to toggle clip state", error);
    }
  };

  const handleClipAll = async (messageId: string, offers: Offer[]) => {
    const filters = activeFilters[messageId] || { category: 'all' };
    const visibleOffers = offers.filter(o => {
      const matchCategory = filters.category === 'all' || o.category === filters.category;
      return matchCategory;
    });

    const unclipped = visibleOffers.filter(o => !clippedIds.includes(o.id));
    if (unclipped.length === 0) return;

    setIsBatchClippingId(messageId);
    
    try {
      const newIds = [...clippedIds];
      for (const offer of unclipped) {
        await mockApiService.clipOffer(offer.id);
        newIds.push(offer.id);
      }
      onOffersClipped(newIds);
    } catch (error) {
      console.error("Failed batch clipping", error);
    } finally {
      setIsBatchClippingId(null);
    }
  };

  const handleSort = (messageId: string) => {
    const newSort = !sortAsc;
    setSortAsc(newSort);
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.offers) {
        const sorted = [...msg.offers].sort((a, b) => {
          const dateA = new Date(a.expiry).getTime();
          const dateB = new Date(b.expiry).getTime();
          return newSort ? dateA - dateB : dateB - dateA;
        });
        return { ...msg, offers: sorted };
      }
      return msg;
    }));
  };

  const updateMessageFilter = (messageId: string, type: 'category', value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [messageId]: {
        ...(prev[messageId] || { category: 'all' }),
        [type]: value
      }
    }));
  };

  const filteredMessages = useMemo(() => {
    if (!searchTerm.trim()) return messages;
    const lowerSearch = searchTerm.toLowerCase();
    return messages.filter(msg => 
      msg.text.toLowerCase().includes(lowerSearch) || 
      (msg.offers && msg.offers.some(o => 
        o.deal.toLowerCase().includes(lowerSearch) || 
        o.category.toLowerCase().includes(lowerSearch) ||
        o.description.toLowerCase().includes(lowerSearch)
      ))
    );
  }, [messages, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200 relative">
      <div className="bg-blue-600 px-6 py-4 flex items-center justify-between shadow-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white border border-white/30">
            <i className="fa-solid fa-store"></i>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Grocery Deals AI</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></span>
              <p className="text-blue-100 text-[10px] uppercase tracking-widest font-bold">Best Value Expert</p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${showHistory ? 'bg-white text-blue-600' : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'}`}
        >
          <i className="fa-solid fa-clock-rotate-left"></i>
          Recent
        </button>
      </div>

      {showHistory && (
        <div className="absolute inset-x-0 top-[72px] bottom-0 bg-white z-10 flex flex-col animate-in slide-in-from-top duration-300">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
              <i className="fa-solid fa-receipt text-blue-500"></i>
              Based on your History
            </h3>
            <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="flex-grow overflow-y-auto p-4 space-y-3">
            {purchases.map(p => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex justify-between items-center">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                    <i className={`fa-solid ${p.category === 'Produce' ? 'fa-apple-whole' : p.category === 'Dairy' ? 'fa-cheese' : 'fa-basket-shopping'}`}></i>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{p.item}</h4>
                    <p className="text-[9px] text-gray-500 uppercase tracking-tighter">Last bought {p.date}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleSendMessage(`Find me deals on ${p.item}`)}
                  className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-600 hover:text-white transition-all"
                >
                  Find Deals
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 py-2 border-b border-gray-100 bg-white flex items-center gap-3">
        <div className="relative flex-grow">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search within this chat..."
            className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="fa-solid fa-circle-xmark text-xs"></i>
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-6 bg-gray-50/50">
        {filteredMessages.map((msg) => {
          const filters = activeFilters[msg.id] || { category: 'all' };
          const filteredOffers = (msg.offers || []).filter(o => {
            const matchCategory = filters.category === 'all' || o.category === filters.category;
            const matchSearch = !searchTerm.trim() || 
              o.deal.toLowerCase().includes(searchTerm.toLowerCase()) || 
              o.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
              o.description.toLowerCase().includes(searchTerm.toLowerCase());
            return matchCategory && matchSearch;
          });

          const uniqueCategories = Array.from(new Set((msg.offers || []).map(o => o.category)));
          const allFilteredClipped = filteredOffers.length > 0 && filteredOffers.every(o => clippedIds.includes(o.id));
          const someFilteredAvailable = filteredOffers.some(o => !clippedIds.includes(o.id));

          return (
            <div 
              key={msg.id} 
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[90%] sm:max-w-[80%] ${msg.sender === 'user' ? 'order-1' : 'order-2'}`}>
                <div className={`p-4 rounded-2xl shadow-sm transition-all duration-300 ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : msg.isGuardrail 
                      ? 'bg-amber-50 text-amber-900 border border-amber-200 border-l-4 border-l-amber-500 italic rounded-tl-none'
                      : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>

                {msg.sender === 'system' && msg.suggestedAlternatives && msg.suggestedAlternatives.length > 0 && !msg.isGuardrail && (
                  <div className="mt-3 space-y-2 px-1">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-wand-magic-sparkles text-blue-500"></i>
                      Suggested Alternatives
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.suggestedAlternatives.map((alt) => (
                        <button 
                          key={alt}
                          onClick={() => handleSendMessage(`Show me deals for ${alt}`)}
                          className="bg-white border border-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-[10px] font-bold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                        >
                          Explore {alt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {msg.offers && msg.offers.length > 0 && (
                  <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <button 
                        onClick={() => handleSort(msg.id)}
                        className="text-[10px] font-bold uppercase tracking-tight bg-white border border-gray-200 px-3 py-1.5 rounded-full text-gray-500 hover:text-blue-600 hover:border-blue-200 flex items-center gap-2 transition-all shadow-sm"
                      >
                        <i className="fa-solid fa-clock"></i>
                        {sortAsc === null ? 'Sort' : sortAsc ? 'Soonest' : 'Latest'}
                      </button>

                      <div className="relative">
                        <select 
                          value={filters.category}
                          onChange={(e) => updateMessageFilter(msg.id, 'category', e.target.value)}
                          className="appearance-none text-[10px] font-bold uppercase tracking-tight bg-white border border-gray-200 pl-3 pr-8 py-1.5 rounded-full text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm focus:outline-none cursor-pointer"
                        >
                          <option value="all">All Items</option>
                          {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-gray-400 pointer-events-none"></i>
                      </div>

                      <div className="flex-grow"></div>

                      <button 
                        onClick={() => handleClipAll(msg.id, msg.offers!)}
                        disabled={!someFilteredAvailable || isBatchClippingId === msg.id}
                        className={`text-[10px] font-bold uppercase tracking-tight px-4 py-2 rounded-full flex items-center gap-2 transition-all shadow-md border ${
                          allFilteredClipped 
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-default shadow-none' 
                            : 'bg-blue-600 border-blue-700 text-white hover:bg-blue-700 active:scale-95'
                        }`}
                      >
                        {isBatchClippingId === msg.id ? (
                          <><i className="fa-solid fa-circle-notch animate-spin"></i> Clipping...</>
                        ) : allFilteredClipped ? (
                          <><i className="fa-solid fa-check-double"></i> All Saved</>
                        ) : (
                          <><i className="fa-solid fa-bolt"></i> Clip All</>
                        )}
                      </button>
                    </div>
                    
                    {filteredOffers.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredOffers.map((offer) => (
                          <OfferCard 
                            key={offer.id} 
                            offer={offer} 
                            onClip={handleToggleClip}
                            isClipped={clippedIds.includes(offer.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                        <i className="fa-solid fa-filter-circle-xmark text-gray-300 text-3xl mb-2"></i>
                        <p className="text-gray-500 text-sm">No deals match your search criteria.</p>
                      </div>
                    )}
                  </div>
                )}

                <span className="text-[9px] text-gray-400 mt-1.5 block px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
              <div className="flex gap-2 items-center">
                <span className="text-xs text-blue-600 font-bold uppercase tracking-widest text-[10px]">Scouting deals</span>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {!isLoading && !searchTerm && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto bg-gray-50/50 scrollbar-hide border-t border-gray-100">
          <button 
            onClick={() => handleSendMessage("Show me all Dairy deals")}
            className="whitespace-nowrap bg-white border border-gray-200 px-4 py-2 rounded-full text-[11px] font-bold text-gray-600 hover:border-blue-300 hover:text-blue-700 transition-all shadow-sm flex items-center gap-2"
          >
            <i className="fa-solid fa-cheese text-blue-500"></i>
            Dairy
          </button>
          <button 
            onClick={() => handleSendMessage("Show me all Produce deals")}
            className="whitespace-nowrap bg-white border border-gray-200 px-4 py-2 rounded-full text-[11px] font-bold text-gray-600 hover:border-blue-300 hover:text-blue-700 transition-all shadow-sm flex items-center gap-2"
          >
            <i className="fa-solid fa-apple-whole text-red-500"></i>
            Produce
          </button>
          <button 
            onClick={() => handleSendMessage("Search for Almond Milk deals")}
            className="whitespace-nowrap bg-white border border-gray-200 px-4 py-2 rounded-full text-[11px] font-bold text-gray-600 hover:border-blue-300 hover:text-blue-700 transition-all shadow-sm flex items-center gap-2"
          >
            <i className="fa-solid fa-bottle-water text-blue-500"></i>
            Almond Milk
          </button>
          <button 
            onClick={() => handleSendMessage("What's in the Frozen section?")}
            className="whitespace-nowrap bg-white border border-gray-200 px-4 py-2 rounded-full text-[11px] font-bold text-gray-600 hover:border-blue-300 hover:text-blue-700 transition-all shadow-sm flex items-center gap-2"
          >
            <i className="fa-solid fa-snowflake text-blue-300"></i>
            Frozen
          </button>
        </div>
      )}

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2 items-center bg-gray-50 p-1.5 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
            placeholder="Search deals (e.g. 'Almond Milk' or 'Dairy')"
            className="flex-grow bg-transparent px-3 py-2.5 focus:outline-none text-sm placeholder:text-gray-400"
          />
          <button
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isLoading}
            className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:active:scale-100 shadow-lg shadow-blue-500/20"
          >
            <i className="fa-solid fa-paper-plane text-sm"></i>
          </button>
        </div>
      </div>
    </div>
  );
};
