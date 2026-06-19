/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Home, Flame, Globe, Radio, Bookmark, AppWindow, 
  RefreshCw, ChevronDown, Settings, Shield, Cpu, Activity, 
  LayoutDashboard, Map, Info, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SidebarProps } from '../types';
import { formatCountryName } from '../utils';

const Sidebar: React.FC<SidebarProps> = ({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  setActiveTab, 
  activeTab, 
  setCurrentChannel, 
  currentChannel, 
  t, 
  lang, 
  setIsCountryModalOpen, 
  selectedCountry, 
  deferredPrompt, 
  handleInstallApp,
  streamMode,
  setStreamMode,
  customProxyUrl,
  setCustomProxyUrl,
  proxyHost,
  setProxyHost,
  proxyPort,
  setProxyPort,
  proxyType,
  setProxyType,
  userAgent,
  setUserAgent,
  referer,
  setReferer,
  isServer1Enabled,
  setIsServer1Enabled,
  isServer2Enabled,
  setIsServer2Enabled,
  isServer3Enabled,
  setIsServer3Enabled,
  serverSource,
  setServerSource
}) => {
  const [isClearing, setIsClearing] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

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

  const navItems = [
    { id: 'all', label: t.home, icon: Home },
    { id: 'sports', label: t.sports, icon: Flame },
    { id: 'fifa', label: t.fifa, icon: Globe, special: true },
    { id: 'news', label: t.news, icon: Radio },
    { id: 'favorites', label: t.favorites, icon: Bookmark },
  ];

  return (
    <div className="flex flex-col h-full bg-[#09090b] border-r border-white/5 w-64 text-zinc-400 relative z-50">
      {/* Sidebar Header */}
      <div className="px-6 h-20 flex items-center shrink-0 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold tracking-tight text-lg leading-tight uppercase">
              {t.title}
            </span>
            <span className="text-[10px] text-zinc-500 font-medium tracking-widest uppercase">
              Premium Stream
            </span>
          </div>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-6 pb-20">
        {/* Main Navigation */}
        <div className="px-3 mb-8">
          <div className="px-3 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center">
             <LayoutDashboard className="w-3 h-3 mr-2" />
             {lang === 'en' ? 'Navigate' : 'ন্যাভিগেশন'}
          </div>
          <div className="space-y-1">
            {navItems.map((item) => (
              <button 
                key={item.id}
                onClick={() => { 
                  setActiveTab(item.id); 
                  setCurrentChannel(null); 
                  if(window.innerWidth < 1024) setIsSidebarOpen(false); 
                }} 
                className={`w-full group flex items-center space-x-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all relative overflow-hidden ${
                  activeTab === item.id && !currentChannel 
                    ? 'text-white' 
                    : 'hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                {activeTab === item.id && !currentChannel && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute inset-0 bg-indigo-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex items-center space-x-3 w-full">
                  <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
                    activeTab === item.id && !currentChannel ? 'text-white' : item.special ? 'text-indigo-400' : 'text-zinc-500'
                  }`} />
                  <span className={`text-sm ${activeTab === item.id && !currentChannel ? 'font-bold' : 'font-medium'} ${item.special ? 'text-indigo-300' : ''}`}>
                    {item.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Region / Explore */}
        <div className="px-3 mb-8">
          <div className="px-3 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center">
             <Map className="w-3 h-3 mr-2" />
             {t.explore}
          </div>
          <button 
            onClick={() => {setIsCountryModalOpen(true); if(window.innerWidth < 1024) setIsSidebarOpen(false);}} 
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer group"
          >
            <div className="flex items-center space-x-3">
              <Globe className="w-5 h-5 text-zinc-500 group-hover:text-indigo-400 group-hover:animate-pulse" />
              <span className="text-sm font-medium text-zinc-300 truncate max-w-[120px]">
                {formatCountryName(selectedCountry)}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          </button>
        </div>


        {/* PWA Install */}
        {deferredPrompt && (
          <div className="px-3 mb-8">
             <div className="bg-gradient-to-br from-teal-900/20 to-emerald-900/20 rounded-2xl p-4 border border-teal-500/10 space-y-3">
                <div className="flex items-center space-x-2">
                  <AppWindow className="w-5 h-5 text-teal-400" />
                  <span className="text-xs font-bold text-teal-300 uppercase tracking-widest">Store Quality</span>
                </div>
                <p className="text-[11px] text-teal-300/70 leading-relaxed">
                  Install the progressive app for a full-screen theater experience.
                </p>
                <button 
                  onClick={handleInstallApp}
                  className="w-full py-2 bg-teal-500 hover:bg-teal-400 text-black text-[11px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-teal-500/20 active:scale-95"
                >
                  {lang === 'en' ? 'Get App' : 'অ্যাপ নিন'}
                </button>
             </div>
          </div>
        )}

        {/* Settings / System */}
        <div className="px-3 mb-8">
          <div className="px-3 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center">
             <Settings className="w-3 h-3 mr-2" />
             {lang === 'en' ? 'Preferences' : 'পছন্দসমূহ'}
          </div>
          
          <div className="space-y-2">
            {/* Server 1 Toggle */}
            <div 
              onClick={() => {if(isServer1Enabled) setServerSource('1');}}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${serverSource === '1' ? 'bg-indigo-600/10 border-indigo-500/30 ring-1 ring-indigo-500/20' : 'bg-white/5 border-white/5 hover:bg-white/[0.08]'}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${serverSource === '1' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  <span className="text-[10px] font-bold">S1</span>
                </div>
                <div className="flex flex-col">
                  <span className={`text-xs font-bold ${serverSource === '1' ? 'text-indigo-400' : 'text-white'}`}>Server 1</span>
                  <span className="text-[9px] text-zinc-500">M3U Feed 1</span>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsServer1Enabled(!isServer1Enabled); }}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${isServer1Enabled ? 'bg-indigo-600' : 'bg-zinc-700'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isServer1Enabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Server 2 Toggle */}
            <div 
              onClick={() => {if(isServer2Enabled) setServerSource('2');}}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${serverSource === '2' ? 'bg-indigo-600/10 border-indigo-500/30 ring-1 ring-indigo-500/20' : 'bg-white/5 border-white/5 hover:bg-white/[0.08]'}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${serverSource === '2' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                   <span className="text-[10px] font-bold">S2</span>
                </div>
                <div className="flex flex-col">
                  <span className={`text-xs font-bold ${serverSource === '2' ? 'text-indigo-400' : 'text-white'}`}>Server 2</span>
                  <span className="text-[9px] text-zinc-500">M3U Feed 2</span>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsServer2Enabled(!isServer2Enabled); }}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${isServer2Enabled ? 'bg-indigo-600' : 'bg-zinc-700'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isServer2Enabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Server 3 Toggle (Latest / Dedicated) */}
            <div 
              onClick={() => {if(isServer3Enabled) setServerSource('3');}}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${serverSource === '3' ? 'bg-teal-500/10 border-teal-500/30 ring-1 ring-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'bg-white/5 border-white/5 hover:bg-white/[0.08]'}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${serverSource === '3' ? 'bg-teal-500 text-black border-teal-400' : 'bg-zinc-800 text-zinc-400 border-zinc-700/50'}`}>
                   <span className="text-[10px] font-black">S3</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center space-x-1">
                    <span className={`text-xs font-bold ${serverSource === '3' ? 'text-teal-400' : 'text-white'}`}>Server 3</span>
                    <span className="px-1 py-0.2 bg-indigo-500/20 text-indigo-400 text-[7px] font-black uppercase tracking-wider rounded border border-indigo-500/10">Ultra</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-tighter font-black">Stable Optimized</span>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsServer3Enabled(!isServer3Enabled); }}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${isServer3Enabled ? 'bg-teal-500' : 'bg-zinc-700'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isServer3Enabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Stream Protocol Connection Selector */}
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center space-x-2 text-zinc-500">
                <Activity className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider italic">Stream Protocol</span>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg border border-white/5">
                {['direct', 'proxy', 'custom'].map((mode) => (
                  <button 
                    key={mode}
                    onClick={() => setStreamMode(mode as any)} 
                    className={`py-1.5 text-[9px] font-black uppercase tracking-tighter rounded-md transition-all cursor-pointer ${
                      streamMode === mode 
                        ? 'bg-zinc-800 text-indigo-400 border border-white/10 shadow-inner' 
                        : 'text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Custom Proxy Detailed Settings */}
              <AnimatePresence>
                {streamMode === 'custom' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-3 pt-1"
                  >
                    <div className="flex items-center bg-zinc-950 border border-white/5 rounded-lg p-0.5">
                      {['socks5', 'http', 'url'].map((type) => (
                        <button 
                          key={type}
                          onClick={() => setProxyType(type as any)} 
                          className={`flex-1 py-1 text-[9px] font-bold rounded transition-colors cursor-pointer ${
                            proxyType === type ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-600'
                          }`}
                        >
                          {type.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    {proxyType === 'url' ? (
                      <input 
                        type="text" 
                        placeholder="https://proxy.com/?url="
                        value={customProxyUrl}
                        onChange={(e) => setCustomProxyUrl(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/5 rounded-lg px-3 py-2 text-[10px] text-indigo-300 outline-none focus:border-indigo-500/50 transition-all font-mono"
                      />
                    ) : (
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="IP / Host"
                          value={proxyHost}
                          onChange={(e) => setProxyHost(e.target.value)}
                          className="flex-[3] bg-zinc-950 border border-white/5 rounded-lg px-3 py-2 text-[10px] text-zinc-300 outline-none focus:border-indigo-500/50 transition-all font-mono"
                        />
                        <input 
                          type="text" 
                          placeholder="Port"
                          value={proxyPort}
                          onChange={(e) => setProxyPort(e.target.value)}
                          className="flex-1 bg-zinc-950 border border-white/5 rounded-lg px-2 py-2 text-[10px] text-zinc-300 outline-none focus:border-indigo-500/50 transition-all text-center font-mono"
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Cache Reset Button */}
            <button 
              onClick={clearAppCache}
              disabled={isClearing}
              className="w-full flex items-center justify-between p-3 rounded-xl text-zinc-500 hover:bg-red-500/5 hover:text-red-400 border border-white/5 hover:border-red-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50 group"
            >
              <div className="flex items-center space-x-3">
                <RefreshCw className={`w-4 h-4 ${isClearing ? 'animate-spin text-red-500' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                <span className="text-xs font-medium">
                  {lang === 'en' ? 'Reset Engine' : 'ইঞ্জিন রিসেট'}
                </span>
              </div>
              <Info className="w-3 h-3 opacity-20 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-white/5 bg-[#09090b]/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Version</span>
            <span className="text-xs font-mono text-zinc-400">1.4.2-stable</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
