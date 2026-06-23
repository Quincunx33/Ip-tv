import React, { useState, useEffect } from 'react';
import { FootballMatch } from '../types';
import { Clock, Calendar, CheckCircle2, ChevronLeft } from 'lucide-react';

interface FullMatchScheduleProps {
  onBack: () => void;
  lang: string;
  onWatchMatch?: (match: FootballMatch) => void;
}

export const FullMatchSchedule: React.FC<FullMatchScheduleProps> = ({ onBack, lang, onWatchMatch }) => {
  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [news, setNews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch('/api/matches');
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        if (data.matches && Array.isArray(data.matches)) {
          data.matches.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
          setMatches(data.matches);
        }
        if (data.news && Array.isArray(data.news)) setNews(data.news);
      } catch (err) {
        console.error("Failed to load schedule:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMatches();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const getMatchStatus = (matchTimeStr: string) => {
    const matchTime = new Date(matchTimeStr).getTime();
    const currTime = now.getTime();
    const threeHours = 3 * 60 * 60 * 1000;
    if (currTime >= matchTime && currTime < matchTime + threeHours) return 'live';
    if (currTime < matchTime) return 'upcoming';
    return 'completed';
  };

  const formatMatchTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const shortLocal = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const localDateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
      return { shortLocal, localDateStr };
    } catch {
      return { shortLocal: 'TBA', localDateStr: 'TBA' };
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-20 text-zinc-500">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin mb-4" />
        <p className="font-bold">Loading match schedule...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <button 
        onClick={onBack}
        className="flex items-center text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft className="w-5 h-5 mr-1" />
        <span className="font-semibold">{lang === 'bn' ? 'ফিরে যান' : 'Back to Home'}</span>
      </button>

      <div className="mb-10 text-center">
        <h1 className="text-3xl font-black mb-2 text-white">Full Match Schedule</h1>
        <p className="text-zinc-400 font-medium">{lang === 'bn' ? 'লাইভ ম্যাচ এবং বিস্তারিত ফুটবল খেলার সূচী।' : 'Upcoming, playing, and recently finished major soccer matches.'}</p>
      </div>

      <div className="grid gap-4">
        {matches.length === 0 && (
           <div className="text-center p-8 border border-zinc-800 rounded-2xl bg-[#1a1a1a]">
             <p className="text-zinc-500 font-medium">
                {lang === 'bn' ? 'এই মুহূর্তে কোনো খেলার খবর নেই' : 'No match schedule available right now.'}
             </p>
           </div>
        )}
        {matches.map((match, idx) => {
          const status = getMatchStatus(match.time);
          const { shortLocal, localDateStr } = formatMatchTime(match.time);

          return (
            <div key={`${match.id}-${idx}`} className={`p-4 sm:p-6 rounded-2xl border transition-all ${status === 'live' ? 'bg-red-950/20 border-red-900/50' : 'bg-[#1a1a1a] border-zinc-800/80 hover:bg-[#222]'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  <span>{match.group}</span>
                </div>
                
                <div className="flex items-center flex-1 justify-center max-w-2xl mx-auto gap-2 sm:gap-4 w-full">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end text-right">
                    <span className="font-bold text-sm sm:text-xl line-clamp-2">{match.team1}</span>
                    {match.team1Flag && match.team1Flag.startsWith('http') ? (
                      <img src={match.team1Flag} alt="" className="w-8 h-5 object-cover rounded shadow-sm shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-xl sm:text-4xl leading-none shrink-0">{match.team1Flag}</span>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-center justify-center px-2 sm:px-4 shrink-0 min-w-[80px]">
                    <span className="text-[10px] sm:text-xs font-black text-zinc-600 mb-1">VS</span>
                    {status === 'live' ? (
                      <span className="bg-red-600/20 text-red-500 font-bold px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs shadow-[0_0_15px_rgba(220,38,38,0.3)] animate-pulse border border-red-500/30 whitespace-nowrap">
                        LIVE NOW
                      </span>
                    ) : status === 'upcoming' ? (
                      <span className="text-zinc-400 font-semibold text-xs sm:text-sm whitespace-nowrap">
                        {shortLocal}
                      </span>
                    ) : (
                      <span className="flex items-center text-zinc-500 text-[10px] sm:text-xs font-bold bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800 whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                        FT
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-start text-left">
                    {match.team2Flag && match.team2Flag.startsWith('http') ? (
                      <img src={match.team2Flag} alt="" className="w-8 h-5 object-cover rounded shadow-sm shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-xl sm:text-4xl leading-none shrink-0">{match.team2Flag}</span>
                    )}
                    <span className="font-bold text-sm sm:text-xl line-clamp-2">{match.team2}</span>
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-start sm:items-end gap-2.5 shrink-0">
                  <div className="text-right text-xs text-zinc-500 font-medium">
                    {localDateStr}
                  </div>
                  {onWatchMatch && (
                    <button 
                      onClick={() => onWatchMatch(match)}
                      className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-white text-xs font-bold transition-all shadow-md whitespace-nowrap active:scale-95 cursor-pointer ${
                        status === 'live' 
                        ? 'bg-red-600 hover:bg-red-700 animate-bounce' 
                        : 'bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300'
                      }`}
                    >
                      <span>
                        {status === 'live' 
                          ? (lang === 'bn' ? '📺 লাইভ দেখুন' : '📺 Watch Live') 
                          : (lang === 'bn' ? '📺 স্পোর্টস চ্যানেল' : '📺 Sports Channel')
                        }
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {news.length > 0 && (
        <div className="mt-16 bg-[#111] border border-zinc-800 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">Latest News</h2>
          <ul className="space-y-4">
            {news.map((item, idx) => (
              <li key={`news-${idx}`} className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors">
                <span className="w-6 h-6 rounded bg-red-600/20 text-red-500 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">{idx + 1}</span>
                <p className="font-medium text-zinc-300 leading-relaxed text-sm sm:text-base">{item}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
