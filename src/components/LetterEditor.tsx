/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Letter, PaperSettings, EnvelopeSettings, ScrollSettings, VisualEffectsSettings, PlacedStamp, StaticStamp, SenderType } from '../types';
import { LETTER_THEMES, STAMPS_LIBRARY, FONTS_LIBRARY } from '../data';
import HandwritingCanvas from './HandwritingCanvas';
import EffectsOverlay from './EffectsOverlay';
import { DB, LocalUser } from '../lib/db';
import { 
  FileText, Mail, Scroll, Sliders, Type, Edit2, Sparkles, Music, 
  Clock, Share2, Check, ArrowRight, Play, Eye, RotateCcw, 
  Plus, Trash2, Heart, Award, HelpCircle
} from 'lucide-react';

interface LetterEditorProps {
  user: LocalUser;
  onSaved: () => void;
  onCancel: () => void;
  editLetterId?: string | null;
}

const DEFAULT_PAPER: PaperSettings = {
  paperType: 'parchment',
  color: '#EAD7B7',
  textureIntensity: 75,
  borderColor: '#7A4E2D',
  borderThickness: 2,
  cornerDecoration: 'vintage',
  opacity: 100,
  shadow: 40,
  agingEffect: 50,
  foldMarks: true,
  creases: true
};

const DEFAULT_ENVELOPE: EnvelopeSettings = {
  envelopeStyle: 'vintage',
  color: '#7A4E2D',
  borderColor: '#A67C52',
  borderStyle: 'vintage',
  texture: 'felt',
  addressLabel: 'To Anna',
  decorativeCorners: true,
  patternOverlay: 'vintage',
  ribbonStyle: 'crossed',
  waxSealColor: '#8B0000',
  waxSealDesign: 'heart',
  stamps: []
};

const DEFAULT_SCROLL: ScrollSettings = {
  material: 'walnut',
  engraving: 'royal',
  paperColor: '#F7E7C6',
  paperTexture: 'ancient',
  scrollWidth: 80,
  aging: 40,
  decorativeEdges: true
};

const DEFAULT_EFFECTS: VisualEffectsSettings = {
  effectType: 'rose_petals',
  intensity: 3,
  duration: 5,
  density: 40
};

