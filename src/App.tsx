/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  PlayCircle, 
  Search, 
  Menu, 
  Tv, 
  Compass, 
  ShieldAlert, 
  X, 
  Tv2, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  Copy, 
  Check, 
  Globe2, 
  ChevronDown, 
  Activity, 
  Camera, 
  Sliders, 
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface Channel {
  name: string;
  url: string;
}

// Map country codes to flag emojis
const getCountryFlag = (code: string) => {
  const flags: Record<string, string> = {
    bd: '🇧🇩',
    in: '🇮🇳',
    us: '🇺🇸',
    ca: '🇨🇦',
    gb: '🇬🇧',
    de: '🇩🇪',
    fr: '🇫🇷',
    es: '🇪🇸',
    it: '🇮🇹',
    au: '🇦🇺',
    jp: '🇯🇵',
    kr: '🇰🇷',
    br: '🇧🇷',
    ar: '🇦🇷',
    mx: '🇲🇽',
    za: '🇿🇦',
    tr: '🇹🇷',
    uy: '🇺🇾',
    az: '🇦🇿',
    sv: '🇸🇻',
    bh: '🇧🇭',
    co: '🇨🇴',
    cy: '🇨🇾',
    bo: '🇧🇴',
    mo: '🇲🇴',
    iq: '🇮🇶',
  };
  const key = code.toLowerCase();
  return flags[key] || '🌐';
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
    
    if (parts.length > 1) {
      const modifier = parts.slice(1).join(' ');
      name = `${name} (${modifier.charAt(0).toUpperCase() + modifier.slice(1)})`;
    }
    return name;
  } catch (e) {
    return filename.toUpperCase();
  }
};

// Generates dynamic gradients and initials based on TV station name to create a premium network logo look
const getNetworkBadge = (name: string) => {
  const clean = name.trim().toUpperCase();
  // Get up to 2 uppercase initials
  const initials = clean.replace(/[^A-Z0-9]/g, '').slice(0, 2) || clean.slice(0, 2) || 'TV';
  
  // Create deterministic gradient based on name hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  const bgGradient = `linear-gradient(135deg, hsl(${hue}, 85%, 40%) 0%, hsl(${(hue + 60) % 360}, 90%, 25%) 100%)`;
  
  return { initials, bgGradient };
};

