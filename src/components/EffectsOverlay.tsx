/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { VisualEffectsSettings } from '../types';

interface EffectsOverlayProps {
  settings: VisualEffectsSettings;
  active: boolean;
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  symbol?: string;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
  wobble: number;
  wobbleSpeed: number;
}

export default function EffectsOverlay({ settings, active, onComplete }: EffectsOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const effectType = settings?.effectType || 'none';
  const intensity = settings?.intensity || 3;
  const duration = settings?.duration || 5;
  const density = settings?.density || 40;

  useEffect(() => {
    if (!active) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle Resize
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial parameters based on intensity and density
    const particleList: Particle[] = [];
    const maxParticles = (density || 50) * (intensity || 3);
    
    // Select color palette
    const getColors = () => {
      switch (effectType) {
        case 'rose_petals':
          return ['#E11D48', '#FB7185', '#BE123C', '#F43F5E', '#FDA4AF'];
        case 'sakura':
          return ['#FFB7C5', '#FFC0CB', '#FFD1DC', '#FFF0F5', '#FA8072'];
        case 'snow':
          return ['#FFFFFF', '#E0F2FE', '#F0F9FF', '#BAE6FD'];
        case 'stars':
        case 'sparkles':
        case 'golden_dust':
          return ['#D4AF37', '#FFDF00', '#ECE5B6', '#FFFDD0', '#FFFDF0'];
        case 'fireflies':
          return ['#CCFF00', '#ADFF2F', '#93C5FD', '#FDE047', '#A7F3D0'];
        case 'hearts':
          return ['#E11D48', '#FF69B4', '#FF1493', '#FFC0CB', '#8B0000'];
        case 'lanterns':
          return ['#EA580C', '#F97316', '#FDBA74', '#EF4444', '#E11D48'];
        case 'confetti':
        default:
          return ['#E11D48', '#FFD400', '#0099FF', '#22C55E', '#A855F7', '#EC4899', '#3B82F6'];
      }
    };

    const colors = getColors();

    const createParticle = (initTop = false): Particle => {
      const sizeBase = effectType === 'lanterns' ? 18 : effectType === 'rose_petals' ? 12 : effectType === 'sakura' ? 10 : 5;
      const sizeMultiplier = 0.5 + Math.random() * 1.5;
      const size = sizeBase * sizeMultiplier;
      
      const x = Math.random() * canvas.width;
      // Start from top (or bottom for fireflies/lanterns)
      let y = 0;
      if (initTop) {
        y = Math.random() * canvas.height;
      } else {
        y = (effectType === 'fireflies' || effectType === 'lanterns') 
          ? canvas.height + 20 
          : -20;
      }

      // Physics based on intensities
      let vx = (Math.random() - 0.5) * intensity;
      let vy = 0;

      if (effectType === 'fireflies' || effectType === 'lanterns') {
        vy = -(0.5 + Math.random() * intensity * 0.4); // upward
      } else {
        vy = (1 + Math.random() * intensity * 0.8); // downward gravity
      }

      // Custom wind / drifts
      if (effectType === 'sakura' || effectType === 'rose_petals') {
        vx = 1 + Math.random() * 2; // steady drift to right
      }

      const color = colors[Math.floor(Math.random() * colors.length)];
      const maxLife = 100 + Math.random() * 150;
      const life = initTop ? Math.floor(Math.random() * maxLife * 0.6) : 0;

      return {
        x,
        y,
        vx,
        vy,
        size,
        color,
        opacity: Math.random() * 0.6 + 0.4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        life,
        maxLife,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.08
      };
    };

    // Pre-populate half particles
    for (let i = 0; i < maxParticles / 2; i++) {
      particleList.push(createParticle(true));
    }

    let animationId: number;
    const durationMs = (duration || 6) * 1000;
    const startTime = Date.now();

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const elapsed = Date.now() - startTime;
      
      // Stop creating new particles close to expiration
      const ending = elapsed > durationMs - 1500;

      if (elapsed > durationMs) {
        if (onComplete) onComplete();
        return;
      }

      // Add particles if buffer below capacity
      if (particleList.length < maxParticles && !ending && Math.random() < 0.4) {
        particleList.push(createParticle(false));
      }

      for (let i = particleList.length - 1; i >= 0; i--) {
        const p = particleList[i];
        p.life++;

        // Update Physics
        p.wobble += p.wobbleSpeed;
        p.rotation += p.rotationSpeed;
        
        let dx = p.vx;
        if (effectType === 'sakura' || effectType === 'rose_petals' || effectType === 'snow') {
          dx += Math.sin(p.wobble) * 1.5; // flutter
        }

        p.x += dx;
        p.y += p.vy;

        // Life fading
        const lifeFraction = p.life / p.maxLife;
        let pOpacity = p.opacity;
        if (lifeFraction > 0.7) {
          pOpacity *= (1 - lifeFraction) / 0.3;
        }

        // Global duration fading
        const globalFade = elapsed > durationMs - 1000 ? (durationMs - elapsed) / 1000 : 1;
        pOpacity *= Math.max(0, globalFade);

        if (pOpacity <= 0 || p.x < -40 || p.x > canvas.width + 40 || p.y < -40 || p.y > canvas.height + 40 || p.life >= p.maxLife) {
          particleList.splice(i, 1);
          continue;
        }

        // Draw individual effects
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = pOpacity;

        if (effectType === 'confetti') {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2);
        } else if (effectType === 'hearts') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, p.size / 4);
          ctx.bezierCurveTo(-p.size / 2, -p.size / 2, -p.size, p.size / 3, 0, p.size);
          ctx.bezierCurveTo(p.size, p.size / 3, p.size / 2, -p.size / 2, 0, p.size / 4);
          ctx.fill();
        } else if (effectType === 'sakura' || effectType === 'rose_petals') {
          ctx.fillStyle = p.color;
          // Organic leaf shape
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size / 1.6, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (effectType === 'stars' || effectType === 'sparkles') {
          ctx.fillStyle = p.color;
          // Shimmering 4-point star
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.quadraticCurveTo(0, 0, p.size, 0);
          ctx.quadraticCurveTo(0, 0, 0, p.size);
          ctx.quadraticCurveTo(0, 0, -p.size, 0);
          ctx.quadraticCurveTo(0, 0, 0, -p.size);
          ctx.fill();
        } else if (effectType === 'lanterns') {
          // Warm glowing paper lanterns
          ctx.shadowBlur = 15;
          ctx.shadowColor = 'rgba(234, 88, 12, 0.6)';
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.roundRect(-p.size / 2, -p.size * 0.7, p.size, p.size * 1.4, 4);
          ctx.fill();
          // Black tassel/rim
          ctx.fillStyle = '#1A0D00';
          ctx.fillRect(-p.size / 2, -p.size * 0.75, p.size, p.size * 0.1);
          ctx.fillRect(-p.size / 2, p.size * 0.65, p.size, p.size * 0.1);
          // Hanging light
          ctx.fillStyle = '#FFEAA7';
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.35, 0, Math.PI * 2);
          ctx.fill();
        } else if (effectType === 'fireflies' || effectType === 'golden_dust') {
          const glowRad = p.size * (effectType === 'fireflies' ? 3.5 : 1.5);
          const radGrad = ctx.createRadialGradient(0, 0, p.size * 0.2, 0, 0, glowRad);
          radGrad.addColorStop(0, '#FFFFFF');
          radGrad.addColorStop(0.2, p.color);
          radGrad.addColorStop(1, 'transparent');

          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.arc(0, 0, glowRad, 0, Math.PI * 2);
          ctx.fill();
        } else if (effectType === 'snow') {
          // Soft rounded snowflake
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowBlur = 4;
          ctx.shadowColor = 'rgba(255,255,255,0.5)';
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [active, effectType, intensity, duration, density]);

  if (effectType === 'none') return null;

  return (
    <canvas
      id="effects-canvas"
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999] w-full h-full"
      style={{ display: active ? 'block' : 'none' }}
    />
  );
}
