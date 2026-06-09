/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DB, LocalUser } from './lib/db';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import LetterEditor from './components/LetterEditor';
import LetterReader from './components/LetterReader';
import { Mail, Compass, HelpCircle, PenTool, Key, Settings, Lock } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [appView, setAppView] = useState<'landing' | 'auth' | 'dashboard' | 'editor' | 'reader'>('landing');
  const [selectedLetterId, setSelectedLetterId] = useState<string | null>(null);

  // Check URL query parameters on load to trigger high-priority shared opens
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const letterId = params.get('open');
    if (letterId && letterId.trim() !== '') {
      setSelectedLetterId(letterId);
      setAppView('reader');
    }
  }, []);

  // Monitor Authentication state changes securely
  useEffect(() => {
    const unsub = DB.subscribeToAuth((authedUser) => {
      setUser(authedUser);
      if (authedUser) {
        if (appView === 'landing' || appView === 'auth') {
          setAppView('dashboard');
        }
      } else {
        if (appView === 'dashboard' || appView === 'editor') {
          setAppView('landing');
        }
      }
    });
    return () => unsub();
  }, [appView]);

  const handleLogout = async () => {
    await DB.logout();
    setUser(null);
    setAppView('landing');
  };

  return (
    <div
      id="application-root"
      className={`min-h-screen bg-[#F4E9D8] text-[#2E1E12] font-sans flex flex-col justify-between transition-all duration-300 ${appView !== 'reader' ? 'border-[12px] border-[#7A4E2D]' : ''
        }`}
    >

      {/* 1. APP IMMERSIVE READER VIEWPORT (Hides all surrounding UI) */}
      {appView === 'reader' && selectedLetterId && (
        <LetterReader
          letterId={selectedLetterId}
          onExit={() => {
            setSelectedLetterId(null);
            // Clear URL query parameters cleanly
            const url = new URL(window.location.href);
            url.searchParams.delete('open');
            window.history.pushState({}, '', url.pathname);

            if (user) {
              setAppView('dashboard');
            } else {
              setAppView('landing');
            }
          }}
        />
      )}

      {/* 2. GENERAL CORE SHELL (Shown only if not in Full Screen Reader) */}
      {appView !== 'reader' && (
        <>
          {/* Main Top Navigation Header */}
          <header className="h-16 flex items-center justify-between px-6 md:px-8 border-b border-[#7A4E2D]/20 bg-[#F4E9D8] select-none sticky top-0 z-40">
            <div className="max-w-6xl w-full mx-auto flex justify-between items-center">
              <button
                id="logo-nav-link"
                onClick={() => setAppView(user ? 'dashboard' : 'landing')}
                className="hover:opacity-90 transition flex items-center gap-3.5 focus:outline-none"
              >
                <div className="w-9 h-9 bg-[#8B0000] rounded-full flex items-center justify-center text-[#D4AF37] font-serif font-extrabold text-xl shadow-md border border-[#D4AF37]/35">
                  L
                </div>
                <h1 className="text-xl md:text-2xl font-bold tracking-widest uppercase font-display text-[#2E1E12] leading-none">
                  TheLetters
                </h1>
              </button>

              <div className="flex items-center gap-4">
                {user ? (
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] uppercase tracking-tighter opacity-60">Session active</p>
                      <p className="text-xs font-bold font-serif italic text-[#7A4E2D]">{user.displayName}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-[#7A4E2D] p-0.5" title={user.displayName}>
                      <div className="w-full h-full rounded-full bg-[#7A4E2D]/20 flex items-center justify-center text-[10px] font-bold font-mono">
                        {user.displayName.substring(0, 2).toUpperCase()}
                      </div>
                    </div>
                    <button
                      id="nav-logout-btn"
                      onClick={handleLogout}
                      className="text-[10px] font-mono tracking-wider uppercase font-bold text-[#8B0000] hover:underline ml-1"
                    >
                      Exit Ledger
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      id="nav-signin-btn"
                      onClick={() => setAppView('auth')}
                      className="text-xs font-mono uppercase tracking-wider text-[#7A4E2D] hover:underline"
                    >
                      Entrance
                    </button>
                    <button
                      id="nav-editor-btn"
                      onClick={async () => {
                        // Quick launch guest state creator
                        const guest = await DB.enterGuestMode('Guest');
                        setUser(guest);
                        setAppView('editor');
                      }}
                      className="bg-[#7A4E2D] hover:bg-[#8B0000] text-white px-3.5 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-[0.15em] font-bold transition shadow-md"
                    >
                      Quick Create
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* PAGE ROUTER */}
          <main className="flex-1 flex flex-col justify-center py-6">

            {/* A. LANDING VIEW */}
            {appView === 'landing' && (
              <div id="landing-lobby" className="max-w-4xl mx-auto px-4 py-8 text-center space-y-12 select-none">

                {/* Hero branding */}
                <div className="space-y-4 max-w-2xl mx-auto">
                  <h1 className="font-serif text-5xl md:text-6xl font-bold tracking-tight text-[#2E1E12] leading-[1.1]">
                    Craft Memorable Keepsakes, Not Messages.
                  </h1>
                  
                </div>

                {/* Tactical Call to Actions */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
                  <button
                    id="hero-editor-launch"
                    onClick={async () => {
                      const guest = await DB.enterGuestMode('Guest');
                      setUser(guest);
                      setAppView('editor');
                    }}
                    className="w-full sm:w-auto bg-[#7A4E2D] hover:bg-[#5E3B21] text-[#F4E9D8] px-8 py-3.5 rounded-xl text-xs font-mono uppercase tracking-widest font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
                  >
                    <PenTool className="w-4 h-4" /> Open Designing Desk
                  </button>

                  <button
                    id="hero-auth-launch"
                    onClick={() => {
                      setAppView('auth');
                    }}
                    className="w-full sm:w-auto bg-[#EAD7B7] hover:bg-[#EAD7B7]/80 text-[#7A4E2D] px-8 py-3.5 rounded-xl text-xs font-mono uppercase tracking-widest font-bold flex items-center justify-center gap-2 shadow border-2 border-[#7A4E2D]/40 transition active:scale-95"
                  >
                    <Key className="w-4 h-4" /> Registered Login
                  </button>
                </div>

                
              </div>
            )}

            {/* B. AUTH ENTRY VIEW */}
            {appView === 'auth' && (
              <div className="flex justify-center items-center py-10 px-4">
                <AuthScreen
                  onAuthSuccess={(authedUser) => {
                    setUser(authedUser);
                    setAppView('dashboard');
                  }}
                  onClose={() => setAppView('landing')}
                />
              </div>
            )}

            {/* C. PATRON DASHBOARD CABINETS */}
            {appView === 'dashboard' && user && (
              <Dashboard
                user={user}
                onLogout={handleLogout}
                onComposeNew={() => {
                  setSelectedLetterId(null);
                  setAppView('editor');
                }}
                onEditLetter={(id) => {
                  setSelectedLetterId(id);
                  setAppView('editor');
                }}
                onOpenLetter={(id) => {
                  setSelectedLetterId(id);
                  setAppView('reader');
                }}
              />
            )}

            {/* D. STATIONER CREATOR DESTRUCT DESK */}
            {appView === 'editor' && user && (
              <div className="p-4 md:p-6 w-full max-w-7xl mx-auto">
                <LetterEditor
                  user={user}
                  editLetterId={selectedLetterId}
                  onSaved={() => {
                    setSelectedLetterId(null);
                    setAppView('dashboard');
                  }}
                  onCancel={() => {
                    setSelectedLetterId(null);
                    setAppView('dashboard');
                  }}
                />
              </div>
            )}

          </main>

          {/* Post Office Footer */}
          <footer className="py-6 border-t border-[#7A4E2D]/20 bg-[#EAD7B7]/25 text-center select-none text-[10px] font-mono tracking-widest uppercase text-[#7A4E2D]/80">
            THE LETTERS COMPANY • EST. 2026
          </footer>
        </>
      )}
    </div>
  );
}
