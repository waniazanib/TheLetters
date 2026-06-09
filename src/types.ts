/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DeliveryFormatType = 'envelope' | 'scroll';

export type EnvelopeStyle =
  | 'modern'
  | 'vintage'
  | 'love_letter'
  | 'royal'
  | 'minimal'
  | 'floral'
  | 'luxury'
  | 'handcrafted';

export type ScrollMaterial =
  | 'silver'
  | 'gold'
  | 'bronze'
  | 'copper'
  | 'bamboo'
  | 'walnut'
  | 'ebony'
  | 'marble';

export type ScrollEngraving =
  | 'none'
  | 'floral'
  | 'royal'
  | 'celtic'
  | 'arabic'
  | 'geometric'
  | 'ancient';

export interface PaperSettings {
  paperType: string; // 'plain', 'lined', 'dotted', 'grid', 'parchment', etc.
  color: string;
  textureIntensity: number; // 0 to 100
  borderColor: string;
  borderThickness: number; // in pixels
  cornerDecoration: 'none' | 'vintage' | 'royal' | 'floral' | 'gilded';
  opacity: number; // 0 to 100
  shadow: number; // 0 to 100
  agingEffect: number; // 0 to 100
  foldMarks: boolean;
  creases: boolean;
}

export interface EnvelopeSettings {
  envelopeStyle: EnvelopeStyle;
  color: string;
  borderColor: string;
  borderStyle: 'solid' | 'dashed' | 'double' | 'vintage';
  texture: string;
  addressLabel: string;
  decorativeCorners: boolean;
  patternOverlay: 'none' | 'damask' | 'stars' | 'stripes' | 'vintage';
  ribbonStyle: 'none' | 'simple' | 'crossed' | 'royal';
  waxSealColor: string; // red, gold, silver, black, emerald, sapphire
  waxSealDesign: string; // crown, rose, heart, initials, moon, tree, compass, none, custom
  stamps: PlacedStamp[];
  sealX?: number; // percentage left (0 to 100)
  sealY?: number; // percentage top (0 to 100)
  sealScale?: number; // 0.5 to 2.5
  sealRotation?: number; // in degrees
  customInsigniaEmoji?: string; // custom emoji symbol used for engraving
  addressX?: number; // percentage left
  addressY?: number; // percentage top
  addressScale?: number;
  addressRotation?: number;
}

export interface PlacedStamp {
  id: string; // unique instance ID
  designId: string; // ref to static stamp design
  x: number; // percentage left (0 to 100)
  y: number; // percentage top (0 to 100)
  scale: number; // 0.5 to 1.5
  rotation: number; // in degrees
}

export interface ScrollSettings {
  material: ScrollMaterial;
  engraving: ScrollEngraving;
  paperColor: string;
  paperTexture: string;
  scrollWidth: number; // e.g. percentage or width factor
  aging: number; // 0 to 100
  decorativeEdges: boolean;
  scrollOuterColor?: string; // custom Outer Cover Color
  outerCoverType?: 'metal' | 'wooden' | 'none'; // instead of ribbon binding, user can choose metal or wooden outer cover
}

export interface VisualEffectsSettings {
  effectType: 'none' | 'confetti' | 'sparkles' | 'stars' | 'hearts' | 'rose_petals' | 'fireflies' | 'snow' | 'sakura' | 'lanterns' | 'golden_dust';
  intensity: number; // 1 to 5
  duration: number; // in seconds
  density: number; // particles quantity
}

export interface StrokePoint {
  x: number;
  y: number;
}

export interface HandwritingStroke {
  points: StrokePoint[];
  color: string;
  thickness: number;
  isEraser?: boolean;
}

export type SenderType = 'anonymous' | 'nickname' | 'verified';

export interface Letter {
  id: string;
  title: string;
  senderId: string; // 'guest' or uid
  senderName: string;
  senderType: SenderType;
  deliveryFormat: DeliveryFormatType;
  themeId: string;
  paperSettings: PaperSettings;
  envelopeSettings: EnvelopeSettings;
  scrollSettings: ScrollSettings;
  typedContent: string;
  fontName?: string;
  fontSize?: number;
  textColor?: string;
  italic?: boolean;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  typedPositionX?: number;
  typedPositionY?: number;
  typedRotation?: number;
  handwritingScale?: number;
  handwritingPositionX?: number;
  handwritingPositionY?: number;
  handwritingStrokes: HandwritingStroke[];
  effects: VisualEffectsSettings;
  audio: 'none' | 'piano' | 'rain' | 'ocean' | 'fireplace' | 'forest' | 'chimes';
  audioEnabled: boolean;
  deliveryTimeType: 'immediate' | 'delayed';
  deliveryTime: string; // ISO string when it unlocks
  oneTimeView: boolean;
  viewCount: number;
  createdAt: string;
  isFavorite?: boolean;
  isDraft?: boolean;
}

export interface LetterTheme {
  id: string;
  name: string;
  background: string;
  paperColor: string;
  primary: string;
  secondary: string;
  accent: string;
  goldAccent: string;
  text: string;
  feel: string;
  recommendedFor: string;
}

export interface StaticStamp {
  id: string;
  name: string;
  category: 'historical' | 'nature' | 'romance' | 'fantasy' | 'travel' | 'seasonal';
  icon: string; // Lucide icon name or emoji representer
  country?: string;
  price?: string;
  color: string;
}
