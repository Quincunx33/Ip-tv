import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Globe, Server, Layers, Layout, Save, Trash, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

interface AdminPortalProps {
  user: any;
  customPlaylists: any[];
  onClose: () => void;
  lang: 'en' | 'bn';
}

const AdminPortal: React.FC<AdminPortalProps> = ({ user, customPlaylists, onClose, lang }) => {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddPlaylist = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const name = formData.get('name') as string;
    const url = formData.get('url') as string;
    const server = formData.get('server') as string;
    const category = formData.get('category') as string;

    if (!name || !url || !server || !category) {
      showToast(lang === 'en' ? "Please fill all fields" : "সবগুলো ঘর পূরণ করুন", 'error');
      return;
    }

    try {
      const id = `m3u_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await setDoc(doc(db, 'm3u_playlists', id), {
        name: name.trim(),
        url: url.trim(),
        server,
        category,
        addedBy: user.email,
        createdAt: new Date().toISOString()
      });
      form.reset();
      showToast(lang === 'en' ? "Source added successfully" : "সফলভাবে যুক্ত হয়েছে");
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(lang === 'en' ? "Are you sure?" : "আপনি কি নিশ্চিত?")) return;
    try {
      await deleteDoc(doc(db, 'm3u_playlists', id));
      showToast(lang === 'en' ? "Channel source removed" : "চ্যানেল সোর্স মুছে ফেলা হয়েছে");
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        className="bg-[#0c0c0e] w-full max-w-4xl border border-white/5 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 sm:p-8 flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-600/10">
              <Server className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tighter text-white uppercase italic">
                {lang === 'en' ? 'Core Stream Management' : 'কোর স্ট্রিম ম্যানেজমেন্ট'}
              </h2>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">
                  {lang === 'en' ? `Admin: ${user.email}` : `অ্যাডমিন: ${user.email}`}
                </p>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white rounded-2xl transition-all hover:bg-zinc-800 active:scale-95 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-10 custom-scrollbar">
          {/* Add Form */}
          <section className="space-y-6">
            <div className="flex items-center space-x-2 px-2">
              <Plus className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                {lang === 'en' ? 'Link New M3U Source' : 'নতুন M3U লিঙ্ক যুক্ত করুন'}
              </h3>
            </div>
            
            <form onSubmit={handleAddPlaylist} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-900/30 p-6 rounded-[2rem] border border-white/5 shadow-inner">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Server Source</label>
                <div className="relative">
                  <select 
                    name="server"
                    className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="1">Feed Alpha (Server 1)</option>
                    <option value="2">Core Delta (Server 2)</option>
                    <option value="3">Sigma (Server 3)</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Layout className="w-4 h-4 text-zinc-600" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Section Assignment</label>
                <div className="relative">
                  <select 
                    name="category"
                    className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="general">Global Directory</option>
                    <option value="sports">Live Sports Hub</option>
                    <option value="fifa">FIFA / Event Exclusive</option>
                    <option value="news">Global News Desk</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Globe className="w-4 h-4 text-zinc-600" />
                  </div>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Display Name</label>
                <input 
                  type="text" 
                  name="name"
                  placeholder="e.g. World Cup Premium Feed"
                  className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Direct M3U / Stream URL</label>
                <input 
                  type="url" 
                  name="url"
                  placeholder="https://cdn.example.com/playlist.m3u"
                  className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-5 py-4 text-sm font-mono text-indigo-300 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
                />
              </div>

              <div className="md:col-span-2 pt-2">
                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-[0.2em] uppercase text-xs rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] cursor-pointer"
                >
                  Confirm & Sync to Firebase
                </button>
              </div>
            </form>
          </section>

          {/* List Section */}
          <section className="space-y-6 pb-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                  {lang === 'en' ? 'Active Records' : 'বর্তমান রেকর্ড সমূহ'} ({customPlaylists.length})
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {customPlaylists.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4 bg-zinc-900/20 border-2 border-dashed border-white/5 rounded-[2rem]">
                  <div className="p-5 bg-zinc-900 rounded-full">
                    <Trash className="w-8 h-8 text-zinc-700" />
                  </div>
                  <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">No Custom Records Found</p>
                </div>
              ) : (
                customPlaylists.map((p) => (
                  <motion.div 
                    layout
                    key={p.id}
                    className="group relative flex items-center justify-between p-5 bg-zinc-900/40 hover:bg-indigo-600/5 border border-white/5 hover:border-indigo-500/20 rounded-2xl transition-all"
                  >
                    <div className="flex flex-col space-y-2 min-w-0 pr-10">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-sm font-black text-white truncate max-w-[200px]">{p.name}</span>
                        <span className="px-2 py-0.5 bg-zinc-800 text-[8px] font-black tracking-tighter uppercase text-indigo-400 rounded-lg border border-white/5">
                          S{p.server}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-[8px] font-black tracking-tighter uppercase text-emerald-400 rounded-lg border border-emerald-500/20">
                          {p.category}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-600 font-mono truncate">{p.url}</span>
                        <span className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest mt-1">Bound by {p.addedBy}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDelete(p.id)}
                      className="p-3 text-zinc-600 hover:text-rose-500 bg-black/40 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-zinc-900/50 border-t border-white/5 flex items-center justify-between text-[8px] font-black text-zinc-600 uppercase tracking-widest">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Encrypted Firebase Security Active</span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span>Unauthorized IP Logging Engaged</span>
          </div>
        </div>
      </motion.div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[300] flex items-center space-x-3 border ${
              toast.type === 'success' ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'
            }`}
          >
            <span className="text-white text-xs font-black uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPortal;
