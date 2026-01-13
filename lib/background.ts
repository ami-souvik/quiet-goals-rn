import { Mood } from './moods';
import {getImageCssFilter} from './filters';

export function getGradientId(mood: Mood) {
  return `grad-${mood.id}`;
}

export function getNoiseId(mood: Mood) {
  return `noise-${mood.id}`;
}

export function getVignetteId(mood: Mood) {
  return `vignette-${mood.id}`;
}

export function generateBackgroundDefs(mood: Mood): string {
  const bg = mood.background;
  const gradId = getGradientId(mood);
  const noiseId = getNoiseId(mood);
  const vignetteId = getVignetteId(mood);

  // 1. Main Gradient
  let gradientDef = '';
  const stops = bg.stops
    .map((s) => `<stop offset="${s.offset}%" stop-color="${s.color}" />`)
    .join('\n');

  if (bg.type === 'linear') {
    gradientDef = `
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1" gradientTransform="rotate(${bg.angle || 0} 0.5 0.5)">
        ${stops}
      </linearGradient>
    `;
  } else {
    gradientDef = `
      <radialGradient id="${gradId}" cx="${bg.cx || 50}%" cy="${bg.cy || 50}%" r="80%">
        ${stops}
      </radialGradient>
    `;
  }

  // 2. Noise Filter
  const noiseFilter = `
    <filter id="${noiseId}">
      <feTurbulence 
        type="fractalNoise" 
        baseFrequency="${0.8 * (bg.noiseScale || 1)}" 
        numOctaves="3" 
        stitchTiles="stitch" 
      />
      <feColorMatrix type="saturate" values="0" />
    </filter>
  `;

  // 3. Vignette Gradient
  const vignetteDef = `
    <radialGradient id="${vignetteId}" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000" stop-opacity="${bg.vignetteStrength}" />
    </radialGradient>
  `;

  return `
    ${gradientDef}
    ${noiseFilter}
    ${vignetteDef}
  `;
}

export function generateBackgroundRects(mood: Mood, imageUrl?: string | null): string {
  const gradId = getGradientId(mood);
  const noiseId = getNoiseId(mood);
  const vignetteId = getVignetteId(mood);

  let baseLayer = '';
  let imageLayer = '';
  let overlayLayer = '';

  if (imageUrl) {
      // IMAGE MODE
      // Note: CSS filters (blur/saturate) in 'style' prop might not be fully supported in React Native SVG.
      // We keep it for now, but native support varies.
      // To strictly support blur in SVG we'd need <filter> definitions applied to the image.
      const cssFilter = getImageCssFilter(mood); 
      
      imageLayer = `<image href="${imageUrl}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />`;
      
      // Color Overlay
      overlayLayer = `<rect width="100%" height="100%" fill="${mood.image.overlayColor}" fill-opacity="${mood.image.overlayOpacity}" />`;
  } else {
      // PROCEDURAL MODE
      baseLayer = `<rect width="100%" height="100%" fill="url(#${gradId})" />`;
      
      // Noise Overlay
      overlayLayer = mood.background.grainOpacity > 0 
        ? `<rect width="100%" height="100%" filter="url(#${noiseId})" opacity="${mood.background.grainOpacity}" />`
        : '';
  }

  // Vignette Overlay (Always applied if strength > 0)
  const vignetteLayer = mood.background.vignetteStrength > 0
    ? `<rect width="100%" height="100%" fill="url(#${vignetteId})" />`
    : '';

  return `
    ${baseLayer}
    ${imageLayer}
    ${overlayLayer}
    ${vignetteLayer}
  `;
}
