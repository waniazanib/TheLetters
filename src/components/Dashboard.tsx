/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DB, LocalUser } from '../lib/db';
import { Letter } from '../types';
import { 
  Inbox, Send, Clock, Star, FileEdit, Plus, Trash2, 
  Share2, Eye, LogOut, Disc, Compass, LayoutGrid, Heart, Scroll 
} from 'lucide-react';

interface DashboardProps {
  user: LocalUser;
  onLogout: () => void;
  onComposeNew: () => void;
  onEditLetter: (id: string) => void;
  onOpenLetter: (id: string) => void;
}

export default function Dashboard({
  user,
  onLogout,
  onComposeNew,
  onEditLetter,
  onOpenLetter
}: DashboardProps) {
  const [activeSegment, setActiveSegment] = useState<'sent' | 'scheduled' | 'drafts' | 'received' | 'favorites'>('sent');
  const [letters, setLetters] = useState<Letter[]>([]);
  const [received, setReceived] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLetters = async () => {
    setLoading(true);
    try {
      // Load user authored data
      const myLetters = await DB.getMyLetters(user.uid);
      setLetters(myLetters);
    } catch (e) {
      console.error('Could not load ledger logs from Firestore:', e);
      // Fallback to local letters directly in UI so the user still sees their letters
      const local = DB.getLocalLetters().filter(l => l.senderId === user.uid);
      setLetters(local);
    }

    try {
      // Load recipient history
      const listReceived = await DB.getReceivedLetters();
      setReceived(listReceived);
    } catch (e) {
      console.error('Could not load received logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLetters();
  }, [user.uid]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you absolute in dissolving this draft permanently from the scrolls?')) {
      await DB.deleteLetter(id);
      fetchLetters();
    }
  };

  const copyShareLink = (id: string) => {
    const appUrl = window.location.origin;
    const link = `${appUrl}?open=${id}`;
    navigator.clipboard.writeText(link)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch((err) => console.error('Could not copy shared key:', err));
  };

  // Classify current authored letters
  const now = new Date().toISOString();
  
  const drafts = letters.filter(l => l.isDraft === true);
  
  const sent = letters.filter(l => !l.isDraft && l.deliveryTimeType === 'immediate');
  
  const scheduled = letters.filter(l => !l.isDraft && l.deliveryTimeType === 'delayed' && l.deliveryTime > now);
  
  const sentReleased = letters.filter(l => !l.isDraft && l.deliveryTimeType === 'delayed' && l.deliveryTime <= now);
  
  // Combine all fully released letters
  const allSent = [...sent, ...sentReleased];

  // Combine favorites and ensure unique IDs (e.g. if a letter is written by us and also tracked as opened/received)
  const uniqueFavoritesMap = new Map<string, Letter>();
  [...letters, ...received].forEach(l => {
    if (DB.isLetterFavorite(l.id)) {
      uniqueFavoritesMap.set(l.id, l);
    }
  });
  const favorites = Array.from(uniqueFavoritesMap.values());

  const getFilteredList = () => {
    switch (activeSegment) {
      case 'sent':
        return allSent;
      case 'scheduled':
        return scheduled;
      case 'drafts':
        return drafts;
      case 'received':
        return received;
      case 'favorites':
        return favorites;
      default:
        return allSent;
    }
  };

  const activeList = getFilteredList();

  return (
    <div id="dashboard-desk-container" className="max-w-6xl w-full mx-auto p-4 md:p-6 bg-[#F4E9D8] min-h-screen text-[#2E1E12] select-none animate-fade-in">
      
      {/* Brass Registry Header panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-[#7A4E2D]/40 pb-5 mb-6 gap-4">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-[#7A4E2D] uppercase font-bold block">
            {user.isAnonymous ? 'Guest Session' : 'Patron Account Desk'}
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#2E1E12] mt-0.5">
            Welcome, {user.displayName}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="dash-compose-btn"
            onClick={onComposeNew}
            className="bg-[#7A4E2D] hover:bg-[#5E3B21] text-[#F4E9D8] px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest font-semibold flex items-center gap-1.5 shadow-md active:scale-95 transition"
          >
            <Plus className="w-4 h-4" /> Craft Letter
          </button>

          <button
            id="dash-logout-btn"
            onClick={onLogout}
            className="p-2 w-9 h-9 flex items-center justify-center rounded-xl bg-[#EAD7B7] hover:bg-[#ead7b7]/60 text-[#8B0000] border border-[#7A4E2D]/20 transition"
            title="Seal Ledger & Exit"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main layout: 12 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT NAV BAR: Shelves Drawers Navigation (3 Cols) */}
        <div id="shelves-drawer-nav" className="lg:col-span-3 bg-[#EAD7B7] border-2 border-[#7A4E2D] p-4 rounded-2xl flex flex-col space-y-2 shadow-sm">
          <h3 className="text-[10px] font-mono tracking-widest text-[#7A4E2D] uppercase font-bold mb-3 border-b border-[#7A4E2D]/25 pb-1 select-none">
            Registry Shelves
          </h3>

          <button
            id="shelf-tab-sent"
            onClick={() => setActiveSegment('sent')}
            className={`flex items-center justify-between px-3 py-2.5 text-xs font-mono rounded-xl transition ${
              activeSegment === 'sent' 
                ? 'bg-[#7A4E2D] text-white font-bold shadow-md' 
                : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Send className="w-3.5 h-3.5" /> Sent Parchments
            </span>
            <span className="scale-90 opacity-70">({allSent.length})</span>
          </button>

          <button
            id="shelf-tab-scheduled"
            onClick={() => setActiveSegment('scheduled')}
            className={`flex items-center justify-between px-3 py-2.5 text-xs font-mono rounded-xl transition ${
              activeSegment === 'scheduled' 
                ? 'bg-[#7A4E2D] text-white font-bold shadow-md' 
                : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Scheduled Deliveries
            </span>
            <span className="scale-90 opacity-70">({scheduled.length})</span>
          </button>

          <button
            id="shelf-tab-drafts"
            onClick={() => setActiveSegment('drafts')}
            className={`flex items-center justify-between px-3 py-2.5 text-xs font-mono rounded-xl transition ${
              activeSegment === 'drafts' 
                ? 'bg-[#7A4E2D] text-white font-bold shadow-md' 
                : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <FileEdit className="w-3.5 h-3.5" /> Drafts
            </span>
            <span className="scale-90 opacity-70">({drafts.length})</span>
          </button>

          <button
            id="shelf-tab-received"
            onClick={() => setActiveSegment('received')}
            className={`flex items-center justify-between px-3 py-2.5 text-xs font-mono rounded-xl transition ${
              activeSegment === 'received' 
                ? 'bg-[#7A4E2D] text-white font-bold shadow-md' 
                : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Inbox className="w-3.5 h-3.5" /> Receipt Journal
            </span>
            <span className="scale-90 opacity-70">({received.length})</span>
          </button>

          <button
            id="shelf-tab-favorites"
            onClick={() => setActiveSegment('favorites')}
            className={`flex items-center justify-between px-3 py-2.5 text-xs font-mono rounded-xl transition ${
              activeSegment === 'favorites' 
                ? 'bg-[#7A4E2D] text-white font-bold shadow-md' 
                : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5" /> Favorite Designs
            </span>
            <span className="scale-90 opacity-70">({favorites.length})</span>
          </button>

          {user.isAnonymous && (
            <div className="pt-4 border-t border-[#7A4E2D]/15 mt-4 text-[9px] font-mono leading-relaxed text-[#7A4E2D]/80">
              ⚠️ Note: You are currently navigating in Guest mode.
            </div>
          )}
        </div>

        {/* RIGHT DRAWER: Dynamic Grid Shelves (9 Cols) */}
        <div id="drawer-grid-shelves" className="lg:col-span-9 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#7A4E2D]/20 select-none">
            <span className="text-xs font-mono text-[#a67c52] uppercase font-bold tracking-wider">
              {activeSegment === 'sent' && 'Dispatch Archive'}
              {activeSegment === 'scheduled' && 'Vault holding schedule'}
              {activeSegment === 'drafts' && 'Unfinished parchment drafts'}
              {activeSegment === 'received' && 'Recipience history'}
              {activeSegment === 'favorites' && 'Aesthetic treasures'}
            </span>
            <span className="text-[10px] font-mono text-[#7A4E2D]">
              {activeList.length} items logged
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/20 rounded-2xl border border-[#7A4E2D]/15">
              <Disc className="w-8 h-8 text-[#7A4E2D] animate-spin mb-2" />
              <span className="text-[10px] font-mono tracking-widest text-[#7A4E2D] uppercase">Shuffling ledgers...</span>
            </div>
          ) : activeList.length === 0 ? (
            /* Empty mailbox display */
            <div className="flex flex-col items-center justify-center py-24 bg-[#EAD7B7]/25 rounded-2xl border-2 border-dashed border-[#7A4E2D]/30 p-6 text-center select-none animate-fade-in">
              <Compass className="w-10 h-10 text-[#7A4E2D]/40 mb-3" />
              <h4 className="font-serif text-sm font-bold text-[#2E1E12]">This registry shelf stands empty</h4>
              <p className="text-xs text-[#a67c52] max-w-xs mt-1">
                {activeSegment === 'sent' && 'No letters have climbed the wind towers yet. Let\'s write a fresh one!'}
                {activeSegment === 'scheduled' && 'No parchment seals currently await delayed unlock timings.'}
                {activeSegment === 'drafts' && 'Every blank slate has been sealed and dispatched.'}
                {activeSegment === 'received' && 'You have not browsed any received shared URLs inside this browser yet.'}
                {activeSegment === 'favorites' && 'Tag specific letters using the heart icon during view states to save them here.'}
              </p>
              {activeSegment !== 'received' && (
                <button
                  id="emptycompose-btn"
                  onClick={onComposeNew}
                  className="mt-4 bg-[#7A4E2D] hover:bg-[#5E3B21] text-white hover:text-white px-4 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest font-semibold transition shadow"
                >
                  Write First Letter
                </button>
              )}
            </div>
          ) : (
            /* Items Shelf Matrix Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeList.map((item) => (
                <div
                  id={`shelf-item-${item.id}`}
                  key={item.id}
                  className="bg-[#EAD7B7] p-4.5 border-2 border-[#7A4E2D]/60 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md hover:border-[#7A4E2D] transition group relative overflow-hidden"
                >
                  {/* Miniature delivery form insignia seal */}
                  <div className="absolute top-2.5 right-3 opacity-15 pointer-events-none text-right">
                    {item.deliveryFormat === 'envelope' ? (
                      <LayoutGrid className="w-14 h-14" />
                    ) : (
                      <Scroll className="w-14 h-14" />
                    )}
                  </div>

                  <div className="space-y-1 z-10">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${item.deliveryTimeType === 'delayed' ? 'bg-[#D4AF37]' : 'bg-[#4F772D]'}`} />
                      <h4 className="font-serif text-base font-bold text-[#2E1E12] line-clamp-1 group-hover:text-[#8B0000] transition">
                        {item.title || 'Classic Correspondence'}
                      </h4>
                    </div>

                    <p className="text-[10px] font-mono text-[#7A4E2D] font-semibold">
                      Format: <span className="capitalize">{item.deliveryFormat}</span> • Design: {item.themeId.replace('_', ' ')}
                    </p>

                    <p className="text-[9px] font-mono text-[#a67c52] leading-tight">
                      Logged: {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>

                    {item.deliveryTimeType === 'delayed' && (
                      <div className="mt-1 bg-yellow-100/40 p-1 px-2 rounded border border-yellow-200 text-[8.5px] font-mono text-[#7A4E2D] inline-block">
                        ⏳ Decrypt release: {new Date(item.deliveryTime).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Operational Controls Footer */}
                  <div className="flex items-center justify-between border-t border-[#7A4E2D]/15 pt-3 mt-4 z-10">
                    <span className="text-[9px] font-mono text-[#a67c52] inline-flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Reads: {item.viewCount || 0}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        id={`btn-open-shelf-${item.id}`}
                        onClick={() => onOpenLetter(item.id)}
                        className="bg-[#7A4E2D] hover:bg-[#5E3B21] text-[#F4E9D8] hover:text-white px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide uppercase transition"
                        title="Display full immersion view"
                      >
                        Read
                      </button>

                      {/* Edit capabilities are for drafts / empty scrolls */}
                      {(activeSegment === 'drafts' || item.senderId === user.uid) && (
                        <button
                          id={`btn-edit-shelf-${item.id}`}
                          onClick={() => onEditLetter(item.id)}
                          className="p-1 rounded text-[#7A4E2D] hover:bg-neutral-100 border border-black/10 transition bg-white"
                          title="Modify design settings"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Share copies link keys */}
                      <button
                        id={`btn-share-shelf-${item.id}`}
                        onClick={() => copyShareLink(item.id)}
                        className={`p-1 rounded border transition ${
                          copiedId === item.id 
                            ? 'bg-green-700 text-white border-green-700' 
                            : 'bg-white text-[#7A4E2D] border-black/10 hover:bg-neutral-100'
                        }`}
                        title="Copy shared key URL"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        id={`btn-delete-shelf-${item.id}`}
                        onClick={() => handleDelete(item.id)}
                        className="p-1 rounded text-[#8B0000] border border-black/10 hover:bg-red-50 bg-white transition"
                        title="Dissolve from shelves"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
