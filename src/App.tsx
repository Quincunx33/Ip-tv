/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import * as dashjs from 'dashjs';
import { Play, Pause, Search, Menu, Tv, Globe, X, Volume2, VolumeX, RefreshCw, Copy, Check, ChevronDown, 
  Star, Heart, Languages, LayoutGrid, List, Flame, Radio, Bookmark, Tv2, Maximize, Minimize, 
  SkipForward, SkipBack, Expand, AppWindow, Tv2 as TvIcon, MoreVertical, Send, ThumbsUp, ThumbsDown, 
  Share, Users, MessageSquare, Home, Compass, Settings, Clock, Cast, Bell, PictureInPicture,
  Plus, Trash2, Upload, FileText, Link2
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Sidebar from './components/Sidebar';
import { Channel } from './types';
import { getCountryFlag, formatCountryName, parseM3UContent } from './utils';


interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const SWUpdatePrompt = ({ onUpdate }: { onUpdate: () => void }) => {
  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[100] bg-indigo-600 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between border border-white/20"
    >
      <div className="flex items-center space-x-3">
        <RefreshCw className="w-5 h-5 animate-spin-slow" />
        <div>
          <p className="text-sm font-bold">Update Available</p>
          <p className="text-xs opacity-90">Refresh to get latest channels</p>
        </div>
      </div>
      <button 
        onClick={onUpdate}
        className="bg-white text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors"
      >
        Update Now
      </button>
    </motion.div>
  );
};

export const CAZE_TV_CHANNEL: Channel = {
  name: 'CazéTV',
  url: 'UCZiYbVptd3PVPf4f6eR6UaQ',
  type: 'youtube-iframe',
  logo: 'https://logodownload.org/wp-content/uploads/2023/07/caze-tv-logo.png',
  country: 'br',
  language: 'Portuguese'
};

// Deterministic background color based on name (extracted to module scope to bypass recreations)
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

