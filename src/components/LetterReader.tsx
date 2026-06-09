/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Letter, HandwritingStroke, StaticStamp } from '../types';
import { LETTER_THEMES, STAMPS_LIBRARY, FONTS_LIBRARY } from '../data';
import EffectsOverlay from './EffectsOverlay';
import { DB } from '../lib/db';
import {
  Heart, BookOpen, Trash, Watch,
  RefreshCw, RotateCcw, AlertTriangle, Disc, ArrowDown
} from 'lucide-react';

interface LetterReaderProps {
  letterId: string;
  onExit: () => void;
}

export default function LetterReader({ letterId, onExit }: LetterReaderProps) {
  const [loading, setLoading] = useState(true);
  const [letter, setLetter] = useState<Letter | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Opening animation stages
  // envelope: 'sealed' | 'seal_breaking' | 'seal_broken' | 'unfolding' | 'revealed'
  // scroll: 'cased' | 'lid_opening' | 'unrolling' | 'revealed'
  const [animationStage, setAnimationStage] = useState<string>('sealed');
  const [effectsPlaying, setEffectsPlaying] = useState(false);
  const [countdownString, setCountdownString] = useState('');
  const [isLockedByTimer, setIsLockedByTimer] = useState(false);
  const [hasSelfDestructed, setHasSelfDestructed] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);



  // Fetch the shared record on load
  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const item = await DB.getLetter(letterId);
        if (!item) {
          if (!DB.isOnline()) {
            setErrorMsg('The letter code you hold does not match any local registers. Because the app is running in Offline Sandbox Mode, letters are saved only inside your specific browser tab\'s local storage. They cannot be shared with friends or opened in secondary/incognito windows. To enable global sharing, please accept the terms in the Firebase Setup UI.');
          } else {
            setErrorMsg('The letter code you hold does not match any postal vaults.');
          }
          setLoading(false);
          return;
        }

        // Check if lock release timer holds
        const targetTime = new Date(item.deliveryTime).getTime();
        const now = Date.now();
        if (item.deliveryTimeType === 'delayed' && now < targetTime) {
          setIsLockedByTimer(true);
          setAnimationStage('locked');
          // Start countdown timer
          const timer = setInterval(() => {
            const distance = targetTime - Date.now();
            if (distance < 0) {
              clearInterval(timer);
              setIsLockedByTimer(false);
              setAnimationStage(item.deliveryFormat === 'envelope' ? 'sealed' : 'cased');
            } else {
              const hours = Math.floor(distance / (1000 * 60 * 60));
              const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((distance % (1000 * 60)) / 1000);
              setCountdownString(`${hours}h ${minutes}m ${seconds}s`);
            }
          }, 1000);

          setLetter(item);
          setLoading(false);
          return () => clearInterval(timer);
        }

        // Enforce self destruct conditions
        if (item.oneTimeView && item.viewCount > 0) {
          setHasSelfDestructed(true);
          setErrorMsg('This letter was sealed with self-destruct wax and dissolved after its first opening.');
          setLoading(false);
          return;
        }

        // Set initial stage
        setAnimationStage(item.deliveryFormat === 'envelope' ? 'sealed' : 'cased');
        setLetter(item);
        setIsFavorited(DB.isLetterFavorite(item.id));

        // Increment analytics view Count safely
        await DB.incrementViewCount(item.id);
      } catch (err) {
        setErrorMsg('Could not consult database registers.');
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [letterId]);



  // Self destruct deletion triggered on exit
  const handleExitReader = async () => {
    if (letter && letter.oneTimeView) {
      // Physically delete the letter to keep constraints
      await DB.deleteLetter(letter.id);
    }
    onExit();
  };

  // Triggers wax seal crack or unrolls scroll
  const handleActionOpen = () => {
    if (!letter) return;

    if (letter.deliveryFormat === 'envelope') {
      setAnimationStage('seal_breaking');
      setTimeout(() => {
        setAnimationStage('seal_broken');
        setTimeout(() => {
          setAnimationStage('unfolding');
          setTimeout(() => {
            setAnimationStage('revealed');
            setEffectsPlaying(true);
          }, 1200);
        }, 1000);
      }, 1100);
    } else {
      setAnimationStage('lid_opening');
      setTimeout(() => {
        setAnimationStage('unrolling');
        setTimeout(() => {
          setAnimationStage('revealed');
          setEffectsPlaying(true);
        }, 1500);
      }, 1200);
    }
  };

  const toggleFavorite = () => {
    if (!letter) return;
    DB.toggleFavoriteLetter(letter.id);
    setIsFavorited(!isFavorited);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#F4E9D8] flex flex-col items-center justify-center select-none z-50">
        <Disc className="w-10 h-10 text-[#7A4E2D] animate-spin mb-3" />
        <span className="text-xs font-mono tracking-widest text-[#7A4E2D] uppercase">Consulting Postal Registers...</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="fixed inset-0 bg-[#F4E9D8] flex flex-col items-center justify-center p-6 text-center select-none z-50">
        <AlertTriangle className="w-12 h-12 text-[#8B0000] mb-4" />
        <h3 className="font-serif text-xl font-bold text-[#2E1E12] mb-2">Vault Bypassed or Sealed</h3>
        <p className="text-sm text-[#7A4E2D] max-w-sm mb-6">{errorMsg}</p>
        <button
          id="exit-error-reader-btn"
          onClick={onExit}
          className="bg-[#7A4E2D] hover:bg-[#5E3B21] text-[#F4E9D8] py-2 px-6 rounded-xl text-xs font-mono uppercase tracking-widest transition shadow-md"
        >
          Return to Registry Office
        </button>
      </div>
    );
  }

  const activeTheme = LETTER_THEMES.find(t => t.id === letter?.themeId) || LETTER_THEMES[0];
  const paperSettings = letter?.paperSettings;
  const envelopeSettings = letter?.envelopeSettings;
  const scrollSettings = letter?.scrollSettings;

  return (
    <div
      id="immersive-reader-container"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden select-none transition-all duration-700"
      style={{ backgroundColor: activeTheme.background }}
    >

      {/* Sparks Particles Overlay */}
      {letter && (
        <EffectsOverlay
          active={effectsPlaying}
          settings={letter.effects}
          onComplete={() => setEffectsPlaying(false)}
        />
      )}

      {/* TOP EXIT & MUTE BAR (Kept extremely clean/ambient) */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-40">
        <button
          id="exit-reader-btn"
          onClick={handleExitReader}
          className="text-[10px] font-mono uppercase tracking-wider text-white bg-black/60 hover:bg-black/80 px-3.5 py-1.5 rounded-full transition shadow-md"
        >
          ← Return to Vaults
        </button>

        <div className="flex gap-2">
          {letter && (
            <button
              id="fav-letter-reader-btn"
              onClick={toggleFavorite}
              className={`p-2 rounded-full shadow-md transition-all ${isFavorited
                  ? 'bg-red-700 text-white hover:scale-105'
                  : 'bg-black/60 text-white hover:bg-black/80'
                }`}
              title={isFavorited ? 'Remove Favorite' : 'Mark Favorite Design'}
            >
              <Heart className="w-4 h-4 fill-current" />
            </button>
          )}
        </div>
      </div>

      {/* LOCKED BY DELAY COUNTDOWN SCREEN */}
      {animationStage === 'locked' && (
        <div className="flex flex-col items-center justify-center text-center max-w-sm animate-fade-in p-6 bg-white/10 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-md">
          <Watch className="w-14 h-14 text-white hover:animate-bounce mb-4" />
          <h2 className="font-serif text-2xl font-bold tracking-tight text-white mb-2">Sealed with Lock Timer</h2>
          <p className="text-xs text-white/80 font-mono tracking-widest uppercase mb-6 leading-relaxed">
            The author requested delayed delivery. The celestial vault has locked this manuscript till:
          </p>
          <div className="font-mono text-3xl font-extrabold text-[#D4AF37] px-6 py-3 bg-black/40 rounded-xl mb-4 border border-[#D4AF37]/35">
            {countdownString || 'Resolving Orbit...'}
          </div>
          <span className="text-[10px] text-white/50 font-mono italic">Please let the sands drift...</span>
        </div>
      )}

      {/* OPENING ANIMATION PHASES */}
      {letter && animationStage !== 'locked' && (
        <div className="relative min-h-[440px] w-full max-w-[500px] flex items-center justify-center">

          {/* 1. SEAFARING ENVELOPE OPENING CHAIN */}
          {letter.deliveryFormat === 'envelope' && animationStage !== 'revealed' && (
            <div
              id="reader-envelope-stage"
              className={`w-full aspect-[1.6/1] bg-white rounded-2xl shadow-2xl relative flex flex-col justify-between p-6 border-4 overflow-hidden transition-all duration-700 select-none ${animationStage === 'sealed' ? 'hover:scale-[1.01] cursor-pointer' : ''
                } ${animationStage === 'seal_breaking' ? 'scale-105 animate-pulse' : ''
                } ${animationStage === 'unfolding' ? 'scale-110 opacity-40 translate-y-[-100px] blur-sm' : ''
                }`}
              style={{
                backgroundColor: envelopeSettings?.color,
                borderColor: envelopeSettings?.borderColor,
                borderStyle: envelopeSettings?.borderStyle === 'vintage' ? 'double' : envelopeSettings?.borderStyle
              }}
              onClick={animationStage === 'sealed' ? handleActionOpen : undefined}
            >
              {/* Crossed lines cover pattern */}
              <div className="absolute inset-x-0 bottom-0 top-1/2 bg-black/5 flex" />

              {/* Ribbon markings */}
              {envelopeSettings?.ribbonStyle !== 'none' && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  {envelopeSettings.ribbonStyle === 'simple' && (
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-6 bg-[#D4AF37] border-y border-black/15 shadow" />
                  )}
                  {envelopeSettings.ribbonStyle === 'crossed' && (
                    <>
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-6 bg-[#D4AF37] border-y border-black/15 shadow opacity-90" />
                      <div className="absolute top-0 bottom-0 left-1/3 w-6 bg-[#D4AF37] border-x border-black/15 shadow opacity-90" />
                    </>
                  )}
                  {envelopeSettings.ribbonStyle === 'royal' && (
                    <>
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-8 bg-[#8B0000] border-y-2 border-[#D4AF37] shadow opacity-95" />
                      <div className="absolute top-0 bottom-0 left-1/4 w-8 bg-[#8B0000] border-x-2 border-[#D4AF37] shadow opacity-95" />
                    </>
                  )}
                </div>
              )}

              {/* Imprinted text - Absolutely positioned corresponding to coordinates */}
              <div
                className="p-3 bg-[#EAD7B7]/95 border-2 border-[#7A4E2D] rounded-lg shadow-md max-w-[200px] absolute pointer-events-none"
                style={{
                  left: `${envelopeSettings?.addressX !== undefined ? envelopeSettings.addressX : 30}%`,
                  top: `${envelopeSettings?.addressY !== undefined ? envelopeSettings.addressY : 40}%`,
                  transform: `translate(-50%, -50%) scale(${envelopeSettings?.addressScale !== undefined ? envelopeSettings.addressScale : 1.0}) rotate(${envelopeSettings?.addressRotation !== undefined ? envelopeSettings.addressRotation : 0}deg)`,
                  zIndex: 15
                }}
              >
                <span className="text-[8px] font-mono block opacity-60 uppercase">DELIVERED TO:</span>
                <p className="font-serif text-xs font-bold leading-tight line-clamp-2 text-[#2E1E12]">{envelopeSettings?.addressLabel || 'Recipient'}</p>
              </div>

              {/* Stamps overlay - Absolutely positioned corresponding to coordinates */}
              {envelopeSettings?.stamps.map((stamp) => {
                const staticStamp = STAMPS_LIBRARY.find(s => s.id === stamp.designId);
                return (
                  <div
                    key={stamp.id}
                    className="p-1.5 bg-white border border-dashed border-[#a67c52] rounded shadow-md select-none absolute"
                    style={{
                      left: `${stamp.x !== undefined ? stamp.x : 70}%`,
                      top: `${stamp.y !== undefined ? stamp.y : 20}%`,
                      transform: `translate(-50%, -50%) rotate(${stamp.rotation || 0}deg) scale(${stamp.scale || 1})`,
                      zIndex: 20
                    }}
                  >
                    <span className="text-xl leading-none">{staticStamp?.icon || '✉️'}</span>
                    <span className="text-[7px] font-mono text-[#7A4E2D] block mt-0.5 leading-none text-center">{staticStamp?.price || '2d'}</span>
                  </div>
                );
              })}

              {/* INTERACTIVE CENTRAL WAX SEAL */}
              {envelopeSettings?.waxSealDesign !== 'hidden' && (
                <div
                  className="absolute z-30 flex flex-col items-center gap-1.5"
                  style={{
                    left: `${envelopeSettings?.sealX !== undefined ? envelopeSettings.sealX : 75}%`,
                    top: `${envelopeSettings?.sealY !== undefined ? envelopeSettings.sealY : 75}%`,
                    transform: `translate(-50%, -50%) rotate(${envelopeSettings?.sealRotation || 0}deg) scale(${envelopeSettings?.sealScale || 1.1})`,
                  }}
                >
                  <div
                    id="reader-wax-seal"
                    onClick={animationStage === 'sealed' ? handleActionOpen : undefined}
                    className={`w-18 h-18 rounded-full flex items-center justify-center text-2xl wax-seal-depth shadow-2xl relative border-2 border-black/10 select-none cursor-pointer hover:scale-105 active:scale-95 transition ${animationStage === 'seal_breaking' ? 'animate-bounce' : ''
                      }`}
                    style={{ backgroundColor: envelopeSettings?.waxSealColor || '#8B0000' }}
                  >
                    <span className="brightness-90 filter drop-shadow select-none">
                      {envelopeSettings?.waxSealDesign === 'crown' && '👑'}
                      {envelopeSettings?.waxSealDesign === 'rose' && '🌹'}
                      {envelopeSettings?.waxSealDesign === 'heart' && '❤️'}
                      {envelopeSettings?.waxSealDesign === 'initials' && '⚜️'}
                      {envelopeSettings?.waxSealDesign === 'moon' && '🌙'}
                      {envelopeSettings?.waxSealDesign === 'tree' && '🌲'}
                      {envelopeSettings?.waxSealDesign === 'compass' && '🧭'}
                      {envelopeSettings?.waxSealDesign === 'custom' && (envelopeSettings?.customInsigniaEmoji || '✨')}
                      {envelopeSettings?.waxSealDesign === 'none' && ''}
                    </span>

                    {/* Wax splits broken animation visual segments */}
                    {animationStage === 'seal_breaking' && (
                      <div className="absolute inset-0 bg-[#8B0000]/10 border-2 border-[#8B0000] rounded-full animate-ping pointer-events-none" />
                    )}
                    {animationStage === 'seal_broken' && (
                      <>
                        <div className="absolute top-0 bottom-0 left-[49%] w-0.5 bg-black/60 shadow transform rotate-[30deg]" />
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-black/60 shadow" />
                      </>
                    )}
                  </div>
                  {animationStage === 'sealed' && (
                    <span className="text-[9px] font-mono text-white max-w-max select-none text-center uppercase tracking-widest bg-[#7A4E2D] px-2 py-0.5 rounded shadow whitespace-nowrap">
                      Break Seal to Open
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. CHRONICLE CALLIGRAPHY SCROLL OPENING CHAIN */}
          {letter.deliveryFormat === 'scroll' && animationStage !== 'revealed' && (
            <div
              id="reader-scroll-stage"
              onClick={animationStage === 'cased' ? handleActionOpen : undefined}
              className={`flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-700 ${animationStage === 'cased' ? 'hover:scale-[1.02]' : ''
                } ${animationStage === 'unrolling' ? 'opacity-30 blur scale-110' : ''
                }`}
            >
              {/* Outer cylinder presentation box with wooden/metallic styling and custom outer color */}
              <div
                className={`w-72 h-14 rounded-full relative flex items-center justify-center shadow-2xl overflow-hidden border-4 ${scrollSettings?.outerCoverType === 'metal' ? 'border-zinc-300' : 'border-[#2e1e12]'
                  }`}
                style={{
                  backgroundColor: scrollSettings?.scrollOuterColor || (scrollSettings?.material === 'gold' ? '#D4AF37' : scrollSettings?.material === 'silver' ? '#C0C0C0' : scrollSettings?.material === 'marble' ? '#FAF6F0' : '#8B6B4A')
                }}
              >
                {/* Visual gradients for realistic wood vs metal textures */}
                {scrollSettings?.outerCoverType === 'metal' ? (
                  <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-black/30 pointer-events-none" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-white/5 to-black/20 pointer-events-none" />
                )}

                {/* Ancient engravings lining */}
                <div className="absolute inset-y-1.5 inset-x-6 border-y border-[#FAF3E8]/30 font-serif text-[10px] flex justify-between px-3 items-center text-[#FAF3E8] z-10">
                  <span>✨</span>
                  <span className="uppercase tracking-widest text-[9px] font-bold">
                    {scrollSettings?.outerCoverType === 'metal' ? '⚙️ METAL' : '🌲 WOODEN'} VAULT SCROLL
                  </span>
                  <span>✨</span>
                </div>
                {/* Outer lid cap */}
                <div
                  className={`absolute right-0 top-[-4px] bottom-[-4px] w-8 rounded-r-full border-y-4 border-r-4 transition-all duration-1000 ${scrollSettings?.outerCoverType === 'metal' ? 'border-zinc-300' : 'border-[#2e1e12]'
                    } ${animationStage === 'lid_opening' ? 'translate-x-12 opacity-0' : ''
                    }`}
                  style={{
                    backgroundColor: scrollSettings?.scrollOuterColor ? `${scrollSettings.scrollOuterColor}dd` : '#D4AF37'
                  }}
                />
              </div>

              {animationStage === 'cased' && (
                <span className="text-[10px] font-mono text-white bg-black/60 px-4 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                  <ArrowDown className="w-3.5 h-3.5" /> Pull cap to unroll scroll
                </span>
              )}
            </div>
          )}

          {/* 3. REVEALED READ WINDOW (FULL SCREEN ELEGANT STATIONERY OVERLAY) */}
          {animationStage === 'revealed' && (
            <div
              id="reader-revealed-stationery"
              className="w-full max-w-[420px] aspect-[1.4/1] bg-white rounded-xl shadow-2xl relative flex flex-col justify-between p-6 border-4 overflow-hidden select-none transition-all duration-300 animate-scroll-unroll"
              style={{
                backgroundColor: paperSettings?.color || '#FAF3E8',
                borderColor: paperSettings?.borderColor,
                borderWidth: `${paperSettings?.borderThickness || 2}px`,
                borderStyle: paperSettings?.cornerDecoration === 'none' ? 'solid' : 'double',
                opacity: 0.98,
                boxShadow: `0 15px 35px rgba(0,0,0, ${(paperSettings?.shadow || 40) / 100 * 0.3})`
              }}
            >
              {/* Paper Type Texture Overlay effects */}
              {paperSettings?.paperType === 'parchment' && (
                <div className="absolute inset-0 pointer-events-none mix-blend-multiply transition-all duration-200" style={{
                  backgroundImage: `url('https://www.transparenttextures.com/patterns/aged-paper.png')`,
                  opacity: (paperSettings?.textureIntensity !== undefined ? paperSettings.textureIntensity : 75) / 100 * 0.55
                }} />
              )}
              {paperSettings?.paperType === 'lined' && (
                <div className="absolute inset-0 pointer-events-none transition-all duration-200" style={{
                  backgroundImage: 'linear-gradient(#7A4E2D 1px, transparent 1px)',
                  backgroundSize: '100% 24px',
                  marginTop: '32px',
                  opacity: (paperSettings?.textureIntensity !== undefined ? paperSettings.textureIntensity : 75) / 100 * 0.45
                }} />
              )}
              {paperSettings?.paperType === 'dotted' && (
                <div className="absolute inset-0 pointer-events-none transition-all duration-200" style={{
                  backgroundImage: 'radial-gradient(#7A4E2D 1.5px, transparent 1.5px)',
                  backgroundSize: '24px 24px',
                  opacity: (paperSettings?.textureIntensity !== undefined ? paperSettings.textureIntensity : 75) / 100 * 0.35
                }} />
              )}
              {paperSettings?.paperType === 'grid' && (
                <div className="absolute inset-0 pointer-events-none transition-all duration-200" style={{
                  backgroundImage: 'linear-gradient(to right, #7A4E2D 1px, transparent 1px), linear-gradient(to bottom, #7A4E2D 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  opacity: (paperSettings?.textureIntensity !== undefined ? paperSettings.textureIntensity : 75) / 100 * 0.25
                }} />
              )}
              {paperSettings?.paperType === 'tea' && (
                <>
                  <div className="absolute inset-0 pointer-events-none transition-all duration-200" style={{
                    backgroundImage: `
                      radial-gradient(circle at 20% 25%, rgba(139, 90, 43, 0.25) 0%, transparent 45%),
                      radial-gradient(circle at 85% 75%, rgba(120, 80, 40, 0.20) 0%, transparent 40%),
                      radial-gradient(circle at 50% 50%, rgba(139, 90, 43, 0.14) 0%, transparent 60%)
                    `,
                    mixBlendMode: 'multiply',
                    opacity: (paperSettings?.textureIntensity !== undefined ? paperSettings.textureIntensity : 75) / 100
                  }} />
                  <div className="absolute inset-0 pointer-events-none mix-blend-multiply transition-all duration-200" style={{
                    backgroundImage: `url('https://www.transparenttextures.com/patterns/rough-paper.png')`,
                    opacity: (paperSettings?.textureIntensity !== undefined ? paperSettings.textureIntensity : 75) / 100 * 0.5
                  }} />
                </>
              )}
              {paperSettings?.paperType === 'coffee' && (
                <>
                  <div className="absolute inset-0 pointer-events-none transition-all duration-200" style={{
                    backgroundImage: `
                      radial-gradient(circle at 75% 20%, rgba(78, 54, 41, 0.3) 0%, transparent 35%),
                      radial-gradient(circle at 15% 80%, rgba(92, 64, 47, 0.25) 0%, transparent 45%),
                      radial-gradient(circle at 45% 45%, transparent 34%, rgba(78, 54, 41, 0.18) 36%, transparent 42%),
                      radial-gradient(circle at 60% 55%, rgba(60, 40, 25, 0.15) 0%, transparent 50%)
                    `,
                    mixBlendMode: 'multiply',
                    opacity: (paperSettings?.textureIntensity !== undefined ? paperSettings.textureIntensity : 75) / 100
                  }} />
                  <div className="absolute inset-0 pointer-events-none mix-blend-multiply transition-all duration-200" style={{
                    backgroundImage: `url('https://www.transparenttextures.com/patterns/cardboard-flat.png')`,
                    opacity: (paperSettings?.textureIntensity !== undefined ? paperSettings.textureIntensity : 75) / 100 * 0.55
                  }} />
                </>
              )}
              {paperSettings?.paperType === 'washi' && (
                <>
                  <div className="absolute inset-0 pointer-events-none mix-blend-multiply transition-all duration-200" style={{
                    backgroundImage: `url('https://www.transparenttextures.com/patterns/natural-paper.png')`,
                    opacity: (paperSettings?.textureIntensity !== undefined ? paperSettings.textureIntensity : 75) / 100 * 0.7
                  }} />
                  <div className="absolute inset-0 pointer-events-none opacity-20 transition-all duration-200" style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(212,175,55,0.06) 0px, rgba(212,175,55,0.06) 2px, transparent 2px, transparent 15px)',
                    opacity: (paperSettings?.textureIntensity !== undefined ? paperSettings.textureIntensity : 75) / 100
                  }} />
                </>
              )}
              {paperSettings?.paperType === 'handmade' && (
                <div className="absolute inset-0 pointer-events-none mix-blend-multiply transition-all duration-200" style={{
                  backgroundImage: `url('https://www.transparenttextures.com/patterns/canvas-paper.png')`,
                  opacity: (paperSettings?.textureIntensity !== undefined ? paperSettings.textureIntensity : 75) / 100 * 0.75
                }} />
              )}
              {paperSettings?.paperType === 'plain' && (
                <div className="absolute inset-0 pointer-events-none mix-blend-multiply transition-all duration-200" style={{
                  backgroundImage: `url('https://www.transparenttextures.com/patterns/beige-paper.png')`,
                  opacity: (paperSettings?.textureIntensity !== undefined ? paperSettings.textureIntensity : 75) / 100 * 0.15
                }} />
              )}

              {/* Inset Browning Edge Overlay */}
              {paperSettings?.agingEffect !== undefined && paperSettings.agingEffect > 0 && (
                <div
                  className="absolute inset-0 pointer-events-none rounded-2xl transition-all duration-200"
                  style={{
                    boxShadow: `inset 0 0 ${paperSettings.agingEffect * 0.65}px rgba(110, 65, 30, ${paperSettings.agingEffect / 100 * 0.9})`,
                    mixBlendMode: 'multiply',
                    zIndex: 10
                  }}
                />
              )}

              {/* Embedded Paper creases markings */}
              {paperSettings?.creases && (
                <>
                  <div className="absolute inset-x-0 top-1/3 h-[1px] fold-horizontal pointer-events-none" />
                  <div className="absolute inset-x-0 top-2/3 h-[1px] fold-horizontal pointer-events-none" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] fold-vertical pointer-events-none" />
                </>
              )}

              {/* Edge decorative custom engraving */}
              {paperSettings?.cornerDecoration === 'floral' && (
                <div className="absolute inset-2 border-2 border-dashed border-[#8B0000]/15 rounded-lg pointer-events-none" />
              )}
              {paperSettings?.cornerDecoration === 'royal' && (
                <div className="absolute inset-3 border-4 border-double border-[#D4AF37]/40 pointer-events-none" />
              )}

              <div className="absolute inset-6 flex flex-col justify-between pointer-events-none">
                {/* Header registry card designed to exactly fit spacing */}
                <span className="text-[8px] font-mono opacity-50 block tracking-widest uppercase border-b border-[#7A4E2D]/15 pb-1 mb-2 select-none text-center">
                  From: {letter.senderType === 'anonymous' ? 'A Friend' : letter.senderName} • {new Date(letter.createdAt).toLocaleDateString()}
                </span>

                {/* Content Panel */}
                <div className="flex-1 relative overflow-hidden">
                  {/* 1. TYPED CALLIGRAPHY LAYER */}
                  {letter.typedContent && (
                    <p
                      id="reader-typed-body"
                      className="absolute inset-x-0 break-words whitespace-pre-wrap select-none tracking-normal pointer-events-auto"
                      style={{
                        fontFamily: letter.fontName ? (FONTS_LIBRARY.find(f => f.name === letter.fontName)?.fontClass || letter.fontName) : (FONTS_LIBRARY.find(f => f.name === letter.themeId)?.fontClass || 'inherit'),
                        color: letter.textColor || activeTheme.text,
                        fontSize: `${Math.max(10, (letter.fontSize || 18) * 0.72)}px`,
                        fontWeight: letter.bold ? 'bold' : 'normal',
                        fontStyle: letter.italic ? 'italic' : 'normal',
                        textAlign: letter.align || 'left',
                        transform: `translate(${letter.typedPositionX || 0}px, ${letter.typedPositionY || 0}px) rotate(${letter.typedRotation || 0}deg)`,
                        transformOrigin: 'center center',
                        width: '100%',
                      }}
                    >
                      {letter.typedContent}
                    </p>
                  )}

                  {/* 2. HANDWRITING STROKES LAYER (Vector graphic SVG scaled and positioned perfectly) */}
                  {letter.handwritingStrokes && letter.handwritingStrokes.length > 0 && (
                    <svg
                      id="reader-handwriting-svg"
                      viewBox="0 0 800 570"
                      className="absolute inset-x-0 top-0 w-full h-full pointer-events-none pointer-events-auto"
                      style={{
                        transform: `translate(${letter.handwritingPositionX || 0}px, ${letter.handwritingPositionY || 0}px) scale(${letter.handwritingScale || 1.0})`,
                        transformOrigin: 'center center',
                      }}
                    >
                      <defs>
                        <mask id="eraser-mask-reader">
                          <rect x="0" y="0" width="800" height="570" fill="white" />
                          {letter.handwritingStrokes.filter(s => s.isEraser).map((stroke, index) => {
                            if (!stroke.points || stroke.points.length === 0) return null;
                            const pathData = `M ${stroke.points[0].x} ${stroke.points[0].y} ` +
                              stroke.points.slice(1).map((p: any) => `L ${p.x} ${p.y}`).join(' ');
                            return (
                              <path
                                key={`eraser-${index}`}
                                d={pathData}
                                fill="none"
                                stroke="black"
                                strokeWidth={stroke.thickness}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            );
                          })}
                        </mask>
                      </defs>
                      <g mask="url(#eraser-mask-reader)">
                        {letter.handwritingStrokes.filter(s => !s.isEraser).map((stroke, index) => {
                          if (!stroke.points || stroke.points.length === 0) return null;
                          const pathData = `M ${stroke.points[0].x} ${stroke.points[0].y} ` +
                            stroke.points.slice(1).map((p: any) => `L ${p.x} ${p.y}`).join(' ');
                          return (
                            <path
                              key={index}
                              d={pathData}
                              fill="none"
                              stroke={stroke.color}
                              strokeWidth={stroke.thickness}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          );
                        })}
                      </g>
                    </svg>
                  )}
                </div>

                {/* Self-destruct ticking badge indicator */}
                {letter.oneTimeView && (
                  <div className="pt-1.5 border-t border-black/10 text-center flex items-center justify-center gap-1 select-none">
                    <span className="w-1.5 h-1.5 bg-red-700 rounded-full animate-ping" />
                    <span className="text-[7px] font-mono text-red-800 uppercase tracking-wider font-bold">
                      [Dissolving Draft (Will vanish upon leaving)]
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