export default function LetterEditor({ user, onSaved, onCancel, editLetterId }: LetterEditorProps) {
  const [activeTab, setActiveTab] = useState<'themes' | 'format' | 'paper' | 'writing' | 'envelope' | 'waxseal' | 'effects' | 'delivery'>('themes');
  const [editorMode, setEditorMode] = useState<'typed' | 'handwritten'>('typed');
  
  // Custom states
  const [title, setTitle] = useState('Message');
  const [themeId, setThemeId] = useState('natural_tones');
  const [paper, setPaper] = useState<PaperSettings>(DEFAULT_PAPER);
  const [envelope, setEnvelope] = useState<EnvelopeSettings>(DEFAULT_ENVELOPE);
  const [interactionState, setInteractionState] = useState<{
    type: string;
  } | null>(null);

  const sealX = envelope.sealX !== undefined ? envelope.sealX : 75;
  const sealY = envelope.sealY !== undefined ? envelope.sealY : 75;
  const sealScale = envelope.sealScale !== undefined ? envelope.sealScale : 1.0;
  const sealRotation = envelope.sealRotation !== undefined ? envelope.sealRotation : 0;
  const [scroll, setScroll] = useState<ScrollSettings>(DEFAULT_SCROLL);
  const [deliveryFormat, setDeliveryFormat] = useState<'envelope' | 'scroll'>('envelope');
  const [effects, setEffects] = useState<VisualEffectsSettings>(DEFAULT_EFFECTS);
  const [effectsPreviewActive, setEffectsPreviewActive] = useState(false);

  // Identity Settings
  const [senderName, setSenderName] = useState(user.displayName);
  const [senderType, setSenderType] = useState<SenderType>('nickname');

  // Typed Text Editor States
  const [typedContent, setTypedContent] = useState('');
  const [selectedFont, setSelectedFont] = useState(FONTS_LIBRARY[0]); 
  const [fontSize, setFontSize] = useState(18);
  const [italic, setItalic] = useState(false);
  const [bold, setBold] = useState(false);
  const [textColor, setTextColor] = useState('#2E1E12');
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('left');
  
  // Sizing & Positioning States
  const [typedPositionX, setTypedPositionX] = useState(0);
  const [typedPositionY, setTypedPositionY] = useState(0);
  const [handwritingScale, setHandwritingScale] = useState(1.0);
  const [handwritingPositionX, setHandwritingPositionX] = useState(0);
  const [handwritingPositionY, setHandwritingPositionY] = useState(0);
  
  // Handwriting Strokes
  const [strokes, setStrokes] = useState<any[]>([]);
  const [currentInkColor, setCurrentInkColor] = useState('#2E1E12');
  const [currentPenThickness, setCurrentPenThickness] = useState(3);

  // Drag and Drop stamps states
  const [stampCategory, setStampCategory] = useState<'historical' | 'nature' | 'romance' | 'fantasy' | 'travel' | 'seasonal'>('historical');
  const [selectedStampForPlacing, setSelectedStampForPlacing] = useState<StaticStamp>(STAMPS_LIBRARY[0]);
  const [activeStampIndex, setActiveStampIndex] = useState<number | null>(null);

  // Delivery configuration states
  const [deliveryType, setDeliveryType] = useState<'immediate' | 'delayed'>('immediate');
  const [delayValue, setDelayValue] = useState<'1h' | '3h' | '6h' | '12h' | '24h' | 'custom'>('1h');
  const [customUnlockTime, setCustomUnlockTime] = useState('');
  const [oneTimeView, setOneTimeView] = useState(false);

  // Sharing states
  const [shareableLink, setShareableLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const envelopeAreaRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<any>(null);
  const [typedRotation, setTypedRotation] = useState(0);

  // Load existing letter if editing
  useEffect(() => {
    if (editLetterId) {
      const load = async () => {
        const doc = await DB.getLetter(editLetterId);
        if (doc) {
          setTitle(doc.title);
          setThemeId(doc.themeId);
          setPaper(doc.paperSettings);
          setEnvelope(doc.envelopeSettings);
          setScroll(doc.scrollSettings);
          setDeliveryFormat(doc.deliveryFormat);
          setEffects(doc.effects);
          setSenderName(doc.senderName);
          setSenderType(doc.senderType);
          setTypedContent(doc.typedContent);
          setStrokes(doc.handwritingStrokes || []);
          setTypedPositionX(doc.typedPositionX || 0);
          setTypedPositionY(doc.typedPositionY || 0);
          setTypedRotation(doc.typedRotation || 0);
          setHandwritingScale(doc.handwritingScale || 1.0);
          setHandwritingPositionX(doc.handwritingPositionX || 0);
          setHandwritingPositionY(doc.handwritingPositionY || 0);
          if (doc.fontName) {
            const font = FONTS_LIBRARY.find(f => f.name === doc.fontName);
            if (font) setSelectedFont(font);
          }
          if (doc.fontSize) setFontSize(doc.fontSize);
          if (doc.textColor) setTextColor(doc.textColor);
          if (doc.italic !== undefined) setItalic(doc.italic);
          if (doc.bold !== undefined) setBold(doc.bold);
          if (doc.align) setAlign(doc.align);
          setOneTimeView(doc.oneTimeView || false);
          setDeliveryType(doc.deliveryTimeType);
        }
      };
      load();
    }
  }, [editLetterId]);

  const updateStampProp = (index: number, prop: 'scale' | 'rotation' | 'x' | 'y', value: number) => {
    setEnvelope(prev => {
      const copy = [...prev.stamps];
      copy[index] = { ...copy[index], [prop]: value };
      return { ...prev, stamps: copy };
    });
  };

  const removeStamp = (index: number) => {
    setEnvelope(prev => ({
      ...prev,
      stamps: prev.stamps.filter((_, idx) => idx !== index)
    }));
    setActiveStampIndex(null);
  };

  // Mouse and Touch listeners for Wax Seal, Address, and Stamps interactive layout manipulation
  useEffect(() => {
    if (!interactionState) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const isTouch = 'touches' in e;
      if (isTouch) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
      const clientX = isTouch ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = isTouch ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

      const rect = envelopeAreaRef.current?.getBoundingClientRect();
      if (!rect) return;

      // 1. ORIGINAL WAX SEAL ENGINE
      if (interactionState.type === 'dragging') {
        const computedXPercent = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
        const computedYPercent = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
        setEnvelope(prev => ({
          ...prev,
          sealX: parseFloat(computedXPercent.toFixed(1)),
          sealY: parseFloat(computedYPercent.toFixed(1))
        }));
      } else if (interactionState.type === 'resizing') {
        const centerX = rect.left + (sealX / 100) * rect.width;
        const centerY = rect.top + (sealY / 100) * rect.height;

        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const currentDist = Math.sqrt(dx * dx + dy * dy);

        const computedScale = Math.min(2.5, Math.max(0.4, currentDist / 35));
        setEnvelope(prev => ({
          ...prev,
          sealScale: parseFloat(computedScale.toFixed(2))
        }));
      } else if (interactionState.type === 'rotating') {
        const centerX = rect.left + (sealX / 100) * rect.width;
        const centerY = rect.top + (sealY / 100) * rect.height;

        const dx = clientX - centerX;
        const dy = clientY - centerY;

        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        angle = (angle + 90) % 360;
        if (angle < 0) angle += 360;

        setEnvelope(prev => ({
          ...prev,
          sealRotation: Math.round(angle)
        }));
      }

      // 2. RETRO ADDRESS LABEL LAYOUT ENGINE
      else if (interactionState.type === 'dragging-address') {
        const computedXPercent = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
        const computedYPercent = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
        setEnvelope(prev => ({
          ...prev,
          addressX: parseFloat(computedXPercent.toFixed(1)),
          addressY: parseFloat(computedYPercent.toFixed(1))
        }));
      } else if (interactionState.type === 'resizing-address') {
        const addrX = envelope.addressX !== undefined ? envelope.addressX : 30;
        const addrY = envelope.addressY !== undefined ? envelope.addressY : 40;
        const centerX = rect.left + (addrX / 100) * rect.width;
        const centerY = rect.top + (addrY / 100) * rect.height;

        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const currentDist = Math.sqrt(dx * dx + dy * dy);

        const computedScale = Math.min(3.0, Math.max(0.4, currentDist / 80));
        setEnvelope(prev => ({
          ...prev,
          addressScale: parseFloat(computedScale.toFixed(2))
        }));
      } else if (interactionState.type === 'rotating-address') {
        const addrX = envelope.addressX !== undefined ? envelope.addressX : 30;
        const addrY = envelope.addressY !== undefined ? envelope.addressY : 40;
        const centerX = rect.left + (addrX / 100) * rect.width;
        const centerY = rect.top + (addrY / 100) * rect.height;

        const dx = clientX - centerX;
        const dy = clientY - centerY;

        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        angle = (angle + 90) % 360;
        if (angle < 0) angle += 360;

        setEnvelope(prev => ({
          ...prev,
          addressRotation: Math.round(angle)
        }));
      }

      // 3. ENVELOPE STAMPS LAYOUT ENGINE
      else if (interactionState.type.startsWith('dragging-stamp-')) {
        const stampIdx = parseInt(interactionState.type.replace('dragging-stamp-', ''));
        if (!isNaN(stampIdx) && envelope.stamps[stampIdx]) {
          const computedXPercent = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
          const computedYPercent = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
          updateStampProp(stampIdx, 'x', parseFloat(computedXPercent.toFixed(1)));
          updateStampProp(stampIdx, 'y', parseFloat(computedYPercent.toFixed(1)));
        }
      } else if (interactionState.type.startsWith('resizing-stamp-')) {
        const stampIdx = parseInt(interactionState.type.replace('resizing-stamp-', ''));
        if (!isNaN(stampIdx) && envelope.stamps[stampIdx]) {
          const stamp = envelope.stamps[stampIdx];
          const stampX = stamp.x !== undefined ? stamp.x : 70;
          const stampY = stamp.y !== undefined ? stamp.y : 20;
          const centerX = rect.left + (stampX / 100) * rect.width;
          const centerY = rect.top + (stampY / 100) * rect.height;

          const dx = clientX - centerX;
          const dy = clientY - centerY;
          const currentDist = Math.sqrt(dx * dx + dy * dy);

          const computedScale = Math.min(3.0, Math.max(0.4, currentDist / 35));
          updateStampProp(stampIdx, 'scale', parseFloat(computedScale.toFixed(2)));
        }
      } else if (interactionState.type.startsWith('rotating-stamp-')) {
        const stampIdx = parseInt(interactionState.type.replace('rotating-stamp-', ''));
        if (!isNaN(stampIdx) && envelope.stamps[stampIdx]) {
          const stamp = envelope.stamps[stampIdx];
          const stampX = stamp.x !== undefined ? stamp.x : 70;
          const stampY = stamp.y !== undefined ? stamp.y : 20;
          const centerX = rect.left + (stampX / 100) * rect.width;
          const centerY = rect.top + (stampY / 100) * rect.height;

          const dx = clientX - centerX;
          const dy = clientY - centerY;

          let angle = Math.atan2(dy, dx) * (180 / Math.PI);
          angle = (angle + 90) % 360;
          if (angle < 0) angle += 360;

          updateStampProp(stampIdx, 'rotation', Math.round(angle));
        }
      }

      // 4. TYPED CALLIGRAPHY TEXT ENGINE
      else if (interactionState.type === 'dragging-typed-text') {
        if (dragStartRef.current) {
          const dx = clientX - dragStartRef.current.startX;
          const dy = clientY - dragStartRef.current.startY;
          setTypedPositionX(dragStartRef.current.initialX + dx);
          setTypedPositionY(dragStartRef.current.initialY + dy);
        }
      } else if (interactionState.type === 'resizing-typed-text') {
        if (dragStartRef.current) {
          const dx = clientX - dragStartRef.current.startX;
          const dy = clientY - dragStartRef.current.startY;
          const change = dx + dy;
          const computedFontSize = Math.max(8, Math.min(72, Math.round(dragStartRef.current.initialFontSize + change * 0.18)));
          setFontSize(computedFontSize);
        }
      } else if (interactionState.type === 'rotating-typed-text') {
        if (dragStartRef.current) {
          const dx = clientX - dragStartRef.current.centerX;
          const dy = clientY - dragStartRef.current.centerY;
          let angle = Math.atan2(dy, dx) * (180 / Math.PI);
          angle = (angle + 90) % 360;
          if (angle < 0) angle += 360;
          setTypedRotation(Math.round(angle));
        }
      }

      // 5. HANDWRITING STROKES ENGINE
      else if (interactionState.type === 'dragging-handwriting') {
        if (dragStartRef.current) {
          const dx = clientX - dragStartRef.current.startX;
          const dy = clientY - dragStartRef.current.startY;
          setHandwritingPositionX(dragStartRef.current.initialX + dx);
          setHandwritingPositionY(dragStartRef.current.initialY + dy);
        }
      } else if (interactionState.type === 'resizing-handwriting') {
        if (dragStartRef.current) {
          const dx = clientX - dragStartRef.current.startX;
          const dy = clientY - dragStartRef.current.startY;
          const change = dx + dy;
          const computedScale = Math.min(3.0, Math.max(0.15, dragStartRef.current.initialScale + change * 0.005));
          setHandwritingScale(parseFloat(computedScale.toFixed(3)));
        }
      }
    };

    const handlePointerUp = () => {
      setInteractionState(null);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [interactionState, sealX, sealY, envelope, updateStampProp]);

  // Handle selected theme application
  const applyTheme = (themeId: string) => {
    const theme = LETTER_THEMES.find(t => t.id === themeId);
    if (!theme) return;

    setThemeId(themeId);
    setPaper(prev => ({
      ...prev,
      color: theme.paperColor,
      borderColor: theme.primary
    }));

    setEnvelope(prev => ({
      ...prev,
      borderColor: theme.secondary,
      color: theme.primary,
      waxSealColor: theme.accent
    }));

    setScroll(prev => ({
      ...prev,
      paperColor: theme.paperColor,
    }));

    // Update typography color matching the theme
    setTextColor(theme.text);
  };

  // Add a stamp into the active placed collection
  const handleAddStamp = (stamp: StaticStamp) => {
    const newPlaced: PlacedStamp = {
      id: `placed_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      designId: stamp.id,
      x: 10 + Math.random() * 40, // percentage position
      y: 10 + Math.random() * 40,
      scale: 1,
      rotation: (Math.random() - 0.5) * 30
    };

    setEnvelope(prev => ({
      ...prev,
      stamps: [...prev.stamps, newPlaced]
    }));
    setActiveStampIndex(envelope.stamps.length);
  };

  // Save/Generate Link Operation
  const handleSaveLetter = async () => {
    setSaving(true);
    
    // Determine the exact release timestamp
    let targetTime = new Date().toISOString();
    if (deliveryType === 'delayed') {
      const now = new Date();
      if (delayValue === '1h') now.setHours(now.getHours() + 1);
      else if (delayValue === '3h') now.setHours(now.getHours() + 3);
      else if (delayValue === '6h') now.setHours(now.getHours() + 6);
      else if (delayValue === '12h') now.setHours(now.getHours() + 12);
      else if (delayValue === '24h') now.setHours(now.getHours() + 24);
      else if (delayValue === 'custom' && customUnlockTime) {
        now.setTime(Date.now()); // Reset to custom picker timestamp
        targetTime = new Date(customUnlockTime).toISOString();
      }
      if (delayValue !== 'custom') {
        targetTime = now.toISOString();
      }
    }

    const uniqueId = editLetterId || Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
    
    const envelopeForSave = deliveryFormat === 'scroll'
      ? { ...envelope, stamps: [], addressLabel: '', waxSealDesign: 'hidden' as const }
      : envelope;

    const letterToSave: Letter = {
      id: uniqueId,
      title: title || 'An Unspoken Letter',
      senderId: user.uid,
      senderName: senderType === 'anonymous' ? 'Anonymous Sender' : senderName,
      senderType,
      deliveryFormat,
      themeId,
      paperSettings: paper,
      envelopeSettings: envelopeForSave,
      scrollSettings: scroll,
      typedContent,
      fontName: selectedFont.name,
      fontSize,
      textColor,
      italic,
      bold,
      align,
      typedPositionX,
      typedPositionY,
      typedRotation,
      handwritingScale,
      handwritingPositionX,
      handwritingPositionY,
      handwritingStrokes: strokes,
      effects,
      audio: 'none',
      audioEnabled: false,
      deliveryTimeType: deliveryType,
      deliveryTime: targetTime,
      oneTimeView,
      viewCount: 0,
      createdAt: new Date().toISOString(),
      isDraft: false
    };

    try {
      await DB.createLetter(letterToSave);
      const appUrl = window.location.origin;
      const link = `${appUrl}?open=${uniqueId}`;
      setShareableLink(link);
    } catch (e) {
      console.error('Could not archive letter:', e);
      // Pre-save local fallback link generation
      const appUrl = window.location.origin;
      const link = `${appUrl}?open=${uniqueId}`;
      setShareableLink(link);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);

    let targetTime = new Date().toISOString();
    const uniqueId = editLetterId || Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);

    const envelopeForSave = deliveryFormat === 'scroll'
      ? { ...envelope, stamps: [], addressLabel: '', waxSealDesign: 'hidden' as const }
      : envelope;

    const letterToSave: Letter = {
      id: uniqueId,
      title: title || 'Message',
      senderId: user.uid,
      senderName: senderType === 'anonymous' ? 'Anonymous Sender' : senderName,
      senderType,
      deliveryFormat,
      themeId,
      paperSettings: paper,
      envelopeSettings: envelopeForSave,
      scrollSettings: scroll,
      typedContent,
      fontName: selectedFont.name,
      fontSize,
      textColor,
      italic,
      bold,
      align,
      typedPositionX,
      typedPositionY,
      typedRotation,
      handwritingScale,
      handwritingPositionX,
      handwritingPositionY,
      handwritingStrokes: strokes,
      effects,
      audio: 'none',
      audioEnabled: false,
      deliveryTimeType: deliveryType,
      deliveryTime: targetTime,
      oneTimeView,
      viewCount: 0,
      createdAt: new Date().toISOString(),
      isDraft: true
    };

    try {
      await DB.createLetter(letterToSave);
      onSaved();
    } catch (e) {
      console.error('Could not save draft:', e);
      onSaved();
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div id="stationer-studio-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-6 bg-[#F4E9D8] min-h-screen text-[#2E1E12] max-w-7xl mx-auto rounded-3xl select-none">
      
      {/* LEFT PANEL: Live Interactive Design Suite Controls (5 Cols) */}
      <div className="lg:col-span-5 bg-[#EAD7B7] p-5 md:p-6 border-3 border-[#7A4E2D] rounded-2xl flex flex-col shadow-lg space-y-5">
        <div className="flex items-center justify-between border-b pb-3 border-[#7A4E2D]/20">
          <div>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-[#2E1E12]">Stationer's Desk</h2>
            <p className="text-[10px] font-mono tracking-widest text-[#7A4E2D] uppercase mt-0.5">Letter Studio</p>
          </div>
          <button 
            id="editor-close-btn"
            onClick={onCancel}
            className="text-xs font-mono text-[#8B0000] hover:underline"
          >
            Leave Desk
          </button>
        </div>

        {/* Studio Subsystem Navigation Tab bar (Horizontal grid for mobile/desktop flexibility) */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#7A4E2D]/10 rounded-xl border border-[#a67c52]/30 text-center">
          <button
            id="desk-tab-themes"
            onClick={() => setActiveTab('themes')}
            className={`py-1.5 text-[10px] font-mono rounded-lg transition-all ${activeTab === 'themes' ? 'bg-[#7A4E2D] text-[#F4E9D8] font-bold' : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'}`}
            title="Predefined Stationery Themes"
          >
            Themes
          </button>
          <button
            id="desk-tab-format"
            onClick={() => setActiveTab('format')}
            className={`py-1.5 text-[10px] font-mono rounded-lg transition-all ${activeTab === 'format' ? 'bg-[#7A4E2D] text-[#F4E9D8] font-bold' : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'}`}
            title="Design Format Select"
          >
            Format
          </button>
          <button
            id="desk-tab-paper"
            onClick={() => setActiveTab('paper')}
            className={`py-1.5 text-[10px] font-mono rounded-lg transition-all ${activeTab === 'paper' ? 'bg-[#7A4E2D] text-[#F4E9D8] font-bold' : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'}`}
            title="Paper Details & Aging"
          >
            Paper
          </button>
          <button
            id="desk-tab-writing"
            onClick={() => setActiveTab('writing')}
            className={`py-1.5 text-[10px] font-mono rounded-lg transition-all ${activeTab === 'writing' ? 'bg-[#7A4E2D] text-[#F4E9D8] font-bold' : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'}`}
            title="Typed & Handwriting Desk"
          >
            Writing
          </button>
          <button
            id="desk-tab-envelope"
            onClick={() => setActiveTab('envelope')}
            className={`py-1.5 text-[10px] font-mono rounded-lg transition-all ${activeTab === 'envelope' ? 'bg-[#7A4E2D] text-[#F4E9D8] font-bold' : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'}`}
            title="Envelope/Scroll Outer Covers, Stamps & Materials"
          >
            Covers
          </button>
          {deliveryFormat !== 'scroll' && (
            <button
              id="desk-tab-seal"
              onClick={() => setActiveTab('waxseal')}
              className={`py-1.5 text-[10px] font-mono rounded-lg transition-all ${activeTab === 'waxseal' ? 'bg-[#7A4E2D] text-[#F4E9D8] font-bold' : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'}`}
              title="Wax Seals"
            >
              Seals
            </button>
          )}
          <button
            id="desk-tab-effects"
            onClick={() => setActiveTab('effects')}
            className={`py-1.5 text-[10px] font-mono rounded-lg transition-all ${activeTab === 'effects' ? 'bg-[#7A4E2D] text-[#F4E9D8] font-bold' : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'}`}
            title="Audio & Sparks"
          >
            Effects
          </button>
          <button
            id="desk-tab-delivery"
            onClick={() => setActiveTab('delivery')}
            className={`py-1.5 text-[10px] font-mono rounded-lg transition-all ${activeTab === 'delivery' ? 'bg-[#7A4E2D] text-[#F4E9D8] font-bold' : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'}`}
            title="Delivery Scheduler"
          >
            Delivery
          </button>
        </div>

        {/* ACTIVE MODULE CONTAINER */}
        <div id="studio-active-module" className="flex-1 overflow-y-auto max-h-[500px] pr-2 space-y-4">
          
          {/* THEMES TAB */}
          {activeTab === 'themes' && (
            <div className="space-y-3">
              <p className="text-xs italic text-[#7A4E2D]">Select a complete theme package to automatically update your paper, envelopes, and suggested colors:</p>
              <div className="grid grid-cols-2 gap-2.5">
                {LETTER_THEMES.map((theme) => (
                  <button
                    id={`apply-theme-${theme.id}`}
                    key={theme.id}
                    onClick={() => applyTheme(theme.id)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between h-28 hover:scale-[1.02] transition duration-200 ${
                      themeId === theme.id 
                        ? 'border-[#8B0000] bg-[#FAF3E8] ring-2 ring-[#8B0000]/20' 
                        : 'border-[#7A4E2D]/30 bg-[#F4E9D8]/50'
                    }`}
                  >
                    <div>
                      <h3 className="font-serif text-xs font-bold text-[#2E1E12]">{theme.name}</h3>
                      <p className="text-[9px] text-[#7A4E2D] font-mono mt-0.5 italic leading-none">{theme.feel}</p>
                    </div>
                    {/* Tiny palette bar indicators */}
                    <div className="flex gap-1 mt-2">
                      <span className="w-3.5 h-3.5 rounded border border-black/10" style={{ backgroundColor: theme.background }} />
                      <span className="w-3.5 h-3.5 rounded border border-black/10" style={{ backgroundColor: theme.paperColor }} />
                      <span className="w-3.5 h-3.5 rounded border border-black/10" style={{ backgroundColor: theme.primary }} />
                      <span className="w-3.5 h-3.5 rounded border border-black/10" style={{ backgroundColor: theme.goldAccent }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DELIVER FORMAT */}
          {activeTab === 'format' && (
            <div className="space-y-4">
              <label className="block text-[11px] font-mono uppercase text-[#7A4E2D] tracking-wider font-bold">Select Delivery Vessel</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  id="select-envelope-vessel"
                  onClick={() => setDeliveryFormat('envelope')}
                  className={`p-4 rounded-xl border-3 flex flex-col items-center justify-center gap-1.5 transition ${
                    deliveryFormat === 'envelope'
                      ? 'border-[#8B0000] bg-[#FAF3E8]'
                      : 'border-[#a67c52]/30 bg-[#F4E9D8]/50 text-[#7A4E2D]'
                  }`}
                >
                  <Mail className="w-8 h-8" />
                  <span className="text-xs font-serif font-bold">Royal Envelope</span>
                  
                </button>

                <button
                  id="select-scroll-vessel"
                  onClick={() => {
                    setDeliveryFormat('scroll');
                    if (activeTab === 'waxseal') {
                      setActiveTab('format');
                    }
                  }}
                  className={`p-4 rounded-xl border-3 flex flex-col items-center justify-center gap-1.5 transition ${
                    deliveryFormat === 'scroll'
                      ? 'border-[#8B0000] bg-[#FAF3E8]'
                      : 'border-[#a67c52]/30 bg-[#F4E9D8]/50 text-[#7A4E2D]'
                  }`}
                >
                  <Scroll className="w-8 h-8" />
                  <span className="text-xs font-serif font-bold">Calligraphy Scroll</span>
                  
                </button>
              </div>
            </div>
          )}

          {/* PAPER CONTROLS */}
          {activeTab === 'paper' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#7A4E2D] tracking-wider font-bold mb-1">Paper Material Type</label>
                <select
                  id="set-paper-material"
                  value={paper.paperType}
                  onChange={(e) => setPaper(prev => ({ ...prev, paperType: e.target.value }))}
                  className="w-full bg-[#FAF3E8] border-2 border-[#7A4E2D]/30 p-2 rounded-xl text-xs font-serif text-[#2E1E12] focus:border-[#7A4E2D] outline-none"
                >
                  <option value="plain">Classic Plain</option>
                  <option value="lined">Elegant Lined</option>
                  <option value="dotted">Precise Dotted</option>
                  <option value="grid">Draftsman Grid</option>
                  <option value="tea">Tea Stained</option>
                  <option value="coffee">Coffee Infused</option>
                  <option value="washi">Artistic Washi</option>
                </select>
              </div>

              {/* Sliders Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase text-[#7A4E2D]">Paper Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="set-paper-color"
                      type="color"
                      value={paper.color}
                      onChange={(e) => setPaper(prev => ({ ...prev, color: e.target.value }))}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-[#7A4E2D]/40"
                    />
                    <span className="text-[10px] font-mono text-[#7A4E2D]/85 uppercase font-medium">{paper.color}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-mono uppercase text-[#7A4E2D] mb-1">
                    <span>Texture Intensity</span>
                    <span>{paper.textureIntensity}%</span>
                  </div>
                  <input
                    id="set-paper-texture"
                    type="range"
                    min="0"
                    max="100"
                    value={paper.textureIntensity}
                    onChange={(e) => setPaper(prev => ({ ...prev, textureIntensity: parseInt(e.target.value) }))}
                    className="w-full h-1 bg-[#7A4E2D]/20 rounded-lg appearance-none cursor-pointer accent-[#7A4E2D]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-mono uppercase text-[#7A4E2D] mb-1">
                    <span>Aged Browning Edge</span>
                    <span>{paper.agingEffect}%</span>
                  </div>
                  <input
                    id="set-paper-aging"
                    type="range"
                    min="0"
                    max="100"
                    value={paper.agingEffect}
                    onChange={(e) => setPaper(prev => ({ ...prev, agingEffect: parseInt(e.target.value) }))}
                    className="w-full h-1 bg-[#7A4E2D]/20 rounded-lg appearance-none cursor-pointer accent-[#7A4E2D]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#7A4E2D] mb-1">Border Corner Carving</label>
                  <select
                    id="set-paper-corner"
                    value={paper.cornerDecoration}
                    onChange={(e) => setPaper(prev => ({ ...prev, cornerDecoration: e.target.value as any }))}
                    className="w-full bg-[#FAF3E8] border border-[#7A4E2D]/35 p-1.5 rounded-lg text-xs"
                  >
                    <option value="none">Sharp Clean</option>
                    <option value="royal">Emperor Crown Crest</option>
                    <option value="floral">Lace Border</option>
                    <option value="gilded">Gilded Royalty Corner</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-1.5">
                  <label className="flex items-center gap-2 text-xs text-[#2E1E12] cursor-pointer">
                    <input
                      id="toggle-crease-folds"
                      type="checkbox"
                      checked={paper.foldMarks}
                      onChange={(e) => setPaper(prev => ({ ...prev, foldMarks: e.target.checked, creases: e.target.checked }))}
                      className="rounded accent-[#7A4E2D] h-3.5 w-3.5"
                    />
                    <span>Crease Marks</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* WRITING WORKSPACE */}
          {activeTab === 'writing' && (
            <div className="space-y-4">
              <div className="flex bg-[#7A4E2D]/10 p-1 rounded-lg border border-[#a67c52]/30">
                <button
                  id="tab-typed-text"
                  onClick={() => setEditorMode('typed')}
                  className={`flex-1 text-center py-1.5 text-xs font-mono rounded-lg transition ${editorMode === 'typed' ? 'bg-[#7A4E2D] text-[#F4E9D8]' : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'}`}
                >
                  <Type className="w-3.5 h-3.5 inline mr-1" /> Typed Calligraphy
                </button>
                <button
                  id="tab-handwritten-drawing"
                  onClick={() => setEditorMode('handwritten')}
                  className={`flex-1 text-center py-1.5 text-xs font-mono rounded-lg transition ${editorMode === 'handwritten' ? 'bg-[#7A4E2D] text-[#F4E9D8]' : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'}`}
                >
                  <Edit2 className="w-3.5 h-3.5 inline mr-1" /> Ink Quill Desk
                </button>
              </div>

              {editorMode === 'typed' ? (
                /* Typography Workspace Settings */
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#7A4E2D] tracking-wider mb-1">Handwriting Fonts</label>
                    <select
                      id="set-calligraphy-font"
                      value={selectedFont.name}
                      onChange={(e) => {
                        const found = FONTS_LIBRARY.find(f => f.name === e.target.value);
                        if (found) setSelectedFont(found);
                      }}
                      className="w-full bg-[#FAF3E8] border-2 border-[#7A4E2D]/35 p-2 rounded-xl text-xs text-[#2E1E12] outline-none"
                    >
                      {FONTS_LIBRARY.map((f) => (
                        <option key={f.name} value={f.name}>{f.name} ({f.category})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2.5 items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#7A4E2D] block">Font Size: {fontSize}px</span>
                      <input
                        id="set-font-size-slider"
                        type="range"
                        min="12"
                        max="32"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                        className="w-24 bg-[#7A4E2D]/20 h-1 rounded-lg accent-[#7A4E2D] appearance-none"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#7A4E2D] block">Ink Hue</span>
                      <input
                        id="set-font-color-picker"
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-10 h-8 rounded border border-[#7A4E2D]/30"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 pt-4">
                      <button
                        id="btn-bold-toggle"
                        onClick={() => setBold(!bold)}
                        className={`p-1.5 rounded border text-xs font-bold font-mono transition ${bold ? 'bg-[#7A4E2D] text-[#F4E9D8] border-[#7A4E2D]' : 'border-[#7A4E2D]/30 hover:bg-[#7A4E2D]/5 text-[#7A4E2D]'}`}
                      >
                        B
                      </button>
                      <button
                        id="btn-italic-toggle"
                        onClick={() => setItalic(!italic)}
                        className={`p-1.5 rounded border text-xs italic font-mono transition ${italic ? 'bg-[#7A4E2D] text-[#F4E9D8] border-[#7A4E2D]' : 'border-[#7A4E2D]/30 hover:bg-[#7A4E2D]/5 text-[#7A4E2D]'}`}
                      >
                        I
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#7A4E2D] tracking-wider mb-1">Draft Content (Typed)</label>
                    <textarea
                      id="draft-text-content"
                      placeholder="Write your beautiful heartfelt words..."
                      value={typedContent}
                      onChange={(e) => setTypedContent(e.target.value)}
                      style={{ fontFamily: selectedFont.name }}
                      className="w-full min-h-[140px] bg-[#FAF3E8] border-2 border-[#7A4E2D]/35 p-3 rounded-2xl text-base text-[#2E1E12] outline-none focus:border-[#7A4E2D] resize-none mb-3"
                    />
                  </div>

                  {/* Interactive Layout Dashboard for Typed Text */}
                  <div className="bg-[#FAF3E8]/80 p-3.5 rounded-xl border border-[#7A4E2D]/20 space-y-2 text-[10px] font-mono shadow-sm">
                    <div className="text-center text-[#7A4E2D] tracking-wider uppercase font-bold border-b border-[#7A4E2D]/10 pb-1.5 mb-1.5 flex items-center justify-between">
                      <span>Typography Layout Dashboard</span>
                      </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-center text-[#8C6239] pt-1">
                      <div className="bg-[#FAF3E8] p-1.5 rounded border border-[#7A4E2D]/10">
                        <div className="opacity-60 text-[8px] uppercase">Horizon</div>
                        <div className="font-bold text-[11px] text-[#7A4E2D]">{typedPositionX}px</div>
                      </div>
                      <div className="bg-[#FAF3E8] p-1.5 rounded border border-[#7A4E2D]/10">
                        <div className="opacity-60 text-[8px] uppercase">Vertical</div>
                        <div className="font-bold text-[11px] text-[#7A4E2D]">{typedPositionY}px</div>
                      </div>
                      <div className="bg-[#FAF3E8] p-1.5 rounded border border-[#7A4E2D]/10">
                        <div className="opacity-60 text-[8px] uppercase">Rotation</div>
                        <div className="font-bold text-[11px] text-[#7A4E2D]">{typedRotation || 0}°</div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button 
                        id="reset-typed-coords"
                        type="button"
                        onClick={() => { setTypedPositionX(0); setTypedPositionY(0); setTypedRotation(0); }}
                        className="px-2.5 py-1 bg-[#7A4E2D] text-white rounded-lg shadow-sm font-semibold text-[9px] select-none hover:bg-amber-800 transition"
                      >
                        Reset Layout Settings
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Ink Quill Canvas */
                <div className="space-y-4 animate-fade-in border-2 border-[#7A4E2D]/20 rounded-xl overflow-hidden shadow-inner">
                  {/* Ink color bottles picker */}
                  <div className="p-2 border-b bg-[#7a4e2d]/5 border-[#a67c52]/10 flex items-center justify-between gap-1 select-none">
                    <span className="text-[10px] font-mono uppercase text-[#7A4E2D] font-bold">Ink Bottle:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['#2E1E12', '#8B0000', '#1E3A8A', '#2C3E20', '#6B4423', '#7C3AED'].map((hue) => (
                        <button
                          id={`ink-bottle-${hue.replace('#', '')}`}
                          key={hue}
                          onClick={() => setCurrentInkColor(hue)}
                          className={`w-5 h-5 rounded-full border border-black/20 relative transition hover:scale-105 active:scale-95 ${currentInkColor === hue ? 'ring-2 ring-[#8B0000] ring-offset-1' : ''}`}
                          style={{ backgroundColor: hue }}
                        />
                      ))}
                      
                      {/* Styled Custom Color Ink Bottle Picker option */}
                      <div 
                        className={`w-7 h-5 rounded-l-md rounded-r-lg border border-stone-400 relative transition hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer overflow-hidden ${!['#2E1E12', '#8B0000', '#1E3A8A', '#2C3E20', '#6B4423', '#7C3AED'].includes(currentInkColor) ? 'ring-2 ring-[#8B0000] ring-offset-1' : ''}`}
                        style={{ backgroundColor: !['#2E1E12', '#8B0000', '#1E3A8A', '#2C3E20', '#6B4423', '#7C3AED'].includes(currentInkColor) ? currentInkColor : '#FFF' }}
                        title="Custom Ink Bottle"
                      >
                        <span className="text-[10px] pointer-events-none select-none">🧪</span>
                        <input
                          id="custom-ink-picker"
                          type="color"
                          value={currentInkColor}
                          onChange={(e) => setCurrentInkColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <HandwritingCanvas
                    strokes={strokes}
                    onChange={setStrokes}
                    inkColor={currentInkColor}
                    penThickness={currentPenThickness}
                  />
                  
                  {/* Quick thickness and positioning adjustments */}
                  <div className="p-2.5 bg-[#FAF3E8] border-t border-[#7a4e2d]/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#a67c52] whitespace-nowrap">Stroke size:</span>
                      <input
                        id="ink-stroke-slider"
                        type="range"
                        min="1"
                        max="14"
                        value={currentPenThickness}
                        onChange={(e) => setCurrentPenThickness(parseInt(e.target.value))}
                        className="w-full bg-[#7a4e2d]/10 rounded accent-[#7A4E2D]"
                      />
                    </div>

                    {/* Interactive Layout Dashboard for Handwriting Layer */}
                    <div className="bg-white/90 p-3 rounded-xl border border-[#7A4E2D]/20 space-y-2 text-[10px] font-mono shadow-sm">
                      <div className="text-center text-[#7A4E2D] tracking-wider uppercase font-bold border-b border-[#7A4E2D]/10 pb-1.5 mb-1.5 flex items-center justify-between">
                        <span>Ink Layout Dashboard</span>
                        
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center text-[#8C6239] pt-1">
                        <div className="bg-[#FAF3E8]/50 p-1.5 rounded border border-[#7A4E2D]/10">
                          <div className="opacity-60 text-[8px] uppercase">Horizon</div>
                          <div className="font-bold text-[11px] text-[#7A4E2D]">{handwritingPositionX}px</div>
                        </div>
                        <div className="bg-[#FAF3E8]/50 p-1.5 rounded border border-[#7A4E2D]/10">
                          <div className="opacity-60 text-[8px] uppercase">Vertical</div>
                          <div className="font-bold text-[11px] text-[#7A4E2D]">{handwritingPositionY}px</div>
                        </div>
                        <div className="bg-[#FAF3E8]/50 p-1.5 rounded border border-[#7A4E2D]/10">
                          <div className="opacity-60 text-[8px] uppercase">Scale</div>
                          <div className="font-bold text-[11px] text-[#7A4E2D]">{Math.round(handwritingScale * 100)}%</div>
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button 
                          id="reset-strokes-layout"
                          type="button"
                          onClick={() => { setHandwritingScale(1.0); setHandwritingPositionX(0); setHandwritingPositionY(0); }}
                          className="px-2.5 py-1 bg-[#7A4E2D] text-white rounded-lg shadow-sm font-semibold text-[9px] select-none hover:bg-amber-800 transition"
                        >
                          Reset Ink settings
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COVERS DESIGNER (FORMERLY ENVELOPE) */}
          {activeTab === 'envelope' && (
            <div className="space-y-4 animate-fade-in">
              {deliveryFormat === 'scroll' ? (
                <div className="p-3.5 bg-[#FAF3E8] border border-[#7A4E2D]/25 rounded-xl space-y-3">
                  <span className="block text-[11px] font-mono uppercase text-[#7A4E2D] tracking-wider font-bold">Scroll Outer Cover</span>
                  <div>
                    <label className="block text-[10px] font-mono text-[#7A4E2D]/80 mb-1">Scroll Outer Cover Color</label>
                    <div className="flex items-center gap-2.5">
                      <input
                        id="set-scroll-outer-color"
                        type="color"
                        value={scroll.scrollOuterColor || '#4E3629'}
                        onChange={(e) => setScroll(prev => ({ ...prev, scrollOuterColor: e.target.value }))}
                        className="w-10 h-8 rounded border border-[#7A4E2D]/40 cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-[#7A4E2D]/85 uppercase font-medium">{scroll.scrollOuterColor || '#4E3629'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-[#7A4E2D]/80 mb-1">Outer Cover Style</label>
                    <select
                      id="set-scroll-outer-cover-type"
                      value={scroll.outerCoverType || 'wooden'}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setScroll(prev => ({
                          ...prev,
                          outerCoverType: val,
                          material: val === 'wooden' ? 'walnut' : 'silver'
                        }));
                      }}
                      className="w-full bg-white border border-[#7A4E2D]/35 p-1.5 rounded-lg text-xs"
                    >
                      <option value="wooden">🌲 Wooden Outer Cover</option>
                      <option value="metal">🪙 Metal Outer Cover</option>
                    </select>
                  </div>

                  {/* Material accent selector based on style */}
                  <div>
                    <label className="block text-[10px] font-mono text-[#7A4E2D]/80 mb-1">Material Accent</label>
                    <select
                      id="set-scroll-cover-material"
                      value={scroll.material}
                      onChange={(e) => {
                        const mat = e.target.value as any;
                        setScroll(prev => ({ ...prev, material: mat }));
                      }}
                      className="w-full bg-white border border-[#7A4E2D]/35 p-1.5 rounded-lg text-xs font-serif"
                    >
                      {scroll.outerCoverType === 'metal' ? (
                        <>
                          <option value="silver">🥈 Polished Silver</option>
                          <option value="gold">🥇 Premium Gold</option>
                          <option value="bronze">🥉 Ancient Bronze</option>
                          <option value="copper">🏺 Gilded Copper</option>
                        </>
                      ) : (
                        <>
                          <option value="walnut">🟫 Walnut Hardwood</option>
                          <option value="ebony">⬛ Royal Ebony</option>
                          <option value="bamboo">🎋 Natural Bamboo</option>
                          <option value="marble">⬜ Luxury Marble</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-[#FAF3E8] border border-[#7A4E2D]/25 rounded-xl space-y-3">
                  <span className="block text-[11px] font-mono uppercase text-[#7A4E2D] tracking-wider font-bold">Envelope Crafting</span>
                  <div>
                    <label className="block text-[10px] font-mono text-[#7A4E2D]/80 mb-1">Envelope Outer Color</label>
                    <div className="flex items-center gap-2.5">
                      <input
                        id="set-envelope-color"
                        type="color"
                        value={envelope.color}
                        onChange={(e) => setEnvelope(prev => ({ ...prev, color: e.target.value }))}
                        className="w-10 h-8 rounded border border-[#7A4E2D]/40 cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-[#7A4E2D]/85 uppercase font-medium">{envelope.color}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-[#7A4E2D]/80 mb-1">Ribbon Bindings Style</label>
                    <select
                      id="set-envelope-ribbon"
                      value={envelope.ribbonStyle}
                      onChange={(e) => setEnvelope(prev => ({ ...prev, ribbonStyle: e.target.value as any }))}
                      className="w-full bg-white border border-[#7A4E2D]/35 p-1.5 rounded-lg text-xs"
                    >
                      <option value="none">No Ribbon Binding</option>
                      <option value="simple">Minimalist Horizontal Silk</option>
                      <option value="crossed">Criss-Cross Silk</option>
                      <option value="royal">Imperial Golden Bindings</option>
                    </select>
                  </div>
                </div>
              )}

              {deliveryFormat === 'envelope' && (
                <>
                  <div className="p-3.5 bg-[#FAF3E8] border border-[#7A4E2D]/25 rounded-xl space-y-2">
                    <label className="block text-[11px] font-mono uppercase text-[#7A4E2D] tracking-wider font-bold">To: (Heading Address)</label>
                    <input
                      id="set-envelope-label"
                      type="text"
                      value={envelope.addressLabel}
                      onChange={(e) => setEnvelope(prev => ({ ...prev, addressLabel: e.target.value }))}
                      className="w-full bg-white border-2 border-[#7A4E2D]/30 p-2 rounded-xl text-xs text-[#2E1E12] outline-none font-serif"
                      placeholder="E.g. Anna"
                    />
                    
                  </div>

                  {/* VINTAGE STAMPS HARVESTER (Includes Drags, rotations, and placements!) */}
                  <div className="p-3 bg-[#FAF3E8] border border-[#7A4E2D]/30 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-[#7A4E2D]/20 pb-1.5">
                      <span className="text-xs font-bold text-[#7A4E2D] uppercase font-mono">Antique Postage Stamp Desk</span>
                      
                    </div>

                    {/* Categories filtering bar */}
                    <select
                      id="set-stamp-cat-filter"
                      value={stampCategory}
                      onChange={(e) => setStampCategory(e.target.value as any)}
                      className="w-full bg-[#FAF3E8] border border-[#a67c52]/30 p-1.5 rounded-lg text-[10px]"
                    >
                      <option value="historical">🏰 Historical Era Stamps & Crests</option>
                      <option value="nature">🌸 Botanical & Wilderness</option>
                      <option value="romance">💖 Love Letters & Anniversary Hearts</option>
                      <option value="fantasy">🔮 Dragon Magic & Constellations</option>
                      <option value="travel">✈️ Worldwide Postcards</option>
                      <option value="seasonal">❄️ Festival Keepsakes</option>
                    </select>

                    {/* Stamp visual rack */}
                    <div className="grid grid-cols-5 gap-1.5 max-h-[140px] overflow-y-auto p-1 bg-[#7a4e2d]/5 rounded border">
                      {STAMPS_LIBRARY.filter(s => s.category === stampCategory).map((stamp) => (
                        <button
                          id={`affix-${stamp.id}`}
                          key={stamp.id}
                          onClick={() => handleAddStamp(stamp)}
                          className="p-1 items-center justify-center flex flex-col bg-white border-2 border-dashed border-[#ead7b7] rounded shadow-sm relative group hover:scale-105 active:scale-95 transition"
                          title={`Double click or Click to place: ${stamp.name}`}
                        >
                          <span className="text-sm select-none">{stamp.icon}</span>
                          <span className="text-[7px] font-mono scale-90 text-[#a67c52] mt-0.5">{stamp.price}</span>
                        </button>
                      ))}
                    </div>


                    {/* Placed Stamp Controller */}
                    {envelope.stamps.length > 0 && (
                      <div className="p-2 border-t border-[#7A4E2D]/20 bg-white/70 rounded mt-1.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-[#7A4E2D]">
                            Postage Stamped: <span className="font-bold text-[#8B0000]">{envelope.stamps.length} placed</span>
                          </span>
                          {activeStampIndex !== null && (
                            <button
                              id="btn-remove-selected-stamp"
                              onClick={() => removeStamp(activeStampIndex)}
                              className="text-[9px] text-red-700 hover:underline flex items-center gap-0.5"
                            >
                              <Trash2 className="w-2.5 h-2.5" /> Remove Selected Accent
                            </button>
                          )}
                        </div>

                        
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* WAX SEAL SYSTEM */}
          {activeTab === 'waxseal' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#7A4E2D] tracking-wider font-bold mb-2">Select Imperial Sealing Wax</label>
                <div className="flex flex-wrap gap-2 items-center">
                  {[
                    { name: 'Imperial Red', value: '#8B0000' },
                    { name: 'Gilded Gold', value: '#D4AF37' },
                    { name: 'Victorian Silver', value: '#C0C0C0' },
                    { name: 'Midnight Charcoal', value: '#1A1A1A' },
                    { name: 'Emerald Forest', value: '#047857' },
                    { name: 'Royal Opal Blue', value: '#1D4ED8' }
                  ].map((wax) => (
                    <button
                      id={`wax-${wax.name.replace(/\s+/g, '-').toLowerCase()}`}
                      key={wax.value}
                      onClick={() => setEnvelope(prev => ({ ...prev, waxSealColor: wax.value }))}
                      className={`w-9 h-9 rounded-full border border-black/20 shadow flex items-center justify-center transition active:scale-90 ${
                        envelope.waxSealColor === wax.value ? 'ring-2 ring-black font-extrabold text-white text-xs' : ''
                      }`}
                      style={{ backgroundColor: wax.value }}
                      title={wax.name}
                    >
                      {envelope.waxSealColor === wax.value && '✓'}
                    </button>
                  ))}

                  {/* Styled Custom Color Wax Seal Picker */}
                  <div 
                    className={`w-9 h-9 rounded-full border border-stone-400 relative transition hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer overflow-hidden shadow ${
                      ![ '#8B0000', '#D4AF37', '#C0C0C0', '#1A1A1A', '#047857', '#1D4ED8' ].includes(envelope.waxSealColor) ? 'ring-2 ring-black font-extrabold ring-offset-1' : ''
                    }`}
                    style={{ backgroundColor: ![ '#8B0000', '#D4AF37', '#C0C0C0', '#1A1A1A', '#047857', '#1D4ED8' ].includes(envelope.waxSealColor) ? envelope.waxSealColor : '#FFFFFF' }}
                    title="Custom Sealing Wax Color"
                  >
                    <span className="text-sm pointer-events-none select-none">🎨</span>
                    <input
                      id="custom-waxseal-color-picker"
                      type="color"
                      value={envelope.waxSealColor}
                      onChange={(e) => setEnvelope(prev => ({ ...prev, waxSealColor: e.target.value }))}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#7A4E2D] tracking-wider font-bold mb-2">Engrave Wax Insignia</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'none', label: '📭 Plain Wax' },
                    { id: 'hidden', label: '🚫 No Seal' },
                    { id: 'custom', label: '✨ Custom...' },
                    { id: 'crown', label: '👑 Crown' },
                    { id: 'rose', label: '🌹 Rose' },
                    { id: 'heart', label: '❤️ Love' },
                    { id: 'initials', label: '⚜️ Herald' },
                    { id: 'moon', label: '🌙 Moon' },
                    { id: 'tree', label: '🌲 Pine' },
                    { id: 'compass', label: '🧭 Wind' }
                  ].map((des) => (
                    <button
                      id={`seal-pattern-${des.id}`}
                      key={des.id}
                      onClick={() => setEnvelope(prev => ({ ...prev, waxSealDesign: des.id }))}
                      className={`py-2 px-1 text-xs border rounded-lg hover:bg-[#7A4E2D]/5 transition text-center ${
                        envelope.waxSealDesign === des.id
                          ? 'border-[#8B0000] bg-white ring-2 ring-[#8B0000]/10 font-bold'
                          : 'border-[#7A4E2D]/20 text-[#7A4E2D]'
                      }`}
                    >
                      {des.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom engraving input field */}
              {envelope.waxSealDesign === 'custom' && (
                <div className="p-3 bg-[#FAF3E8] border border-[#7A4E2D]/20 rounded-xl animate-fade-in space-y-2">
                  <label className="block text-[10px] font-mono text-[#7A4E2D] uppercase font-bold">Custom Stamp Engraving symbol</label>
                  <input
                    id="custom-seal-engraving-input"
                    type="text"
                    maxLength={3}
                    placeholder="E.g. 🦋 or WZ"
                    value={envelope.customInsigniaEmoji || ''}
                    onChange={(e) => setEnvelope(prev => ({ ...prev, customInsigniaEmoji: e.target.value }))}
                    className="w-full bg-white border-2 border-[#7A4E2D]/35 p-2 rounded-xl text-center text-sm font-bold text-[#2E1E12] outline-none focus:border-[#7A4E2D]"
                  />
                  
                  
                </div>
              )}

              {/* Draggable guidance notes */}
              {envelope.waxSealDesign !== 'hidden' && (
                <div className="p-3.5 bg-[#EAD7B7]/25 border border-[#7A4E2D]/20 rounded-xl space-y-1.5 text-[10px] text-[#7A4E2D] font-mono leading-relaxed">
                  <span className="block font-bold text-[#8B0000] uppercase tracking-wider">🖐️ Interactive Desk Controls:</span>
                  <div className="pt-1.5 flex gap-2">
                    <button
                      id="reset-seal-layout-btn"
                      type="button"
                      onClick={() => setEnvelope(prev => ({ ...prev, sealX: 75, sealY: 75, sealScale: 1.0, sealRotation: 0 }))}
                      className="px-2 py-1 bg-[#8B0000]/10 border border-[#8B0000]/20 rounded text-[#8B0000] font-bold hover:bg-[#8B0000]/20 active:scale-95 transition"
                    >
                      Reset Seal Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AMBIENCE SOUND & OPEN SPARKS */}
          {activeTab === 'effects' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#7A4E2D] tracking-wider font-bold mb-2">Cinematic Open Action Sparks</label>
                <select
                  id="set-sparks-action"
                  value={effects.effectType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setEffects(prev => ({ ...prev, effectType: val }));
                    if (val !== 'none') {
                      setEffectsPreviewActive(true);
                    }
                  }}
                  className="w-full bg-[#FAF3E8] border border-[#7A4E2D]/35 p-2 rounded-xl text-xs text-[#2E1E12] outline-none"
                >
                  <option value="none">No Particles</option>
                  <option value="confetti">Carnival Silk Confetti</option>
                  <option value="sparkles">Golden Radiance Sparks</option>
                  <option value="stars">Celestial Shooting Stars</option>
                  <option value="hearts">Flurrying Pink Hearts</option>
                  <option value="rose_petals">Petal Storm (Crimson Rose)</option>
                  <option value="sakura">Cherry Blossom Wind</option>
                  <option value="fireflies">Dusk Magical Fireflies</option>
                  <option value="snow">Quiet Falling Arctic Snow</option>
                  <option value="lanterns">Floating Lantern Festival</option>
                  <option value="golden_dust">Glowing Golden Dust</option>
                </select>

                <div className="mt-2.5">
                  <button
                    id="trigger-effects-preview-btn"
                    type="button"
                    onClick={() => {
                      if (effects.effectType !== 'none') {
                        setEffectsPreviewActive(true);
                      }
                    }}
                    disabled={effects.effectType === 'none'}
                    className={`w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase border transition-all duration-200 select-none ${
                      effects.effectType === 'none'
                        ? 'opacity-40 cursor-not-allowed border-[#7A4E2D]/20 text-[#7A4E2D]/50 bg-stone-100'
                        : 'border-[#8B0000] text-white bg-[#8B0000] hover:bg-[#680000] shadow-sm hover:scale-[1.01] active:scale-95'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {effectsPreviewActive ? 'Previewing Spark Overlay...' : 'Preview Open Action Spark'}
                  </button>
                </div>
              </div>


            </div>
          )}

          {/* DELIVERY SCHEDULER */}
          {activeTab === 'delivery' && (
            <div className="space-y-4">
              {/* Identity Settings */}
              <div className="space-y-2 border-b border-[#7A4E2D]/20 pb-3">
                <label className="block text-[11px] font-mono uppercase text-[#7A4E2D] tracking-wider font-bold">Sender Signature Mask</label>
                <div className="grid grid-cols-3 gap-1 bg-[#FAF3E8] p-1 border rounded-lg">
                  <button
                    id="sender-sig-anonymous"
                    type="button"
                    onClick={() => setSenderType('anonymous')}
                    className={`py-1.5 text-[9px] font-mono rounded-lg ${senderType === 'anonymous' ? 'bg-[#7A4E2D] text-[#F4E9D8] font-bold' : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'}`}
                  >
                    Anonymous
                  </button>
                  
                  <button
                    id="sender-sig-verified"
                    type="button"
                    onClick={() => setSenderType('verified')}
                    className={`py-1.5 text-[9px] font-mono rounded-lg ${senderType === 'verified' ? 'bg-[#7A4E2D] text-[#F4E9D8] font-bold' : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'}`}
                  >
                    Real Identity
                  </button>
                </div>

                {senderType !== 'anonymous' && (
                  <div className="animate-fade-in mt-1">
                    <input
                      id="sender-sig-name-input"
                      type="text"
                      placeholder={senderType === 'nickname' ? "Alias e.g. Midnight Quill" : user.displayName}
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full bg-[#FAF3E8] border border-[#a67c52]/30 p-2 rounded-xl text-xs font-serif"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-mono uppercase text-[#7A4E2D] tracking-wider font-bold">Unlocking Date Trigger</label>
                <div className="flex bg-[#FAF3E8] p-1 border rounded-lg gap-2">
                  <button
                    id="delivery-immediate"
                    type="button"
                    onClick={() => setDeliveryType('immediate')}
                    className={`flex-1 py-1.5 text-xs font-mono rounded-lg ${deliveryType === 'immediate' ? 'bg-[#7A4E2D] text-[#F4E9D8]' : 'text-[#7A4E2D]'}`}
                  >
                    Instant Delivery
                  </button>
                  <button
                    id="delivery-delayed"
                    type="button"
                    onClick={() => setDeliveryType('delayed')}
                    className={`flex-1 py-1.5 text-xs font-mono rounded-lg ${deliveryType === 'delayed' ? 'bg-[#7A4E2D] text-[#F4E9D8]' : 'text-[#7A4E2D]'}`}
                  >
                    Staggered Delay
                  </button>
                </div>

                {deliveryType === 'delayed' && (
                  <div className="animate-fade-in space-y-2 pt-1 border-t border-dashed border-[#7A4E2D]/20">
                    <select
                      id="set-delay-factor"
                      value={delayValue}
                      onChange={(e) => setDelayValue(e.target.value as any)}
                      className="w-full bg-[#FAF3E8] border border-[#7A4E2D]/35 p-1.5 text-xs"
                    >
                      <option value="1h">🚀 Hold for 1 Hour</option>
                      <option value="3h">⏳ Hold for 3 Hours</option>
                      <option value="6h">⏳ Hold for 6 Hours</option>
                      <option value="12h">⏳ Hold for 12 Hours</option>
                      <option value="24h">📦 Hold for 24 Hours</option>
                      <option value="custom">📅 Select Specific Solar Orbit (Custom Date/Time)</option>
                    </select>

                    {delayValue === 'custom' && (
                      <input
                        id="set-custom-delay-time"
                        type="datetime-local"
                        value={customUnlockTime}
                        onChange={(e) => setCustomUnlockTime(e.target.value)}
                        className="w-full bg-[#FAF3E8] border-2 border-[#7A4E2D]/35 p-2 rounded-xl text-xs font-mono"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Single View Setting */}
              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs text-[#2E1E12] cursor-pointer">
                  <input
                    id="toggle-self-destruct-read"
                    type="checkbox"
                    checked={oneTimeView}
                    onChange={(e) => setOneTimeView(e.target.checked)}
                    className="rounded accent-[#8B0000] h-4 w-4"
                  />
                  <span>Self-Destruct (Destroy manuscript after single viewing session)</span>
                </label>
              </div>
            </div>
          )}

        </div>

        {/* BOTTOM ACTION: Archiving and Sharing link creation */}
        <div className="pt-4 border-t border-[#7A4E2D]/20 space-y-3">
          <div className="flex gap-2.5">
            <input
              id="editor-title-input"
              type="text"
              placeholder="Internal Ledger Title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 bg-[#FAF3E8] p-2 border-2 border-[#7A4E2D]/30 rounded-xl text-xs font-mono outline-none"
            />
            
            <button
              id="save-draft-letter-btn"
              disabled={savingDraft || saving}
              onClick={handleSaveDraft}
              className="bg-[#7A4E2D] hover:bg-[#5E3B21] text-white py-2 px-5 rounded-xl text-xs font-mono font-bold tracking-wider uppercase active:scale-95 transition shadow-md"
            >
              {savingDraft ? 'Drafting...' : 'Save Draft'}
            </button>
            
            <button
              id="seal-letter-archive-btn"
              disabled={saving || savingDraft}
              onClick={handleSaveLetter}
              className="bg-[#8B0000] hover:bg-[#680000] text-white py-2 px-5 rounded-xl text-xs font-mono font-bold tracking-wider uppercase active:scale-95 transition shadow-md"
            >
              {saving ? 'Engraving...' : 'Seal & Send'}
            </button>
          </div>

          {shareableLink && (
            <div id="post-send-link-banner" className="p-4 bg-[#FAF3E8] border-2 border-[#7A4E2D] rounded-xl text-center space-y-3 animate-fade-in shadow-inner">
              <span className="text-[11px] font-mono text-emerald-800 font-bold block uppercase tracking-wider">
                ✓ Seal Engraved Successfully!
              </span>
              <p className="text-[10px] font-mono text-[#7A4E2D] font-medium leading-normal">
                Share this secure seal link with your recipient:
              </p>
              
              <div className="flex gap-2">
                <input
                  id="generated-share-link"
                  type="text"
                  readOnly
                  value={shareableLink}
                  className="flex-1 bg-white text-[10px] font-mono p-2 rounded-lg text-[#2E1E12] border-2 border-[#7A4E2D]/20 select-all outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  id="copy-sealed-link-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(shareableLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className={`${copiedLink ? 'bg-[#2E1E12] text-white' : 'bg-[#7A4E2D] hover:bg-[#5E3B21] text-[#F4E9D8]'} px-4 py-1.5 rounded-lg text-xs font-mono transition-colors font-bold active:scale-95 duration-200`}
                >
                  {copiedLink ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              <div className="pt-2 border-t border-[#7A4E2D]/15 flex justify-center">
                <button
                  id="link-banner-done-btn"
                  onClick={onSaved}
                  className="bg-[#2E1E12] hover:bg-black text-white px-5 py-2 rounded-lg text-xs font-mono uppercase tracking-widest font-semibold active:scale-95 transition-colors"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Dynamic Live preview Area (7 Cols) */}
      <div className="lg:col-span-7 bg-[#EAD7B7]/40 border-3 border-dashed border-[#7A4E2D]/30 rounded-2xl flex flex-col items-center justify-center p-6 relative overflow-hidden min-h-[450px]">
        
        {/* Dynamic envelope style or parchment paper visualizer */}
        {activeTab === 'paper' || activeTab === 'writing' ? (
          <div 
            id="paper-visual-canvas"
            ref={envelopeAreaRef}
            className="w-full max-w-[420px] aspect-[1.4/1] bg-white rounded-xl shadow-2xl relative flex flex-col justify-between p-6 border-4 overflow-hidden select-none transition-all duration-300"
            style={{ 
              backgroundColor: paper.color,
              borderColor: paper.borderColor,
              borderWidth: `${paper.borderThickness || 2}px`,
              borderStyle: paper.cornerDecoration === 'none' ? 'solid' : 'double',
              boxShadow: `0 15px 35px rgba(0,0,0, ${(paper.shadow || 40) / 100 * 0.3})`
            }}
          >
            {/* Paper Type Texture Overlay effects */}
            {paper.paperType === 'parchment' && (
              <div className="absolute inset-0 pointer-events-none mix-blend-multiply transition-all duration-200" style={{
                backgroundImage: `url('https://www.transparenttextures.com/patterns/aged-paper.png')`,
                opacity: (paper.textureIntensity !== undefined ? paper.textureIntensity : 75) / 100 * 0.55
              }} />
            )}
            {paper.paperType === 'lined' && (
              <div className="absolute inset-0 pointer-events-none transition-all duration-200" style={{
                backgroundImage: 'linear-gradient(#7A4E2D 1px, transparent 1px)',
                backgroundSize: '100% 24px',
                marginTop: '32px',
                opacity: (paper.textureIntensity !== undefined ? paper.textureIntensity : 75) / 100 * 0.45
              }} />
            )}
            {paper.paperType === 'dotted' && (
              <div className="absolute inset-0 pointer-events-none transition-all duration-200" style={{
                backgroundImage: 'radial-gradient(#7A4E2D 1.5px, transparent 1.5px)',
                backgroundSize: '24px 24px',
                opacity: (paper.textureIntensity !== undefined ? paper.textureIntensity : 75) / 100 * 0.35
              }} />
            )}
            {paper.paperType === 'grid' && (
              <div className="absolute inset-0 pointer-events-none transition-all duration-200" style={{
                backgroundImage: 'linear-gradient(to right, #7A4E2D 1px, transparent 1px), linear-gradient(to bottom, #7A4E2D 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                opacity: (paper.textureIntensity !== undefined ? paper.textureIntensity : 75) / 100 * 0.25
              }} />
            )}
            {paper.paperType === 'tea' && (
              <>
                <div className="absolute inset-0 pointer-events-none transition-all duration-200" style={{
                  backgroundImage: `
                    radial-gradient(circle at 20% 25%, rgba(139, 90, 43, 0.25) 0%, transparent 45%),
                    radial-gradient(circle at 85% 75%, rgba(120, 80, 40, 0.20) 0%, transparent 40%),
                    radial-gradient(circle at 50% 50%, rgba(139, 90, 43, 0.14) 0%, transparent 60%)
                  `,
                  mixBlendMode: 'multiply',
                  opacity: (paper.textureIntensity !== undefined ? paper.textureIntensity : 75) / 100
                }} />
                <div className="absolute inset-0 pointer-events-none mix-blend-multiply transition-all duration-200" style={{
                  backgroundImage: `url('https://www.transparenttextures.com/patterns/rough-paper.png')`,
                  opacity: (paper.textureIntensity !== undefined ? paper.textureIntensity : 75) / 100 * 0.5
                }} />
              </>
            )}
            {paper.paperType === 'coffee' && (
              <>
                <div className="absolute inset-0 pointer-events-none transition-all duration-200" style={{
                  backgroundImage: `
                    radial-gradient(circle at 75% 20%, rgba(78, 54, 41, 0.3) 0%, transparent 35%),
                    radial-gradient(circle at 15% 80%, rgba(92, 64, 47, 0.25) 0%, transparent 45%),
                    radial-gradient(circle at 45% 45%, transparent 34%, rgba(78, 54, 41, 0.18) 36%, transparent 42%),
                    radial-gradient(circle at 60% 55%, rgba(60, 40, 25, 0.15) 0%, transparent 50%)
                  `,
                  mixBlendMode: 'multiply',
                  opacity: (paper.textureIntensity !== undefined ? paper.textureIntensity : 75) / 100
                }} />
                <div className="absolute inset-0 pointer-events-none mix-blend-multiply transition-all duration-200" style={{
                  backgroundImage: `url('https://www.transparenttextures.com/patterns/cardboard-flat.png')`,
                  opacity: (paper.textureIntensity !== undefined ? paper.textureIntensity : 75) / 100 * 0.55
                }} />
              </>
            )}
            {paper.paperType === 'washi' && (
              <>
                <div className="absolute inset-0 pointer-events-none mix-blend-multiply transition-all duration-200" style={{
                  backgroundImage: `url('https://www.transparenttextures.com/patterns/natural-paper.png')`,
                  opacity: (paper.textureIntensity !== undefined ? paper.textureIntensity : 75) / 100 * 0.7
                }} />
                <div className="absolute inset-0 pointer-events-none opacity-20 transition-all duration-200" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(212,175,55,0.06) 0px, rgba(212,175,55,0.06) 2px, transparent 2px, transparent 15px)',
                  opacity: (paper.textureIntensity !== undefined ? paper.textureIntensity : 75) / 100
                }} />
              </>
            )}
            {paper.paperType === 'handmade' && (
              <div className="absolute inset-0 pointer-events-none mix-blend-multiply transition-all duration-200" style={{
                backgroundImage: `url('https://www.transparenttextures.com/patterns/canvas-paper.png')`,
                opacity: (paper.textureIntensity !== undefined ? paper.textureIntensity : 75) / 100 * 0.75
              }} />
            )}
            {paper.paperType === 'plain' && (
              <div className="absolute inset-0 pointer-events-none mix-blend-multiply transition-all duration-200" style={{
                backgroundImage: `url('https://www.transparenttextures.com/patterns/beige-paper.png')`,
                opacity: (paper.textureIntensity !== undefined ? paper.textureIntensity : 75) / 100 * 0.15
              }} />
            )}

            {/* Inset Browning Edge Overlay */}
            {paper.agingEffect !== undefined && paper.agingEffect > 0 && (
              <div 
                className="absolute inset-0 pointer-events-none rounded-xl transition-all duration-200"
                style={{
                  boxShadow: `inset 0 0 ${paper.agingEffect * 0.55}px rgba(110, 65, 30, ${paper.agingEffect / 100 * 0.85})`,
                  mixBlendMode: 'multiply',
                  zIndex: 10
                }}
              />
            )}

            {/* Creases and folds lines */}
            {paper.foldMarks && (
              <>
                <div className="absolute inset-x-0 top-1/3 h-[1px] bg-[#7A4E2D]/15 pointer-events-none" />
                <div className="absolute inset-x-0 top-2/3 h-[1px] bg-[#7A4E2D]/15 pointer-events-none" />
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#7A4E2D]/15 pointer-events-none" />
              </>
            )}

            {/* Corner decorations overlays */}
            {paper.cornerDecoration === 'floral' && (
              <div className="absolute inset-2 border border-dashed border-[#8B0000]/25 rounded-lg pointer-events-none" />
            )}
            {paper.cornerDecoration === 'royal' && (
              <div className="absolute inset-2.5 border-2 border-double border-[#D4AF37]/50 pointer-events-none" />
            )}
            {paper.cornerDecoration === 'gilded' && (
              <div className="absolute inset-3 border-4 border-double border-[#D4AF37] pointer-events-none" />
            )}

            {/* Written contents inside draft preview */}
            <div className="absolute inset-6 flex flex-col justify-between pointer-events-none">
              <span className="text-[8px] font-mono opacity-50 block tracking-widest uppercase border-b border-[#7A4E2D]/15 pb-1 mb-2 select-none">
                Manuscript Draft
              </span>

              <div className="flex-1 relative overflow-hidden">
                {/* 1. TYPED CALLIGRAPHY LAYER */}
                {typedContent && (
                  <div 
                    id="paper-typed-layer"
                    className={`absolute inset-x-0 break-words whitespace-pre-wrap transition-all select-none ${activeTab === 'writing' && editorMode === 'typed' ? 'pointer-events-auto cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
                    style={{ 
                      fontFamily: selectedFont.fontClass || selectedFont.name,
                      color: textColor,
                      fontSize: `${Math.max(10, fontSize * 0.72)}px`,
                      fontWeight: bold ? 'bold' : 'normal',
                      fontStyle: italic ? 'italic' : 'normal',
                      textAlign: align,
                      transform: `translate(${typedPositionX}px, ${typedPositionY}px) rotate(${typedRotation || 0}deg)`,
                      transformOrigin: 'center center',
                      width: '100%',
                    }}
                    onMouseDown={(e) => {
                      if (activeTab === 'writing' && editorMode === 'typed') {
                        e.stopPropagation();
                        const isTouch = 'touches' in e;
                        const clientX = isTouch ? (e as any).touches[0].clientX : (e as any).clientX;
                        const clientY = isTouch ? (e as any).touches[0].clientY : (e as any).clientY;
                        setInteractionState({ type: 'dragging-typed-text' });
                        dragStartRef.current = {
                          startX: clientX,
                          startY: clientY,
                          initialX: typedPositionX,
                          initialY: typedPositionY
                        };
                      }
                    }}
                    onTouchStart={(e) => {
                      if (activeTab === 'writing' && editorMode === 'typed') {
                        e.stopPropagation();
                        const isTouch = 'touches' in e;
                        const clientX = isTouch ? (e as any).touches[0].clientX : (e as any).clientX;
                        const clientY = isTouch ? (e as any).touches[0].clientY : (e as any).clientY;
                        setInteractionState({ type: 'dragging-typed-text' });
                        dragStartRef.current = {
                          startX: clientX,
                          startY: clientY,
                          initialX: typedPositionX,
                          initialY: typedPositionY
                        };
                      }
                    }}
                  >
                    {typedContent}

                    {/* Active Typed Handles & Guidelines */}
                    {activeTab === 'writing' && editorMode === 'typed' && (
                      <>
                        {/* selection outline */}
                        <div className="absolute -inset-2 border border-dashed border-[#7A4E2D]/55 rounded pointer-events-none" />

                        {/* Top rotational handle */}
                        <button
                          id="typed-rotate-handle"
                          type="button"
                          className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#7A4E2D] border border-[#FAF3E8] flex items-center justify-center text-[9px] shadow hover:scale-105 active:scale-95 pointer-events-auto cursor-alias select-none"
                          title="Rotate Text"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const isTouch = 'touches' in e;
                            const clientX = isTouch ? (e as any).touches[0].clientX : (e as any).clientX;
                            const clientY = isTouch ? (e as any).touches[0].clientY : (e as any).clientY;
                            const rect = envelopeAreaRef.current?.getBoundingClientRect();
                            const centerX = rect ? rect.left + rect.width / 2 + typedPositionX : clientX;
                            const centerY = rect ? rect.top + rect.height / 2 + typedPositionY : clientY;
                            setInteractionState({ type: 'rotating-typed-text' });
                            dragStartRef.current = {
                              centerX,
                              centerY,
                              initialRotation: typedRotation || 0
                            };
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const isTouch = 'touches' in e;
                            const clientX = isTouch ? (e as any).touches[0].clientX : (e as any).clientX;
                            const clientY = isTouch ? (e as any).touches[0].clientY : (e as any).clientY;
                            const rect = envelopeAreaRef.current?.getBoundingClientRect();
                            const centerX = rect ? rect.left + rect.width / 2 + typedPositionX : clientX;
                            const centerY = rect ? rect.top + rect.height / 2 + typedPositionY : clientY;
                            setInteractionState({ type: 'rotating-typed-text' });
                            dragStartRef.current = {
                              centerX,
                              centerY,
                              initialRotation: typedRotation || 0
                            };
                          }}
                        >
                          🔄
                        </button>

                        {/* Bottom-right scale handle */}
                        <button
                          id="typed-resize-handle"
                          type="button"
                          className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-[#7A4E2D] border border-[#FAF3E8] flex items-center justify-center text-[7px] font-bold text-white shadow hover:scale-110 active:scale-90 pointer-events-auto cursor-se-resize select-none"
                          title="Resize font size"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const isTouch = 'touches' in e;
                            const clientX = isTouch ? (e as any).touches[0].clientX : (e as any).clientX;
                            const clientY = isTouch ? (e as any).touches[0].clientY : (e as any).clientY;
                            setInteractionState({ type: 'resizing-typed-text' });
                            dragStartRef.current = {
                              startX: clientX,
                              startY: clientY,
                              initialFontSize: fontSize
                            };
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const isTouch = 'touches' in e;
                            const clientX = isTouch ? (e as any).touches[0].clientX : (e as any).clientX;
                            const clientY = isTouch ? (e as any).touches[0].clientY : (e as any).clientY;
                            setInteractionState({ type: 'resizing-typed-text' });
                            dragStartRef.current = {
                              startX: clientX,
                              startY: clientY,
                              initialFontSize: fontSize
                            };
                          }}
                        >
                          📐
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* 2. HANDWRITING STROKES LAYER (SVG sync format mapped directly from 800x570 canvas) */}
                {strokes.length > 0 && (
                  <div
                    id="handwriting-wrapper"
                    className={`absolute inset-0 transition-all duration-75 ${activeTab === 'writing' && editorMode === 'handwritten' ? 'pointer-events-auto cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
                    style={{
                      transform: `translate(${handwritingPositionX}px, ${handwritingPositionY}px) scale(${handwritingScale})`,
                      transformOrigin: 'center center',
                    }}
                    onMouseDown={(e) => {
                      if (activeTab === 'writing' && editorMode === 'handwritten') {
                        e.stopPropagation();
                        const isTouch = 'touches' in e;
                        const clientX = isTouch ? (e as any).touches[0].clientX : (e as any).clientX;
                        const clientY = isTouch ? (e as any).touches[0].clientY : (e as any).clientY;
                        setInteractionState({ type: 'dragging-handwriting' });
                        dragStartRef.current = {
                          startX: clientX,
                          startY: clientY,
                          initialX: handwritingPositionX,
                          initialY: handwritingPositionY
                        };
                      }
                    }}
                    onTouchStart={(e) => {
                      if (activeTab === 'writing' && editorMode === 'handwritten') {
                        e.stopPropagation();
                        const isTouch = 'touches' in e;
                        const clientX = isTouch ? (e as any).touches[0].clientX : (e as any).clientX;
                        const clientY = isTouch ? (e as any).touches[0].clientY : (e as any).clientY;
                        setInteractionState({ type: 'dragging-handwriting' });
                        dragStartRef.current = {
                          startX: clientX,
                          startY: clientY,
                          initialX: handwritingPositionX,
                          initialY: handwritingPositionY
                        };
                      }
                    }}
                  >
                    <svg 
                      id="paper-handwriting-svg"
                      viewBox="0 0 800 570" 
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    >
                      <defs>
                        <mask id="eraser-mask-flat">
                          <rect x="0" y="0" width="800" height="570" fill="white" />
                          {strokes.filter(s => s.isEraser).map((stroke, index) => {
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
                      <g mask="url(#eraser-mask-flat)">
                        {strokes.filter(s => !s.isEraser).map((stroke, index) => {
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

                    {/* Handwriting active outline & scale handle */}
                    {activeTab === 'writing' && editorMode === 'handwritten' && (
                      <>
                        {/* selection outline */}
                        <div className="absolute inset-1 border border-dashed border-amber-600/50 rounded pointer-events-none" />

                        {/* Scale handle */}
                        <button
                          id="hw-resize-handle"
                          type="button"
                          className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-amber-600 border border-white shadow hover:bg-amber-700 active:scale-90 flex items-center justify-center cursor-se-resize text-[8px] text-white select-none pointer-events-auto"
                          title="Scale Handwriting"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const isTouch = 'touches' in e;
                            const clientX = isTouch ? (e as any).touches[0].clientX : (e as any).clientX;
                            const clientY = isTouch ? (e as any).touches[0].clientY : (e as any).clientY;
                            setInteractionState({ type: 'resizing-handwriting' });
                            dragStartRef.current = {
                              startX: clientX,
                              startY: clientY,
                              initialScale: handwritingScale
                            };
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const isTouch = 'touches' in e;
                            const clientX = isTouch ? (e as any).touches[0].clientX : (e as any).clientX;
                            const clientY = isTouch ? (e as any).touches[0].clientY : (e as any).clientY;
                            setInteractionState({ type: 'resizing-handwriting' });
                            dragStartRef.current = {
                              startX: clientX,
                              startY: clientY,
                              initialScale: handwritingScale
                            };
                          }}
                        >
                          📐
                        </button>
                      </>
                    )}
                  </div>
                )}

                {!typedContent && strokes.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-40">
                    <span className="text-xl">✍️</span>
                    <p className="text-[10px] font-mono mt-1">Empty Parchment</p>
                    <p className="text-[8px] font-mono">Add Calligraphy text or Quill strokes inside the desk...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : deliveryFormat === 'envelope' ? (
          <div 
            id="envelope-visual-canvas"
            ref={envelopeAreaRef}
            className="w-full max-w-[420px] aspect-[1.6/1] bg-white rounded-xl shadow-2xl relative flex flex-col justify-between p-5 border-4 transition-all duration-300 overflow-hidden select-none"
            style={{ 
              backgroundColor: envelope.color,
              borderColor: envelope.borderColor,
              borderStyle: envelope.borderStyle === 'vintage' ? 'double' : envelope.borderStyle
            }}
          >
            {/* Ribbons overlay markings */}
            {envelope.ribbonStyle !== 'none' && (
              <div className="absolute inset-0 pointer-events-none">
                {envelope.ribbonStyle === 'simple' && (
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-6 bg-[#D4AF37] border-y-2 border-black/15 shadow-sm opacity-90" />
                )}
                {envelope.ribbonStyle === 'crossed' && (
                  <>
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-6 bg-[#D4AF37] border-y-2 border-[#D4AF37]/40 shadow-sm opacity-90" />
                    <div className="absolute top-0 bottom-0 left-1/3 w-6 bg-[#D4AF37] border-x-2 border-[#D4AF37]/40 shadow-sm opacity-90" />
                  </>
                )}
                {envelope.ribbonStyle === 'royal' && (
                  <>
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-8 bg-[#8B0000] border-y-2 border-[#D4AF37] shadow-lg opacity-90" />
                    <div className="absolute top-0 bottom-0 left-1/4 w-8 bg-[#8B0000] border-x-2 border-[#D4AF37] shadow-lg opacity-90" />
                  </>
                )}
              </div>
            )}

            {/* Retro addressing label with drag, rotate, and scale handles */}
            <div 
              id="covers-address-label"
              className={`p-3 bg-[#EAD7B7]/95 border-2 border-[#7A4E2D] rounded-lg shadow-md max-w-[180px] absolute cursor-grab active:cursor-grabbing z-15`}
              style={{
                left: `${envelope.addressX !== undefined ? envelope.addressX : 30}%`,
                top: `${envelope.addressY !== undefined ? envelope.addressY : 40}%`,
                transform: `translate(-50%, -50%) scale(${envelope.addressScale !== undefined ? envelope.addressScale : 1.0}) rotate(${envelope.addressRotation !== undefined ? envelope.addressRotation : 0}deg)`,
              }}
              onMouseDown={(e) => {
                if (activeTab !== 'envelope') return;
                e.stopPropagation();
                setInteractionState({ type: 'dragging-address' });
              }}
              onTouchStart={(e) => {
                if (activeTab !== 'envelope') return;
                e.stopPropagation();
                setInteractionState({ type: 'dragging-address' });
              }}
            >
              <span className="text-[7px] font-mono block opacity-60 uppercase select-none pointer-events-none">DELIVER TO:</span>
              <p className="font-serif text-[11px] font-bold leading-tight line-clamp-2 select-none pointer-events-none">{envelope.addressLabel || 'Recipient name'}</p>

              {/* Handles for scale and rotation (Only visible in covers editing mode) */}
              {activeTab === 'envelope' && (
                <>
                  {/* Selection dashed frame */}
                  <div className="absolute -inset-1 border border-dashed border-yellow-500 rounded pointer-events-none" />
                  
                  {/* Rotate handle top center */}
                  <button
                    id="address-rotate-handle"
                    type="button"
                    className="absolute -top-5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#7A4E2D] border border-white flex items-center justify-center text-[8px] pointer-events-auto shadow-md"
                    title="Rotate Address"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setInteractionState({ type: 'rotating-address' });
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setInteractionState({ type: 'rotating-address' });
                    }}
                  >
                    🔄
                  </button>

                  {/* Scale resize handle bottom right */}
                  <button
                    id="address-resize-handle"
                    type="button"
                    className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border border-white flex items-center justify-center text-[7px] text-white pointer-events-auto shadow"
                    title="Scale Address"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setInteractionState({ type: 'resizing-address' });
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setInteractionState({ type: 'resizing-address' });
                    }}
                  >
                    ↔️
                  </button>
                </>
              )}
            </div>

            {/* Draggable stamps with high-fidelity rotation and resize capabilities */}
            {envelope.stamps.map((stamp, idx) => {
              const staticStamp = STAMPS_LIBRARY.find(s => s.id === stamp.designId);
              return (
                <div
                  id={`placed-stamp-wrapper-${stamp.id}`}
                  key={stamp.id}
                  className="absolute cursor-grab active:cursor-grabbing z-25"
                  style={{
                    left: `${stamp.x !== undefined ? stamp.x : 75}%`,
                    top: `${stamp.y !== undefined ? stamp.y : 22}%`,
                    transform: `translate(-50%, -50%) rotate(${stamp.rotation}deg) scale(${stamp.scale})`
                  }}
                  onMouseDown={(e) => {
                    if (activeTab !== 'envelope') return;
                    e.stopPropagation();
                    setActiveStampIndex(idx);
                    setInteractionState({ type: `dragging-stamp-${idx}` });
                  }}
                  onTouchStart={(e) => {
                    if (activeTab !== 'envelope') return;
                    e.stopPropagation();
                    setActiveStampIndex(idx);
                    setInteractionState({ type: `dragging-stamp-${idx}` });
                  }}
                >
                  <button
                    id={`active-stamp-${stamp.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveStampIndex(idx);
                    }}
                    className={`p-1 bg-white border border-dashed border-[#a67c52] rounded shadow-md relative transition-all ${
                      activeStampIndex === idx ? 'ring-2 ring-yellow-400 bg-yellow-50/50' : 'hover:scale-[1.03]'
                    }`}
                  >
                    <span className="text-lg select-none block leading-none">{staticStamp?.icon || '✉️'}</span>
                    <span className="text-[6px] font-mono text-[#7A4E2D] block text-center leading-none mt-0.5">{staticStamp?.price || '3d'}</span>
                  </button>

                  {/* ACTIVE FLIGHT HANDLES (Only visible in covers editing mode when stamp is selected) */}
                  {activeTab === 'envelope' && activeStampIndex === idx && (
                    <>
                      {/* Visual boundary */}
                      <div className="absolute -inset-1 border border-dashed border-yellow-400 pointer-events-none" />

                      {/* Rotational pivot */}
                      <button
                        id={`stamp-${idx}-rotate-handle`}
                        type="button"
                        className="absolute -top-4.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#7A4E2D] border border-white flex items-center justify-center text-[7px] pointer-events-auto shadow-md"
                        title="Rotate Stamp"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setInteractionState({ type: `rotating-stamp-${idx}` });
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setInteractionState({ type: `rotating-stamp-${idx}` });
                        }}
                      >
                        🔄
                      </button>

                      {/* Scale element */}
                      <button
                        id={`stamp-${idx}-resize-handle`}
                        type="button"
                        className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border border-white flex items-center justify-center text-[6px] text-white pointer-events-auto shadow"
                        title="Scale Stamp"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setInteractionState({ type: `resizing-stamp-${idx}` });
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setInteractionState({ type: `resizing-stamp-${idx}` });
                        }}
                      >
                        ↔️
                      </button>
                    </>
                  )}
                </div>
              );
            })}

            {/* Central interactive wax seal */}
            {envelope.waxSealDesign !== 'hidden' && (
              <div 
                id="draggable-wax-seal"
                className="absolute z-30 select-none cursor-grab active:cursor-grabbing"
                style={{ 
                  left: `${sealX}%`, 
                  top: `${sealY}%`,
                  transform: `translate(-50%, -50%) rotate(${sealRotation}deg) scale(${sealScale})`,
                  width: '56px',
                  height: '56px'
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setInteractionState({ type: 'dragging' });
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setInteractionState({ type: 'dragging' });
                }}
              >
                {/* Circular wax body shell */}
                <div 
                  className={`w-full h-full rounded-full flex items-center justify-center text-xl wax-seal-depth shadow-lg border border-black/10 relative transition-transform ${
                    activeTab === 'waxseal' ? 'ring-2 ring-yellow-400 ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: envelope.waxSealColor }}
                >
                  <span className="select-none text-white brightness-90 filter drop-shadow">
                    {envelope.waxSealDesign === 'crown' && '👑'}
                    {envelope.waxSealDesign === 'rose' && '🌹'}
                    {envelope.waxSealDesign === 'heart' && '❤️'}
                    {envelope.waxSealDesign === 'initials' && '⚜️'}
                    {envelope.waxSealDesign === 'moon' && '🌙'}
                    {envelope.waxSealDesign === 'tree' && '🌲'}
                    {envelope.waxSealDesign === 'compass' && '🧭'}
                    {envelope.waxSealDesign === 'custom' && (envelope.customInsigniaEmoji || '✨')}
                  </span>
                  
                  {/* Embedded inner depth ring */}
                  <div className="absolute inset-2 rounded-full border border-white/20 pointer-events-none" />
                </div>

                {/* ACTIVE DESIGN HANDLES & GUIDELINES (Hidden when activeTab is not 'waxseal') */}
                {activeTab === 'waxseal' && (
                  <>
                    {/* Visual dashed selection outline bounds */}
                    <div className="absolute -inset-1.5 border-2 border-dashed border-yellow-400/70 rounded-full pointer-events-none" />

                    {/* Top rotational indicator handle */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-yellow-400 pointer-events-none" />
                    <button
                      id="seal-rotate-handle"
                      type="button"
                      className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#7A4E2D] border-2 border-white shadow-md active:scale-95 flex items-center justify-center cursor-alias text-[10px]"
                      title="Rotate Seal"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setInteractionState({ type: 'rotating' });
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setInteractionState({ type: 'rotating' });
                      }}
                    >
                      🔄
                    </button>

                    {/* Corner resize scale handle */}
                    <button
                      id="seal-resize-handle"
                      type="button"
                      className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-amber-500 border border-white shadow hover:bg-amber-600 active:scale-90 flex items-center justify-center cursor-se-resize -mr-1 -mb-1 text-[8px] text-white select-none !pointer-events-auto"
                      title="Resize Scale"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setInteractionState({ type: 'resizing' });
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setInteractionState({ type: 'resizing' });
                      }}
                    >
                      ↔️
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Symmetrical calligraphy scroll visualizer with support for multi-layout elements and dynamic wood/metal textures, plus side-by-side closed cover preview */
          <div className="w-full h-full flex flex-col xl:flex-row items-center justify-center gap-6 xl:gap-8 max-w-full px-2 animate-fade-in">
            {/* The Letter Scroll Preview (Unrolled) */}
            <div 
              id="envelope-visual-canvas"
              ref={envelopeAreaRef}
              className="w-full max-w-[340px] md:max-w-[380px] xl:max-w-[350px] aspect-[1.35/1] relative flex flex-col items-center justify-center bg-transparent select-none animate-fade-in"
            >
              {/* Scroll top bar roller holder with custom metal or wooden materials */}
              <div 
                className={`w-[85%] h-5 rounded-full shadow-lg flex justify-between px-2 items-center relative overflow-hidden border-2 z-10 ${
                  scroll.outerCoverType === 'metal' ? 'border-zinc-300' : 'border-[#3e2723]'
                }`}
                style={{
                  backgroundColor: scroll.scrollOuterColor || (scroll.material === 'gold' ? '#D4AF37' : scroll.material === 'silver' ? '#C0C0C0' : scroll.material === 'marble' ? '#FAF6F0' : '#4E3629')
                }}
              >
                {/* Material texture overlays */}
                {scroll.outerCoverType === 'metal' ? (
                  <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-transparent to-black/25 pointer-events-none" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-white/5 to-black/15 pointer-events-none" />
                )}
                <div className={`w-3.5 h-3.5 rounded-full border ${scroll.outerCoverType === 'metal' ? 'bg-zinc-400 border-white/45' : 'bg-amber-800 border-[#3e2723]/30'}`} />
                <div className={`w-3.5 h-3.5 rounded-full border ${scroll.outerCoverType === 'metal' ? 'bg-zinc-400 border-white/45' : 'bg-amber-800 border-[#3e2723]/30'}`} />
              </div>

              {/* Scroll paper body with layered dual text + handwriting strokes canvas sync */}
              <div 
                className="w-[78%] flex-1 bg-[#F7E7C6] border-x-4 border-double border-[#7A4E2D] shadow-xl relative overflow-hidden transition-all duration-300 flex flex-col p-4"
                style={{ 
                  backgroundColor: scroll.paperColor,
                  opacity: 0.96 
                }}
              >
                {/* Decorative edge line bindings */}
                {scroll.decorativeEdges && (
                  <div className="absolute inset-y-0 left-1 right-1 border-x-2 border-dashed border-[#7A4E2D]/45 pointer-events-none" />
                )}
                
                {/* Fold mark crease overlay */}
                <div className="absolute inset-0 crease-overlay pointer-events-none" />

                <span className="text-[10px] font-mono opacity-50 block tracking-wide border-b border-black/10 pb-0.5 select-none">EST. LEDGER SCROLL</span>

                {/* Render dynamic parchment content with dual layout synchronization */}
                <div className="mt-2.5 flex-1 relative overflow-hidden">
                  {/* 1. TYPED CALLIGRAPHY LAYER */}
                  {typedContent && (
                    <div 
                      id="scroll-typed-layer"
                      className="absolute inset-x-0 break-words whitespace-pre-wrap transition-all select-none"
                      style={{ 
                        fontFamily: selectedFont.fontClass || selectedFont.name,
                        color: textColor,
                        fontSize: `${Math.max(8, fontSize * 0.45)}px`, 
                        fontWeight: bold ? 'bold' : 'normal',
                        fontStyle: italic ? 'italic' : 'normal',
                        textAlign: align,
                        transform: `translate(${typedPositionX * 0.5}px, ${typedPositionY * 0.5}px) rotate(${typedRotation || 0}deg)`,
                        width: '100%',
                      }}
                    >
                      {typedContent}
                    </div>
                  )}

                  {/* 2. HANDWRITING STROKES LAYER (SVG sync format mapped directly from 800x570 canvas) */}
                  {strokes.length > 0 && (
                    <svg 
                      id="scroll-handwriting-svg"
                      viewBox="0 0 800 570" 
                      className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-75"
                      style={{
                        transform: `translate(${handwritingPositionX * 0.5}px, ${handwritingPositionY * 0.5}px) scale(${handwritingScale * 0.82})`,
                        transformOrigin: 'center center',
                      }}
                    >
                      <defs>
                        <mask id="eraser-mask-scroll">
                          <rect x="0" y="0" width="800" height="570" fill="white" />
                          {strokes.filter(s => s.isEraser).map((stroke, index) => {
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
                      <g mask="url(#eraser-mask-scroll)">
                        {strokes.filter(s => !s.isEraser).map((stroke, index) => {
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

                  {!typedContent && strokes.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-40">
                      <span className="text-sm">✍️</span>
                      <p className="text-[9px] font-mono mt-1">Empty Scroll</p>
                    </div>
                  )}
                </div>

                {/* Central interactive elements overlay (Removed address label, stamps and wax seals on scrolls) */}
              </div>

              {/* Scroll bottom roller bar holder with custom metal or wooden materials */}
              <div 
                className={`w-[85%] h-5 rounded-full shadow-lg flex justify-between px-2 items-center relative overflow-hidden border-2 z-10 ${
                  scroll.outerCoverType === 'metal' ? 'border-zinc-300' : 'border-[#3e2723]'
                }`}
                style={{
                  backgroundColor: scroll.scrollOuterColor || (scroll.material === 'gold' ? '#D4AF37' : scroll.material === 'silver' ? '#C0C0C0' : scroll.material === 'marble' ? '#FAF6F0' : '#4E3629')
                }}
              >
                {/* Material texture overlays */}
                {scroll.outerCoverType === 'metal' ? (
                  <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-transparent to-black/25 pointer-events-none" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-white/5 to-black/15 pointer-events-none" />
                )}
                <div className={`w-3.5 h-3.5 rounded-full border ${scroll.outerCoverType === 'metal' ? 'bg-zinc-400 border-white/45' : 'bg-amber-800 border-[#3e2723]/30'}`} />
                <div className={`w-3.5 h-3.5 rounded-full border ${scroll.outerCoverType === 'metal' ? 'bg-zinc-400 border-white/45' : 'bg-amber-800 border-[#3e2723]/30'}`} />
              </div>
            </div>

            {/* Scroll Outer Presentation Cover Preview (Closed Capsule) */}
            <div className="flex flex-col items-center gap-3 p-4 bg-[#FAF3E8]/85 border-2 border-[#7A4E2D]/45 rounded-2xl w-full max-w-[240px] md:max-w-[260px] shadow-md animate-fade-in relative">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#7A4E2D] font-bold text-center flex items-center gap-1.5 select-none">
                📁 Closed Capsule Cover
              </span>
              
              {/* Outer cylinder presentation box with wooden/metallic styling and custom outer color */}
              <div 
                className={`w-48 h-12 rounded-full relative flex items-center justify-center shadow-lg overflow-hidden border-4 transition-all duration-300 ${
                  scroll.outerCoverType === 'metal' ? 'border-zinc-300' : 'border-[#2e1e12]'
                }`}
                style={{
                  backgroundColor: scroll.scrollOuterColor || (scroll.material === 'gold' ? '#D4AF37' : scroll.material === 'silver' ? '#C0C0C0' : scroll.material === 'marble' ? '#FAF6F0' : '#8B6B4A')
                }}
              >
                {/* Visual gradients for realistic wood vs metal textures */}
                {scroll.outerCoverType === 'metal' ? (
                  <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-black/30 pointer-events-none" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-white/5 to-black/20 pointer-events-none" />
                )}

                {/* Ancient engravings lining */}
                <div className="absolute inset-y-1 inset-x-3 border-y border-[#FAF3E8]/30 font-serif text-[7px] flex justify-between px-1.5 items-center text-[#FAF3E8] z-10 select-none">
                  <span>✨</span>
                  <span className="uppercase tracking-widest text-[8px] font-bold">
                    {scroll.outerCoverType === 'metal' ? '⚙️ METAL' : '🌲 WOODEN'} VAULT
                  </span>
                  <span>✨</span>
                </div>
                {/* Outer lid cap */}
                <div 
                  className={`absolute right-0 top-[-2px] bottom-[-2px] w-5 rounded-r-full border-y-2 border-r-2 transition-all ${
                    scroll.outerCoverType === 'metal' ? 'border-[#FAF3E8]/40' : 'border-[#2e1e12]'
                  }`}
                  style={{
                    backgroundColor: scroll.scrollOuterColor ? `${scroll.scrollOuterColor}dd` : '#D4AF37'
                  }}
                />
              </div>

              {/* Status details indicators showing wood/metal parameters and accents */}
              <div className="w-full text-[9px] font-mono text-[#7A4E2D] tracking-wide border-t border-[#7A4E2D]/15 pt-2 mt-1 space-y-1 select-none">
                <div className="flex justify-between items-center">
                  <span className="opacity-75">Base Hue:</span>
                  <div className="flex items-center gap-1">
                    <div 
                      className="w-2.5 h-2.5 rounded-full border border-[#7A4E2D]/40" 
                      style={{ backgroundColor: scroll.scrollOuterColor || '#4E3629' }} 
                    />
                    <strong className="text-[#8B0000] uppercase text-[8px]">{scroll.scrollOuterColor || '#4E3629'}</strong>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-75">Cover Material:</span>
                  <strong className="text-[#8B0000] capitalize text-[8px]">{scroll.material || 'Standard'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-75">Outer Type:</span>
                  <strong className="text-[#8B0000] capitalize text-[8px]">{scroll.outerCoverType || 'Wooden'}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5 bg-[#FAF3E8]/85 px-4 py-1.5 rounded-full border border-[#7A4E2D]/20 shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#7A4E2D] font-bold">LIVE DRAFT PREVIEW</span>
        </div>


      </div>

      {/* Immersive effects overlay for real-time live previewing */}
      <EffectsOverlay
        active={effectsPreviewActive}
        settings={effects}
        onComplete={() => setEffectsPreviewActive(false)}
      />

    </div>
  );
}
