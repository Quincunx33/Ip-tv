/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Search, Menu, Tv, Globe, X, Volume2, VolumeX, RefreshCw, Copy, Check, ChevronDown, 
  Star, Heart, Languages, LayoutGrid, List, Flame, Radio, Bookmark, Tv2, Maximize, Minimize, 
  SkipForward, SkipBack, Expand, AppWindow, Tv2 as TvIcon, MoreVertical, Send, ThumbsUp, ThumbsDown, 
  Share, Users, MessageSquare, Home, Compass, Settings, Clock, Cast, Bell, PictureInPicture, LogIn, LogOut
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
  const flags: Record<string, string> = {
    bd: '🇧🇩', in: '🇮🇳', us: '🇺🇸', ca: '🇨🇦', gb: '🇬🇧', de: '🇩🇪',
    fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹', au: '🇦🇺', jp: '🇯🇵', kr: '🇰🇷',
    br: '🇧🇷', ar: '🇦🇷', mx: '🇲🇽', za: '🇿🇦', tr: '🇹🇷', cn: '🇨🇳', pk: '🇵🇰'
  };
  return flags[code.toLowerCase()] || '🌐';
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

export default function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('bd');
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [errorMsg, setErrorMsg] = useState(false);
  const [streamMode, setStreamMode] = useState<'proxy' | 'direct'>('proxy');
  const [lang, setLang] = useState<'en' | 'bn'>('en');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'sports' | 'news' | 'fifa'>('all');

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
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsAppInstalled(true);
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

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
        if (data.includes('bd')) setSelectedCountry('bd');
        else if (data.length > 0) setSelectedCountry(data[0]);
      } catch (err) {
        // Fallback for GitHub Pages (Static Hosting)
        try {
          const res = await fetch('static-api/channels.json');
          const data = await res.json();
          setCountries(data);
          if (data.includes('bd')) setSelectedCountry('bd');
          else if (data.length > 0) setSelectedCountry(data[0]);
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
      const fetchId = activeTab === 'fifa' ? 'fifa' : selectedCountry;
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
    if (activeTab === 'favorites') list = favorites;
    else if (activeTab === 'sports') {
      const kw = ['sport', 'cricket', 'football', 'fifa', 'ten ', 'tsports', 'gtv'];
      list = channels.filter(c => kw.some(k => c.name.toLowerCase().includes(k)));
    } else if (activeTab === 'news') {
      const kw = ['news', 'somoy', 'jamuna', 'ekattor', 'independent', 'bbc', 'cnn', 'al jazeera'];
      list = channels.filter(c => kw.some(k => c.name.toLowerCase().includes(k)));
    }
    if (searchQuery) list = list.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    setFilteredChannels(list);
  }, [searchQuery, channels, favorites, activeTab]);

  const sortedFilteredChannels = React.useMemo(() => {
    return [...filteredChannels].sort((a, b) => {
      const aDead = deadChannels.has(a.url);
      const bDead = deadChannels.has(b.url);
      return (aDead === bDead) ? 0 : aDead ? 1 : -1;
    });
  }, [filteredChannels, deadChannels]);

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

  useEffect(() => {
    setSelectedServer(0);
    setQualityLevels([]);
    setShowQualityMenu(false);
  }, [currentChannel]);

  useEffect(() => {
    if (currentChannel && videoRef.current) {
      const video = videoRef.current;
      setErrorMsg(false);
      setIsBuffering(true);
      
      const streamUrl = currentChannel.urls && currentChannel.urls[selectedServer] 
        ? currentChannel.urls[selectedServer] 
        : currentChannel.url;

      const targetUrl = streamMode === 'proxy' 
        ? `api/proxy?url=${encodeURIComponent(streamUrl)}` : streamUrl;
      
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new Hls({ maxBufferLength: 20, enableWorker: true, lowLatencyMode: true });
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

  const handleMouseMoveControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && isHoveringVideo) setShowControls(false);
    }, 3000);
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

  const togglePiP = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      } else if ((videoRef.current as any).webkitSupportsPresentationMode && typeof (videoRef.current as any).webkitSetPresentationMode === 'function') {
        // iOS Safari PiP fallback
        const currentMode = (videoRef.current as any).webkitPresentationMode;
        if (currentMode === 'picture-in-picture') {
          (videoRef.current as any).webkitSetPresentationMode('inline');
        } else {
          (videoRef.current as any).webkitSetPresentationMode('picture-in-picture');
        }
      } else {
         throw new Error("PiP Not Supported");
      }
    } catch (err) {
      console.error('PiP error:', err);
      alert('Picture-in-Picture is not supported in this environment. Please open the app in a new tab.');
    }
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
    if (videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
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

  const SidebarContent = () => (
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
      </div>
    </div>
  );

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

  if (loadingAuth) {
    return (
      <div className="h-screen w-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen bg-[#0f0f0f] flex flex-col items-center justify-center text-white px-4">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="space-y-4">
            <div className="mx-auto w-24 h-24 rounded-3xl overflow-hidden shadow-lg shadow-red-600/20">
              <img src="/streamtube_logo.jpg" alt="StreamTube Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-4xl font-bold tracking-tighter">StreamTube</h1>
            <p className="text-zinc-400 text-lg">Watch your favorite channels from around the world in one place.</p>
          </div>
          
          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center space-x-3 bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
            ) : (
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            )}
            <span>{isLoggingIn ? "Signing in..." : "Sign in with Google"}</span>
          </button>
          
          <p className="text-xs text-zinc-500 pt-8 uppercase tracking-widest font-semibold">Free • Global • Live</p>
        </div>
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
          <div className="flex items-center space-x-1.5 cursor-pointer" onClick={() => setCurrentChannel(null)}>
            <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-800">
              <img src="/streamtube_logo.jpg" alt="Logo" className="w-full h-full object-cover" />
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
                 <SidebarContent />
               </motion.div>
             </>
          )}
        </AnimatePresence>

        {/* Home Browse vs Watch Mode */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent bg-[#0f0f0f]">
          
          {!currentChannel ? (
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
                 <span className="text-sm font-medium text-zinc-500 hidden sm:block">{filteredChannels.length} {t.views.replace('views', 'streams')}</span>
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
              ) : filteredChannels.length === 0 ? (
                <div className="w-full flex flex-col justify-center items-center py-20 text-zinc-500">
                   <Tv className="w-16 h-16 mb-4 opacity-50" />
                   <p className="font-bold text-lg">{t.noChannels}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 pb-10">
                    {sortedFilteredChannels.slice(0, visibleCount).map(channel => {
                      const isF = favorites.some(f => f.url === channel.url);
                    const isDead = deadChannels.has(channel.url);
                    return (
                      <div key={channel.url} className={`flex flex-col cursor-pointer group ${isDead ? 'opacity-40 grayscale' : ''}`} onClick={() => { setCurrentChannel(channel); scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        <div className="w-full aspect-video bg-zinc-900 rounded-xl overflow-hidden relative mb-2.5 shadow-sm border border-zinc-800/60 group-hover:border-zinc-700 transition-colors flex items-center justify-center">
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
                           <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-zinc-400 font-bold uppercase text-xs overflow-hidden">
                             <ChannelLogo channel={channel} className="w-full h-full" isAvatar />
                           </div>
                           <div className="flex flex-col overflow-hidden w-full">
                              <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2 pr-4">{channel.name}</h3>
                              <p className="text-xs text-zinc-400 mt-1">{formatCountryName(selectedCountry)} TV</p>
                              <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center justify-between w-full">
                                <span>{(Math.random() * 10 + 1).toFixed(1)}K {t.watching}</span>
                                <button onClick={(e) => toggleFavorite(channel, e)} className="p-1 hover:bg-zinc-800 rounded-full transition-colors z-10 hover:text-white" title={t.save}>
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>
                           </div>
                        </div>
                      </div>
                    )
                  })}
                  </div>
                  {/* Infinity Scroll Loading Trigger */}
                  <div ref={loadMoreTriggerRef} className="h-20 w-full flex items-center justify-center">
                    {visibleCount < sortedFilteredChannels.length && (
                      <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></div>
                    )}
                  </div>
                </>
              )}
            </div>

          ) : (
            <>
              {/* Watching Content Grid */}
              <div className="w-full max-w-[1600px] mx-auto p-0 lg:p-6 lg:flex lg:space-x-6 min-h-full">
                
                {/* Main Column: Video Player, Info */}
                <div className="flex-1 lg:w-2/3 xl:w-3/4 min-w-0 flex flex-col">
                  
                  {/* 16:9 Video Player - Sticky on mobile for simultaneous chat */}
                  <div 
                    ref={videoContainerRef}
                    className={`w-full bg-black group overflow-hidden sticky sm:relative top-14 sm:top-0 z-[40] sm:z-10 ${isCssFullscreen ? 'fixed inset-0 z-[99999] h-[100dvh]' : `relative ${isFullscreen ? '' : 'aspect-video rounded-none lg:rounded-xl shadow-lg'}`}`}
                    onMouseMove={handleMouseMoveControls}
                    onMouseLeave={handleMouseLeaveVideo}
                    onMouseEnter={handleMouseEnterVideo}
                    onClick={handlePlayToggle}
                  >
                  {isBuffering && (
                    <div className="absolute inset-0 z-20 flex flex-col justify-center items-center pointer-events-none bg-black/40">
                      <div className="w-12 h-12 border-4 border-zinc-700 border-t-white rounded-full animate-spin"></div>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="absolute inset-0 z-30 flex flex-col justify-center items-center bg-black/90 px-6 text-center">
                      <TvIcon className="w-12 h-12 text-zinc-600 mb-4" />
                      <p className="text-white font-bold text-lg mb-2">{t.playbackError}</p>
                      <button onClick={(e) => { e.stopPropagation(); setStreamMode(streamMode === 'proxy' ? 'direct' : 'proxy'); }} className="mt-4 px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-zinc-200 cursor-pointer">
                        Use {streamMode === 'proxy' ? t.directMode : t.proxyMode}
                      </button>
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain pointer-events-none"
                    autoPlay playsInline
                  />

                  {/* Player Controls Overlay */}
                  <div className={`absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16 pb-2 px-3 sm:px-4 flex flex-col justify-end transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={e => e.stopPropagation()}>
                     
                     {/* Fake Timeline Scrubber */}
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
                           <button onClick={() => setStreamMode(streamMode === 'proxy' ? 'direct' : 'proxy')} className="border border-zinc-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase hover:bg-white hover:text-black transition-colors cursor-pointer" title="Switch Routing Mode">
                             {streamMode}
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

                           <button onClick={togglePiP} className="hover:opacity-80 p-1 cursor-pointer" title="Picture in Picture">
                             <PictureInPicture className="w-5 h-5" />
                           </button>
                           <button onClick={toggleFullscreen} className="hover:opacity-80 p-1 cursor-pointer">
                             {(isFullscreen || isCssFullscreen) ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                           </button>
                        </div>
                     </div>
                  </div>
                </div>

                {/* Mobile Chat - Below Video, Above Info */}
                <div className="lg:hidden border-b border-zinc-800 bg-[#0f0f0f] flex flex-col h-[350px] sm:h-[450px]">
                  <div className="p-3 bg-[#121212] border-b border-zinc-800 flex items-center justify-between shrink-0">
                    <span className="font-bold text-xs text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
                      {t.chatTitle} 
                      <span className="flex items-center px-1.5 py-0.5 rounded text-[8px] bg-red-600/10 text-red-500 border border-red-600/20">LIVE</span>
                    </span>
                    <button className="p-1 hover:bg-zinc-800 rounded text-zinc-500"><MoreVertical className="w-4 h-4" /></button>
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
                    <div className="p-3 border-t border-zinc-800 bg-[#121212] flex justify-center">
                      <button onClick={handleLogin} className="text-xs font-bold text-blue-400 hover:underline">Sign In to join chat</button>
                    </div>
                  )}
                </div>

                {/* Video Info & Actions */}
                <div className="mt-4 px-4 sm:px-0 mb-6">
                  <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{currentChannel.name}</h1>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                         <ChannelLogo channel={currentChannel} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm sm:text-base leading-tight">{formatCountryName(selectedCountry)} TV</h3>
                        <p className="text-[11px] text-zinc-500">{(Math.random() * 5 + 1).toFixed(1)}M subscribers</p>
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
              </div>

              {/* Related & Chat Column */}
              <div className="w-full lg:w-[350px] xl:w-[420px] px-0 lg:px-0 flex-shrink-0 flex flex-col">
                
                {/* Embedded Sidebar Chat - DESKTOP ONLY */}
                <div className="hidden lg:flex border border-zinc-800 rounded-none sm:rounded-2xl overflow-hidden bg-[#0f0f0f] flex-col h-[500px] lg:h-[600px] shadow-2xl mb-6">
                  <div className="p-3 bg-[#121212] border-b border-zinc-800 flex items-center justify-between z-10 shadow-sm shrink-0">
                    <div className="flex items-center space-x-2">
                       <span className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                         {t.chatTitle} 
                         <span className="flex items-center px-1.5 py-0.5 rounded text-[8px] bg-red-600/10 text-red-500 border border-red-600/20">LIVE</span>
                       </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors">
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent bg-black/20">
                    <AnimatePresence initial={false}>
                      {chatMessages.map((msg, idx) => {
                        const isMe = user?.uid === msg.id || user?.displayName === msg.user;
                        return (
                          <motion.div 
                            key={msg.id || idx} 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-start gap-2.5 mb-1"
                          >
                            <div className="w-6 h-6 rounded-full bg-zinc-800 shrink-0 flex items-center justify-center text-[10px] uppercase font-bold text-zinc-500 border border-zinc-700/50 overflow-hidden mt-0.5">
                              {msg.userPhoto ? <img src={msg.userPhoto} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover"/> : <span>{msg.user?.charAt(0)}</span>}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <p className="text-[11px] leading-tight break-words">
                                <span className={`font-bold mr-2 ${isMe ? 'text-blue-400' : 'text-zinc-500'}`}>{msg.user}</span>
                                <span className="text-zinc-200">{msg.text}</span>
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {user ? (
                    <div className="p-3 bg-[#121212] border-t border-zinc-800 shrink-0">
                      <form onSubmit={handleChatSubmit} className="flex items-center space-x-2">
                        <div className="flex-1 relative">
                          <input 
                            type="text" 
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Chat message..." 
                            className="w-full bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-800 focus:border-blue-500 outline-none text-xs placeholder-zinc-600 transition-all" 
                          />
                        </div>
                        <button 
                          type="submit" 
                          disabled={!chatInput.trim()} 
                          className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white disabled:text-zinc-500 rounded-lg transition-all active:scale-95 shrink-0"
                        >
                           <Send className="w-4 h-4 fill-current" />
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="p-4 border-t border-zinc-800 bg-[#121212] flex flex-col items-center justify-center shrink-0">
                      <button onClick={handleLogin} className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95">
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign In</span>
                      </button>
                    </div>
                  )}
                </div>

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
                      <div key={c.url} className={`flex space-x-2.5 cursor-pointer group ${isDead ? 'opacity-40 grayscale' : ''}`} onClick={() => { setCurrentChannel(c); scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}>
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
                          <p className="text-[11px] text-zinc-400 mt-1 font-medium">{formatCountryName(selectedCountry)} TV</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center"><Users className="w-3 h-3 mr-1 opacity-70"/> {(Math.random() * 8 + 1).toFixed(1)}K views</p>
                        </div>
                      </div>
                    );})}
                  </div>
                </div>
              </div>
            </div>
          </>
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
