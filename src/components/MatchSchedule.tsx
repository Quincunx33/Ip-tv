import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Clock, Search, Tv, Flame, CheckCircle2, AlertCircle, Newspaper, ChevronRight } from 'lucide-react';
import { FootballMatch } from '../types';

interface MatchScheduleProps {
  t: any;
  lang: string;
  onOpenSchedule: () => void;
  channelsCount: number;
}

export const MatchSchedule: React.FC<MatchScheduleProps> = ({ t, lang, onOpenSchedule, channelsCount }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');
  const [now, setNow] = useState(new Date());
  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [news, setNews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch match schedule from our server
  useEffect(() => {
    let isMounted = true;
    
    const fetchMatches = async () => {
      try {
        const res = await fetch('/api/matches');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        
        if (isMounted && data) {
          if (data.matches && Array.isArray(data.matches)) {
            data.matches.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
            setMatches(data.matches);
          }
          if (data.news && Array.isArray(data.news)) {
            setNews(data.news);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error fetching match schedule:", err);
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMatches();

    return () => { isMounted = false; };
  }, []);

  // Keep internal tick for accurate timers and state changes
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 10000); // Tick every 10s
    return () => clearInterval(timer);
  }, []);

  const getMatchStatus = (matchTimeStr: string) => {
    const matchTime = new Date(matchTimeStr).getTime();
    const currTime = now.getTime();
    const threeHours = 3 * 60 * 60 * 1000;

    if (currTime >= matchTime && currTime < matchTime + threeHours) {
      return 'live';
    } else if (currTime < matchTime) {
      return 'upcoming';
    } else {
      return 'completed';
    }
  };

  const formatMatchTime = (matchTimeStr: string) => {
    const d = new Date(matchTimeStr);
    
    // Bangladesh Time is UTC+6
    const bangladeshOffset = 6 * 60; // in minutes
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const bdDate = new Date(utc + (3600000 * 6));

    // local system time format
    const localStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const localDateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

    // BD Time string
    const bdStr = bdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " BST";

    if (lang === 'bn') {
      const convertToBnNum = (str: string) => {
        const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return str.replace(/[0-9]/g, (w) => bnNums[parseInt(w)]);
      };
      return {
        local: `${localDateStr}, ${convertToBnNum(localStr)} (আপনার সময়)`,
        bd: `${convertToBnNum(bdStr)} (বাংলাদেশ সময়)`,
        shortLocal: `${localDateStr} - ${convertToBnNum(localStr)}`
      };
    }

    return {
      local: `${localDateStr}, ${localStr} (Your Time)`,
      bd: `${bdStr} (BD Time)`,
      shortLocal: `${localDateStr} - ${localStr}`
    };
  };

  const getCountdownString = (matchTimeStr: string) => {
    const diff = new Date(matchTimeStr).getTime() - now.getTime();
    if (diff <= 0) return '';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (lang === 'bn') {
      const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      const convert = (num: number) => {
        return String(num).replace(/[0-9]/g, (w) => bnNums[parseInt(w)]);
      };
      if (hours > 0) {
        return `${convert(hours)} ঘণ্টা ${convert(mins)} মিনিট পর শুরু`;
      }
      return `${convert(mins)} মিনিট পর শুরু`;
    }

    if (hours > 0) {
      return `Starts in ${hours}h ${mins}m`;
    }
    return `Starts in ${mins}m`;
  };

  if (isLoading) {
    return (
      <div 
        className="bg-gradient-to-r from-red-600/90 via-rose-600/90 to-red-600/90 text-white overflow-hidden flex items-center border-b border-red-500/50 shrink-0 z-40 relative h-10 w-full"
      >
        <div className="bg-red-700 font-bold px-3 sm:px-4 text-[10px] sm:text-xs tracking-wider flex items-center gap-2 z-10 shadow-[2px_0_10px_rgba(0,0,0,0.5)] shrink-0 uppercase h-full w-[120px] sm:w-[150px] whitespace-nowrap">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white shrink-0"></span>
          </span>
          <span className="truncate">{lang === 'bn' ? 'ম্যাচ আপডেট' : 'LIVE UPDATES'}</span>
        </div>
        <div className="flex-1 px-4 text-xs font-semibold animate-pulse truncate">
           {lang === 'bn' ? 'লোড হচ্ছে...' : 'Loading updates...'}
        </div>
      </div>
    );
  }

  if (matches.length === 0 && news.length === 0) {
    return (
      <div 
        onClick={onOpenSchedule}
        className="bg-gradient-to-r from-red-600/90 via-rose-600/90 to-red-600/90 text-white overflow-hidden flex items-center border-b border-red-500/50 shrink-0 z-40 relative cursor-pointer hover:from-red-500/90 hover:to-red-500/90 transition-colors group h-10 w-full"
      >
        <div className="bg-red-700 font-bold px-3 sm:px-4 text-[10px] sm:text-xs tracking-wider flex items-center gap-2 z-10 shadow-[2px_0_10px_rgba(0,0,0,0.5)] shrink-0 uppercase h-full whitespace-nowrap w-[120px] sm:w-[150px]">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white shrink-0"></span>
          </span>
          <span className="truncate">{lang === 'bn' ? 'ম্যাচ আপডেট' : 'LIVE UPDATES'}</span>
          <ChevronRight className="w-3 h-3 ml-1 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 hidden sm:block" />
        </div>
        <div className="flex-1 px-4 text-xs font-semibold truncate">
           {lang === 'bn' ? 'এই মুহূর্তে কোনো নতুন আপডেট নেই' : 'No new updates at the moment'}
        </div>
      </div>
    );
  }

  // Interleave items for marquee
  const marqueeItems = [];
  const maxLength = Math.max(matches.length, news.length);
  for (let i = 0; i < maxLength; i++) {
    if (matches[i]) marqueeItems.push({ type: 'match', data: matches[i] });
    if (news[i]) marqueeItems.push({ type: 'news', data: news[i] });
  }

  const displayItems = [...marqueeItems, ...marqueeItems, ...marqueeItems, ...marqueeItems];

  return (
    <div 
      onClick={onOpenSchedule}
      className="bg-gradient-to-r from-red-600/90 via-rose-600/90 to-red-600/90 text-white overflow-hidden flex items-center border-b border-red-500/50 shrink-0 z-40 relative cursor-pointer hover:from-red-500/90 hover:to-red-500/90 transition-colors group h-10 w-full"
    >
      <div className="bg-red-700 font-bold px-3 sm:px-4 text-[10px] sm:text-xs tracking-wider flex items-center gap-2 z-10 shadow-[2px_0_10px_rgba(0,0,0,0.5)] shrink-0 uppercase h-full whitespace-nowrap w-[120px] sm:w-[150px]">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white shrink-0"></span>
        </span>
        <span className="truncate">{lang === 'bn' ? 'ম্যাচ আপডেট' : 'LIVE UPDATES'}</span>
        <ChevronRight className="w-3 h-3 ml-1 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 hidden sm:block" />
      </div>
      <div className="flex-1 overflow-hidden relative flex items-center h-full group w-full">
        <div className="flex whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused] items-center">
          {displayItems.map((item, idx) => {
            if (item.type === 'match') {
              const match = item.data as FootballMatch;
              const status = getMatchStatus(match.time);
              const timeObj = formatMatchTime(match.time);
              
              return (
                <div 
                  key={`match-${match.id}-${idx}`} 
                  className="flex items-center px-4 sm:px-6 py-1.5 sm:py-2 border-r border-white/20 select-none"
                >
                  <div className="flex bg-black/20 rounded-full px-2 py-0.5 items-center mr-3 hidden sm:flex">
                    <span className="text-[10px] font-bold text-red-100">{status === 'live' ? 'LIVE NOW' : status === 'upcoming' ? 'UPCOMING' : 'FINISHED'}</span>
                  </div>
                  <div className="font-semibold text-xs sm:text-sm flex items-center gap-2">
                    {match.team1Flag && match.team1Flag.startsWith('http') ? (
                      <img src={match.team1Flag} alt="" className="w-5 h-3.5 object-cover rounded-sm inline-block shadow-sm shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-base leading-none shrink-0">{match.team1Flag}</span>
                    )}
                    <span>{match.team1}</span>
                    <span className="text-red-200 text-[10px] font-black mx-1">VS</span>
                    <span>{match.team2}</span>
                    {match.team2Flag && match.team2Flag.startsWith('http') ? (
                      <img src={match.team2Flag} alt="" className="w-5 h-3.5 object-cover rounded-sm inline-block shadow-sm shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-base leading-none shrink-0">{match.team2Flag}</span>
                    )}
                  </div>
                  <div className="ml-4 text-[10px] sm:text-xs font-medium text-red-100 bg-black/20 px-2 py-1 rounded inline-block uppercase tracking-wider">
                    {status === 'live' ? 'Playing' : timeObj.shortLocal}
                  </div>
                </div>
              );
            } else {
              const newsText = item.data as string;
              return (
                <div 
                  key={`news-${idx}`}
                  className="flex items-center px-4 sm:px-6 py-1.5 sm:py-2 border-r border-white/20 select-none"
                >
                  <Newspaper className="w-4 h-4 text-red-200 mr-2 shrink-0 hidden sm:block" />
                  <span className="text-xs sm:text-sm font-semibold">{newsText}</span>
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
};
