import { getMood } from './moods';
import { getVariant } from './variants';
import { wrapText, calculateFontSize } from './layout';
import { generateBackgroundDefs, generateBackgroundRects } from './background';

interface GenerateSvgParams {
  text: string;
  moodId: string;
  variantId: string;
  width: number;
  height: number;
  backgroundImage?: string | null;
}

export function generateSvg({
  text,
  moodId,
  variantId,
  width,
  height,
  backgroundImage = null
}: GenerateSvgParams): string {
  const mood = getMood(moodId);
  const variant = getVariant(variantId);

  // Determine if mobile based on aspect ratio or fixed dimensions
  const isMobile = width < height;

  // Calculate font size
  const fontSize = calculateFontSize(width, isMobile, variant.fontScale) * mood.scalingFactor;
  const lineHeight = fontSize * (variant.lineHeight || 1.4);

  // Prepare text
  const displayText = mood.uppercase ? text.toUpperCase() : text;
  
  // Measure text to wrap
  const maxTextWidth = width * 0.8;
  const lines = wrapText(displayText, maxTextWidth, fontSize);

  // Calculate Vertical Position
  const totalTextHeight = lines.length * lineHeight;
  let startY = 0;

  if (variant.verticalAlign === 'center') {
    startY = (height - totalTextHeight) / 2 + lineHeight * 0.75;
  } else if (variant.verticalAlign === 'top') {
    startY = (height * (variant.offsetY / 100)) + lineHeight; 
  } else if (variant.verticalAlign === 'bottom') {
    startY = height - (height * (Math.abs(variant.offsetY) / 100)) - totalTextHeight + lineHeight;
  }
  
  const x = width / 2;

  // Background Generation
  const bgDefs = generateBackgroundDefs(mood);
  const bgRects = generateBackgroundRects(mood, backgroundImage);

  // Helper to escape XML characters
  const escapeXml = (unsafe: string) => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
  };

  // React Native SVG Font handling
  const fontFamily = mood.fontFamily;

  // Generate SVG lines with inlined styles
  const textElements = lines.map((line, i) => {
    const escapedLine = escapeXml(line);
    return `<text 
      x="${x}" 
      y="${startY + i * lineHeight}" 
      text-anchor="middle" 
      fill="${mood.textColor}" 
      fill-opacity="${variant.opacity}"
      font-family="${fontFamily}"
      font-size="${fontSize}"
      font-weight="${variant.fontWeight}"
      letter-spacing="${variant.letterSpacing}"
    >${escapedLine}</text>`;
  }).join('\n');

  const svgContent = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${bgDefs}
      </defs>
      ${bgRects}
      ${textElements}
    </svg>
  `;

  return svgContent.trim();
}