export default function App() {
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('bd');
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [streamMode, setStreamMode] = useState<'proxy' | 'direct'>('proxy');
  
  // Custom video states
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [videoStats, setVideoStats] = useState({
    resolution: 'Detecting...',
    aspectRatio: '16:9',
    bufferLength: 0.0,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Load countries catalog
  useEffect(() => {
    fetch('/api/channels')
      .then(res => res.json())
      .then(data => {
        setCountries(data);
        if (data.includes('bd')) {
          setSelectedCountry('bd');
        } else if (data.length > 0) {
          setSelectedCountry(data[0]);
        }
      })
      .catch(err => console.error("Error loading countries:", err));
  }, []);

  // Load channels catalog for selected country
  useEffect(() => {
    if (!selectedCountry) return;
    setLoading(true);
    fetch(`/api/channels/${selectedCountry}`)
      .then(res => res.json())
      .then(data => {
        setChannels(data);
        setFilteredChannels(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading channels:", err);
        setLoading(false);
      });
  }, [selectedCountry]);

  // Client search filter
  useEffect(() => {
    if (searchQuery) {
      setFilteredChannels(
        channels.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    } else {
      setFilteredChannels(channels);
    }
  }, [searchQuery, channels]);

  // Check Picture-in-Picture configuration
  useEffect(() => {
    setIsPiPSupported(
      'pictureInPictureEnabled' in document &&
      document.pictureInPictureEnabled
    );

    const video = videoRef.current;
    if (!video) return;

    const onEnterPiP = () => setIsPiPActive(true);
    const onLeavePiP = () => setIsPiPActive(false);

    video.addEventListener('enterpictureinpicture', onEnterPiP);
    video.addEventListener('leavepictureinpicture', onLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', onEnterPiP);
      video.removeEventListener('leavepictureinpicture', onLeavePiP);
    };
  }, [videoRef]);

  // Real telemetric statistics from video stream
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateStats = () => {
      if (video.videoWidth) {
        setVideoStats({
          resolution: `${video.videoWidth}x${video.videoHeight}`,
          aspectRatio: (video.videoWidth / video.videoHeight).toFixed(2) === '1.78' ? '16:9' : `${(video.videoWidth / video.videoHeight).toFixed(2)}:1`,
          bufferLength: video.buffered.length > 0 ? parseFloat((video.buffered.end(video.buffered.length - 1) - video.currentTime).toFixed(1)) : 0.0,
        });
      }
    };

    const interval = setInterval(updateStats, 2000);
    video.addEventListener('loadedmetadata', updateStats);

    return () => {
      clearInterval(interval);
      video.removeEventListener('loadedmetadata', updateStats);
    };
  }, [currentChannel]);

  // HLS stream binding & play
  useEffect(() => {
    if (currentChannel && videoRef.current) {
      const video = videoRef.current;
      setErrorMsg('');
      
      const streamUrl = streamMode === 'proxy' 
        ? `/api/proxy?url=${encodeURIComponent(currentChannel.url)}`
        : currentChannel.url;
      
      if (Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
        
        const hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;
        
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.log('Autoplay blocked:', e));
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            if (streamMode === 'proxy') {
              console.log('Proxy stream failed, trying Direct/Bypass connection...');
              setErrorMsg('Proxy geo-restricted. Attempting Direct stream...');
              setTimeout(() => {
                setStreamMode('direct');
              }, 1200);
            } else {
              setErrorMsg('Oops! This Channel is offline or geo-blocked in your location.');
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  break;
              }
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS for Safari/iOS
        video.src = streamUrl;
        
        const handleLoadedMetadata = () => {
          video.play().catch(e => console.log('Autoplay blocked:', e));
        };
        const handleError = () => {
          if (streamMode === 'proxy') {
            setErrorMsg('Proxy unresolved. Trying direct bypass...');
            setTimeout(() => {
              setStreamMode('direct');
            }, 1200);
          } else {
            setErrorMsg('Failed to load stream. The source might be offline.');
          }
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('error', handleError);

        return () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('error', handleError);
        };
      }
    }
  }, [currentChannel, streamMode]);

  // Handle manual play toggle Click
  const handlePlayOverlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(e => console.error(e));
      } else {
        videoRef.current.pause();
      }
    }
  };

  // Toggle Picture-in-Picture
  const togglePiP = async () => {
    if (!videoRef.current || !isPiPSupported) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error('Failed to trigger picture-in-picture:', err);
    }
  };

  // Copy Stream Link
  const handleCopyLink = () => {
    if (!currentChannel) return;
    navigator.clipboard.writeText(currentChannel.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      videoRef.current.muted = nextMuted;
    }
  };

  // Adjust Volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    const isZero = val === 0;
    setIsMuted(isZero);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = isZero;
    }
  };

  return (
    <div id="iptv-app-root" className="flex flex-col md:flex-row h-screen w-screen bg-[#07060e] text-[#e2e1e9] font-sans overflow-hidden antialiased">
      {/* Dynamic Font Styling Injected */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        
        #iptv-app-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .font-mono-custom {
          font-family: 'JetBrains Mono', monospace;
        }
        .ambient-glowing {
          box-shadow: 0 0 40px -5px rgba(99, 102, 241, 0.15);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.01);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.3);
        }
      `}</style>

      {/* Cyberpunk Glow Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Mobile Top Navigation */}
      <div className="md:hidden flex items-center justify-between px-5 py-4 bg-[#0a0914]/80 border-b border-white/[0.05] backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-indigo-600 to-indigo-500 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">StreamHub</span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2.5 bg-white/[0.04] active:bg-white/[0.1] rounded-xl border border-white/[0.07] text-white cursor-pointer"
          >
            {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Sidebar: Channel & Location Navigator */}
      <div className={`
        ${isSidebarOpen ? 'translate-x-0 w-full md:w-[340px] lg:w-[380px]' : '-translate-x-full w-0 overflow-hidden'} 
        fixed md:relative top-0 left-0 z-30 h-full bg-[#0a0912]/95 md:bg-[#08070f]/70 border-r border-white/[0.06] flex flex-col transition-all duration-300 ease-out backdrop-blur-2xl
      `}>
        {/* Brand Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.04] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-2.5 rounded-2xl shadow-xl shadow-indigo-500/20">
               <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">StreamHub</h1>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-mono-custom">Premium IPTV Platform</span>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-[#9a99a2] hover:text-white hover:bg-white/[0.05] rounded-xl transition-all cursor-pointer"
            title="Collapse Sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Catalog Action Bar */}
        <div className="p-5 shrink-0 space-y-3.5">
          {/* Custom Region Selector Trigger */}
          <div className="space-y-1.5">
            <label className="text-xs text-indigo-300/80 uppercase font-mono-custom tracking-widest font-semibold ml-1">Region Catalog</label>
            <button
              onClick={() => setIsCountryModalOpen(true)}
              className="w-full flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] px-4 py-3 rounded-2xl transition-all text-left text-sm text-[#e2e1e9] hover:border-indigo-500/30 cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <span className="text-xl leading-none">{getCountryFlag(selectedCountry)}</span>
                <span className="font-semibold text-white truncate max-w-[200px]">
                  {formatCountryName(selectedCountry)}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
            </button>
          </div>

          {/* Luxury Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Search station or matches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/[0.02] border border-white/[0.06] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 w-full pl-10 pr-4 py-3 rounded-2xl text-sm placeholder-slate-500 outline-none text-[#f1f0f7] transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-24 md:pb-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
              <span className="text-xs text-[#9a99a2] font-mono-custom">Retrieving channels...</span>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="text-center py-20 px-4">
              <Compass className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No results found</p>
              <p className="text-xs text-slate-600 mt-1">Try refining your search keyword</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-2 pb-2.5 flex items-center justify-between text-[11px] text-[#9a9aab] uppercase tracking-wider font-mono-custom font-semibold">
                <span>Available Streams</span>
                <span className="bg-[#12111d] px-2 py-0.5 rounded-full border border-white/[0.03] text-indigo-400">
                  {filteredChannels.length} TV stations
                </span>
              </div>
              <ul className="space-y-1.5 focus:outline-none">
                {filteredChannels.map((channel, idx) => {
                  const isActive = currentChannel?.url === channel.url;
                  const { initials, bgGradient } = getNetworkBadge(channel.name);
                  
                  return (
                    <li
                      key={idx}
                      onClick={() => {
                        setCurrentChannel(channel);
                        if (window.innerWidth < 768) {
                          setIsSidebarOpen(false);
                        }
                      }}
                      className={`group p-3 rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-between border ${
                        isActive 
                          ? 'bg-[#1b1932] border-indigo-500/50 text-white shadow-xl shadow-indigo-500/10' 
                          : 'bg-white/[0.01]/30 border-white/[0.02] text-[#c2c1c9] hover:bg-white/[0.03] hover:border-white/[0.04] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3 truncate">
                        {/* Custom TV Badge */}
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs tracking-tight shrink-0 shadow-inner relative group-hover:scale-105 transition-transform"
                          style={{ background: bgGradient }}
                        >
                          <span className="text-white drop-shadow-sm">{initials}</span>
                          {/* Live pulse dot */}
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-black animate-pulse"></span>
                        </div>
                        
                        <div className="truncate">
                          <p className="font-semibold text-sm truncate">{channel.name || `Live Station ${idx + 1}`}</p>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[10px] bg-slate-800/60 text-slate-400 px-1.5 py-0.2 rounded font-mono-custom font-semibold">1080p</span>
                            <span className="text-[10px] text-indigo-400/80 font-mono-custom">Live stream</span>
                          </div>
                        </div>
                      </div>

                      {/* Equalizer Waveform or Play CTA */}
                      {isActive ? (
                        <div className="flex items-end space-x-0.5 h-3 pr-2">
                          <span className="w-0.5 bg-indigo-400 rounded-full animate-bounce" style={{ height: '100%', animationDuration: '0.8s' }}></span>
                          <span className="w-0.5 bg-indigo-400 rounded-full animate-bounce" style={{ height: '60%', animationDuration: '0.5s', animationDelay: '0.2s' }}></span>
                          <span className="w-0.5 bg-indigo-400 rounded-full animate-bounce" style={{ height: '80%', animationDuration: '0.6s', animationDelay: '0.4s' }}></span>
                        </div>
                      ) : (
                        <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0 pr-1.5">
                          <PlayCircle className="w-5 h-5 text-indigo-400" />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Main Video Arena */}
      <div className="flex-1 bg-[#050409] flex flex-col relative z-10 w-full h-full overflow-hidden">
        
        {/* Top Controls Overlay bar / Expand Sidebar */}
        <div className="absolute top-4 left-4 z-20 flex items-center space-x-2.5 pointer-events-auto">
          {!isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-3 bg-[#0a0914]/90 hover:bg-indigo-600 border border-white/[0.08] hover:border-transparent text-white rounded-2xl shadow-2xl transition-all duration-200 cursor-pointer flex items-center justify-center backdrop-blur-xl group"
              title="Expand Channels Sidebar"
            >
              <Menu className="w-4.5 h-4.5 group-hover:scale-110 transition-all" />
              <span className="text-xs font-semibold px-1.5 hidden sm:inline">Show Catalog</span>
            </button>
          )}

          {currentChannel && (
            <button
              onClick={() => setShowStats(!showStats)}
              className={`p-3 rounded-2xl border border-white/[0.08] shadow-2xl transition-all duration-200 cursor-pointer flex items-center justify-center backdrop-blur-xl ${
                showStats ? 'bg-indigo-600 text-white border-transparent' : 'bg-[#0a0914]/90 hover:bg-white/[0.06] text-slate-300'
              }`}
              title="Toggle Telemetric Info"
            >
              <Activity className="w-4.5 h-4.5" />
              <span className="text-xs font-semibold px-1.5 hidden sm:inline">Telemetry HUD</span>
            </button>
          )}
        </div>

        {/* Global Floating HUD Controls (Stream Mode Selector + Picture-in-Picture) */}
        {currentChannel && (
          <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 pointer-events-auto">
            {/* Picture-in-Picture Toggle Module */}
            {isPiPSupported && (
              <button
                onClick={togglePiP}
                className={`p-3 rounded-2xl border border-white/[0.08] shadow-2xl duration-200 cursor-pointer flex items-center justify-center backdrop-blur-xl transition-all ${
                  isPiPActive 
                    ? 'bg-gradient-to-tr from-purple-700 to-purple-500 text-white border-transparent shadow-purple-500/20' 
                    : 'bg-[#0a0914]/90 hover:bg-white/[0.05] text-slate-300'
                }`}
                title="Toggle Picture-in-Picture Mode"
              >
                <Tv2 className="w-4.5 h-4.5 animate-pulse" />
                <span className="text-xs font-semibold px-2 hidden sm:inline">
                  {isPiPActive ? 'Leaving PiP...' : 'Picture-in-Picture'}
                </span>
              </button>
            )}

            {/* Connection Strategy Selector */}
            <div className="flex items-center space-x-1 bg-[#0a0914]/95 border border-white/[0.08] p-1 rounded-2xl shadow-2xl backdrop-blur-xl">
              <button
                onClick={() => setStreamMode('proxy')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  streamMode === 'proxy' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Proxy requests through server to circumvent browser CORS issues"
              >
                Proxy
              </button>
              <button
                onClick={() => setStreamMode('direct')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  streamMode === 'direct' 
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Direct bypass: circumvents local server proxies; stream directly inside your browser"
              >
                Direct
              </button>
            </div>
          </div>
        )}

        {/* Video Frame */}
        <div className="flex-1 w-full h-full relative z-0 flex items-center justify-center group" onClick={handlePlayOverlay}>
          
          <video
            ref={videoRef}
            className="w-full h-full max-h-screen object-contain bg-black select-none pointer-events-auto"
            autoPlay
            playsInline
          />

          {/* Luxury Hover Quick Menu Bar on Player */}
          {currentChannel && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-2xl bg-[#090810]/95 border border-white/[0.07] px-5 py-3 rounded-2xl shadow-3xl backdrop-blur-2xl flex items-center justify-between pointer-events-auto opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
              <div className="flex items-center space-x-3 shrink-1 truncate">
                <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></span>
                <span className="text-xs font-bold truncate text-white">{currentChannel.name}</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono-custom uppercase tracking-wide shrink-0 hidden sm:inline">
                  {streamMode === 'proxy' ? 'Proxied Loop' : 'Direct Link'}
                </span>
              </div>

              {/* Volume + Utilities */}
              <div className="flex items-center space-x-4">
                {/* Copy Stream link button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}
                  className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer relative"
                  title="Copy Stream Playlist File (M3U8) Link"
                >
                  {copied ? <Check className="w-4.5 h-4.5 text-green-400" /> : <Copy className="w-4.5 h-4.5" />}
                  {copied && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg whitespace-nowrap shadow-xl">
                      Copied!
                    </span>
                  )}
                </button>

                {/* Picture in Picture duplicate trigger inside quick bar */}
                {isPiPSupported && (
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePiP(); }}
                    className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Minimize window to Picture in Picture floating mode"
                  >
                    <Tv2 className="w-4.5 h-4.5" />
                  </button>
                )}

                {/* Real Video Reload Trigger */}
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    const orig = streamMode;
                    // Reset streamer connection to force fresh fetch
                    setStreamMode('proxy');
                    setTimeout(() => setStreamMode(orig), 50);
                  }}
                  className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Refresh video buffer connection manually"
                >
                  <RefreshCw className="w-4.5 h-4.5" />
                </button>

                <div className="h-4 w-px bg-white/[0.08]"></div>

                {/* Custom Volume Slider */}
                <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                  <button onClick={handleToggleMute} className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer">
                    {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active Stream stats panel */}
        <AnimatePresence>
          {showStats && currentChannel && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-20 left-4 z-25 bg-[#090812]/95 border border-white/[0.08] p-5 rounded-2xl shadow-3xl backdrop-blur-2xl max-w-sm"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.05] mb-3">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4.5 h-4.5 text-indigo-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono-custom">Realtime Telemetry HUD</span>
                </div>
                <button onClick={() => setShowStats(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2 text-[11px] font-mono-custom text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Video Resolution:</span>
                  <span className="text-slate-200 font-bold">{videoStats.resolution}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Aspect Ratio:</span>
                  <span className="text-indigo-400 font-bold">{videoStats.aspectRatio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Buffer Length:</span>
                  <span className="text-emerald-400 font-bold">{videoStats.bufferLength}s of live feed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Connection Mode:</span>
                  <span className="text-purple-400 font-bold uppercase">{streamMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Direct Playback Link:</span>
                  <span className="text-slate-400 truncate max-w-[160px] cursor-pointer hover:text-indigo-400" title="Click to copy link" onClick={handleCopyLink}>
                    {currentChannel.url}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty Slate Greeting Card & Selection Guide */}
        {!currentChannel && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none bg-radial-[at_center_center,_var(--tw-gradient-stops)] from-[#0a0815] via-[#050409] to-[#010103] text-center px-6">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl animate-pulse"></div>
              <div className="bg-gradient-to-tr from-indigo-700/80 to-purple-800/80 p-8 rounded-full border border-indigo-500/30 relative shadow-2xl">
                <Tv className="w-12.5 h-12.5 text-indigo-300 animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">Welcome to StreamHub</h2>
            <p className="text-slate-400 max-w-sm text-sm font-medium">
              Choose an IPTV country catalog and pick any station to begin streaming football matches, FIFA, live sports, and local feeds.
            </p>
            
            <div className="mt-8 flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2.5 rounded-full">
              <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider font-mono-custom">How to fix streaming bugs</span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-300" />
              <span className="text-xs text-slate-300">Switch Stream Mode to Direct if a channel fails</span>
            </div>
          </div>
        )}
        
        {/* Connection Failure Error Overlay */}
        {errorMsg && currentChannel && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md px-6 text-center">
            <div className="bg-red-500/10 p-5 rounded-full border border-red-500/20 mb-4 animate-bounce">
              <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1.5">Stream Offline or Restricted</h3>
            <p className="text-slate-400 text-sm max-w-md mb-6">{errorMsg}</p>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button 
                onClick={() => setStreamMode(streamMode === 'proxy' ? 'direct' : 'proxy')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-3 rounded-2xl transition-all shadow-lg cursor-pointer"
              >
                Change stream to {streamMode === 'proxy' ? 'Direct Bypass' : 'Proxy Mode'}
              </button>
              <button 
                onClick={() => {
                  setErrorMsg('');
                  // trigger a fast state refresh
                  const orig = streamMode;
                  setStreamMode('proxy');
                  setTimeout(() => setStreamMode(orig), 10);
                }}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs px-5 py-3 rounded-2xl transition-all cursor-pointer"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Live / Channel Information Text Overlay */}
        {currentChannel && !errorMsg && (
          <div className="absolute bottom-20 md:bottom-24 left-0 p-6 md:p-8 z-10 pointer-events-none w-full">
            <div className="flex items-center space-x-2 mb-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-red-600 text-white text-[10px] font-extrabold rounded-full shadow-lg shadow-red-500/20 tracking-wider uppercase animate-pulse">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                <span>Live Feed</span>
              </div>
              <div className={`px-3 py-1 text-white text-[10px] font-extrabold rounded-full shadow-md uppercase tracking-wider ${
                streamMode === 'proxy' ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-teal-600 shadow-teal-500/20'
              }`}>
                {streamMode === 'proxy' ? 'Proxied Loop' : 'Direct Bypass Active'}
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white drop-shadow-3xl tracking-tight leading-none">
              {currentChannel.name}
            </h1>
          </div>
        )}
      </div>

      {/* Global Regional Catalog Popover / Interactive Modal */}
      <AnimatePresence>
        {isCountryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCountryModalOpen(false)}
              className="absolute inset-0 bg-[#040409]/90 backdrop-blur-xl"
            />
            
            {/* Modal Dialog */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0b0a15] border border-white/[0.08] w-full max-w-xl rounded-3xl overflow-hidden shadow-3xl relative z-10 max-h-[85vh] flex flex-col"
            >
              <div className="p-6 border-b border-white/[0.04] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Select Country Playlist</h3>
                  <p className="text-xs text-slate-400">Stream region-specific TV channels and sports streams</p>
                </div>
                <button 
                  onClick={() => setIsCountryModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Grid representation of regional playlist catalogs */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {countries.map(c => {
                    const isSelected = selectedCountry === c;
                    return (
                      <button
                        key={c}
                        onClick={() => {
                          setSelectedCountry(c);
                          setIsCountryModalOpen(false);
                        }}
                        className={`flex items-center space-x-3.5 p-3 rounded-2xl text-left border cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-lg' 
                            : 'bg-white/[0.02]/40 border-white/[0.04] hover:bg-white/[0.05] text-[#c2c1c9] hover:text-white hover:border-white/[0.08]'
                        }`}
                      >
                        <span className="text-2xl leading-none">{getCountryFlag(c)}</span>
                        <div className="truncate">
                          <p className="font-semibold text-sm truncate">{formatCountryName(c)}</p>
                          <span className="text-[10px] text-slate-500 font-mono-custom uppercase font-semibold">
                            {isSelected ? 'Active Playlist' : 'Click to load'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
