import { Mood } from './moods';

/**
 * Returns a CSS filter string for the SVG <image> element.
 */
export function getImageCssFilter(mood: Mood): string {
  const { saturation, contrast, brightness, blurRadius } = mood.image;
  return `blur(${blurRadius}px) saturate(${saturation}%) contrast(${contrast}%) brightness(${brightness}%)`;
}

/**
 * Returns a Canvas filter string for export.
 */
export function getCanvasFilter(mood: Mood): string {
  const { saturation, contrast, brightness, blurRadius } = mood.image;
  return `blur(${blurRadius}px) saturate(${saturation}%) contrast(${contrast}%) brightness(${brightness}%)`;
}