const ChannelLogo = React.memo(({ channel, className = "", isAvatar = false }: { channel: Channel, className?: string, isAvatar?: boolean }) => {
  const [error, setError] = useState(false);
  
  const bgColor = React.useMemo(() => getBgColor(channel.name), [channel.name]);

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
});

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
    fifa: "FIFA World Cup",
    noInternet: "No Internet Connection",
    noInternetDesc: "Please check your network cables or Wi-Fi connection. We didn't mark this channel as dead because of your local internet issue.",
    retryConnection: "Retry Connection",
    customProxy: "Custom Proxy",
    customProxyPlaceholder: "e.g. https://myproxy.com/?url=",
    customProxyDesc: "Enter a proxy URL that will be prefixed to the stream URL.",
    matchSchedule: "FIFA Match Schedule",
    liveMatches: "LIVE Matches",
    upcomingMatches: "Upcoming",
    finishedMatches: "Completed",
    allMatches: "All Matches",
    searchMatch: "Search Teams...",
    timeLabel: "Time"
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
    fifa: "ফিফা ওয়ার্ল্ড কাপ",
    noInternet: "ইন্টারনেট সংযোগ নেই",
    noInternetDesc: "আপনার ইন্টারনেট সংযোগ বা ওয়াই-ফাই চেক করে পুনরায় চেষ্টা করুন। লোকাল নেটওয়ার্ক সমস্যার কারণে এই চ্যানেলটিকে ডেড বা অফলাইন চিহ্নিত করা হয়নি।",
    retryConnection: "পুনরায় চেষ্টা করুন",
    customProxy: "কাস্টম প্রক্সি",
    customProxyPlaceholder: "উদাঃ https://myproxy.com/?url=",
    customProxyDesc: "একটি প্রক্সি URL লিখুন যা স্ট্রিম URL এর আগে যুক্ত হবে।",
    matchSchedule: "ফিফার ম্যাচের সময়সূচী ফিক্সচার",
    liveMatches: "লাইভ ম্যাচ",
    upcomingMatches: "আসন্ন ম্যাচ",
    finishedMatches: "সম্পন্ন ম্যাচ",
    allMatches: "সব ম্যাচ",
    searchMatch: "দল খুঁজুন...",
    timeLabel: "সময়"
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
  onClick: (channel: Channel) => void, 
  onToggleFavorite: (channel: Channel, e: React.MouseEvent) => void, 
  isFavorite: boolean, 
  countryName: string, 
  t: any 
}) => {
  const viewers = React.useMemo(() => getDeterministicViewers(channel.url), [channel.url]);

  return (
    <div 
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 240px' }}
      className={`flex flex-col cursor-pointer group transition-[opacity,filter] duration-300 ${isDead ? 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100' : ''}`} 
      onClick={() => onClick(channel)}
    >
      <div className="w-full aspect-video bg-zinc-900 rounded-xl overflow-hidden relative mb-2.5 shadow-sm border border-zinc-800/60 group-hover:border-zinc-700 transition-[border-color] duration-300 flex items-center justify-center">
         <ChannelLogo channel={channel} className="w-full h-full" />
         <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
           <Play className="w-12 h-12 text-white/80 scale-90 group-hover:scale-100 transition-transform" fill="currentColor" />
         </div>
         <div className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-xs font-bold font-mono tracking-wider text-white shadow-sm flex items-center space-x-1.5">
           <span className={`w-1.5 h-1.5 rounded-full ${isDead ? 'bg-zinc-500' : 'bg-red-600 animate-pulse'}`}></span>
           <span className="text-[10px]">{isDead ? 'OFFLINE' : t.live}</span>
         </div>
      </div>
      <div className="flex space-x-3 px-1">
         <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-blue-700 border border-white/10 flex items-center justify-center shrink-0 shadow-lg pointer-events-none">
            <div className="relative">
              <Tv className="w-5 h-5 text-white" />
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
              {channel.language && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-500/20 text-[9px] font-extrabold text-indigo-400 shrink-0 border border-indigo-500/30">
                  <span>{channel.language}</span>
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
                onClick={(e) => onToggleFavorite(channel, e)} 
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

const checkIsInternetConnected = async (): Promise<boolean> => {
  if (!navigator.onLine) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    let response;
    try {
      response = await fetch('/robots.txt', { method: 'HEAD', signal: controller.signal, cache: 'no-store' });
      if (!response.ok) {
        response = await fetch('/robots.txt', { signal: controller.signal, cache: 'no-store' });
      }
    } catch (e) {
      response = await fetch('/static-api/channels.json', { signal: controller.signal, cache: 'no-store' });
    }
    clearTimeout(timeoutId);
    return response.ok;
  } catch (e) {
    return false;
  }
};

export default function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [showInstallPopup, setShowInstallPopup] = useState<boolean>(false);
  const [deviceOS, setDeviceOS] = useState<'Android' | 'iOS' | 'Windows' | 'Mac' | 'Device'>('Device');

  const [isServer1Enabled, setIsServer1Enabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('isServer1Enabled');
    return saved !== null ? saved === 'true' : false;
  });
  const [isServer2Enabled, setIsServer2Enabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('isServer2Enabled');
    return saved !== null ? saved === 'true' : false;
  });
  const [isServer3Enabled, setIsServer3Enabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('isServer3Enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [isServer4Enabled, setIsServer4Enabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('isServer4Enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [serverSource, setServerSource] = useState<'1' | '2' | '3' | '4'>('1');

  useEffect(() => {
    localStorage.setItem('isServer1Enabled', String(isServer1Enabled));
    localStorage.setItem('isServer2Enabled', String(isServer2Enabled));
    localStorage.setItem('isServer3Enabled', String(isServer3Enabled));
    localStorage.setItem('isServer4Enabled', String(isServer4Enabled));
  }, [isServer1Enabled, isServer2Enabled, isServer3Enabled, isServer4Enabled]);

  useEffect(() => {
    if (serverSource === '1' && !isServer1Enabled) {
      if (isServer2Enabled) setServerSource('2');
      else if (isServer3Enabled) setServerSource('3');
      else if (isServer4Enabled) setServerSource('4');
    } else if (serverSource === '2' && !isServer2Enabled) {
      if (isServer1Enabled) setServerSource('1');
      else if (isServer3Enabled) setServerSource('3');
      else if (isServer4Enabled) setServerSource('4');
    } else if (serverSource === '3' && !isServer3Enabled) {
      if (isServer1Enabled) setServerSource('1');
      else if (isServer2Enabled) setServerSource('2');
      else if (isServer4Enabled) setServerSource('4');
    } else if (serverSource === '4' && !isServer4Enabled) {
      if (isServer1Enabled) setServerSource('1');
      else if (isServer2Enabled) setServerSource('2');
      else if (isServer3Enabled) setServerSource('3');
    }
  }, [isServer1Enabled, isServer2Enabled, isServer3Enabled, isServer4Enabled, serverSource]);

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

  // Sync selected country with auto-detected country, or URL query parameters
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlCountry = searchParams.get('country') || searchParams.get('c');
      if (urlCountry) {
        const lowerCountry = urlCountry.toLowerCase();
        setSelectedCountry(lowerCountry);
        return;
      }
    } catch (e) {
      console.error("Failed to parse country URL query param:", e);
    }

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

  // Sync active category tab with URL query parameter override
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlTab = searchParams.get('tab') || searchParams.get('t');
      if (urlTab) {
        const cleanTab = urlTab.toLowerCase();
        if (['all', 'favorites', 'sports', 'news', 'fifa', 'custom'].includes(cleanTab)) {
          setActiveTab(cleanTab as any);
        }
      }
    } catch (e) {
      console.error("Failed to parse tab URL query param:", e);
    }
  }, []);

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
          const res = await fetch(`/static-api/search-index.json`);
          if (res.ok) {
            searchIndexRef.current = await res.json();
          } else {
            // Lazy cloudflare safe fallback path to relative static path or API
            const fallbackRes = await fetch(`/static-api/search-index.json`);
            if (fallbackRes.ok) {
              searchIndexRef.current = await fallbackRes.json();
            } else {
              // Direct fallback (Express backend proxy)
              const apiRes = await fetch(`/api/search?q=${encodeURIComponent(debouncedSearch)}`);
              if (apiRes.ok) {
                const data: Channel[] = await apiRes.json();
                const filteredData = data.filter((ch: Channel) => {
                  const s = ch.source || '1';
                  const isEnabled = s === '1' ? isServer1Enabled : s === '2' ? isServer2Enabled : s === '3' ? isServer3Enabled : isServer4Enabled;
                  return isEnabled || ch.name.toLowerCase().includes('bein sports 1');
                });
                setUniversalSearchResults(filteredData);
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

          const filteredResults = results.filter(ch => {
            const s = ch.source || '1';
            const isEnabled = s === '1' ? isServer1Enabled : s === '2' ? isServer2Enabled : s === '3' ? isServer3Enabled : isServer4Enabled;
            return isEnabled || ch.name.toLowerCase().includes('bein sports 1');
          });
          
          filteredResults.sort((a, b) => {
            const aLower = a.name.toLowerCase();
            const bLower = b.name.toLowerCase();
            const cleanQuery = queryStr.replace(/[^a-z0-9]/g, '');
            const cleanA = aLower.replace(/[^a-z0-9]/g, '');
            const cleanB = bLower.replace(/[^a-z0-9]/g, '');

            // 1. Exact alphanumeric match
            const aExact = cleanA.includes(cleanQuery);
            const bExact = cleanB.includes(cleanQuery);
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;

            // 2. Starts with query
            const aStarts = aLower.startsWith(queryStr);
            const bStarts = bLower.startsWith(queryStr);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            // 3. New tag priority
            const aNew = aLower.includes('(new)');
            const bNew = bLower.includes('(new)');
            if (aNew && !bNew) return -1;
            if (!aNew && bNew) return 1;

            return a.name.localeCompare(b.name);
          });

          setUniversalSearchResults(filteredResults);
        } else {
          setUniversalSearchResults([]);
        }
      } catch (err) {
        console.error("Global search index failed, falling back to API:", err);
          try {
            const apiRes = await fetch(`/api/search?q=${encodeURIComponent(debouncedSearch)}`);
            if (apiRes.ok) {
              const data: Channel[] = await apiRes.json();
              const filteredData = data.filter((ch: Channel) => {
                const s = ch.source || '1';
                const isEnabled = s === '1' ? isServer1Enabled : s === '2' ? isServer2Enabled : s === '3' ? isServer3Enabled : isServer4Enabled;
                return isEnabled || ch.name.toLowerCase().includes('bein sports 1');
              });
              setUniversalSearchResults(filteredData);
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
  }, [debouncedSearch, isServer1Enabled, isServer2Enabled, isServer3Enabled, isServer4Enabled]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [errorMsg, setErrorMsg] = useState(false);
  const [playerError, setPlayerError] = useState<'none' | 'no-internet' | 'stream-error'>('none');
  const [playerDiagnostics, setPlayerDiagnostics] = useState<{
    originalUrl: string;
    resolvedUrl: string;
    format: string;
    mode: string;
    time: string;
  } | null>(null);
  const [copiedErrorUrl, setCopiedErrorUrl] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [streamMode, setStreamMode] = useState<'proxy' | 'direct' | 'custom'>('direct');
  const [customProxyUrl, setCustomProxyUrl] = useState<string>('');
  const [proxyHost, setProxyHost] = useState<string>('');
  const [proxyPort, setProxyPort] = useState<string>('');
  const [proxyType, setProxyType] = useState<'socks5' | 'http' | 'url'>('socks5');
  const [userAgent, setUserAgent] = useState<string>('');
  const [referer, setReferer] = useState<string>('');
  const [lang, setLang] = useState<'en' | 'bn'>('en');


  const [validationStatus, setValidationStatus] = useState<'checking' | 'direct' | 'fallback-local' | 'fallback-public' | 'failed'>('checking');
  const [validationDetails, setValidationDetails] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'sports' | 'news' | 'fifa' | 'schedule' | 'custom'>('fifa');
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [isClosingMiniPlayer, setIsClosingMiniPlayer] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customModalTab, setCustomModalTab] = useState<'url' | 'file' | 'text' | 'single'>('url');
  const [dragActive, setDragActive] = useState(false);
  const [playlistUrlInput, setPlaylistUrlInput] = useState('');
  const [singleStreamUrlInput, setSingleStreamUrlInput] = useState('');
  const [testUrls, setTestUrls] = useState<Record<string, { testing: boolean; result: any | null }>>({});

  const handleTestLink = async (url: string, key: string) => {
    if (!url || !url.trim().startsWith('http')) {
      setToastMessage("Please enter a valid HTTP/HTTPS URL first");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    setTestUrls(prev => ({
      ...prev,
      [key]: { testing: true, result: null }
    }));

    try {
      const res = await fetch(`/api/test-link?url=${encodeURIComponent(url.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setTestUrls(prev => ({
          ...prev,
          [key]: { testing: false, result: data }
        }));
      } else {
        setTestUrls(prev => ({
          ...prev,
          [key]: { testing: false, result: { ok: false, message: `Server error response: ${res.status}` } }
        }));
      }
    } catch (e) {
      setTestUrls(prev => ({
        ...prev,
        [key]: { testing: false, result: { ok: false, message: "Could not connect to link tester server" } }
      }));
    }
  };

  const [favorites, setFavorites] = useState<Channel[]>(() => {
    const saved = localStorage.getItem('st_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [deadChannels, setDeadChannels] = useState<Set<string>>(new Set());

  // Custom Playlists States loaded from LocalStorage
  const [customPlaylists, setCustomPlaylists] = useState<any[]>(() => {
    const saved = localStorage.getItem('st_custom_playlists');
    return saved ? JSON.parse(saved) : [];
  });
  const [customChannels, setCustomChannels] = useState<Channel[]>([]);

  const handleM3UFileLoad = (file: File, playlistName: string) => {
    const nameToUse = (playlistName || file.name.replace(/\.[^/.]+$/, "")).trim();
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const parsed = parseM3UContent(content, '4');
      if (parsed.length === 0) {
        setToastMessage("Could not find any readable channels in this M3U file");
        setTimeout(() => setToastMessage(''), 3000);
        return;
      }

      const newPlaylist = {
        id: 'm3u_' + Date.now(),
        name: nameToUse,
        server: '4', // Forced to Server 4
        type: 'file',
        channels: parsed,
        createdAt: new Date().toISOString()
      };

      setCustomPlaylists(prev => [...prev, newPlaylist]);
      setToastMessage(`Loaded ${parsed.length} channels to Server 4!`);
      setTimeout(() => setToastMessage(''), 3000);
    };
    reader.readAsText(file);
  };

  // Sync states to LocalStorage
  useEffect(() => {
    localStorage.setItem('st_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('st_custom_playlists', JSON.stringify(customPlaylists));
  }, [customPlaylists]);

  // Parse and cache custom M3U channels matching serverSource
  useEffect(() => {
    let active = true;
    const fetchCustomChannels = async () => {
      const allParsed: Channel[] = [];
      const matchingPlaylists = customPlaylists.filter(p => {
        const pServer = p.server || '4';
        return String(pServer) === String(serverSource);
      });
      
      let needsStateUpdate = false;
      const updatedPlaylists = [...customPlaylists];

      for (const playlist of matchingPlaylists) {
        if (playlist.channels && playlist.channels.length > 0) {
          const formatted = playlist.channels.map((ch: any) => ({
            ...ch,
            source: serverSource,
            country: ch.country || 'custom'
          }));
          allParsed.push(...formatted);
        } else if (playlist.url) {
          try {
            const res = await fetch(`/api/parse-m3u?url=${encodeURIComponent(playlist.url)}`);
            if (res.ok) {
              const parsedList: Channel[] = await res.json();
              if (parsedList && parsedList.length > 0) {
                const formatted = parsedList.map(ch => ({
                  ...ch,
                  source: serverSource,
                  country: ch.country || 'custom'
                }));
                allParsed.push(...formatted);

                // Cache them in local state to avoid refetching on every render/mode toggle!
                const playlistIndex = updatedPlaylists.findIndex(p => p.id === playlist.id);
                if (playlistIndex !== -1) {
                  updatedPlaylists[playlistIndex] = {
                    ...updatedPlaylists[playlistIndex],
                    channels: parsedList
                  };
                  needsStateUpdate = true;
                }
              }
            }
          } catch (err) {
            console.error("Failed to parse custom playlist URL:", playlist.url, err);
          }
        }
      }
      
      if (active) {
        setCustomChannels(allParsed);
        if (needsStateUpdate) {
          setCustomPlaylists(updatedPlaylists);
        }
      }
    };
    
    if (customPlaylists.length > 0) {
      fetchCustomChannels();
    } else {
      setCustomChannels([]);
    }
    
    return () => {
      active = false;
    };
  }, [customPlaylists, serverSource]);

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
  const dashRef = useRef<any>(null);
  const mpegtsRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const browseScrollPosRef = useRef<number>(0);
  const isProgrammaticBackRef = useRef<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const chUrl = searchParams.get('ch');
      const chName = searchParams.get('name') || searchParams.get('n');
      const chLogo = searchParams.get('logo') || searchParams.get('l');
      const chCountry = searchParams.get('country') || searchParams.get('c');

      if (chUrl && chName) {
        const deepChannel: Channel = {
          name: chName,
          url: chUrl,
          logo: chLogo || undefined,
          country: chCountry || undefined
        };
        setCurrentChannel(deepChannel);
        setIsSidebarOpen(false);
      }
    } catch (e) {
      console.error("Failed to parse deep link query parameters:", e);
    }
  }, []);

  // Hydrate deep-linked channels with multiple server configurations from the global catalog
  useEffect(() => {
    if (!currentChannel) return;
    
    const hydrateChannel = async () => {
      // If the active channel already has multiple backup servers or urls, no need to override
      if (currentChannel.urls && currentChannel.urls.length > 1) return;
      
      try {
        const res = await fetch('/static-api/search-index.json');
        if (!res.ok) return;
        const indexList: Channel[] = await res.json();
        
        // Find match by comparing URL or Channel Name (case-insensitive)
        const match = indexList.find(ch => 
          (ch.url && ch.url === currentChannel.url) || 
          (ch.name && currentChannel.name && ch.name.toLowerCase() === currentChannel.name.toLowerCase()) ||
          (ch.urls && ch.urls.includes(currentChannel.url))
        );
        
        if (match && match.urls && match.urls.length > 0) {
          console.log(`Deep Hydration found a catalog match for: ${currentChannel.name}. Injecting backup servers!`, match.urls);
          setCurrentChannel(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              urls: match.urls,
              logo: prev.logo || match.logo,
              country: prev.country || match.country
            };
          });
        }
      } catch (err) {
        console.warn("Deep link catalog hydration failed:", err);
      }
    };
    
    hydrateChannel();
  }, [currentChannel?.name, currentChannel?.url]);
  
  const [baseLikes, setBaseLikes] = useState(0);
  const [baseDislikes, setBaseDislikes] = useState(0);
  const [userInteraction, setUserInteraction] = useState<'like' | 'dislike' | null>(null);

  const [selectedServer, setSelectedServer] = useState(0);

  const [qualityLevels, setQualityLevels] = useState<{ id: number, label: string }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const t = TRANSLATIONS[lang];

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          setRegistration(reg);
          if (reg.waiting) setUpdateAvailable(true);
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          });
        }
      });
    }
  }, []);

  const handleUpdateApp = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

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

  useEffect(() => {
    if (currentChannel) {
      // Create a deterministic base like/dislike count
      const seed = currentChannel.url.split('').reduce((a,b)=>a+b.charCodeAt(0),0);
      setBaseLikes(Math.floor(seed * 2.5) % 15000 + 500);
      setBaseDislikes(Math.floor(seed * 0.3) % 500);
      setUserInteraction(null);
    }
  }, [currentChannel]);

  const handleInteraction = (type: 'like' | 'dislike') => {
     if (!currentChannel) return;
     if (userInteraction === type) {
        setUserInteraction(null);
     } else {
        setUserInteraction(type);
     }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('iptv_favorites');
      if (saved) setFavorites(JSON.parse(saved));
      const savedDead = localStorage.getItem('iptv_dead_channels');
      if (savedDead) setDeadChannels(new Set(JSON.parse(savedDead)));
      const savedMode = localStorage.getItem('iptv_stream_mode');
      if (savedMode === 'proxy' || savedMode === 'direct' || savedMode === 'custom') setStreamMode(savedMode as any);
      const savedProxy = localStorage.getItem('iptv_custom_proxy');
      if (savedProxy) setCustomProxyUrl(savedProxy);
      const savedHost = localStorage.getItem('iptv_proxy_host');
      if (savedHost) setProxyHost(savedHost);
      const savedPort = localStorage.getItem('iptv_proxy_port');
      if (savedPort) setProxyPort(savedPort);
      const savedType = localStorage.getItem('iptv_proxy_type');
      if (savedType === 'socks5' || savedType === 'http') setProxyType(savedType);
    } catch { }

    // Synchronize with the daily crawler checked offline channel URLs
    fetch('/static-api/dead-channels.json')
      .then(res => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDeadChannels(prev => {
            const next = new Set(prev);
            data.forEach((url: string) => next.add(url));
            return next;
          });
        }
      })
      .catch(() => {});
  }, []);

  // Sync Media Session API for system controls and background PiP support
  useEffect(() => {
    if ('mediaSession' in navigator && currentChannel) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentChannel.name,
        artist: 'StreamTube Live',
        album: currentChannel.country || 'Global',
        artwork: [
          { src: currentChannel.logo || 'icon.svg', sizes: '96x96', type: 'image/png' },
          { src: currentChannel.logo || 'icon.svg', sizes: '128x128', type: 'image/png' },
          { src: currentChannel.logo || 'icon.svg', sizes: '192x192', type: 'image/png' },
          { src: currentChannel.logo || 'icon.svg', sizes: '256x256', type: 'image/png' },
          { src: currentChannel.logo || 'icon.svg', sizes: '384x384', type: 'image/png' },
          { src: currentChannel.logo || 'icon.svg', sizes: '512x512', type: 'image/png' },
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        videoRef.current?.play().catch(() => {});
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        videoRef.current?.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        setCurrentChannel(null);
      });

      // Try to enable PiP action handler if supported
      try {
        // @ts-ignore
        navigator.mediaSession.setActionHandler('enterpictureinpicture', handlePiPClick);
      } catch (e) {}
    }
  }, [currentChannel]);

  // Combined Sync effect to avoid multiple writes
  useEffect(() => {
    localStorage.setItem('iptv_favorites', JSON.stringify(favorites));
    localStorage.setItem('iptv_dead_channels', JSON.stringify([...deadChannels]));
    localStorage.setItem('iptv_stream_mode', streamMode);
    localStorage.setItem('iptv_custom_proxy', customProxyUrl);
    localStorage.setItem('iptv_proxy_host', proxyHost);
    localStorage.setItem('iptv_proxy_port', proxyPort);
    localStorage.setItem('iptv_proxy_type', proxyType);
  }, [favorites, deadChannels, streamMode, customProxyUrl, proxyHost, proxyPort, proxyType]);

  useEffect(() => {
    if (currentChannel) {
      document.title = `Playing: ${currentChannel.name} - Free IPTV | StreamTube`;
    } else {
      document.title = "StreamTube - Free Live World IPTV Player | Watch M3U Playlist Streams Online";
    }
  }, [currentChannel]);

  useEffect(() => {
    if (currentChannel) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
        window.scrollTo(0, 0);
      });
    } else if (!currentChannel && browseScrollPosRef.current > 0) {
      const savedPos = browseScrollPosRef.current;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = savedPos;
          }
        });
      });
    }
  }, [currentChannel]);

  useEffect(() => {
    browseScrollPosRef.current = 0;
  }, [activeTab, selectedCountry, serverSource]);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        let res = await fetch('/api/channels');
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setCountries(data);
      } catch (err) {
        // Fallback for GitHub Pages (Static Hosting)
        try {
          const res = await fetch('/static-api/channels.json');
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
      if (activeTab === 'custom') {
        setChannels([]);
        setLoading(false);
        return;
      }
      const fetchId = activeTab === 'fifa' ? 'fifa' : activeTab === 'sports' ? 'sports' : selectedCountry;
      try {
        let res = await fetch(`/api/channels/${fetchId}?source=${serverSource}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setChannels(data);
      } catch (err) {
        // Fallback for GitHub Pages
        try {
          const res = await fetch(`/static-api/${fetchId}.json`);
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
    const baseChannels = [...channels, ...customChannels];
    const hasCaze = baseChannels.some(c => c.url === CAZE_TV_CHANNEL.url);
    if (!hasCaze && (activeTab === 'fifa' || activeTab === 'sports' || activeTab === 'all' || selectedCountry === 'br' || selectedCountry === 'all')) {
      baseChannels.unshift({
        ...CAZE_TV_CHANNEL,
        source: serverSource
      });
    }
    let list = baseChannels;
    if (activeTab === 'favorites') {
      list = favorites;
    } else if (activeTab === 'custom') {
      const allCustom: Channel[] = [];
      customPlaylists.forEach(playlist => {
        if (playlist.channels && playlist.channels.length > 0) {
          playlist.channels.forEach((ch: any) => {
            allCustom.push({
              ...ch,
              source: playlist.server || '4',
              country: ch.country || 'custom'
            });
          });
        }
      });
      list = allCustom;
    } else if (activeTab === 'fifa' || activeTab === 'sports') {
      // Use the pre-compiled global static lists without extra clientside pruning
      list = baseChannels;
    } else if (activeTab === 'news') {
      const kw = ['news', 'somoy', 'jamuna', 'ekattor', 'independent', 'bbc', 'cnn', 'al jazeera'];
      list = baseChannels.filter(c => kw.some(k => c.name.toLowerCase().includes(k)));
    }
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase().trim();
      if (query.startsWith('@') && query.length >= 2) {
        const countryCode = query.substring(1);
        list = list.filter(c => c.country?.toLowerCase() === countryCode);
      } else {
        // Standard name search. We can also include country check but name should be primary.
        list = list.filter(c => 
          c.name.toLowerCase().includes(query) || 
          (c.country && c.country.toLowerCase() === query)
        );
      }
    }
    
    // Deduplicate list by url and name to ensure no duplicate key/visual items
    const seen = new Set<string>();
    const uniqueList = list.filter(c => {
      const key = `${c.url}-${c.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const finalFilteredList = uniqueList.filter(c => {
      if (activeTab === 'all') {
        return c.source === serverSource;
      }
      if (c.source === '1' && isServer1Enabled) return true;
      if (c.source === '2' && isServer2Enabled) return true;
      if (c.source === '3' && isServer3Enabled) return true;
      if (c.source === '4' && isServer4Enabled) return true;
      
      // Keep bein sports 1 and CazéTV channels visible
      if (c.name.toLowerCase().includes('bein sports 1') || c.url === CAZE_TV_CHANNEL.url || c.name.toLowerCase().includes('cazétv')) {
        return true;
      }
      return false;
    });

    setFilteredChannels(finalFilteredList);
  }, [debouncedSearch, channels, favorites, activeTab, isServer1Enabled, isServer2Enabled, isServer3Enabled, isServer4Enabled, serverSource]);

  const sortedFilteredChannels = React.useMemo(() => {
    let sorted = [...filteredChannels];
    
    // For FIFA, prioritze specific channel keywords if they exist
    if (activeTab === 'fifa') {
      const priorityKeywords = ['fifa', 'world cup', 'fwc', 'plus', 'star'];
      sorted.sort((a, b) => {
        // CazéTV comes first
        const isA_Caze = a.url === CAZE_TV_CHANNEL.url || a.name.toLowerCase().includes('cazétv');
        const isB_Caze = b.url === CAZE_TV_CHANNEL.url || b.name.toLowerCase().includes('cazétv');
        if (isA_Caze && !isB_Caze) return -1;
        if (!isA_Caze && isB_Caze) return 1;

        const isA_beIn1 = a.name.toLowerCase().includes('bein sports 1');
        const isB_beIn1 = b.name.toLowerCase().includes('bein sports 1');
        if (isA_beIn1 && !isB_beIn1) return -1;
        if (!isA_beIn1 && isB_beIn1) return 1;

        const isA_TSports = a.name.toLowerCase().includes('t sports') || a.name.toLowerCase().includes('tsports');
        const isB_TSports = b.name.toLowerCase().includes('t sports') || b.name.toLowerCase().includes('tsports');
        if (isA_TSports && !isB_TSports) return -1;
        if (!isA_TSports && isB_TSports) return 1;

        const aPriority = priorityKeywords.some(k => a.name.toLowerCase().includes(k)) ? 0 : 1;
        const bPriority = priorityKeywords.some(k => b.name.toLowerCase().includes(k)) ? 0 : 1;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.name.localeCompare(b.name);
      });
    } else {
      sorted.sort((a, b) => {
        // CazéTV comes first
        const isA_Caze = a.url === CAZE_TV_CHANNEL.url || a.name.toLowerCase().includes('cazétv');
        const isB_Caze = b.url === CAZE_TV_CHANNEL.url || b.name.toLowerCase().includes('cazétv');
        if (isA_Caze && !isB_Caze) return -1;
        if (!isA_Caze && isB_Caze) return 1;

        // Then beIn sports 1
        const isA_beIn1 = a.name.toLowerCase().includes('bein sports 1');
        const isB_beIn1 = b.name.toLowerCase().includes('bein sports 1');
        if (isA_beIn1 && !isB_beIn1) return -1;
        if (!isA_beIn1 && isB_beIn1) return 1;

        const aDead = deadChannels.has(a.url);
        const bDead = deadChannels.has(b.url);
        
        if (aDead !== bDead) {
          return aDead ? 1 : -1;
        }
        
        // Secondary sort: Active server channels first
        if (a.source === serverSource && b.source !== serverSource) return -1;
        if (a.source !== serverSource && b.source === serverSource) return 1;
        
        // Tertiary sort: Alphabetical
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
    }
    return sorted;
  }, [filteredChannels, deadChannels, activeTab]);

  const favoriteUrls = React.useMemo(() => new Set(favorites.map(f => f.url)), [favorites]);

  const displayChannelsList = React.useMemo(() => {
    if (debouncedSearch && universalSearchResults.length > 0) {
      return universalSearchResults;
    }
    return sortedFilteredChannels;
  }, [debouncedSearch, universalSearchResults, sortedFilteredChannels]);

  useEffect(() => {
    setVisibleCount(60);
    if (scrollContainerRef.current) {
       scrollContainerRef.current.scrollTop = 0;
    }
  }, [selectedCountry, activeTab, debouncedSearch, serverSource]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        // Increase jump to reduce recalculation frequency
        setVisibleCount(prev => prev + 100);
      }
    }, { threshold: 0, rootMargin: '400px' });

    if (loadMoreTriggerRef.current) {
      observerRef.current.observe(loadMoreTriggerRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [displayChannelsList.length]);



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
    setShowSettingsMenu(false);
    setPlayerError('none');
  }, [currentChannel]);

  useEffect(() => {
    let active = true;
    if (currentChannel) {
      if (currentChannel.type === 'youtube-iframe') {
        setIsBuffering(false);
        setIsPlaying(true);
        setPlayerError('none');
        setValidationStatus('direct');
        setValidationDetails(lang === 'en' ? 'YouTube Live Embed active' : 'ইউটিউব লাইভ এমবেড সক্রিয়');
        
        // Reset previous players
        if (hlsRef.current) {
          try { hlsRef.current.destroy(); } catch (e) {}
          hlsRef.current = null;
        }
        if (dashRef.current) {
          try { dashRef.current.reset(); } catch (e) {}
          dashRef.current = null;
        }
        if (mpegtsRef.current) {
          try {
            mpegtsRef.current.unload();
            mpegtsRef.current.detachMediaElement();
            mpegtsRef.current.destroy();
          } catch (e) {}
          mpegtsRef.current = null;
        }
        return;
      }
    }

    if (currentChannel && videoRef.current) {
      const video = videoRef.current;
      try {
        (video as any).autoPictureInPicture = true;
      } catch (e) {
        console.warn(e);
      }
      setPlayerError('none');
      setErrorMsg(false);
      
      if (!navigator.onLine) {
        setPlayerError('no-internet');
        setIsBuffering(false);
        return;
      }
      
      setIsBuffering(true);
      setValidationStatus('direct');
      setValidationDetails(lang === 'en' ? 'Direct playback active' : 'সরাসরি প্লেব্যাক সক্রিয়');

      let stallTimer: NodeJS.Timeout | null = null;
      let watchdogAttempts = 0;
      let boundEvents: { name: string; handler: any }[] = [];

      const clearStallWatchdog = () => {
        if (stallTimer) {
          clearTimeout(stallTimer);
          stallTimer = null;
        }
        watchdogAttempts = 0;
      };

      const startStallWatchdog = (streamFormat: string, targetUrl: string) => {
        if (stallTimer) clearTimeout(stallTimer);
        
        const executeWatchdogStep = () => {
          if (!active) return;
          watchdogAttempts++;
          console.warn(`Video stall watchdog triggered. Step ${watchdogAttempts}.`);
          setIsBuffering(true);

          if (streamFormat === 'hls' && hlsRef.current) {
            if (watchdogAttempts === 1) {
              console.log("HLS Stall Recovery (Step 1): Nudging playhead and calling startLoad()...");
              try {
                if (video.buffered && video.buffered.length > 0) {
                  const end = video.buffered.end(video.buffered.length - 1);
                  if (video.currentTime >= end - 0.5) {
                    video.currentTime = Math.max(0, end - 1.0);
                  } else {
                    video.currentTime = video.currentTime + 0.2;
                  }
                } else {
                  video.currentTime = video.currentTime + 0.2;
                }
              } catch (e) {}
              try {
                hlsRef.current.startLoad();
              } catch (e) {}
              stallTimer = setTimeout(executeWatchdogStep, 5000);
            } else if (watchdogAttempts === 2) {
              console.log("HLS Stall Recovery (Step 2): Calling recoverMediaError()...");
              try {
                hlsRef.current.recoverMediaError();
              } catch (e) {}
              stallTimer = setTimeout(executeWatchdogStep, 5000);
            } else {
              console.log("HLS Stall Recovery (Step 3): Full source reload...");
              try {
                hlsRef.current.loadSource(targetUrl);
                hlsRef.current.startLoad();
              } catch (e) {}
              stallTimer = setTimeout(executeWatchdogStep, 8000);
              watchdogAttempts = 0; // cycle back
            }
          } else if (streamFormat === 'mpegts' && mpegtsRef.current) {
            if (watchdogAttempts === 1) {
              console.log("Mpegts Stall Recovery (Step 1): Pausing and resuming player...");
              try {
                mpegtsRef.current.pause();
                mpegtsRef.current.play();
              } catch (e) {}
              stallTimer = setTimeout(executeWatchdogStep, 5000);
            } else {
              console.log("Mpegts Stall Recovery (Step 2): Full unload and reload...");
              try {
                mpegtsRef.current.unload();
                mpegtsRef.current.load();
                mpegtsRef.current.play();
              } catch (e) {}
              stallTimer = setTimeout(executeWatchdogStep, 8000);
              watchdogAttempts = 0; // cycle back
            }
          } else if (streamFormat === 'dash' && dashRef.current) {
            if (watchdogAttempts === 1) {
              console.log("Dash Stall Recovery (Step 1): Pausing and resuming player...");
              try {
                dashRef.current.pause();
                dashRef.current.play();
              } catch (e) {}
              stallTimer = setTimeout(executeWatchdogStep, 5000);
            } else {
              console.log("Dash Stall Recovery (Step 2): Full attach source reload...");
              try {
                dashRef.current.attachSource(targetUrl);
              } catch (e) {}
              stallTimer = setTimeout(executeWatchdogStep, 8000);
              watchdogAttempts = 0; // cycle back
            }
          } else {
            // Native fallback or direct streams
            if (watchdogAttempts === 1) {
              console.log("Native Stall Recovery (Step 1): Nudging playhead slightly...");
              try {
                video.currentTime = video.currentTime + 0.2;
              } catch (e) {}
              stallTimer = setTimeout(executeWatchdogStep, 5000);
            } else {
              console.log("Native Stall Recovery (Step 2): Reloading src element...");
              try {
                const currentSrc = video.src;
                video.src = '';
                video.src = currentSrc;
                video.play().catch(() => {});
              } catch (e) {}
              stallTimer = setTimeout(executeWatchdogStep, 8000);
              watchdogAttempts = 0; // cycle back
            }
          }
        };

        stallTimer = setTimeout(executeWatchdogStep, 10000); // Trigger step 1 after 10s of stalling
      };

      const handleWaiting = (streamFormat: string, targetUrl: string) => {
        if (active) {
          setIsBuffering(true);
          startStallWatchdog(streamFormat, targetUrl);
        }
      };

      const handlePlayingOrProgress = () => {
        if (active) {
          setIsBuffering(false);
          clearStallWatchdog();
        }
      };

      const runLoader = async () => {
        const streamUrl = currentChannel.urls && currentChannel.urls[selectedServer] 
          ? currentChannel.urls[selectedServer] 
          : currentChannel.url;

        // Reset previous players
        if (hlsRef.current) {
          try { hlsRef.current.destroy(); } catch (e) {}
          hlsRef.current = null;
        }
        if (dashRef.current) {
          try { dashRef.current.reset(); } catch (e) {}
          dashRef.current = null;
        }
        if (mpegtsRef.current) {
          try {
            mpegtsRef.current.unload();
            mpegtsRef.current.detachMediaElement();
            mpegtsRef.current.destroy();
          } catch (e) {}
          mpegtsRef.current = null;
        }

        const isHttpsPage = window.location.protocol === 'https:';
        const headerParams = (userAgent ? `&userAgent=${encodeURIComponent(userAgent)}` : '') + 
                             (referer ? `&referer=${encodeURIComponent(referer)}` : '');
        const proxyConfigParams = (proxyHost && proxyPort ? `&proxyHost=${proxyHost}&proxyPort=${proxyPort}&proxyType=${proxyType}` : '');

        let targetUrl = streamUrl;
        let activeMode: 'direct' | 'proxy' | 'custom' = streamMode;

        // Auto fallback to secure proxy for insecure http streams on an https page to bypass Mixed Content blocking
        if (isHttpsPage && streamUrl.startsWith('http:') && activeMode === 'direct') {
          activeMode = 'proxy';
        }

        if (activeMode === 'proxy') {
          targetUrl = window.location.origin + `/api/proxy?url=${encodeURIComponent(streamUrl)}${headerParams}${proxyConfigParams}`;
        } else if (activeMode === 'custom') {
          if (proxyType === 'url' && customProxyUrl) {
            targetUrl = `${customProxyUrl}${encodeURIComponent(streamUrl)}`;
          } else if (proxyHost && proxyPort) {
            targetUrl = window.location.origin + `/api/proxy?url=${encodeURIComponent(streamUrl)}${headerParams}${proxyConfigParams}`;
          }
        }

        // Format detection helper on the original URL to keep extension metadata
        const detectType = (url: string) => {
          const lc = url.toLowerCase();
          if (lc.includes('.mpd')) return 'dash';
          if (lc.includes('.ts') || lc.includes('/ts/') || lc.match(/live\/[^/]+\/[^/]+\/\d+(\.ts)?$/)) return 'mpegts';
          return 'hls';
        };

        const streamFormat = detectType(streamUrl);

        if (!active) return;

        setPlayerDiagnostics({
          originalUrl: streamUrl,
          resolvedUrl: targetUrl,
          format: streamFormat,
          mode: activeMode,
          time: new Date().toLocaleTimeString()
        });

        if (activeMode === 'proxy') {
          setValidationStatus('fallback-local');
          setValidationDetails(lang === 'en' ? 'Streaming via App secure Proxy...' : 'অ্যপ প্রক্সির মাধ্যমে স্ট্রিম হচ্ছে...');
        } else if (activeMode === 'custom') {
          setValidationStatus('fallback-public');
          setValidationDetails(lang === 'en' ? 'Streaming via Custom Proxy...' : 'কাস্টম প্রক্সির মাধ্যমে স্ট্রিম হচ্ছে...');
        } else {
          setValidationStatus('direct');
          setValidationDetails(lang === 'en' ? 'Direct playback active' : 'সরাসরি প্লেব্যাক সক্রিয়');
        }

        // Bind watchdog events
        const handleWaitingFn = () => handleWaiting(streamFormat, targetUrl);
        const handlePlayingOrProgressFn = handlePlayingOrProgress;

        video.addEventListener('waiting', handleWaitingFn);
        video.addEventListener('playing', handlePlayingOrProgressFn);
        video.addEventListener('timeupdate', handlePlayingOrProgressFn);
        video.addEventListener('seeking', handlePlayingOrProgressFn);

        boundEvents = [
          { name: 'waiting', handler: handleWaitingFn },
          { name: 'playing', handler: handlePlayingOrProgressFn },
          { name: 'timeupdate', handler: handlePlayingOrProgressFn },
          { name: 'seeking', handler: handlePlayingOrProgressFn }
        ];
        
        if (streamFormat === 'hls') {
          if (Hls.isSupported()) {
            const hls = new Hls({ 
              maxBufferLength: 30, 
              maxMaxBufferLength: 60,
              maxBufferSize: 60 * 1000 * 1000,
              maxBufferHole: 0.5,
              enableWorker: true, 
              lowLatencyMode: false,
              backBufferLength: 30,
              progressive: true,
              fragLoadingTimeOut: 20000,
              manifestLoadingTimeOut: 20000
            });
            hlsRef.current = hls;
            hls.loadSource(targetUrl);
            hls.attachMedia(video);

            const handleFatalFailure = async () => {
              setIsBuffering(false); 
              if (hlsRef.current) {
                try { hlsRef.current.destroy(); } catch (e) {}
                hlsRef.current = null;
              }
              const isConnected = await checkIsInternetConnected();
              if (!isConnected) {
                setPlayerError('no-internet');
              } else {
                setPlayerError('stream-error');
                setErrorMsg(true); 
              }
            };

            let networkRetryCount = 0;
            let mediaRetryCount = 0;
            const maxRetries = 3;

            hls.on(Hls.Events.FRAG_BUFFERED, () => {
              networkRetryCount = 0;
              mediaRetryCount = 0;
            });

            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
              if (!active) return;
              setQualityLevels([
                { id: -1, label: 'Auto' },
                ...hls.levels.map((level, index) => ({
                  id: index,
                  label: level.height ? `${level.height}p` : `Level ${index}`
                }))
              ]);
              setCurrentQuality(hls.currentLevel);
              video.play()
                .then(() => {
                  if (active) {
                    setIsPlaying(true);
                    setIsBuffering(false);
                  }
                })
                .catch((err) => {
                  console.warn("Autoplay blocked or play failed:", err);
                  if (active) {
                    setIsPlaying(false);
                    setIsBuffering(false);
                    setShowControls(true);
                  }
                });
            });
            hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
              if (!active) return;
              if (hls.autoLevelEnabled) {
                setCurrentQuality(-1);
              } else {
                setCurrentQuality(data.level);
              }
            });

            hls.on(Hls.Events.ERROR, async (event, data) => {
              if (data.fatal) {
                if (!active) return;
                console.warn(`HLS fatal error encountered: ${data.type}`, data);
                
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    if (networkRetryCount < maxRetries) {
                      networkRetryCount++;
                      console.log(`Attempting to recover from fatal network error (Retry ${networkRetryCount}/${maxRetries})...`);
                      hls.startLoad();
                    } else {
                      console.error("Max HLS network retries reached. Failing.");
                      handleFatalFailure();
                    }
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    if (mediaRetryCount < maxRetries) {
                      mediaRetryCount++;
                      console.log(`Attempting to recover from fatal media error (Retry ${mediaRetryCount}/${maxRetries})...`);
                      hls.recoverMediaError();
                    } else {
                      console.error("Max HLS media retries reached. Failing.");
                      handleFatalFailure();
                    }
                    break;
                  default:
                    console.error("Unrecoverable fatal HLS error. Failing.");
                    handleFatalFailure();
                    break;
                }
              } else {
                console.warn("HLS non-fatal error encountered (retaining player):", data.type, data.details);
              }
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = targetUrl;
            video.onerror = async () => {
              if (!active) return;
              setIsBuffering(false);
              
              const isConnected = await checkIsInternetConnected();
              if (!isConnected) {
                setPlayerError('no-internet');
              } else {
                setPlayerError('stream-error');
                setErrorMsg(true);
              }
            };
            video.play()
              .then(() => {
                if (active) {
                  setIsPlaying(true);
                  setIsBuffering(false);
                }
              })
              .catch((err) => {
                console.warn("Native Autoplay blocked or play failed:", err);
                if (active) {
                  setIsPlaying(false);
                  setIsBuffering(false);
                  setShowControls(true);
                }
              });
          }
        } else if (streamFormat === 'dash') {
          try {
            const player = dashjs.MediaPlayer().create();
            dashRef.current = player;
            player.initialize(video, targetUrl, true);
            
            let dashRetryCount = 0;
            const maxDashRetries = 3;

            player.on(dashjs.MediaPlayer.events.PLAYBACK_PLAYING, () => {
              if (active) {
                setIsPlaying(true);
                setIsBuffering(false);
                dashRetryCount = 0;
              }
            });
            player.on(dashjs.MediaPlayer.events.ERROR, async (errorEvent: any) => {
              if (!active) return;
              console.warn("DashJS error:", errorEvent);
              if (dashRetryCount < maxDashRetries) {
                dashRetryCount++;
                console.log(`Attempting to recover from Dash error (Retry ${dashRetryCount}/${maxDashRetries})...`);
                player.attachSource(targetUrl);
              } else {
                console.error("Max DashJS retries reached. Failing.");
                setIsBuffering(false);
                const isConnected = await checkIsInternetConnected();
                if (!isConnected) {
                  setPlayerError('no-internet');
                } else {
                  setPlayerError('stream-error');
                  setErrorMsg(true);
                }
              }
            });
          } catch (e) {
            console.error("DASH loading failed:", e);
            setPlayerError('stream-error');
          }
        } else if (streamFormat === 'mpegts') {
          try {
            if (mpegts.getFeatureList().mseLivePlayback) {
              const player = mpegts.createPlayer({
                type: 'mpegts',
                url: targetUrl,
                isLive: true
              }, {
                enableStashBuffer: true,
                stashInitialSize: 384, // KB
              });
              mpegtsRef.current = player;
              player.attachMediaElement(video);
              player.load();
              try {
                const playPromise = player.play();
                if (playPromise !== undefined) {
                  playPromise
                    .then(() => {
                      if (active) {
                        setIsPlaying(true);
                        setIsBuffering(false);
                      }
                    })
                    .catch((err: any) => {
                      if (err?.name !== 'AbortError' && !err?.message?.includes('abort')) {
                        console.warn("Mpegts play promise failed:", err);
                      }
                      if (active) {
                        setIsPlaying(false);
                        setIsBuffering(false);
                      }
                    });
                } else {
                  if (active) {
                    setIsPlaying(true);
                    setIsBuffering(false);
                  }
                }
              } catch (playErr) {
                console.warn("Mpegts immediate play failed:", playErr);
              }

              player.on(mpegts.Events.ERROR, async (type: any, detail: any, info: any) => {
                console.error("Mpegts error:", type, detail, info);
                if (!active) return;
                setIsBuffering(false);
                const isConnected = await checkIsInternetConnected();
                if (!isConnected) {
                  setPlayerError('no-internet');
                } else {
                  setPlayerError('stream-error');
                  setErrorMsg(true);
                }
              });
            } else {
              // native TS stream fallback
              video.src = targetUrl;
              video.onerror = async () => {
                if (!active) return;
                setIsBuffering(false);
                const isConnected = await checkIsInternetConnected();
                if (!isConnected) {
                  setPlayerError('no-internet');
                } else {
                  setPlayerError('stream-error');
                  setErrorMsg(true);
                }
              };
              video.play()
                .then(() => {
                  if (active) {
                    setIsPlaying(true);
                    setIsBuffering(false);
                  }
                })
                .catch(() => {
                  if (active) {
                    setPlayerError('stream-error');
                  }
                });
            }
          } catch (e) {
            console.error("MPEG-TS loading failed:", e);
            setPlayerError('stream-error');
          }
        }
      };

      runLoader();
      
      return () => {
        active = false;
        clearStallWatchdog();
        boundEvents.forEach(evt => {
          if (videoRef.current) {
            videoRef.current.removeEventListener(evt.name, evt.handler);
          }
        });
        if (hlsRef.current) {
          try { hlsRef.current.destroy(); } catch (e) {}
          hlsRef.current = null;
        }
        if (dashRef.current) {
          try { dashRef.current.reset(); } catch (e) {}
          dashRef.current = null;
        }
        if (mpegtsRef.current) {
          try {
            mpegtsRef.current.unload();
            mpegtsRef.current.detachMediaElement();
            mpegtsRef.current.destroy();
          } catch (e) {}
          mpegtsRef.current = null;
        }
      };
    }
  }, [currentChannel, streamMode, customProxyUrl, selectedServer]);

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
        isProgrammaticBackRef.current = true;
        window.history.back();
      }
    } catch (e) {
      console.warn("History sync failed:", e);
    }
  }, [currentChannel, isCountryModalOpen, isSidebarOpen]);

  // Handle hardware / browser back button click (popstate)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (isProgrammaticBackRef.current) {
        isProgrammaticBackRef.current = false;
        return;
      }
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

  const toggleFavorite = React.useCallback((channel: Channel, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      if (prev.some(f => f.url === channel.url)) {
        return prev.filter(f => f.url !== channel.url);
      } else {
        return [...prev, channel];
      }
    });
  }, []);

  const handleCardClick = React.useCallback((channel: Channel) => {
    if (scrollContainerRef.current && !currentChannel) {
      browseScrollPosRef.current = scrollContainerRef.current.scrollTop;
    }
    setCurrentChannel(channel);
    setIsSidebarOpen(false);
    setIsMiniPlayer(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentChannel]);

  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('Modern Clipboard API failed, trying fallback:', err);
      }
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return !!successful;
    } catch (err) {
      console.error('Fallback clipboard copy failed:', err);
      return false;
    }
  };

  const handleCopyLink = async (url: string) => {
    const success = await copyToClipboard(url);
    if (success) {
      setToastMessage(lang === 'en' ? 'Link copied to clipboard!' : 'লিঙ্ক কপি করা হয়েছে!');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleShareChannel = async (channel: Channel, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // Dynamically use the current origin and path so it supports both localhost, Cloudflare, custom domains, or previews automatically
    const baseUrl = `${window.location.origin}${window.location.pathname}`;

    const params = new URLSearchParams();
    params.set('ch', channel.url);
    params.set('name', channel.name);
    if (channel.logo) params.set('logo', channel.logo);
    if (channel.country) params.set('country', channel.country);
    
    const shareUrl = `${baseUrl}?${params.toString()}`;

    if (navigator.share) {
      try {
        await navigator.share({
          url: shareUrl,
        });
      } catch (err) {
        console.warn('Web Share API failed, falling back to clipboard copy:', err);
        if (err instanceof Error && err.name !== 'AbortError') {
          await handleCopyLink(shareUrl);
        }
      }
    } else {
      await handleCopyLink(shareUrl);
    }
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
  
  const handleLogin = () => {};

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

        <div className="flex items-center space-x-1.5 sm:space-x-3">
          <button 
            onClick={() => setIsCustomModalOpen(true)}
            className="p-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-full cursor-pointer transition-all border border-indigo-500/20"
            title={lang === 'en' ? 'Add Custom M3U' : 'কাস্টম লিঙ্ক যোগ করুন'}
          >
            <Plus className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-zinc-800 rounded-full hidden sm:block">
            <Bell className="w-5 h-5" />
          </button>
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
                <Sidebar 
                  isSidebarOpen={isSidebarOpen}
                  setIsSidebarOpen={setIsSidebarOpen}
                  setActiveTab={setActiveTab}
                  activeTab={activeTab}
                  setCurrentChannel={setCurrentChannel}
                  currentChannel={currentChannel}
                  t={t}
                  lang={lang}

                  setIsCountryModalOpen={setIsCountryModalOpen}
                  selectedCountry={selectedCountry}
                  deferredPrompt={deferredPrompt}
                  handleInstallApp={handleInstallApp}
                  streamMode={streamMode}
                  setStreamMode={setStreamMode}
                  customProxyUrl={customProxyUrl}
                  setCustomProxyUrl={setCustomProxyUrl}
                  proxyHost={proxyHost}
                  setProxyHost={setProxyHost}
                  proxyPort={proxyPort}
                  setProxyPort={setProxyPort}
                  proxyType={proxyType}
                  setProxyType={setProxyType}
                  userAgent={userAgent}
                  setUserAgent={setUserAgent}
                  referer={referer}
                  setReferer={setReferer}
                  isServer1Enabled={isServer1Enabled}
                  setIsServer1Enabled={setIsServer1Enabled}
                  isServer2Enabled={isServer2Enabled}
                  setIsServer2Enabled={setIsServer2Enabled}
                  isServer3Enabled={isServer3Enabled}
                  setIsServer3Enabled={setIsServer3Enabled}
                  isServer4Enabled={isServer4Enabled}
                  setIsServer4Enabled={setIsServer4Enabled}
                  serverSource={serverSource}
                  setServerSource={setServerSource}
                  setIsCustomModalOpen={setIsCustomModalOpen}
                />
                </motion.div>
             </>
          )}
        </AnimatePresence>

        {/* Home Browse vs Watch Mode */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent bg-[#0f0f0f]">
          
          {/* HOME BROWSING MODE */}
          <div className={`p-4 sm:p-6 lg:p-8 max-w-[2000px] mx-auto min-h-full ${(!currentChannel || isMiniPlayer) ? '' : 'hidden'}`}>
              
              {/* Category Pills directly below nav on mobile */}
              <div className="flex sm:hidden overflow-x-auto space-x-2 pb-3 mb-2 scrollbar-none">
                 <div className="flex items-center bg-[#222] border border-zinc-800 rounded-lg overflow-hidden flex-1 shrink-0 min-w-[200px]">
                    <span className="px-3 text-[10px] uppercase font-bold text-zinc-400 bg-zinc-900 h-full flex items-center">{selectedCountry}</span>
                    <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent text-xs w-full py-2 px-2 outline-none" />
                 </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                 <h1 className="text-xl sm:text-2xl font-bold font-sans text-white">
                   {activeTab === 'all' ? t.explore : activeTab === 'favorites' ? t.favorites : activeTab === 'news' ? t.news : activeTab === 'fifa' ? t.fifa : t.sports}
                 </h1>
                 <span className="text-sm font-medium text-zinc-500 hidden sm:block">{displayChannelsList.length} {t.views.replace('views', 'streams')}</span>
              </div>

              {activeTab === 'all' && (isServer1Enabled || isServer2Enabled || isServer3Enabled || isServer4Enabled) && (
                <div className="flex space-x-2 mb-6 select-none">
                  {isServer1Enabled && (
                    <button 
                      onClick={() => setServerSource('1')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${serverSource === '1' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                    >
                      Server 1
                    </button>
                  )}
                  {isServer2Enabled && (
                    <button 
                      onClick={() => setServerSource('2')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${serverSource === '2' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                    >
                      Server 2
                    </button>
                  )}
                  {isServer3Enabled && (
                    <button 
                      onClick={() => setServerSource('3')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${serverSource === '3' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                    >
                      Server 3
                    </button>
                  )}
                  {isServer4Enabled && (
                    <button 
                      onClick={() => setServerSource('4')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${serverSource === '4' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                    >
                      Server 4
                    </button>
                  )}
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
                    {displayChannelsList.slice(0, visibleCount).map((channel, idx) => (
                      <ChannelCard 
                        key={`${channel.url}-${channel.name}-${idx}`}
                        channel={channel}
                        isDead={deadChannels.has(channel.url)}
                        isFavorite={favoriteUrls.has(channel.url)}
                        onClick={handleCardClick}
                        onToggleFavorite={toggleFavorite}
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
                       /* Centered Controls (Play/Pause) & PiP Button */
                     <>
                      <AnimatePresence>
                        {(showControls || !isPlaying) && (
                          <motion.div 
                             initial={{ opacity: 0, scale: 0.9 }}
                             animate={{ opacity: 1, scale: 1 }}
                             exit={{ opacity: 0, scale: 0.9 }}
                             className="absolute inset-x-0 top-0 bottom-16 z-30 flex items-center justify-center bg-transparent"
                             onClick={(e) => {
                               if (e.target === e.currentTarget) {
                                 handleContainerClick(e);
                               }
                             }}
                          >
                            <button 
                              onClick={(e) => { e.stopPropagation(); handlePlayToggle(e); }}
                              className="w-16 h-16 sm:w-20 sm:h-20 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer active:scale-90 transition-transform shadow-2xl border border-white/10 hover:bg-black/60 hover:border-white/20"
                            >
                              {isPlaying ? <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-current text-white"/> : <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1 text-white" />}
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
                            className="absolute top-4 right-4 z-50 flex items-center space-x-2"
                          >
                            <button 
                              onClick={handlePiPClick}
                              className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white cursor-pointer hover:bg-black/80 active:scale-95 transition-all shadow-md border border-white/15"
                              title="Picture in Picture"
                            >
                              <PictureInPicture className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-100" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                     </>
                    )}

                    {/* Quality Settings (Native) hidden - we use custom HLS menu */}

                  {isBuffering && (
                    <div className="absolute inset-0 z-[25] flex flex-col justify-center items-center pointer-events-none bg-black/40">
                      <div className="w-16 h-16 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
                      <div className="mt-6 text-white text-xs font-bold tracking-[0.3em] animate-pulse drop-shadow-lg font-mono">LOADING STREAM...</div>
                    </div>
                  )}

                  {playerError === 'no-internet' && (
                    <div className="absolute inset-0 z-30 flex flex-col justify-center items-center bg-zinc-950 px-6 text-center animate-fade-in">
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full mb-4">
                        <Globe className="w-12 h-12 text-red-500 animate-pulse" />
                      </div>
                      <p className="text-white font-black text-xl mb-2">{t.noInternet}</p>
                      <p className="text-zinc-400 text-sm max-w-md leading-relaxed mb-6 font-medium">
                        {t.noInternetDesc}
                      </p>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setPlayerError('none');
                          setIsBuffering(true);
                          const prevCh = currentChannel;
                          setCurrentChannel(null);
                          setTimeout(() => setCurrentChannel(prevCh), 100);
                        }} 
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full cursor-pointer shadow-xl active:scale-95 transition-all text-sm font-sans flex items-center space-x-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>{t.retryConnection}</span>
                      </button>
                    </div>
                  )}

                  {playerError === 'stream-error' && (
                    <div className="absolute inset-0 z-30 flex flex-col justify-center items-center bg-zinc-950 px-6 py-4 text-center overflow-y-auto animate-fade-in">
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-full mb-3 shrink-0">
                        <TvIcon className="w-10 h-10 text-red-500" />
                      </div>
                      <p className="text-white font-extrabold text-lg mb-1 shrink-0">
                        {lang === 'en' ? 'Playback Blocked or Stream Offline' : 'প্লেব্যাক ব্লক হয়েছে বা স্ট্রিম অফলাইন'}
                      </p>
                      <p className="text-zinc-400 text-xs max-w-sm mb-4 leading-normal shrink-0">
                        {lang === 'en' 
                          ? 'Mixed Content, CORS, or Server block detected. Choose a different connection protocol below.' 
                          : 'মিক্সড কনটেন্ট, CORS বা সার্ভার ব্লক সনাক্ত হয়েছে। নিচে সংযোগের নিয়ম পরিবর্তন করুন।'}
                      </p>

                      {/* Connection Protocol Toggler directly inside player */}
                      <div className="flex bg-zinc-900 border border-white/5 p-1 rounded-xl mb-4 shrink-0 max-w-xs w-full">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setStreamMode('direct'); 
                            setPlayerError('none');
                            setIsBuffering(true);
                            const prevCh = currentChannel;
                            setCurrentChannel(null);
                            setTimeout(() => setCurrentChannel(prevCh), 50);
                          }} 
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            streamMode === 'direct' 
                              ? 'bg-zinc-800 text-indigo-400 border border-white/5' 
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          ⚡ Direct Link
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setStreamMode('proxy'); 
                            setPlayerError('none');
                            setIsBuffering(true);
                            const prevCh = currentChannel;
                            setCurrentChannel(null);
                            setTimeout(() => setCurrentChannel(prevCh), 50);
                          }} 
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            streamMode === 'proxy' 
                              ? 'bg-zinc-800 text-indigo-400 border border-white/5' 
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          🛡️ Secure Proxy
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-center mb-4 shrink-0">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setPlayerError('none');
                            setIsBuffering(true);
                            const prevCh = currentChannel;
                            setCurrentChannel(null);
                            setTimeout(() => setCurrentChannel(prevCh), 100);
                          }} 
                          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full cursor-pointer shadow-xl text-xs flex items-center space-x-1.5 active:scale-95 transition-all font-sans"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>{t.retryConnection}</span>
                        </button>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const u = currentChannel.urls && currentChannel.urls[selectedServer] 
                              ? currentChannel.urls[selectedServer] 
                              : currentChannel.url;
                            if (u) {
                              navigator.clipboard.writeText(u);
                              setCopiedErrorUrl(true);
                              setTimeout(() => setCopiedErrorUrl(false), 2000);
                            }
                          }}
                          className="px-4 py-2 bg-zinc-900 border border-white/5 text-zinc-300 font-bold rounded-full cursor-pointer text-xs flex items-center space-x-1.5 hover:bg-zinc-800 active:scale-95 transition-all font-sans"
                        >
                          {copiedErrorUrl ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedErrorUrl ? (lang === 'en' ? 'Copied URL!' : 'ইউআরএল কপিড!') : (lang === 'en' ? 'Copy Raw Stream' : 'মূল লিংক কপি করুন')}</span>
                        </button>
                      </div>

                      {/* Debug Diagnostics Expander */}
                      <div className="w-full max-w-sm text-left">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDiagnostics(!showDiagnostics);
                          }}
                          className="text-[10px] font-bold tracking-wider text-zinc-500 hover:text-zinc-400 flex items-center space-x-1 uppercase mx-auto mb-2"
                        >
                          <span>{showDiagnostics ? '▼ Hide Diagnostics' : '▶ Show Diagnostics'}</span>
                        </button>
                        
                        {showDiagnostics && playerDiagnostics && (
                          <div className="p-3 bg-zinc-900/60 border border-white/5 rounded-xl text-[9px] font-mono text-zinc-400 leading-normal space-y-1.5 max-h-[120px] overflow-y-auto w-full select-all">
                            <div><span className="text-zinc-600 font-bold uppercase tracking-widest text-[8px] mr-1">Time:</span> {playerDiagnostics.time}</div>
                            <div><span className="text-zinc-600 font-bold uppercase tracking-widest text-[8px] mr-1">Mode:</span> <span className="text-indigo-400 font-extrabold">{playerDiagnostics.mode.toUpperCase()}</span></div>
                            <div><span className="text-zinc-600 font-bold uppercase tracking-widest text-[8px] mr-1">Format:</span> <span className="text-yellow-500 font-extrabold">{playerDiagnostics.format.toUpperCase()}</span></div>
                            <div className="truncate"><span className="text-zinc-600 font-bold uppercase tracking-widest text-[8px] mr-1">Source:</span> {playerDiagnostics.originalUrl}</div>
                            <div className="truncate"><span className="text-zinc-600 font-bold uppercase tracking-widest text-[8px] mr-1">Target:</span> {playerDiagnostics.resolvedUrl}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {currentChannel.type === 'youtube-iframe' ? (
                    <div className="relative w-full h-full">
                      {/* Warning Warning Overlay Banner */}
                      <div className="absolute top-4 left-4 right-4 z-40 bg-zinc-950/95 border border-zinc-700/60 p-2.5 text-[10px] sm:text-xs rounded-xl text-center text-zinc-300 backdrop-blur-md shadow-lg flex items-center justify-center gap-1.5 font-bold">
                        {(currentChannel.url === CAZE_TV_CHANNEL.url || currentChannel.name.toLowerCase().includes('caze')) ? (
                          <>
                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                            <span className="text-red-400">
                              {lang === 'bn' 
                                ? "🇧🇷 কপিরাইট ব্লকিং এড়াতে দয়া করে আপনার ভিপিএন ব্রাজিল (Brazil) সার্ভারে সেট করুন" 
                                : "🇧🇷 Connect to a Brazil VPN to bypass copyright geo-blocking on this player"}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping shrink-0" />
                            <span>
                              {lang === 'bn' 
                                ? "এই চ্যানেলটি বর্তমানে লাইভ না থাকলে এমবেডে কিছু দেখাবে না" 
                                : "If this channel is not currently live, the embed will not display any video."}
                            </span>
                          </>
                        )}
                      </div>
                      <iframe
                        id="youtube-embed-player"
                        src={`https://www.youtube.com/embed/live_stream?channel=${currentChannel.url}`}
                        className="w-full h-full object-contain pointer-events-auto bg-black"
                        allow="autoplay; encrypted-media; fullscreen"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      className="w-full h-full object-contain pointer-events-auto bg-black"
                      autoPlay 
                      playsInline 
                      webkit-playsinline="true"
                      aria-label="Video Player"
                    />
                  )}

                  {/* Player Controls Overlay */}
                  {currentChannel.type !== 'youtube-iframe' && (
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

                             <div className="relative" onClick={(e) => e.stopPropagation()}>
                               <button 
                                 onClick={() => { setShowSettingsMenu(!showSettingsMenu); }}
                                 className="hover:opacity-80 p-1 cursor-pointer flex items-center space-x-1"
                                 title="Settings"
                               >
                                 <Settings className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
                                 {currentQuality !== -1 && qualityLevels.length > 1 && (
                                   <span className="text-[10px] bg-indigo-600 px-1 rounded font-bold">
                                     {qualityLevels.find(q => q.id === currentQuality)?.label}
                                   </span>
                                 )}
                               </button>
                               
                               <AnimatePresence>
                                 {showSettingsMenu && (
                                   <motion.div 
                                     initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                     animate={{ opacity: 1, y: 0, scale: 1 }}
                                     exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                     className="absolute bottom-full right-0 mb-3 bg-[#111112]/95 backdrop-blur-md border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl min-w-[245px] max-w-[280px] z-[100] font-sans p-3 text-left"
                                   >
                                     <div className="text-xs font-black text-zinc-100 mb-3 border-b border-zinc-900 pb-2 flex items-center justify-between">
                                        <span>{lang === 'en' ? 'PLAYER CONFIG' : 'প্লেয়ার কনফিগারেশন'}</span>
                                        <span className="text-[9px] bg-zinc-800 px-1.5 py-0.5 text-zinc-400 rounded-full font-mono">v2.2</span>
                                     </div>
                                     
                                     {/* Section 1: Backup Server Selector */}
                                     {currentChannel && currentChannel.urls && currentChannel.urls.length > 1 && (
                                       <div className="mb-3.5 pt-1">
                                         <label className="text-[10px] uppercase font-black text-zinc-400 tracking-wider block mb-1.5">
                                           {lang === 'en' ? 'Stream Server / Feed' : 'সার্ভার বা ব্যাকআপ ফিড'}
                                         </label>
                                         <div className="space-y-1 max-h-[110px] overflow-y-auto scrollbar-thin">
                                           {currentChannel.urls.map((url, index) => (
                                             <button
                                               key={index}
                                               onClick={() => {
                                                 setSelectedServer(index);
                                                 setPlayerError('none');
                                                 setIsBuffering(true);
                                               }}
                                               className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${selectedServer === index ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300'}`}
                                             >
                                               <span>{lang === 'en' ? `Server ${index + 1}` : `সার্ভার ${index + 1}`}</span>
                                               {index === 0 && <span className="text-[8px] opacity-60 ml-1">({lang === 'en' ? 'Primary' : 'প্রধান'})</span>}
                                               {selectedServer === index && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                                             </button>
                                           ))}
                                         </div>
                                       </div>
                                     )}
                                     {/* Section 2: Video Quality selector */}
                                     {qualityLevels.length > 1 && (
                                       <div className={`${currentChannel && currentChannel.urls && currentChannel.urls.length > 1 ? 'border-t border-zinc-900 mt-3 pt-3' : ''}`}>
                                         <label className="text-[10px] uppercase font-black text-zinc-400 tracking-wider block mb-1.5">
                                           {lang === 'en' ? 'Quality' : 'ভিডিও কোয়ালিটি'}
                                         </label>
                                         <div className="grid grid-cols-2 gap-1 max-h-[110px] overflow-y-auto scrollbar-thin">
                                           {qualityLevels.map((level) => (
                                             <button
                                               key={level.id}
                                               onClick={() => {
                                                 if (hlsRef.current) {
                                                    hlsRef.current.currentLevel = level.id;
                                                    setCurrentQuality(level.id);
                                                 }
                                               }}
                                               className={`text-center px-1.5 py-1 text-[10px] font-bold rounded-lg hover:bg-zinc-800/80 transition-all cursor-pointer border ${currentQuality === level.id ? 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' : 'text-zinc-400 border-transparent bg-zinc-900/20'}`}
                                             >
                                               {level.label}
                                             </button>
                                           ))}
                                         </div>
                                       </div>
                                     )}
                                     
                                     {/* Status Info */}
                                     <div className="mt-3.5 border-t border-zinc-900 pt-2 text-[8px] font-mono text-zinc-500 flex justify-between">
                                        <span>MODE: {streamMode.toUpperCase()}</span>
                                        <span>SRV: {selectedServer + 1} / {currentChannel?.urls?.length || 1}</span>
                                     </div>
                                   </motion.div>
                                 )}
                               </AnimatePresence>
                             </div>

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
                  )}
                  </div>



                {/* Video Info & Actions */}
                {!isMiniPlayer && (
                  <div className="mt-4 px-4 sm:px-0 mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">{currentChannel.name}</h1>
                    
                    {/* Connection Diagnostics Panel */}
                    <div className="mb-4 flex flex-wrap gap-2.5 items-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono border ${
                        validationStatus === 'checking' 
                          ? 'bg-zinc-800 text-zinc-400 border-zinc-700 animate-pulse'
                          : validationStatus === 'direct'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : validationStatus === 'fallback-local'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          validationStatus === 'checking' 
                            ? 'bg-zinc-500 animate-pulse'
                            : validationStatus === 'direct'
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse'
                            : validationStatus === 'fallback-local'
                            ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse'
                            : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse'
                        }`}></span>
                        <span>{
                          validationStatus === 'checking' 
                            ? (lang === 'en' ? 'Verifying Stream' : 'ফিড যাচাই করা হচ্ছে')
                            : validationStatus === 'direct'
                            ? (lang === 'en' ? 'Direct Connection' : 'সরাসরি সংযোগ')
                            : validationStatus === 'fallback-local'
                            ? (lang === 'en' ? 'App Server Proxy' : 'অ্যাপ সার্ভার প্রক্সি')
                            : (lang === 'en' ? 'CORS Router Proxy' : 'সিওআরএস রাউটার প্রক্সি')
                        }</span>
                      </span>

                      {validationDetails && (
                        <p className="text-[11px] text-zinc-400 font-medium tracking-tight">
                          {validationDetails}
                        </p>
                      )}
                    </div>

                    {/* Brazil VPN Warning Card specifically for CazéTV */}
                    {(currentChannel.url === CAZE_TV_CHANNEL.url || currentChannel.name.toLowerCase().includes('caze')) && (
                      <div className="mb-5 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3 shadow-md">
                        <span className="text-2xl mt-0.5 shrink-0 select-none">🇧🇷</span>
                        <div className="text-xs space-y-1.5 text-zinc-300">
                          <p className="font-bold text-yellow-500 flex items-center gap-1.5">
                            {lang === 'bn' 
                              ? "ব্রাজিল ভিপিএন (Brazil VPN) প্রয়োজন!" 
                              : "Brazil VPN Required!"}
                          </p>
                          <p className="leading-relaxed text-zinc-300">
                            {lang === 'bn' 
                              ? "CazéTV ইউটিউবে লাইভ খেলার সম্প্রচার শুধুমাত্র ব্রাজিলের জন্য সীমাবদ্ধ রাখে। তাই ভিপিএন ছাড়া এখানে 'Video is unavailable' দেখাতে পারে।" 
                              : "CazéTV live broadcasts on YouTube are strictly geo-blocked to Brazil due to official digital copyrights."}
                          </p>
                          <p className="text-[11px] text-zinc-400 leading-normal border-t border-zinc-800/80 pt-1.5">
                            {lang === 'bn' 
                              ? "💡 সমাধান: যেকোনো ফ্রি ভিপিএন (যেমন ProtonVPN, Urban VPN, ও Tuxler) ইন্সটল করে 'Brazil' সার্ভার সিলেক্ট ও কানেক্ট করুন, এরপর প্লেয়ারটি রিফ্রেশ করুন।" 
                              : "💡 Solution: Install a free VPN (like ProtonVPN, Urban VPN, or Tuxler Browser Extension), connect to 'Brazil', and then reload this page."}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-blue-700 flex-shrink-0 flex items-center justify-center border border-white/10 shadow-lg pointer-events-none">
                          <div className="relative">
                              <Tv className="w-6 h-6 text-white" />
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
                        <button onClick={(e) => handleShareChannel(currentChannel, e)} className="flex items-center space-x-2 bg-zinc-800/80 hover:bg-zinc-700 px-4 py-2 rounded-full transition-colors shrink-0">
                          <Share className="w-4 h-4 text-zinc-300" />
                          <span className="text-sm font-semibold">{t.share}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Related & Chat Column */}
              {!isMiniPlayer && (
                <div className="w-full lg:w-[350px] xl:w-[420px] px-0 lg:px-0 flex-shrink-0 flex flex-col">


                <div className="px-4 lg:px-0">
                  <div className="flex items-center space-x-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
                    <button className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg whitespace-nowrap cursor-pointer">Live</button>
                    <button className="px-3 py-1.5 bg-[#222] hover:bg-zinc-800 text-xs font-bold rounded-lg whitespace-nowrap border border-zinc-800 cursor-pointer">News</button>
                    <button className="px-3 py-1.5 bg-[#222] hover:bg-zinc-800 text-xs font-bold rounded-lg whitespace-nowrap border border-zinc-800 cursor-pointer">Sports</button>
                    <button className="px-3 py-1.5 bg-[#222] hover:bg-zinc-800 text-xs font-bold rounded-lg whitespace-nowrap border border-zinc-800 cursor-pointer">Related</button>
                  </div>
                  
                  <div className="space-y-3 mb-10">
                    {sortedFilteredChannels.filter(c => c.url !== currentChannel.url).slice(0, 20).map((c, idx) => {
                      const isDead = deadChannels.has(c.url);
                      return (
                      <div key={`${c.url}-${c.name}-${idx}`} className={`flex space-x-2.5 cursor-pointer group ${isDead ? 'opacity-40 grayscale' : ''}`} onClick={() => handleCardClick(c)}>
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

      {/* Custom M3U Manager Modal */}
      <AnimatePresence>
        {isCustomModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#09090b] rounded-3xl max-w-2xl w-full p-6 relative border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] max-h-[90vh] flex flex-col"
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsCustomModalOpen(false)} 
                className="absolute top-5 right-5 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5"/>
              </button>

              {/* Header */}
              <div className="pb-4 border-b border-white/5 flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-fuchsia-600/20 border border-fuchsia-500/30 flex items-center justify-center">
                  <span className="text-lg">📺</span>
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white uppercase sm:text-xl">Custom Server 4 Manager</h3>
                  <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest leading-none">All custom streams are mapped to Server 4 (VIP)</p>
                </div>
              </div>

              {/* Tab Selector inside Modal */}
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-zinc-950 border border-white/5 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => setCustomModalTab('url')}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-xl cursor-pointer transition-all ${
                    customModalTab === 'url'
                      ? 'bg-fuchsia-600/10 text-fuchsia-400 border border-fuchsia-500/20 shadow-inner'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Link2 className="w-4 h-4 mb-1" />
                  <span className="text-[8px] font-bold uppercase tracking-wider">M3U URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomModalTab('file')}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-xl cursor-pointer transition-all ${
                    customModalTab === 'file'
                      ? 'bg-fuchsia-600/10 text-fuchsia-400 border border-fuchsia-500/20 shadow-inner'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Upload className="w-4 h-4 mb-1" />
                  <span className="text-[8px] font-bold uppercase tracking-wider">Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomModalTab('text')}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-xl cursor-pointer transition-all ${
                    customModalTab === 'text'
                      ? 'bg-fuchsia-600/10 text-fuchsia-400 border border-fuchsia-500/20 shadow-inner'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <FileText className="w-4 h-4 mb-1" />
                  <span className="text-[8px] font-bold uppercase tracking-wider">Paste Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomModalTab('single')}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-xl cursor-pointer transition-all ${
                    customModalTab === 'single'
                      ? 'bg-fuchsia-600/10 text-fuchsia-400 border border-fuchsia-500/20 shadow-inner'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Plus className="w-4 h-4 mb-1" />
                  <span className="text-[8px] font-bold uppercase tracking-wider">One Channel</span>
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                
                {/* Adding New Playlist Form */}
                <div className="p-5 bg-[#121214] border border-white/5 rounded-2xl">
                  {customModalTab === 'url' && (
                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Add M3U Playlist URL</h4>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const formData = new FormData(form);
                        const name = formData.get('playlist-name') as string;
                        const url = playlistUrlInput; // Use current state

                        if (!name || !url) {
                          setToastMessage("Please fill in all fields.");
                          setTimeout(() => setToastMessage(''), 3000);
                          return;
                        }

                        const newPlaylist = {
                          id: 'm3u_' + Date.now(),
                          name: name.trim(),
                          url: url.trim(),
                          server: '4', // Locked to Server 4
                          type: 'url',
                          createdAt: new Date().toISOString()
                        };

                        setCustomPlaylists(prev => [...prev, newPlaylist]);
                        form.reset();
                        setPlaylistUrlInput(''); // Reset state
                        // Reset test status for this key
                        setTestUrls(prev => {
                          const copy = { ...prev };
                          delete copy['playlist'];
                          return copy;
                        });
                        setToastMessage("Playlist successfully registered to Server 4!");
                        setTimeout(() => setToastMessage(''), 3000);
                      }} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5 flex-[2]">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Playlist Name</label>
                            <input 
                              type="text" 
                              name="playlist-name"
                              placeholder="e.g. My Custom M3U URL"
                              required
                              className="w-full bg-zinc-950 border border-white/5 focus:border-fuchsia-500/50 rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-fuchsia-500/20 text-fuchsia-300 font-medium transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Destination Server</label>
                            <div className="w-full bg-zinc-900/50 border border-fuchsia-500/20 rounded-xl px-4 py-3 text-xs text-fuchsia-400 font-black flex items-center justify-between select-none">
                              <span>Server 4 (VIP)</span>
                              <span className="text-[8px] bg-fuchsia-500/10 px-1 py-0.2 rounded text-fuchsia-400 uppercase font-black">Locked</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">M3U Playlist URL</label>
                          <div className="flex space-x-2">
                            <input 
                              type="url" 
                              name="playlist-url"
                              value={playlistUrlInput}
                              onChange={(e) => setPlaylistUrlInput(e.target.value)}
                              placeholder="https://example.com/playlist.m3u"
                              required
                              className="flex-1 bg-zinc-950 border border-white/5 focus:border-fuchsia-500/50 rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-fuchsia-500/20 text-fuchsia-300 font-mono transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => handleTestLink(playlistUrlInput, 'playlist')}
                              disabled={testUrls['playlist']?.testing}
                              className={`px-4 py-3 font-bold uppercase tracking-wider text-[9px] rounded-xl cursor-pointer select-none transition-all border shrink-0 ${
                                testUrls['playlist']?.testing
                                  ? 'bg-zinc-900 border-zinc-800 text-zinc-600'
                                  : 'bg-fuchsia-600/10 hover:bg-fuchsia-600/20 text-fuchsia-400 border-fuchsia-500/20 active:scale-98'
                              }`}
                            >
                              {testUrls['playlist']?.testing ? 'Testing...' : 'Test Link'}
                            </button>
                          </div>

                          {/* Test feedback container with luxurious card styling */}
                          {testUrls['playlist']?.result && (
                            <div className={`mt-2 p-3 rounded-xl border text-[11px] font-medium leading-normal ${
                              testUrls['playlist'].result.ok 
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                                : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
                            }`}>
                              <div className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-[9px] mb-1">
                                <span>{testUrls['playlist'].result.ok ? '✓ Reachable & Online' : '✗ Unreachable'}</span>
                                {testUrls['playlist'].result.status ? (
                                  <span className={`px-1 rounded text-[8px] font-black ${
                                    testUrls['playlist'].result.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                  }`}>Code {testUrls['playlist'].result.status}</span>
                                ) : null}
                              </div>
                              <p className="font-sans text-xs opacity-90">{testUrls['playlist'].result.message}</p>
                              {testUrls['playlist'].result.contentType && (
                                <p className="font-mono text-[9px] mt-1 opacity-60">Type: {testUrls['playlist'].result.contentType}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="pt-2">
                          <button 
                            type="submit"
                            className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold tracking-widest uppercase text-[10px] rounded-xl transition-all shadow-lg shadow-fuchsia-600/25 cursor-pointer active:scale-98"
                          >
                            + Save M3U Playlist to S4
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {customModalTab === 'file' && (
                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Upload Local M3U File</h4>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Playlist Name (Optional)</label>
                          <input 
                            type="text" 
                            id="file-playlist-name"
                            placeholder="e.g. My Offline Local Channels"
                            className="w-full bg-zinc-950 border border-white/5 focus:border-fuchsia-500/50 rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-fuchsia-500/20 text-fuchsia-300 font-medium transition-all"
                          />
                        </div>
                        
                        <div 
                          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragActive(false);
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              const nameInput = document.getElementById('file-playlist-name') as HTMLInputElement | null;
                              handleM3UFileLoad(e.dataTransfer.files[0], nameInput?.value || '');
                              if(nameInput) nameInput.value = '';
                            }
                          }}
                          className={`relative border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all ${
                            dragActive 
                              ? 'border-fuchsia-500 bg-fuchsia-500/5 shadow-[inset_0_0_15px_rgba(217,70,239,0.2)]' 
                              : 'border-white/10 hover:border-white/20 bg-zinc-950/40 hover:bg-zinc-950/60'
                          }`}
                        >
                          <input 
                            type="file"
                            id="m3u-file-input"
                            accept=".m3u,.m3u8,text/plain"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const nameInput = document.getElementById('file-playlist-name') as HTMLInputElement | null;
                                handleM3UFileLoad(e.target.files[0], nameInput?.value || '');
                                if(nameInput) nameInput.value = '';
                              }
                            }}
                          />
                          <Upload className={`w-8 h-8 mb-3 transition-transform duration-300 ${dragActive ? 'scale-110 text-fuchsia-400' : 'text-zinc-500'}`} />
                          <p className="text-xs font-bold text-zinc-300 mb-1">Drag and drop your M3U file here</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-3">or</p>
                          <button 
                            type="button"
                            onClick={() => document.getElementById('m3u-file-input')?.click()}
                            className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-400 text-white font-bold tracking-widest text-[9px] uppercase rounded-lg transition-all active:scale-95 cursor-pointer"
                          >
                            Choose File
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {customModalTab === 'text' && (
                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Paste Raw M3U Plaintext</h4>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const formData = new FormData(form);
                        const name = formData.get('text-playlist-name') as string;
                        const content = formData.get('text-playlist-content') as string;

                        if (!name || !content) {
                          setToastMessage("Please fill in all the input fields");
                          setTimeout(() => setToastMessage(''), 3000);
                          return;
                        }

                        const parsed = parseM3UContent(content, '4');
                        if (parsed.length === 0) {
                          setToastMessage("Could not parse any valid stream lines.");
                          setTimeout(() => setToastMessage(''), 3000);
                          return;
                        }

                        const newPlaylist = {
                          id: 'm3u_' + Date.now(),
                          name: name.trim(),
                          server: '4', // Locked to Server 4
                          type: 'text',
                          channels: parsed,
                          createdAt: new Date().toISOString()
                        };

                        setCustomPlaylists(prev => [...prev, newPlaylist]);
                        form.reset();
                        setToastMessage(`Parsed ${parsed.length} channels onto Server 4!`);
                        setTimeout(() => setToastMessage(''), 3000);
                      }} className="space-y-4">
                        <div className="space-y-1.5 font-sans">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Playlist Name</label>
                          <input 
                            type="text" 
                            name="text-playlist-name"
                            placeholder="e.g. My Clipboard Playlist"
                            required
                            className="w-full bg-zinc-950 border border-white/5 focus:border-fuchsia-500/50 rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-fuchsia-500/20 text-fuchsia-300 font-medium transition-all"
                          />
                        </div>
                        <div className="space-y-1.5 font-sans">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Paste M3U Contents</label>
                          <textarea 
                            name="text-playlist-content"
                            rows={5}
                            placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-logo=&quot;http://&quot;,My Pasted Custom Channel&#10;http://stream.m3u8"
                            required
                            className="w-full bg-zinc-950 border border-white/5 focus:border-fuchsia-500/50 rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-fuchsia-500/20 text-fuchsia-300 font-mono transition-all custom-scrollbar"
                          />
                        </div>
                        <div className="pt-2">
                          <button 
                            type="submit"
                            className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold tracking-widest uppercase text-[10px] rounded-xl transition-all shadow-lg shadow-fuchsia-600/25 cursor-pointer active:scale-98"
                          >
                            + Submit and Parse Raw Text
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                   {customModalTab === 'single' && (
                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Add Single Stream Manually</h4>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const formData = new FormData(form);
                        const name = formData.get('single-name') as string;
                        const url = singleStreamUrlInput; // Use current state
                        const logo = formData.get('single-logo') as string;
                        const group = formData.get('single-group') as string;

                        if (!name || !url) {
                          setToastMessage("Name and Stream URL are required");
                          setTimeout(() => setToastMessage(''), 3000);
                          return;
                        }

                        const newChannel: Channel = {
                          name: name.trim(),
                          url: url.trim(),
                          logo: (logo || '').trim(),
                          source: '4', // Map directly to Server 4
                          country: (group || 'custom').trim().toLowerCase()
                        };

                        const newPlaylist = {
                          id: 'm3u_' + Date.now(),
                          name: name.trim(),
                          server: '4', // Locked to Server 4
                          type: 'single',
                          channels: [newChannel],
                          createdAt: new Date().toISOString()
                        };

                        setCustomPlaylists(prev => [...prev, newPlaylist]);
                        form.reset();
                        setSingleStreamUrlInput(''); // Reset state
                        // Reset test status for this key
                        setTestUrls(prev => {
                          const copy = { ...prev };
                          delete copy['single'];
                          return copy;
                        });
                        setToastMessage("Stream added to Server 4!");
                        setTimeout(() => setToastMessage(''), 3000);
                      }} className="space-y-4">
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Channel Name</label>
                            <input 
                              type="text" 
                              name="single-name"
                              placeholder="e.g. My IPTV Channel 1"
                              required
                              className="w-full bg-zinc-950 border border-white/5 focus:border-fuchsia-500/50 rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-fuchsia-500/20 text-fuchsia-300 font-medium transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Genre Category (Optional)</label>
                            <input 
                              type="text" 
                              name="single-group"
                              placeholder="e.g. sports, news, entertainment"
                              className="w-full bg-zinc-950 border border-white/5 focus:border-fuchsia-500/50 rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-fuchsia-500/20 text-fuchsia-300 font-medium transition-all"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Stream Link URL</label>
                          <div className="flex space-x-2">
                            <input 
                              type="url" 
                              name="single-url"
                              value={singleStreamUrlInput}
                              onChange={(e) => setSingleStreamUrlInput(e.target.value)}
                              placeholder="https://example.com/index.m3u8"
                              required
                              className="flex-1 bg-zinc-950 border border-white/5 focus:border-fuchsia-500/50 rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-fuchsia-500/20 text-fuchsia-300 font-mono transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => handleTestLink(singleStreamUrlInput, 'single')}
                              disabled={testUrls['single']?.testing}
                              className={`px-4 py-3 font-bold uppercase tracking-wider text-[9px] rounded-xl cursor-pointer select-none transition-all border shrink-0 ${
                                testUrls['single']?.testing
                                  ? 'bg-zinc-900 border-zinc-800 text-zinc-600'
                                  : 'bg-fuchsia-600/10 hover:bg-fuchsia-600/20 text-fuchsia-400 border-fuchsia-500/20 active:scale-98'
                              }`}
                            >
                              {testUrls['single']?.testing ? 'Testing...' : 'Test Link'}
                            </button>
                          </div>

                          {/* Test feedback container with luxurious card styling */}
                          {testUrls['single']?.result && (
                            <div className={`mt-2 p-3 rounded-xl border text-[11px] font-medium leading-normal ${
                              testUrls['single'].result.ok 
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                                : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
                            }`}>
                              <div className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-[9px] mb-1">
                                <span>{testUrls['single'].result.ok ? '✓ Reachable & Online' : '✗ Unreachable'}</span>
                                {testUrls['single'].result.status ? (
                                  <span className={`px-1 rounded text-[8px] font-black ${
                                    testUrls['single'].result.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                  }`}>Code {testUrls['single'].result.status}</span>
                                ) : null}
                              </div>
                              <p className="font-sans text-xs opacity-90">{testUrls['single'].result.message}</p>
                              {testUrls['single'].result.contentType && (
                                <p className="font-mono text-[9px] mt-1 opacity-60">Type: {testUrls['single'].result.contentType}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Logo image URL (Optional)</label>
                          <input 
                            type="url" 
                            name="single-logo"
                            placeholder="https://example.com/logo.png"
                            className="w-full bg-zinc-950 border border-white/5 focus:border-fuchsia-500/50 rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-fuchsia-500/20 text-fuchsia-300 font-mono transition-all"
                          />
                        </div>

                        <div className="pt-2">
                          <button 
                            type="submit"
                            className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold tracking-widest uppercase text-[10px] rounded-xl transition-all shadow-lg shadow-fuchsia-600/25 cursor-pointer active:scale-98"
                          >
                            + Add Custom Stream Input
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>

                {/* Registered Playlists Listing */}
                <div className="space-y-3 pb-4">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-1">Active Playlists On Server 4 ({customPlaylists.length})</h4>
                  
                  {customPlaylists.length === 0 ? (
                    <div className="py-8 bg-[#121214]/65 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-zinc-500">
                      <span className="text-2xl mb-1.5">📭</span>
                      <p className="text-xs font-bold uppercase tracking-wider">{lang === 'en' ? 'No custom links registered' : 'কোন কাস্টম প্লেলিস্ট নেই'}</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {customPlaylists.map((playlist, idx) => (
                        <div 
                          key={playlist.id || idx}
                          className="flex items-center justify-between p-4 bg-[#121214] border border-white/5 hover:border-white/10 rounded-xl transition-all group"
                        >
                          <div className="flex flex-col space-y-1 flex-1 min-w-0 pr-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-white truncate">{playlist.name}</span>
                              <span className="px-1.5 py-0.5 bg-fuchsia-900/20 border border-fuchsia-500/20 text-[7px] font-black tracking-widest uppercase text-fuchsia-400 rounded">
                                Server {playlist.server || '4'}
                              </span>
                              <span className="px-1.5 py-0.5 bg-zinc-800 border border-white/5 text-[7px] font-black tracking-widest uppercase text-zinc-400 rounded">
                                {playlist.type || 'url'} ({playlist.channels?.length || 0} Ch)
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-500 truncate font-mono">{playlist.url || 'Inserted/Uploaded local content'}</span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {playlist.type === 'url' && (
                              <button
                                onClick={async () => {
                                  try {
                                    setToastMessage("Refreshing remote playlist...");
                                    const res = await fetch(`/api/parse-m3u?url=${encodeURIComponent(playlist.url)}`);
                                    if (res.ok) {
                                      const parsedList = await res.json();
                                      if (parsedList && parsedList.length > 0) {
                                        setCustomPlaylists(prev => prev.map(p => p.id === playlist.id ? { ...p, channels: parsedList } : p));
                                        setToastMessage(`Refreshed! Found ${parsedList.length} channels.`);
                                      } else {
                                        setToastMessage("Could not parse any channels.");
                                      }
                                    } else {
                                      setToastMessage("Failed to fetch remote playlist.");
                                    }
                                    setTimeout(() => setToastMessage(''), 3000);
                                  } catch (err) {
                                    console.error("Refresh error:", err);
                                  }
                                }}
                                title="Force Refresh URL Stream Feed"
                                className="p-2.5 bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:border-white/10 rounded-xl transition-all cursor-pointer shrink-0"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button 
                              onClick={() => {
                                setCustomPlaylists(prev => prev.filter(p => p.id !== playlist.id));
                                setToastMessage("Playlist removed");
                                setTimeout(() => setToastMessage(''), 3000);
                              }}
                              className="p-2.5 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 border border-zinc-900 hover:border-rose-500/20 rounded-xl transition-all cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Concluding Footer */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-6 shrink-0 text-zinc-650 font-bold uppercase tracking-wider text-[8px]">
                <span>Saved Locally</span>
                <span className="text-fuchsia-500 animate-pulse">Server 4 Active</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation for Mobile */}
      {updateAvailable && <SWUpdatePrompt onUpdate={handleUpdateApp} />}
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

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[110] bg-indigo-600 text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-indigo-400/35 flex items-center space-x-2.5 backdrop-blur-md"
          >
            <Check className="w-4 h-4 text-white font-black shrink-0" strokeWidth={3} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
