/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Search, Menu, Tv, Globe, X, Volume2, VolumeX, RefreshCw, Copy, Check, ChevronDown, 
  Star, Heart, Languages, LayoutGrid, List, Flame, Radio, Bookmark, Tv2, Maximize, Minimize, 
  SkipForward, SkipBack, Expand, AppWindow, Tv2 as TvIcon, MoreVertical, Send, ThumbsUp, ThumbsDown, 
  Share, Users, MessageSquare, Home, Compass, Settings, Clock, Cast, Bell, PictureInPicture, LogIn, LogOut, User
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, orderBy, addDoc, serverTimestamp, limit, deleteDoc } from 'firebase/firestore';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface Channel {
  name: string;
  url: string;
  urls?: string[];
  logo?: string;
  source?: string;
  country?: string;
}

const ChannelLogo = ({ channel, className = "", isAvatar = false }: { channel: Channel, className?: string, isAvatar?: boolean }) => {
  const [error, setError] = useState(false);
  
  // Deterministic background color based on name
  const getBgColor = (name: string) => {
    const colors = [
      'bg-red-900/40', 'bg-blue-900/40', 'bg-emerald-900/40', 'bg-purple-900/40', 
      'bg-amber-900/40', 'bg-indigo-900/40', 'bg-rose-900/40', 'bg-cyan-900/40'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
       hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const bgColor = getBgColor(channel.name);

  if (channel.logo && !error) {
    const isHttp = channel.logo.startsWith('http:');
    const proxyUrl = isHttp ? `api/image-proxy?url=${encodeURIComponent(channel.logo)}` : channel.logo;
    
    return (
      <div className={`relative flex items-center justify-center overflow-hidden ${isAvatar ? '' : bgColor} ${className}`}>
        {!isAvatar && <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-white/5 opacity-40"></div>}
        <img 
          src={proxyUrl} 
          alt={channel.name} 
          onError={() => setError(true)}
          referrerPolicy="no-referrer"
          className={isAvatar ? "w-full h-full object-cover" : "max-w-[70%] max-h-[70%] object-contain drop-shadow-2xl z-10"}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center font-bold uppercase text-zinc-400 border border-zinc-700/50 ${bgColor} ${className}`}>
      {isAvatar ? (
        <span className="text-white/80">{channel.name.slice(0, 2)}</span>
      ) : (
        <div className="flex flex-col items-center">
          <Tv className="w-10 h-10 mb-2 opacity-30 text-white" />
          <span className="text-[10px] tracking-widest opacity-40 text-white font-black">{channel.name.split(' ')[0]}</span>
        </div>
      )}
    </div>
  );
};

const TRANSLATIONS = {
  en: {
    title: "StreamTube",
    searchPlaceholder: "Search channels...",
    searchCountryPlaceholder: "Search country...",
    noChannels: "No channels found",
    home: "Home",
    sports: "Sports",
    news: "News",
    favorites: "Saved Channels",
    explore: "Explore Regions",
    live: "LIVE",
    chatTitle: "Live Chat",
    share: "Share",
    save: "Save",
    saved: "Saved",
    watching: "watching now",
    proxyMode: "Proxy Mode",
    directMode: "Direct Mode",
    views: "views",
    chatPlaceholder: "Say something...",
    playbackError: "Stream Offline or Blocked",
    retry: "Retry Connection",
    fifa: "FIFA World Cup"
  },
  bn: {
    title: "স্ট্রিমটিউব",
    searchPlaceholder: "চ্যানেল খুঁজুন...",
    searchCountryPlaceholder: "দেশ খুঁজুন...",
    noChannels: "কোনো চ্যানেল পাওয়া যায়নি",
    home: "হোম",
    sports: "খেলাধুলা",
    news: "সংবাদ",
    favorites: "সেভ করা চ্যানেল",
    explore: "অঞ্চল খুঁজুন",
    live: "লাইভ",
    chatTitle: "লাইভ চ্যাট",
    share: "শেয়ার",
    save: "সেভ",
    saved: "সেভড",
    watching: "জন দেখছেন",
    proxyMode: "প্রক্সি মোড",
    directMode: "ডাইরেক্ট মোড",
    views: "ভিউ",
    chatPlaceholder: "চ্যাটে কিছু লিখুন...",
    playbackError: "স্ট্রিম অফলাইন বা ব্লক করা হয়েছে",
    retry: "পুনরায় চেষ্টা করুন",
    fifa: "ফিফা ওয়ার্ল্ড কাপ"
  }
};

const getCountryFlag = (code: string) => {
  if (!code || code.length !== 2) return '🌐';
  const flags: Record<string, string> = {
    bd: '🇧🇩', in: '🇮🇳', us: '🇺🇸', ca: '🇨🇦', gb: '🇬🇧', de: '🇩🇪',
    fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹', au: '🇦🇺', jp: '🇯🇵', kr: '🇰🇷',
    br: '🇧🇷', ar: '🇦🇷', mx: '🇲🇽', za: '🇿🇦', tr: '🇹🇷', cn: '🇨🇳', pk: '🇵🇰',
    uk: '🇬🇧'
  };
  const lower = code.toLowerCase();
  if (flags[lower]) return flags[lower];
  try {
    const codePoints = lower
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return '🌐';
  }
};

const formatCountryName = (filename: string) => {
  try {
    const parts = filename.split('_');
    const code = parts[0].toUpperCase();
    let name = code;
    if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
      const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
      name = regionNames.of(code) || code;
    }
    return name;
  } catch (e) {
    return filename.toUpperCase();
  }
};

const getDeterministicViewers = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Reduce viewer count to a more realistic lower range
  return (Math.abs(hash % 25) / 10 + 0.5).toFixed(1);
};

const ChannelCard = React.memo(({ 
  channel, 
  isDead, 
  onClick, 
  onToggleFavorite, 
  isFavorite, 
  countryName, 
  t 
}: { 
  channel: Channel, 
  isDead: boolean, 
  onClick: () => void, 
  onToggleFavorite: (e: React.MouseEvent) => void, 
  isFavorite: boolean, 
  countryName: string, 
  t: any 
}) => {
  const viewers = React.useMemo(() => getDeterministicViewers(channel.url), [channel.url]);

  return (
    <div 
      className={`flex flex-col cursor-pointer group transition-all duration-300 ${isDead ? 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100' : ''}`} 
      onClick={onClick}
    >
      <div className="w-full aspect-video bg-zinc-900 rounded-xl overflow-hidden relative mb-2.5 shadow-sm border border-zinc-800/60 group-hover:border-zinc-700 transition-all duration-300 flex items-center justify-center">
         <ChannelLogo channel={channel} className="w-full h-full" />
         <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300">
           <Play className="w-12 h-12 text-white/80 scale-90 group-hover:scale-100 transition-transform" fill="currentColor" />
         </div>
         <div className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded textxs font-bold font-mono tracking-wider text-white shadow-sm flex items-center space-x-1.5">
           <span className={`w-1.5 h-1.5 rounded-full ${isDead ? 'bg-zinc-500' : 'bg-red-600 animate-pulse'}`}></span>
           <span className="text-[10px]">{isDead ? 'OFFLINE' : t.live}</span>
         </div>
      </div>
      <div className="flex space-x-3 px-1">
         <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-blue-700 border border-white/10 flex items-center justify-center shrink-0 shadow-lg pointer-events-none">
            <div className="relative">
              <User className="w-5 h-5 text-white" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-[#0f0f0f] flex items-center justify-center">
                <Check className="w-2 h-2 text-white" strokeWidth={5} />
              </div>
            </div>
         </div>
         <div className="flex flex-col overflow-hidden w-full">
            <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2 pr-4 flex items-center gap-1.5 flex-wrap">
              {channel.country && (
                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-bold text-zinc-300 uppercase shrink-0 border border-zinc-700/60 font-mono">
                  <span>{getCountryFlag(channel.country)}</span>
                  <span>{channel.country}</span>
                </span>
              )}
              <span>{channel.name}</span>
            </h3>
            <div className="flex items-center space-x-1.5 mt-1">
               <div className="w-3 h-3 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_5px_rgba(37,99,235,0.3)] shrink-0">
                  <Check className="w-2 h-2 text-white" strokeWidth={6} />
               </div>
               <p className="text-[11px] text-zinc-400 font-bold tracking-tight">Build by Taaissu</p>
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center justify-between w-full">
              <span>{viewers}K {t.watching}</span>
              <button 
                onClick={onToggleFavorite} 
                className={`p-1 hover:bg-zinc-800 rounded-full transition-colors z-10 ${isFavorite ? 'text-red-500' : 'hover:text-white'}`} 
                title={t.save}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
         </div>
      </div>
    </div>
  );
});

const SidebarContent = React.memo(({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  setActiveTab, 
  activeTab, 
  setCurrentChannel, 
  currentChannel, 
  t, 
  lang, 
  user, 
  logout, 
  handleLogin, 
  setIsCountryModalOpen, 
  selectedCountry, 
  deferredPrompt, 
  handleInstallApp 
}: {
  isSidebarOpen: boolean,
  setIsSidebarOpen: (o: boolean) => void,
  setActiveTab: (t: any) => void,
  activeTab: string,
  setCurrentChannel: (c: any) => void,
  currentChannel: any,
  t: any,
  lang: string,
  user: any,
  logout: () => void,
  handleLogin: () => void,
  setIsCountryModalOpen: (o: boolean) => void,
  selectedCountry: string,
  deferredPrompt: any,
  handleInstallApp: () => void
}) => {
  const [isClearing, setIsClearing] = useState(false);

  const clearAppCache = async () => {
    setIsClearing(true);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        for (const key of cacheKeys) {
          await caches.delete(key);
        }
      }
      localStorage.clear();
      sessionStorage.clear();
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] w-64 text-zinc-200">
      <div className="hidden lg:flex items-center px-4 h-14 shrink-0 justify-between">
        <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full cursor-pointer lg:hidden">
          <Menu className="w-6 h-6" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 py-3">
        <div className="px-3 space-y-1">
          <button onClick={() => { setActiveTab('all'); setCurrentChannel(null); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-4 px-3 py-2.5 rounded-lg cursor-pointer ${activeTab === 'all' && !currentChannel ? 'bg-zinc-800 font-bold text-white' : 'hover:bg-zinc-800'}`}>
            <Home className={`w-5 h-5 ${activeTab === 'all' && !currentChannel ? 'fill-current' : ''}`} />
            <span className="text-sm">{t.home}</span>
          </button>
          
          <button onClick={() => { setActiveTab('sports'); setCurrentChannel(null); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-4 px-3 py-2.5 rounded-lg cursor-pointer ${activeTab === 'sports' && !currentChannel ? 'bg-zinc-800 font-bold text-white' : 'hover:bg-zinc-800'}`}>
            <Flame className={`w-5 h-5 ${activeTab === 'sports' && !currentChannel ? 'fill-current' : ''}`} />
            <span className="text-sm">{t.sports}</span>
          </button>
          
          <button onClick={() => { setActiveTab('fifa'); setCurrentChannel(null); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-4 px-3 py-2.5 rounded-lg cursor-pointer ${activeTab === 'fifa' && !currentChannel ? 'bg-zinc-800 font-bold text-white' : 'hover:bg-zinc-800'}`}>
            <Globe className={`w-5 h-5 ${activeTab === 'fifa' && !currentChannel ? 'text-indigo-500' : ''}`} />
            <span className="text-sm font-bold text-indigo-400">{t.fifa}</span>
          </button>

          <button onClick={() => { setActiveTab('news'); setCurrentChannel(null); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-4 px-3 py-2.5 rounded-lg cursor-pointer ${activeTab === 'news' && !currentChannel ? 'bg-zinc-800 font-bold text-white' : 'hover:bg-zinc-800'}`}>
            <Radio className="w-5 h-5" />
            <span className="text-sm">{t.news}</span>
          </button>
        </div>

        <div className="my-3 border-t border-zinc-800 pt-3">
          <div className="px-6 mb-2 text-base font-bold text-white flex items-center">{lang==='en'?'You':'আপনি'}</div>
          <div className="px-3 space-y-1">
            <button onClick={() => { setActiveTab('favorites'); setCurrentChannel(null); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-4 px-3 py-2.5 rounded-lg cursor-pointer ${activeTab === 'favorites' && !currentChannel ? 'bg-zinc-800 font-bold text-white' : 'hover:bg-zinc-800'}`}>
              <Bookmark className={`w-5 h-5 ${activeTab === 'favorites' && !currentChannel ? 'fill-current' : ''}`} />
              <span className="text-sm">{t.favorites}</span>
            </button>
          </div>
        </div>

        <div className="my-3 border-t border-zinc-800 pt-3">
          <div className="px-3 space-y-1">
            {user ? (
              <button onClick={() => logout()} className="w-full flex items-center space-x-4 px-3 py-2.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg cursor-pointer">
                {user.photoURL ? <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" className="w-5 h-5 rounded-full" /> : <LogOut className="w-5 h-5" />}
                <span className="text-sm truncate">Logout ({user.displayName || user.email})</span>
              </button>
            ) : (
              <button onClick={handleLogin} className="w-full flex items-center space-x-4 px-3 py-2.5 hover:bg-zinc-800 text-indigo-400 hover:text-indigo-300 rounded-lg cursor-pointer">
                <LogIn className="w-5 h-5" />
                <span className="text-sm">Sign in with Google</span>
              </button>
            )}
          </div>
        </div>

        <div className="my-3 border-t border-zinc-800 pt-3">
          <div className="px-6 mb-2 text-base font-bold text-white">{t.explore}</div>
          <div className="px-3 space-y-1">
            <button onClick={() => {setIsCountryModalOpen(true); if(window.innerWidth < 1024) setIsSidebarOpen(false);}} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-zinc-800 cursor-pointer">
              <div className="flex items-center space-x-4">
                <Globe className="w-5 h-5" />
                <span className="text-sm truncate max-w-[120px]">{formatCountryName(selectedCountry)}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {deferredPrompt && (
          <div className="my-3 border-t border-zinc-800 pt-3">
            <div className="px-6 mb-2 text-sm font-bold text-teal-400 uppercase tracking-widest">{lang === 'en' ? 'Get the App' : 'অ্যাপ ইন্সটল করুন'}</div>
            <div className="px-3">
              <button 
                onClick={handleInstallApp}
                className="w-full flex items-center space-x-3 px-3 py-2.5 bg-teal-600/10 text-teal-300 hover:bg-teal-600/20 border border-teal-500/20 rounded-lg cursor-pointer transition-all active:scale-95 duration-150"
              >
                <AppWindow className="w-5 h-5 text-teal-400" />
                <span className="text-xs font-bold uppercase tracking-wider">{lang === 'en' ? 'Install App' : 'ইন্সটল করুন'}</span>
              </button>
            </div>
          </div>
        )}

        <div className="my-3 border-t border-zinc-800 pt-3">
          <div className="px-6 mb-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">{lang === 'en' ? 'System' : 'সিস্টেম'}</div>
          <div className="px-3">
            <button 
              onClick={clearAppCache}
              disabled={isClearing}
              className="w-full flex items-center space-x-4 px-3 py-2.5 rounded-lg text-zinc-400 hover:bg-red-950/20 hover:text-red-400 border border-transparent hover:border-red-900/30 font-medium transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isClearing ? 'animate-spin text-red-500' : ''}`} />
              <span className="text-sm">{isClearing ? (lang === 'en' ? 'Clearing...' : 'পরিষ্কার ও রিলোড হচ্ছে...') : (lang === 'en' ? 'Force Refresh / Clear Cache' : 'ক্যাশ বাফার মুছুন (পুনরায় লোড)')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
});

export default function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [showInstallPopup, setShowInstallPopup] = useState<boolean>(false);
  const [deviceOS, setDeviceOS] = useState<'Android' | 'iOS' | 'Windows' | 'Mac' | 'Device'>('Device');

  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('bd');
  const [detectedCountry, setDetectedCountry] = useState<string>('bd');
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [universalSearchResults, setUniversalSearchResults] = useState<Channel[]>([]);
  const [isSearchingGlobally, setIsSearchingGlobally] = useState(false);
  const searchIndexRef = useRef<Channel[] | null>(null);

  // Auto Geolocate on load
  useEffect(() => {
    const detectCountry = async () => {
      // Step A: Guess by user local timezone for instant feedback
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.toLowerCase();
      let inferred = 'bd';
      if (tz.includes('dhaka')) inferred = 'bd';
      else if (tz.includes('kolkata') || tz.includes('calcutta') || tz.includes('delhi')) inferred = 'in';
      else if (tz.includes('london')) inferred = 'uk';
      else if (tz.includes('new_york') || tz.includes('los_angeles') || tz.includes('chicago')) inferred = 'us';
      else if (tz.includes('toronto')) inferred = 'ca';
      else if (tz.includes('berlin')) inferred = 'de';
      else if (tz.includes('paris')) inferred = 'fr';
      else if (tz.includes('istanbul')) inferred = 'tr';
      else if (tz.includes('sao_paulo')) inferred = 'br';

      setDetectedCountry(inferred);

      // Step B: Fetch micro ipapi geolocation details for exact match
      try {
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
          const data = await response.json();
          if (data && data.country_code) {
            const code = data.country_code.toLowerCase();
            setDetectedCountry(code);
          }
        }
      } catch (err) {
        // Silent timezone fallback, no warning or log to prevent noisy UI toasts
      }
    };
    detectCountry();
  }, []);

  // Sync selected country with auto-detected country
  useEffect(() => {
    if (countries.length > 0) {
      if (countries.includes(detectedCountry)) {
        setSelectedCountry(detectedCountry);
      } else if (countries.includes('bd')) {
        setSelectedCountry('bd');
      } else {
        setSelectedCountry(countries[0]);
      }
    }
  }, [countries, detectedCountry]);

  // Universal Global Search Hook
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setUniversalSearchResults([]);
      return;
    }

    const searchGlobally = async () => {
      setIsSearchingGlobally(true);
      try {
        if (!searchIndexRef.current) {
          const res = await fetch(`static-api/search-index.json`);
          if (res.ok) {
            searchIndexRef.current = await res.json();
          } else {
            // Lazy cloudflare safe fallback path to relative static path or API
            const fallbackRes = await fetch(`/static-api/search-index.json`);
            if (fallbackRes.ok) {
              searchIndexRef.current = await fallbackRes.json();
            } else {
              // Direct fallback (Express backend proxy)
              const apiRes = await fetch(`api/search?q=${encodeURIComponent(debouncedSearch)}`);
              if (apiRes.ok) {
                const data = await apiRes.json();
                setUniversalSearchResults(data);
                setIsSearchingGlobally(false);
                return;
              }
            }
          }
        }

        if (searchIndexRef.current) {
          const queryStr = debouncedSearch.toLowerCase().trim();
          const results = searchIndexRef.current.filter(ch => 
            ch.name.toLowerCase().includes(queryStr) || 
            (ch.country && ch.country.toLowerCase().includes(queryStr))
          );
          setUniversalSearchResults(results);
        } else {
          setUniversalSearchResults([]);
        }
      } catch (err) {
        console.error("Global search index failed, falling back to API:", err);
        try {
          const apiRes = await fetch(`api/search?q=${encodeURIComponent(debouncedSearch)}`);
          if (apiRes.ok) {
            const data = await apiRes.json();
            setUniversalSearchResults(data);
          } else {
            setUniversalSearchResults([]);
          }
        } catch (e) {
          setUniversalSearchResults([]);
        }
      } finally {
        setIsSearchingGlobally(false);
      }
    };
    searchGlobally();
  }, [debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [errorMsg, setErrorMsg] = useState(false);
  const [streamMode, setStreamMode] = useState<'proxy' | 'direct'>('direct');
  const [lang, setLang] = useState<'en' | 'bn'>('en');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'sports' | 'news' | 'fifa'>('all');
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [isClosingMiniPlayer, setIsClosingMiniPlayer] = useState(false);

  const [user, loadingAuth] = useAuthState(auth);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [favorites, setFavorites] = useState<Channel[]>([]);
  const [deadChannels, setDeadChannels] = useState<Set<string>>(new Set());

  // Infinite Scroll / Lazy Loading State
  const [visibleCount, setVisibleCount] = useState(50);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCssFullscreen, setIsCssFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isHoveringVideo, setIsHoveringVideo] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRefMobile = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [chatMessages, setChatMessages] = useState<{id?: string, user: string, userPhoto?: string, text: string, time: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatExpanded, setIsChatExpanded] = useState<boolean>(false);
  
  const [baseLikes, setBaseLikes] = useState(0);
  const [baseDislikes, setBaseDislikes] = useState(0);
  const [userInteraction, setUserInteraction] = useState<'like' | 'dislike' | null>(null);

  const [selectedServer, setSelectedServer] = useState(0);
  const [serverSource, setServerSource] = useState<'1' | '2'>('1');

  const [qualityLevels, setQualityLevels] = useState<{ id: number, label: string }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const t = TRANSLATIONS[lang];

  // Listen for PWA installation prompt and online/offline status
  useEffect(() => {
    // OS Detection
    const ua = navigator.userAgent;
    let currentOS: 'Android' | 'iOS' | 'Windows' | 'Mac' | 'Device' = 'Device';
    if (/android/i.test(ua)) currentOS = 'Android';
    else if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) currentOS = 'iOS';
    else if (/Mac OS/i.test(ua)) currentOS = 'Mac';
    else if (/Windows/i.test(ua)) currentOS = 'Windows';
    
    setDeviceOS(currentOS);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    const dismissed = localStorage.getItem('installPromptDismissed') === 'true';

    setDeviceOS(currentOS);

    if (isStandalone) {
      setIsAppInstalled(true);
      setShowInstallPopup(false);
    } else if (!dismissed) {
      if (currentOS === 'iOS') {
        setTimeout(() => setShowInstallPopup(true), 3000);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Only show popup if NOT already installed/standalone and not dismissed
      if (!dismissed && !isStandalone && !window.matchMedia('(display-mode: standalone)').matches) {
        setTimeout(() => setShowInstallPopup(true), 2000);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsAppInstalled(true);
      setShowInstallPopup(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const dismissInstallPopup = () => {
    setShowInstallPopup(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };


  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      return;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA Prompt choice outcome: ${outcome}`);
    setDeferredPrompt(null);
  };

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error?.message || String(error),
      operation,
      path,
      uid: user?.uid,
      time: new Date().toISOString()
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
  };

  useEffect(() => {
    if (currentChannel) {
      // Create a deterministic base like/dislike count
      const seed = currentChannel.url.split('').reduce((a,b)=>a+b.charCodeAt(0),0);
      setBaseLikes(Math.floor(seed * 2.5) % 15000 + 500);
      setBaseDislikes(Math.floor(seed * 0.3) % 500);
      setUserInteraction(null);
      
      const safeChannelId = btoa(currentChannel.url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      
      if (user) {
        const intRef = doc(db, 'users', user.uid, 'interactions', safeChannelId);
        getDoc(intRef).then(d => {
          if (d.exists()) {
             setUserInteraction(d.data().type);
          }
        });
      }
      
      // Load Chat Messages
      const q = query(collection(db, 'messages'), where('channelId', '==', safeChannelId), limit(100));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({id: doc.id, ...doc.data() as any}));
        msgs.sort((a,b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
        setChatMessages(msgs.map(m => ({
           id: m.id,
           user: m.userName,
           userPhoto: m.userPhoto,
           text: m.text,
           time: m.createdAt ? new Date(m.createdAt.toMillis()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
        })));
      }, (error) => {
        handleFirestoreError(error, 'LIST', 'messages');
      });
      return () => unsubscribe();
    }
  }, [currentChannel, user]);

  const handleInteraction = async (type: 'like' | 'dislike') => {
     if (!user) {
        handleLogin();
        return;
     }
     if (!currentChannel) return;
     const safeChannelId = btoa(currentChannel.url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
     const intRef = doc(db, 'users', user.uid, 'interactions', safeChannelId);
     
     if (userInteraction === type) {
        await deleteDoc(intRef);
        setUserInteraction(null);
     } else {
        await setDoc(intRef, { channelId: safeChannelId, type });
        setUserInteraction(type);
     }
  };

  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.favorites) {
            // Prevent redundant state updates if they are already deep equal
            if (JSON.stringify(data.favorites) !== JSON.stringify(favorites)) {
              setFavorites(data.favorites);
            }
          }
          if (data.deadChannels) {
            const newDead = new Set<string>(data.deadChannels);
            if (newDead.size !== deadChannels.size || ![...newDead].every(url => deadChannels.has(url))) {
               setDeadChannels(newDead);
            }
          }
        }
      }, (error) => {
        handleFirestoreError(error, 'GET', `users/${user.uid}`);
      });
      return unsubscribe;
    } else {
      try {
        const saved = localStorage.getItem('iptv_favorites');
        if (saved) setFavorites(JSON.parse(saved));
        const savedDead = localStorage.getItem('iptv_dead_channels');
        if (savedDead) setDeadChannels(new Set(JSON.parse(savedDead)));
      } catch { }
    }
  }, [user]);

  // Combined Sync effect to avoid multiple writes
  useEffect(() => {
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      setDoc(docRef, { 
        favorites, 
        deadChannels: [...deadChannels] 
      }, { merge: true }).catch(err => {
        handleFirestoreError(err, 'WRITE', `users/${user.uid}`);
      });
    } else {
      localStorage.setItem('iptv_favorites', JSON.stringify(favorites));
      localStorage.setItem('iptv_dead_channels', JSON.stringify([...deadChannels]));
    }
  }, [favorites, deadChannels, user]);

  useEffect(() => {
    if (currentChannel) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
        window.scrollTo(0, 0);
      });
    }
  }, [currentChannel]);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        let res = await fetch('api/channels');
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setCountries(data);
      } catch (err) {
        // Fallback for GitHub Pages (Static Hosting)
        try {
          const res = await fetch('static-api/channels.json');
          const data = await res.json();
          setCountries(data);
        } catch (e) {
          console.error("Static fallback failed", e);
        }
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    if (!selectedCountry) return;
    const fetchChannels = async () => {
      setLoading(true);
      const fetchId = activeTab === 'fifa' ? 'fifa' : activeTab === 'sports' ? 'sports' : selectedCountry;
      try {
        let res = await fetch(`api/channels/${fetchId}?source=${serverSource}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setChannels(data);
      } catch (err) {
        // Fallback for GitHub Pages
        try {
          const res = await fetch(`static-api/${fetchId}.json`);
          const data = await res.json();
          setChannels(data);
        } catch (e) {
          console.error("Static channels fallback failed", e);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchChannels();
  }, [selectedCountry, serverSource, activeTab]);

  useEffect(() => {
    let list = channels;
    if (activeTab === 'favorites') {
      list = favorites;
    } else if (activeTab === 'fifa' || activeTab === 'sports') {
      // Use the pre-compiled global static lists without extra clientside pruning
      list = channels;
    } else if (activeTab === 'news') {
      const kw = ['news', 'somoy', 'jamuna', 'ekattor', 'independent', 'bbc', 'cnn', 'al jazeera'];
      list = channels.filter(c => kw.some(k => c.name.toLowerCase().includes(k)));
    }
    if (debouncedSearch) {
      list = list.filter(c => c.name.toLowerCase().includes(debouncedSearch.toLowerCase()));
    }
    setFilteredChannels(list);
  }, [debouncedSearch, channels, favorites, activeTab]);

  const sortedFilteredChannels = React.useMemo(() => {
    let sorted = [...filteredChannels];
    
    // For FIFA, prioritze specific channel keywords if they exist
    if (activeTab === 'fifa') {
      const priorityKeywords = ['fifa', 'world cup', 'plus', 'star'];
      sorted.sort((a, b) => {
        const aPriority = priorityKeywords.some(k => a.name.toLowerCase().includes(k)) ? 0 : 1;
        const bPriority = priorityKeywords.some(k => b.name.toLowerCase().includes(k)) ? 0 : 1;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.name.localeCompare(b.name);
      });
    } else {
      sorted.sort((a, b) => {
        const aDead = deadChannels.has(a.url);
        const bDead = deadChannels.has(b.url);
        
        if (aDead !== bDead) {
          return aDead ? 1 : -1;
        }
        
        // Secondary sort: Server 1 channels first
        if (a.source === 'server1' && b.source !== 'server1') return -1;
        if (a.source !== 'server1' && b.source === 'server1') return 1;
        
        // Tertiary sort: Alphabetical
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
    }
    return sorted;
  }, [filteredChannels, deadChannels, activeTab]);

  const displayChannelsList = React.useMemo(() => {
    if (debouncedSearch && universalSearchResults.length > 0) {
      return universalSearchResults;
    }
    return sortedFilteredChannels;
  }, [debouncedSearch, universalSearchResults, sortedFilteredChannels]);

  useEffect(() => {
    setVisibleCount(50);
    if (scrollContainerRef.current) {
       scrollContainerRef.current.scrollTop = 0;
    }
  }, [selectedCountry, activeTab, searchQuery]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + 50);
      }
    }, { threshold: 0.1 });

    if (loadMoreTriggerRef.current) {
      observerRef.current.observe(loadMoreTriggerRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [sortedFilteredChannels, visibleCount]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
    if (chatScrollRefMobile.current) {
      chatScrollRefMobile.current.scrollTop = chatScrollRefMobile.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => { setIsBuffering(false); setIsPlaying(true); };
    const handlePause = () => setIsPlaying(false);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
    };
  }, [currentChannel]);

  // Auto-PiP on tab switch or app change (minimizing)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        const video = videoRef.current;
        if (video && isPlaying) {
          const isCurrentlyPiP = document.pictureInPictureElement === video || 
            (video as any).webkitPresentationMode === 'picture-in-picture';

          if (!isCurrentlyPiP) {
            try {
              if (document.pictureInPictureEnabled) {
                await video.requestPictureInPicture();
                console.log("Automatic PiP entered successfully on minimization.");
              } else if ((video as any).webkitSupportsPresentationMode && typeof (video as any).webkitSetPresentationMode === 'function') {
                (video as any).webkitSetPresentationMode('picture-in-picture');
                console.log("iOS Safari: Automatic PiP entered successfully on minimization.");
              }
            } catch (err) {
              console.warn("Could not automatically enter PiP:", err);
            }
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying]);

  // Synchronize Media Session Metadata and Playback State
  useEffect(() => {
    if ('mediaSession' in navigator && currentChannel) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentChannel.name,
          artist: 'StreamTube Live IPTV',
          album: currentChannel.country ? formatCountryName(currentChannel.country) : 'Live Broadcast',
          artwork: [
            { src: currentChannel.logo || '/icon.svg', sizes: '128x128', type: 'image/png' },
            { src: currentChannel.logo || '/icon.svg', sizes: '512x512', type: 'image/png' }
          ]
        });

        // Set playback state
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

        // Action Handlers
        navigator.mediaSession.setActionHandler('play', () => {
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        });

        navigator.mediaSession.setActionHandler('pause', () => {
          if (videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        });

        navigator.mediaSession.setActionHandler('nexttrack', () => {
          if (filteredChannels.length > 0) {
            const idx = filteredChannels.findIndex(c => c.url === currentChannel.url);
            if (idx !== -1) {
              setCurrentChannel(filteredChannels[(idx + 1) % filteredChannels.length]);
            }
          }
        });

        navigator.mediaSession.setActionHandler('previoustrack', () => {
          if (filteredChannels.length > 0) {
            const idx = filteredChannels.findIndex(c => c.url === currentChannel.url);
            if (idx !== -1) {
              const prevIdx = (idx - 1 + filteredChannels.length) % filteredChannels.length;
              setCurrentChannel(filteredChannels[prevIdx]);
            }
          }
        });
      } catch (err) {
        console.error('Error updating media session:', err);
      }
    }
  }, [currentChannel, isPlaying, filteredChannels]);

  useEffect(() => {
    setSelectedServer(0);
    setQualityLevels([]);
    setShowQualityMenu(false);
  }, [currentChannel]);

  useEffect(() => {
    if (currentChannel && videoRef.current) {
      const video = videoRef.current;
      try {
        (video as any).autoPictureInPicture = true;
      } catch (e) {
        console.warn(e);
      }
      setErrorMsg(false);
      setIsBuffering(true);
      
      const streamUrl = currentChannel.urls && currentChannel.urls[selectedServer] 
        ? currentChannel.urls[selectedServer] 
        : currentChannel.url;

      // Auto-upgrade simple HTTP URLs to HTTPS on secure pages to avoid Mixed Content block by browsers
      const isHttpsPage = window.location.protocol === 'https:';
      const upgradedUrl = (isHttpsPage && streamUrl.startsWith('http:')) 
        ? streamUrl.replace('http:', 'https:') 
        : streamUrl;

      const targetUrl = streamMode === 'proxy' 
        ? `api/proxy?url=${encodeURIComponent(upgradedUrl)}` : upgradedUrl;
      
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new Hls({ 
          maxBufferLength: 10, 
          maxMaxBufferLength: 30,
          enableWorker: true, 
          lowLatencyMode: true,
          backBufferLength: 30,
          progressive: true,
          fragLoadingTimeOut: 20000,
          manifestLoadingTimeOut: 20000
        });
        hlsRef.current = hls;
        hls.loadSource(targetUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          setQualityLevels([
            { id: -1, label: 'Auto' },
            ...hls.levels.map((level, index) => ({
              id: index,
              label: level.height ? `${level.height}p` : `Level ${index}`
            }))
          ]);
          setCurrentQuality(hls.currentLevel);
          video.play().then(() => { setIsPlaying(true); setIsBuffering(false); }).catch(() => {});
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          if (hls.autoLevelEnabled) {
            setCurrentQuality(-1);
          } else {
            setCurrentQuality(data.level);
          }
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            if (streamMode === 'proxy') setStreamMode('direct');
            else { 
              setErrorMsg(true); 
              setIsBuffering(false); 
              setDeadChannels(prev => new Set(prev).add(currentChannel.url));
              hls.destroy(); 
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = targetUrl;
        video.onerror = () => {
          if (streamMode === 'proxy') setStreamMode('direct');
          else {
            setErrorMsg(true);
            setIsBuffering(false);
            setDeadChannels(prev => new Set(prev).add(currentChannel.url));
          }
        };
        video.play().catch(() => {});
      }
    }
  }, [currentChannel, streamMode, selectedServer]);

  useEffect(() => {
    const fn = () => setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    document.addEventListener('fullscreenchange', fn);
    document.addEventListener('webkitfullscreenchange', fn);
    return () => {
      document.removeEventListener('fullscreenchange', fn);
      document.removeEventListener('webkitfullscreenchange', fn);
    };
  }, []);

  // Initialize baseline history entry state with depth 0 on mount
  useEffect(() => {
    try {
      if (!window.history.state || !window.history.state.isStreamTube) {
        window.history.replaceState({ depth: 0, isStreamTube: true }, '');
      }
    } catch (e) {
      console.warn("History API is restricted or not supported in this environment:", e);
    }
  }, []);

  // Monitor open overlay counts and sync window history
  useEffect(() => {
    try {
      const hasPlayer = currentChannel !== null;
      const hasModal = isCountryModalOpen;
      const hasMobileSidebar = isSidebarOpen && window.innerWidth < 1024;

      let activeCount = 0;
      if (hasPlayer) activeCount++;
      if (hasModal) activeCount++;
      if (hasMobileSidebar) activeCount++;

      const currentDepth = window.history.state?.depth || 0;

      if (activeCount > currentDepth) {
        // User opened a new overlay; push a new entry to browser history
        window.history.pushState({ depth: currentDepth + 1, isStreamTube: true }, '');
      } else if (activeCount < currentDepth) {
        // User closed an overlay manually in UI; go back in window history to stay in sync
        window.history.back();
      }
    } catch (e) {
      console.warn("History sync failed:", e);
    }
  }, [currentChannel, isCountryModalOpen, isSidebarOpen]);

  // Handle hardware / browser back button click (popstate)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Close the most recently opened overlay sequential to match the popped history entry
      if (isCountryModalOpen) {
        setIsCountryModalOpen(false);
      } else if (isSidebarOpen && window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else if (currentChannel !== null) {
        setCurrentChannel(null);
        if (window.innerWidth > 1024) {
          setIsSidebarOpen(true);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isCountryModalOpen, isSidebarOpen, currentChannel]);

  const handleMouseMoveControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    
    const timeoutDuration = window.innerWidth < 1024 ? 2000 : 3000;
    
    controlsTimeoutRef.current = setTimeout(() => {
      // Auto-hide if playing and (is desktop and hovering) OR (is mobile/tablet)
      if (isPlaying && (window.innerWidth < 1024 || isHoveringVideo)) {
        setShowControls(false);
      }
    }, timeoutDuration);
  };

  const handleMouseLeaveVideo = () => {
    setIsHoveringVideo(false);
    if (isPlaying) setShowControls(false);
  };
  const handleMouseEnterVideo = () => {
    setIsHoveringVideo(true);
    setShowControls(true);
  };

  const toggleFavorite = (channel: Channel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (favorites.some(f => f.url === channel.url)) {
      setFavorites(favorites.filter(f => f.url !== channel.url));
    } else {
      setFavorites([...favorites, channel]);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const handlePiPClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const video = videoRef.current;
      if (video) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
          await video.requestPictureInPicture();
        } else if ((video as any).webkitSupportsPresentationMode && typeof (video as any).webkitSetPresentationMode === 'function') {
          // iOS Safari presentation mode toggling support
          if ((video as any).webkitPresentationMode === 'picture-in-picture') {
            (video as any).webkitSetPresentationMode('inline');
          } else {
            (video as any).webkitSetPresentationMode('picture-in-picture');
          }
        } else {
          setIsMiniPlayer(!isMiniPlayer);
        }
      }
    } catch (err) {
      console.error('PiP Error:', err);
      setIsMiniPlayer(!isMiniPlayer);
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (isMiniPlayer) {
      setIsMiniPlayer(false);
      return;
    }

    if (window.innerWidth < 1024) {
      const nextState = !showControls;
      setShowControls(nextState);
      if (nextState && isPlaying) {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2500);
      }
    } else {
      handlePlayToggle(e);
    }
  };

  const closeMiniPlayer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClosingMiniPlayer(true);
    setTimeout(() => {
      setCurrentChannel(null);
      setIsMiniPlayer(false);
      setIsClosingMiniPlayer(false);
    }, 300);
  };

  const toggleFullscreen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const videoContainer = videoContainerRef.current;
    const video = videoRef.current;
    if (!videoContainer || !video) return;
    
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement && !isCssFullscreen) {
        let success = false;
        if (videoContainer.requestFullscreen) {
          try {
            const promise = videoContainer.requestFullscreen();
            if (promise) await promise.catch(() => { setIsCssFullscreen(true); success = true; });
            success = true;
          } catch(e) { /* fallback */ }
        } else if ((videoContainer as any).webkitRequestFullscreen) {
          try {
            const promise = (videoContainer as any).webkitRequestFullscreen();
            if (promise) await promise.catch(() => { setIsCssFullscreen(true); success = true; });
            success = true;
          } catch(e) { /* fallback */ }
        }
        
        if (!success) {
           if ((video as any).webkitEnterFullscreen) {
             (video as any).webkitEnterFullscreen();
           } else {
             setIsCssFullscreen(true);
           }
        }
      } else {
        if (isCssFullscreen) {
          setIsCssFullscreen(false);
        } else if (document.exitFullscreen) {
          await document.exitFullscreen().catch(() => setIsCssFullscreen(false));
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen().catch(() => setIsCssFullscreen(false));
        } else if ((video as any).webkitExitFullscreen) {
          (video as any).webkitExitFullscreen();
          setIsCssFullscreen(false);
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
      setIsCssFullscreen(!isCssFullscreen);
    }
  };

  const handlePlayToggle = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      // Auto-hide controls after a short delay on play
      const timeoutDuration = window.innerWidth < 1024 ? 1500 : 2500;
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), timeoutDuration);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(true); // Keep visible when paused
    }
  };

  const playNextChannel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (filteredChannels.length === 0) return;
    if (!currentChannel) setCurrentChannel(filteredChannels[0]);
    else {
      const idx = filteredChannels.findIndex(c => c.url === currentChannel.url);
      setCurrentChannel(filteredChannels[(idx + 1) % filteredChannels.length]);
    }
  };

  const sidebarVisibleClasses = isSidebarOpen ? 'translate-x-0' : '-translate-x-full';
  
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!chatInput.trim()) return;
    if(!user) {
      handleLogin();
      return;
    }
    if(!currentChannel) return;
    
    const safeChannelId = btoa(currentChannel.url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const msgText = chatInput;
    setChatInput('');
    
    await addDoc(collection(db, 'messages'), {
      channelId: safeChannelId,
      uid: user.uid,
      userName: user.displayName || 'Anonymous',
      userPhoto: user.photoURL || '',
      text: msgText,
      createdAt: serverTimestamp()
    });
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in chat or search
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
        return;
      }

      if (currentChannel) {
        switch (e.code) {
          case 'Space':
            e.preventDefault();
            handlePlayToggle();
            break;
          case 'KeyM':
            e.preventDefault();
            setIsMuted(prev => !prev);
            if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
            break;
          case 'KeyF':
            e.preventDefault();
            toggleFullscreen(e as any);
            break;
          case 'KeyL': // Like
            e.preventDefault();
            handleInteraction('like');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChannel, isPlaying, isMuted, isFullscreen, isCssFullscreen]);

  if (loadingAuth) {
    return (
      <div className="h-screen w-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-screen bg-[#0f0f0f] text-white font-sans overflow-hidden select-none">
      
      {/* Top Navbar */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800/50 shrink-0 bg-[#0f0f0f] z-50">
        <div className="flex items-center space-x-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-zinc-800 rounded-full cursor-pointer">
            <Menu className="w-6 h-6 text-zinc-100"/>
          </button>
          <div className="flex items-center space-x-1.5 cursor-pointer" onClick={() => { setCurrentChannel(null); if (window.innerWidth > 1024) setIsSidebarOpen(true); }}>
            <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-800">
              <img src="/icon.svg" alt="Logo" className="w-full h-full object-contain p-1" />
            </div>
            <span className="font-bold text-xl tracking-tighter hidden sm:block">Stream<span className="font-normal text-white">Tube</span></span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-2xl px-4 flex items-center justify-center hidden sm:flex">
          <div className="flex flex-1 items-center w-full bg-[#121212] border border-zinc-800 rounded-full overflow-hidden focus-within:border-blue-600 ml-4 max-w-lg shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
            <div className="pl-4 pr-3 py-2 border-r border-zinc-800 text-xs font-medium text-zinc-400 bg-[#1a1a1a] flex items-center space-x-1 shrink-0">
               <span>{getCountryFlag(selectedCountry)}</span>
               <span className="uppercase tracking-wider hidden md:inline">{selectedCountry}</span>
            </div>
            <input 
              type="text" 
              placeholder={t.searchPlaceholder} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent px-4 py-2 outline-none text-sm placeholder-zinc-500 font-medium"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="px-2 text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4"/>
              </button>
            )}
            <button className="px-5 py-2.5 bg-[#222222] hover:bg-[#333333] transition-colors border-l border-zinc-800 flex items-center justify-center text-zinc-300 cursor-pointer">
              <Search className="w-4 h-4 opacity-70" />
            </button>
          </div>
          <button className="ml-3 p-2.5 bg-[#181818] hover:bg-zinc-800 rounded-full cursor-pointer transition-colors" onClick={() => setLang(lang === 'en' ? 'bn' : 'en')} title="Change App Language">
             <Languages className="w-5 h-5 text-zinc-200" />
          </button>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-3">
          <button className="p-2 hover:bg-zinc-800 rounded-full sm:hidden" onClick={() => setIsCountryModalOpen(true)}>
            <Globe className="w-5 h-5"/>
          </button>
          <button className="p-2 hover:bg-zinc-800 rounded-full hidden sm:block">
            <Bell className="w-5 h-5" />
          </button>
          
          {user ? (
            <div className="group relative ml-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm cursor-pointer shadow-md border border-zinc-700 overflow-hidden">
                 {user?.photoURL ? <img src={user.photoURL} referrerPolicy="no-referrer" alt="user" className="w-full h-full object-cover" /> : user?.displayName?.charAt(0) || 'U'}
              </div>
              {/* Dropdown for logout */}
              <div className="absolute right-0 top-full mt-2 hidden group-hover:block bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-2 z-[100] min-w-[150px]">
                 <div className="px-3 py-2 border-b border-zinc-700 mb-2">
                   <p className="text-xs font-bold text-white truncate">{user?.displayName}</p>
                   <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
                 </div>
                 <button onClick={() => logout()} className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-zinc-700 rounded-md text-sm text-zinc-300 transition-colors">
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                 </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 px-4 py-1.5 border border-zinc-800 hover:border-[#3ea6ff]/30 hover:bg-[#3ea6ff]/10 rounded-full transition-all duration-300 group"
            >
              <User className="w-5 h-5 text-[#3ea6ff] hidden xs:block sm:hidden" />
              <span className="text-sm font-medium text-[#3ea6ff]">Sign in</span>
            </button>
          )}
        </div>
      </div>

      {isOffline && (
        <div className="bg-amber-500 text-zinc-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shrink-0 select-none z-40">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-950 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-900"></span>
            </span>
            <span>You are currently browsing offline. Channels and country lists are running from your offline fallback cache.</span>
          </div>
          <button 
            onClick={() => setIsOffline(!navigator.onLine)} 
            className="bg-zinc-950 text-amber-500 hover:bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 font-bold text-[10px] uppercase transition-all"
          >
            Refresh Status
          </button>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Drawer sidebar for Mobile and Desktop Overlay */}
        {/* Fixed over content on smaller screens, inline block on large screens if NO video is playing. If video is playing, overlay on large screens too */}
        <AnimatePresence>
          {isSidebarOpen && (
             <>
               {/* Mobile/Overlay Backdrop */}
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className={`fixed inset-0 bg-black/60 z-40 lg:hidden`}
                 onClick={() => setIsSidebarOpen(false)}
               />
               
                <motion.div 
                  initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'tween', duration: 0.2 }}
                  className={`absolute top-0 left-0 bottom-0 z-50 shadow-2xl lg:relative lg:z-10`}
                >
                  <SidebarContent 
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    setActiveTab={setActiveTab}
                    activeTab={activeTab}
                    setCurrentChannel={setCurrentChannel}
                    currentChannel={currentChannel}
                    t={t}
                    lang={lang}
                    user={user}
                    logout={logout}
                    handleLogin={handleLogin}
                    setIsCountryModalOpen={setIsCountryModalOpen}
                    selectedCountry={selectedCountry}
                    deferredPrompt={deferredPrompt}
                    handleInstallApp={handleInstallApp}
                  />
                </motion.div>
             </>
          )}
        </AnimatePresence>

        {/* Home Browse vs Watch Mode */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent bg-[#0f0f0f]">
          
          {(!currentChannel || isMiniPlayer) && (
            /* HOME BROWSING MODE */
            <div className="p-4 sm:p-6 lg:p-8 max-w-[2000px] mx-auto min-h-full">
              {/* Category Pills directly below nav on mobile */}
              <div className="flex sm:hidden overflow-x-auto space-x-2 pb-3 mb-2 scrollbar-none">
                 <div className="flex items-center bg-[#222] border border-zinc-800 rounded-lg overflow-hidden flex-1 shrink-0 min-w-[200px]">
                    <span className="px-3 text-[10px] uppercase font-bold text-zinc-400 bg-zinc-900 h-full flex items-center">{selectedCountry}</span>
                    <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent text-xs w-full py-2 px-2 outline-none" />
                 </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                 <h2 className="text-xl sm:text-2xl font-bold font-sans text-white">
                   {activeTab === 'all' ? t.explore : activeTab === 'favorites' ? t.favorites : activeTab === 'news' ? t.news : activeTab === 'fifa' ? t.fifa : t.sports}
                 </h2>
                 <span className="text-sm font-medium text-zinc-500 hidden sm:block">{displayChannelsList.length} {t.views.replace('views', 'streams')}</span>
              </div>

              {activeTab === 'all' && (
                <div className="flex space-x-2 mb-6">
                  <button 
                    onClick={() => setServerSource('1')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${serverSource === '1' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                  >
                    Server 1
                  </button>
                  <button 
                    onClick={() => setServerSource('2')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${serverSource === '2' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                  >
                    Server 2
                  </button>
                </div>
              )}

              {loading ? (
                <div className="w-full flex flex-col justify-center items-center py-20">
                   <div className="w-10 h-10 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin"></div>
                </div>
              ) : displayChannelsList.length === 0 ? (
                <div className="w-full flex flex-col justify-center items-center py-20 text-zinc-500">
                   <Tv className="w-16 h-16 mb-4 opacity-50" />
                   <p className="font-bold text-lg">{t.noChannels}</p>
                </div>
              ) : (
                <>
                  {debouncedSearch && universalSearchResults.length > 0 && (
                    <div className="mb-4 text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center space-x-2 animate-pulse font-mono">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                      <span>🌐 Universal Search Results ({universalSearchResults.length} channels found globally)</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 pb-10">
                    {displayChannelsList.slice(0, visibleCount).map(channel => (
                      <ChannelCard 
                        key={`${channel.url}-${channel.name}`}
                        channel={channel}
                        isDead={deadChannels.has(channel.url)}
                        isFavorite={favorites.some(f => f.url === channel.url)}
                        onClick={() => { setCurrentChannel(channel); setIsSidebarOpen(false); setIsMiniPlayer(false); scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        onToggleFavorite={(e) => toggleFavorite(channel, e)}
                        countryName={formatCountryName(channel.country || selectedCountry)}
                        t={t}
                      />
                    ))}
                  </div>
                  {/* Infinity Scroll Loading Trigger */}
                  <div ref={loadMoreTriggerRef} className="h-20 w-full flex items-center justify-center">
                    {visibleCount < displayChannelsList.length && (
                      <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></div>
                    )}
                  </div>
                </>
              )}
            </div>

          )}
          
          {currentChannel && (
            <div className={isMiniPlayer ? 'fixed bottom-20 items-end right-4 w-72 sm:w-80 z-50' : ''}>
              {/* Watching Content Grid */}
              <div className={`${isMiniPlayer ? 'w-full' : 'w-full max-w-[1600px] mx-auto p-0 lg:p-6 lg:flex lg:space-x-6 min-h-full'}`}>
                
                {/* Main Column: Video Player, Info */}
                <div className={`flex-1 min-w-0 flex flex-col ${isMiniPlayer ? 'w-full' : 'lg:w-2/3 xl:w-3/4'}`}>
                  
                  {/* 16:9 Video Player - Sticky on mobile for simultaneous chat */}
                  <div 
                    ref={videoContainerRef}
                    className={`w-full bg-black group overflow-hidden ${isMiniPlayer ? 'aspect-video rounded-xl border-2 border-indigo-500/50 shadow-2xl relative pointer-events-auto cursor-pointer' : `sticky top-0 lg:top-4 z-[40] ${isCssFullscreen ? 'fixed inset-0 z-[99999] h-[100dvh]' : `relative ${isFullscreen ? '' : 'aspect-video rounded-none lg:rounded-xl shadow-lg'}`}`}`}
                    onMouseMove={handleMouseMoveControls}
                    onMouseLeave={handleMouseLeaveVideo}
                    onMouseEnter={handleMouseEnterVideo}
                    onClick={handleContainerClick}
                  >
                    {isMiniPlayer && (
                      /* Interaction overlay for miniplayer */
                      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all" onClick={() => setIsMiniPlayer(false)}>
                        <Maximize className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); closeMiniPlayer(e); }}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/90 text-white rounded-full z-[60]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {!isMiniPlayer && (
                       /* Centered Controls for Mobile (Play/Pause) & Mobile PiP Button */
                     <>
                      <AnimatePresence>
                        {showControls && (
                          <motion.div 
                             initial={{ opacity: 0, scale: 0.9 }}
                             animate={{ opacity: 1, scale: 1 }}
                             exit={{ opacity: 0, scale: 0.9 }}
                             className="absolute inset-x-0 top-0 bottom-16 z-30 flex items-center justify-center bg-transparent lg:hidden"
                             onClick={(e) => {
                               if (e.target === e.currentTarget) {
                                 handleContainerClick(e);
                               }
                             }}
                          >
                            <button 
                              onClick={(e) => { e.stopPropagation(); handlePlayToggle(e); }}
                              className="w-20 h-20 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer active:scale-90 transition-transform shadow-2xl border border-white/20"
                            >
                              {isPlaying ? <Pause className="w-10 h-10 fill-current text-white"/> : <Play className="w-10 h-10 fill-current ml-1 text-white" />}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {showControls && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-4 right-4 z-50 flex items-center space-x-2 lg:hidden"
                          >
                            <button 
                              onClick={handlePiPClick}
                              className="p-2.5 bg-black/60 backdrop-blur-md rounded-full text-white cursor-pointer hover:bg-black/80 active:scale-95 transition-all shadow-md border border-white/15"
                              title="Picture in Picture / Miniplayer"
                            >
                              <PictureInPicture className="w-5 h-5 text-zinc-100" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                     </>
                    )}

                    {/* Quality Settings (Native) hidden - we use custom HLS menu */}

                  {isBuffering && (
                    <div className="absolute inset-0 z-[25] flex flex-col justify-center items-center pointer-events-none bg-black/40">
                      <div className="w-16 h-16 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin shadow-[0_0_30px_rgba(59,130,246,0.4)]"></div>
                      <div className="mt-6 text-white text-xs font-bold tracking-[0.3em] animate-pulse drop-shadow-lg">LOADING STREAM...</div>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="absolute inset-0 z-30 flex flex-col justify-center items-center bg-zinc-950 px-6 text-center">
                      <TvIcon className="w-12 h-12 text-zinc-700 mb-4" />
                      <p className="text-white font-bold text-lg mb-2">{t.playbackError}</p>
                      <button onClick={(e) => { e.stopPropagation(); setStreamMode(streamMode === 'proxy' ? 'direct' : 'proxy'); }} className="mt-4 px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-zinc-200 cursor-pointer shadow-lg active:scale-95 transition-transform">
                        Use {streamMode === 'proxy' ? t.directMode : t.proxyMode}
                      </button>
                      <div className="mt-4 max-w-sm text-center px-4 py-2.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
                        <p className="font-semibold text-zinc-300">⚠️ Hosting Info:</p>
                        <p className="mt-1">
                          If hosting on static servers like Cloudflare, the secure proxy option is limited. 
                          Mixed HTTP feeds or CORS streams will prevent playback on HTTPS pages. Consider Node.js/Docker VPS deployment for 100% proxy coverage!
                        </p>
                      </div>
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain pointer-events-none bg-black"
                    autoPlay playsInline
                    {...{ autoPictureInPicture: true } as any}
                  />

                  {/* Player Controls Overlay */}
                  <div className={`absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-24 pb-2 px-3 sm:px-4 flex flex-col justify-end transition-opacity duration-500 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                     <div className="relative z-10 w-full flex flex-col" onClick={e => e.stopPropagation()}>
                     <div className="w-full h-1 sm:h-1.5 bg-zinc-600/60 cursor-pointer relative group/bar mb-2.5 sm:mb-3">
                        <div className="absolute top-0 left-0 h-full w-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
                        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-3 sm:w-3.5 h-3 sm:h-3.5 bg-red-600 rounded-full opacity-0 group-hover/bar:opacity-100 scale-0 group-hover/bar:scale-100 transition-all shadow-md"></div>
                     </div>

                     <div className="flex items-center justify-between text-white">
                        <div className="flex items-center space-x-2 sm:space-x-4">
                           <button onClick={handlePlayToggle} className="hover:opacity-80 p-1 cursor-pointer">
                             {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current"/> : <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />}
                           </button>
                           <button onClick={playNextChannel} className="hover:opacity-80 p-1 cursor-pointer hidden sm:block">
                             <SkipForward className="w-5 h-5 fill-current" />
                           </button>
                           <div className="flex items-center group/volume">
                              <button onClick={() => { setIsMuted(!isMuted); if(videoRef.current) videoRef.current.muted = !isMuted; }} className="hover:opacity-80 p-1 cursor-pointer mr-1">
                                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 fill-current" />}
                              </button>
                              <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={(e) => {
                                 const val = parseFloat(e.target.value);
                                 setVolume(val); setIsMuted(val === 0);
                                 if(videoRef.current) { videoRef.current.volume = val; videoRef.current.muted = val === 0; }
                              }} className="w-0 scale-x-0 origin-left hidden sm:block sm:group-hover/volume:w-16 sm:group-hover/volume:scale-x-100 transition-all duration-200 accent-white h-1 cursor-pointer" />
                           </div>
                           <div className="text-[10px] sm:text-xs font-medium flex items-center ml-2">
                             <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse mr-1.5 shadow-[0_0_5px_rgba(220,38,38,0.8)] hidden sm:block"></span>
                             {t.live}
                           </div>
                        </div>

                        <div className="flex items-center space-x-2 sm:space-x-4">
                           <button onClick={(e) => { e.stopPropagation(); setIsMiniPlayer(!isMiniPlayer); }} className="hover:opacity-80 p-1 cursor-pointer" title="Miniplayer">
                             {isMiniPlayer ? <Maximize className="w-5 h-5 sm:w-6 sm:h-6" /> : <Minimize className="w-5 h-5 sm:w-6 sm:h-6" />}
                           </button>

                           {qualityLevels.length > 1 && (
                             <div className="relative">
                               <button 
                                 onClick={() => setShowQualityMenu(!showQualityMenu)}
                                 className="hover:opacity-80 p-1 cursor-pointer flex items-center space-x-1"
                                 title="Change Quality"
                               >
                                 <Settings className="w-5 h-5" />
                                 {currentQuality !== -1 && (
                                   <span className="text-[10px] bg-indigo-600 px-1 rounded font-bold">
                                     {qualityLevels.find(q => q.id === currentQuality)?.label}
                                   </span>
                                 )}
                               </button>
                               
                               <AnimatePresence>
                                 {showQualityMenu && (
                                   <motion.div 
                                     initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                     animate={{ opacity: 1, y: 0, scale: 1 }}
                                     exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                     className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl min-w-[120px] z-[60]"
                                   >
                                     <div className="p-2 border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3">Quality</div>
                                     <div className="py-1 max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 font-sans">
                                       {qualityLevels.map((level) => (
                                         <button
                                           key={level.id}
                                           onClick={() => {
                                             if (hlsRef.current) {
                                               hlsRef.current.currentLevel = level.id;
                                               setCurrentQuality(level.id);
                                             }
                                             setShowQualityMenu(false);
                                           }}
                                           className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-zinc-800 transition-colors flex items-center justify-between ${currentQuality === level.id ? 'text-indigo-400 bg-indigo-600/10' : 'text-zinc-300'}`}
                                         >
                                           <span>{level.label}</span>
                                           {currentQuality === level.id && <Check className="w-3 h-3" />}
                                         </button>
                                       ))}
                                     </div>
                                   </motion.div>
                                 )}
                               </AnimatePresence>
                             </div>
                           )}

                           <button onClick={handlePiPClick} className="hover:opacity-80 p-1 cursor-pointer" title="Picture in Picture">
                             <PictureInPicture className="w-5 h-5" />
                           </button>
                           <button onClick={toggleFullscreen} className="hover:opacity-80 p-1 cursor-pointer">
                             {(isFullscreen || isCssFullscreen) ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
                </div>

                {/* Mobile Chat - Below Video, Above Info */}
                {!isMiniPlayer && (
                  !isChatExpanded ? (
                    <div 
                      onClick={() => setIsChatExpanded(true)}
                      className="lg:hidden border-b border-zinc-805 bg-[#121212] hover:bg-zinc-800/80 px-4 py-3 flex items-center justify-between cursor-pointer transition-all shrink-0"
                    >
                      <div className="flex items-center space-x-2.5">
                        <MessageSquare className="w-4 h-4 text-blue-400" />
                        <span className="font-bold text-xs text-zinc-100 uppercase tracking-wider">{t.chatTitle}</span>
                        <span className="flex items-center px-1.5 py-0.5 rounded text-[8px] bg-red-600/10 text-red-500 border border-red-600/20 font-bold">LIVE</span>
                      </div>
                      <span className="text-xs text-blue-500 font-bold">Click to Join Chat 💬</span>
                    </div>
                  ) : (
                    <div className="lg:hidden border-b border-zinc-800 bg-[#0f0f0f] flex flex-col h-[350px] sm:h-[450px]">
                  <div className="p-3 bg-[#121212] border-b border-zinc-800 flex items-center justify-between shrink-0">
                    <span className="font-bold text-xs text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
                      {t.chatTitle} 
                      <span className="flex items-center px-1.5 py-0.5 rounded text-[8px] bg-red-600/10 text-red-500 border border-red-600/20">LIVE</span>
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsChatExpanded(false); }}
                      className="px-2.5 py-1 text-[11px] bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-md border border-zinc-700 cursor-pointer"
                    >
                      Collapse ✕
                    </button>
                  </div>
                  
                  <div ref={chatScrollRefMobile} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none bg-black/10">
                    <AnimatePresence initial={false}>
                      {chatMessages.map((msg, idx) => {
                        const isMe = user?.uid === msg.id || user?.displayName === msg.user;
                        return (
                          <motion.div 
                            key={msg.id || idx} 
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            className="flex items-start gap-2.5 mb-0.5"
                          >
                            <div className="w-6 h-6 rounded-full bg-zinc-800 shrink-0 flex items-center justify-center text-[10px] font-bold text-zinc-500 border border-zinc-700/50 overflow-hidden mt-0.5">
                              {msg.userPhoto ? <img src={msg.userPhoto} alt="" className="w-full h-full object-cover"/> : <span>{msg.user?.charAt(0)}</span>}
                            </div>
                            <p className="text-xs leading-snug break-words">
                              <span className={`font-bold mr-2 ${isMe ? 'text-blue-400' : 'text-zinc-500'}`}>{msg.user}</span>
                              <span className="text-zinc-200">{msg.text}</span>
                            </p>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {user ? (
                    <div className="p-3 bg-[#121212] border-t border-zinc-800">
                      <form onSubmit={handleChatSubmit} className="flex items-center space-x-2">
                        <input 
                          type="text" 
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          placeholder="Chat..." 
                          className="flex-1 bg-zinc-900 rounded-lg px-4 py-2 border border-zinc-800 focus:border-blue-500 outline-none text-xs placeholder-zinc-600 transition-all" 
                        />
                        <button type="submit" disabled={!chatInput.trim()} className="w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-lg disabled:opacity-50"><Send className="w-4 h-4 fill-current" /></button>
                      </form>
                    </div>
                  ) : (
                    <div className="p-2 border-t border-zinc-800 bg-[#0f0f0f] flex justify-center">
                      <button 
                        onClick={handleLogin} 
                        className="w-full py-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/5 rounded-lg border border-indigo-500/10 transition-all active:scale-95"
                      >
                        Sign In to join chat
                      </button>
                    </div>
                  )}
                </div>
                  )
                )}

                {/* Video Info & Actions */}
                {!isMiniPlayer && (
                  <div className="mt-4 px-4 sm:px-0 mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{currentChannel.name}</h1>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-blue-700 flex-shrink-0 flex items-center justify-center border border-white/10 shadow-lg pointer-events-none">
                          <div className="relative">
                              <User className="w-6 h-6 text-white" />
                              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-[#0f0f0f] flex items-center justify-center">
                                <Check className="w-2 h-2 text-white" strokeWidth={5} />
                              </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm sm:text-base leading-tight flex items-center">
                            Build by Taaissu
                            <div className="ml-1.5 w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" strokeWidth={5} />
                            </div>
                          </h3>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.1em]">Verified Developer</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                        <button onClick={(e) => toggleFavorite(currentChannel, e)} className="flex items-center space-x-2 bg-zinc-800/80 hover:bg-zinc-700 px-4 py-2 rounded-full transition-colors shrink-0">
                          <Bookmark className={`w-4 h-4 ${favorites.some(f => f.url === currentChannel.url) ? 'fill-white' : ''}`} />
                          <span className="text-sm font-semibold">{favorites.some(f => f.url === currentChannel.url) ? t.saved : t.save}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Related & Chat Column */}
              {!isMiniPlayer && (
                <div className="w-full lg:w-[350px] xl:w-[420px] px-0 lg:px-0 flex-shrink-0 flex flex-col">
                  {/* Embedded Sidebar Chat - DESKTOP ONLY */}
                  {!isChatExpanded ? (
                    <div 
                      onClick={() => setIsChatExpanded(true)}
                      className="hidden lg:flex border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-4 bg-[#121212] hover:bg-zinc-800/40 items-center justify-between cursor-pointer transition-all mb-6 shrink-0"
                    >
                      <div className="flex items-center space-x-3">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                        <div className="text-left">
                          <span className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                            {t.chatTitle} 
                            <span className="flex items-center px-1.5 py-0.5 rounded text-[8px] bg-red-600/10 text-red-500 border border-red-600/20 font-bold">LIVE</span>
                          </span>
                          <p className="text-[10px] text-zinc-550 font-medium">Click to expand live chat discussion</p>
                        </div>
                      </div>
                      <span className="text-xs text-blue-500 font-bold px-2.5 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20 whitespace-nowrap">Open Chat 💬</span>
                    </div>
                  ) : (
                    <div className="hidden lg:flex border border-zinc-800 rounded-none sm:rounded-2xl overflow-hidden bg-[#0f0f0f] flex-col h-[500px] lg:h-[600px] shadow-2xl mb-6 shrink-0">
                      <div className="p-3 bg-[#121212] border-b border-zinc-800 flex items-center justify-between shrink-0">
                        <span className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                          {t.chatTitle} 
                          <span className="flex items-center px-1.5 py-0.5 rounded text-[8px] bg-red-600/10 text-red-500 border border-red-600/20">LIVE</span>
                        </span>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setIsChatExpanded(false); }}
                            className="px-2.5 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-md border border-zinc-750 cursor-pointer"
                          >
                            Collapse ✕
                          </button>
                        </div>
                      </div>
                    
                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700 bg-black/20">
                      <AnimatePresence initial={false}>
                        {chatMessages.map((msg, idx) => (
                          <div key={msg.id || idx} className="flex items-start gap-2.5 mb-1">
                            <div className="w-6 h-6 rounded-full bg-zinc-800 shrink-0 flex items-center justify-center text-[10px] uppercase font-bold text-zinc-500 border border-zinc-700/50 overflow-hidden mt-0.5">
                              {msg.userPhoto ? <img src={msg.userPhoto} alt="" className="w-full h-full object-cover"/> : <span>{msg.user?.charAt(0)}</span>}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <p className="text-[11px] leading-tight break-words">
                                <span className={`font-bold mr-2 ${user?.uid === msg.id ? 'text-blue-400' : 'text-zinc-500'}`}>{msg.user}</span>
                                <span className="text-zinc-200">{msg.text}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </AnimatePresence>
                    </div>

                    <div className="p-3 bg-[#121212] border-t border-zinc-800 shrink-0">
                      {user ? (
                        <form onSubmit={handleChatSubmit} className="flex items-center space-x-2">
                          <input 
                            type="text" 
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Chat message..." 
                            className="w-full bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-800 outline-none text-xs text-white" 
                          />
                          <button type="submit" className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg">
                            <Send className="w-4 h-4 fill-current" />
                          </button>
                        </form>
                      ) : (
                        <button onClick={handleLogin} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold">Sign in</button>
                      )}
                    </div>
                  </div>
                )}

                <div className="px-4 lg:px-0">
                  <div className="flex items-center space-x-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
                    <button className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg whitespace-nowrap cursor-pointer">Live</button>
                    <button className="px-3 py-1.5 bg-[#222] hover:bg-zinc-800 text-xs font-bold rounded-lg whitespace-nowrap border border-zinc-800 cursor-pointer">News</button>
                    <button className="px-3 py-1.5 bg-[#222] hover:bg-zinc-800 text-xs font-bold rounded-lg whitespace-nowrap border border-zinc-800 cursor-pointer">Sports</button>
                    <button className="px-3 py-1.5 bg-[#222] hover:bg-zinc-800 text-xs font-bold rounded-lg whitespace-nowrap border border-zinc-800 cursor-pointer">Related</button>
                  </div>
                  
                  <div className="space-y-3 mb-10">
                    {sortedFilteredChannels.filter(c => c.url !== currentChannel.url).slice(0, 20).map(c => {
                      const isDead = deadChannels.has(c.url);
                      return (
                      <div key={c.url} className={`flex space-x-2.5 cursor-pointer group ${isDead ? 'opacity-40 grayscale' : ''}`} onClick={() => { setCurrentChannel(c); setIsSidebarOpen(false); scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        <div className="w-40 sm:w-40 aspect-video bg-zinc-900 rounded-xl flex items-center justify-center relative overflow-hidden shrink-0 border border-zinc-800 group-hover:border-zinc-700">
                           <ChannelLogo channel={c} className="w-full h-full" />
                           <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10"></div>
                           <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-white flex items-center space-x-1 z-20">
                              <span className={`w-1.5 h-1.5 rounded-full ${isDead ? 'bg-zinc-500' : 'bg-red-600 animate-pulse'}`}></span>
                              <span className="leading-none">{isDead ? 'OFFLINE' : t.live}</span>
                           </div>
                        </div>
                        <div className="flex-1 min-w-0 py-0.5">
                          <h3 className="text-[13px] font-semibold text-white leading-snug line-clamp-2 group-hover:text-blue-400 transition-colors pr-4">{c.name}</h3>
                          <div className="flex items-center space-x-1 mt-1">
                             <div className="w-3 h-3 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                <Check className="w-2 h-2 text-white" strokeWidth={4} />
                             </div>
                             <p className="text-[11px] text-zinc-400 font-medium">Build by Taaissu</p>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1 flex items-center"><Users className="w-3 h-3 mr-1 opacity-70"/> {(Math.random() * 8 + 1).toFixed(1)}K views</p>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
              )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Select Country Modal (Desktop Dialog) */}
      <AnimatePresence>
        {isCountryModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCountryModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 bg-[#0f0f0f] max-h-[85vh] flex flex-col relative z-20">
              <div className="p-4 border-b border-zinc-800 bg-[#121212] flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-zinc-400" />
                    {t.explore}
                  </h3>
                  <button onClick={() => setIsCountryModalOpen(false)} className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input type="text" value={countryQuery} onChange={(e) => setCountryQuery(e.target.value)} placeholder={t.searchCountryPlaceholder} className="w-full pl-10 pr-8 py-2.5 text-sm bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-xl outline-none transition-all font-medium text-white placeholder-zinc-500" />
                </div>
              </div>
              <div className="p-3 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-zinc-700 bg-[#121212]">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {countries.filter(c => formatCountryName(c).toLowerCase().includes(countryQuery.toLowerCase()) || c.toLowerCase().includes(countryQuery.toLowerCase())).map(code => {
                    const isChosen = selectedCountry === code;
                    return (
                      <button key={code} onClick={() => { setSelectedCountry(code); setIsCountryModalOpen(false); setCurrentChannel(null); setActiveTab('all'); }} className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${isChosen ? 'bg-[#222] border-zinc-600' : 'bg-transparent border-transparent hover:bg-zinc-800'}`}>
                        <span className="text-2xl leading-none">{getCountryFlag(code)}</span>
                        <span className="text-sm truncate font-medium">{formatCountryName(code)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Install Popup */}
      <AnimatePresence>
        {showInstallPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121212] rounded-2xl max-w-sm w-full p-6 relative border border-zinc-800 shadow-2xl"
            >
              <button 
                onClick={dismissInstallPopup} 
                className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 p-1.5 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg border border-zinc-800/50 bg-[#0f0f0f] flex items-center justify-center">
                  <img src="/icon.svg" alt="App Icon" className="w-[80%] h-[80%] object-contain drop-shadow-md p-1" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white mb-2">Install StreamTube App</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed px-2">
                    {deviceOS === 'iOS' 
                      ? "To install on iOS, tap the Share button below and select 'Add to Home Screen'."
                      : `Install the app on your ${deviceOS} for a faster, full-screen experience.`}
                  </p>
                </div>
                
                <div className="w-full pt-4">
                  {deviceOS !== 'iOS' ? (
                    <button 
                      onClick={() => {
                        setShowInstallPopup(false);
                        handleInstallApp();
                      }}
                      className="w-full py-3.5 bg-white hover:bg-zinc-200 text-black font-bold tracking-wide rounded-xl transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center justify-center space-x-2"
                    >
                      <span>Install Now</span>
                    </button>
                  ) : (
                    <button 
                      onClick={dismissInstallPopup}
                      className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
                    >
                      Got it
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden h-16 border-t border-zinc-800 bg-[#0f0f0f] flex items-center justify-around px-2 pb-safe shrink-0 z-50">
        <button onClick={() => { setActiveTab('all'); setCurrentChannel(null); }} className={`flex flex-col items-center justify-center space-y-1 p-2 transition-colors ${activeTab === 'all' && !currentChannel ? 'text-white font-bold' : 'text-zinc-500'}`}>
          <Home className={`w-5 h-5 ${activeTab === 'all' && !currentChannel ? 'fill-current' : ''}`} />
          <span className="text-[10px]">{t.home}</span>
        </button>
        <button onClick={() => { setActiveTab('sports'); setCurrentChannel(null); }} className={`flex flex-col items-center justify-center space-y-1 p-2 transition-colors ${activeTab === 'sports' ? 'text-white font-bold' : 'text-zinc-500'}`}>
          <Flame className={`w-5 h-5 ${activeTab === 'sports' ? 'fill-current' : ''}`} />
          <span className="text-[10px]">{t.sports}</span>
        </button>
        <button onClick={() => { setActiveTab('favorites'); setCurrentChannel(null); }} className={`flex flex-col items-center justify-center space-y-1 p-2 transition-colors ${activeTab === 'favorites' ? 'text-white font-bold' : 'text-zinc-500'}`}>
          <Bookmark className={`w-5 h-5 ${activeTab === 'favorites' ? 'fill-current' : ''}`} />
          <span className="text-[10px]">{t.favorites}</span>
        </button>
        <button onClick={() => setIsCountryModalOpen(true)} className={`flex flex-col items-center justify-center space-y-1 p-2 transition-colors ${isCountryModalOpen ? 'text-white font-bold' : 'text-zinc-500'}`}>
          <Globe className="w-5 h-5" />
          <span className="text-[10px] truncate max-w-[60px]">{formatCountryName(selectedCountry)}</span>
        </button>
      </div>
    </div>
  );
}
