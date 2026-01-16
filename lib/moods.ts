export interface GradientStop {
  offset: number; // 0 to 100
  color: string;
}

export interface MoodBackground {
  type: 'linear' | 'radial';
  angle?: number; // in degrees, for linear
  cx?: number; // percentage 0-100, for radial
  cy?: number; // percentage 0-100, for radial
  stops: GradientStop[];
  grainOpacity: number; // 0 to 1
  noiseScale?: number; // default 1
  vignetteStrength: number; // 0 to 1
}

export interface ImageTuning {
  blurRadius: number; // px
  saturation: number; // 0-100% (CSS filter scale, so 100 is normal, 0 is gray)
  contrast: number; // 0-100% (CSS filter)
  brightness: number; // 0-100% (CSS filter)
  overlayColor: string;
  overlayOpacity: number; // 0-1
  searchQuery: string;
}

export interface Mood {
  id: string;
  label: string;
  bgColor: string;
  textColor: string;
  background: MoodBackground;
  image: ImageTuning;

  fontFamily: string;
  uppercase: boolean;
  scalingFactor: number;
}

export const MOODS: Record<string, Mood> = {
  calm: {
    id: 'calm',
    label: 'Calm',
    bgColor: '#F0F4F8',
    textColor: '#486581',
    background: {
      type: 'linear',
      angle: 165,
      stops: [
        { offset: 0, color: '#F0F4F8' },
        { offset: 100, color: '#D9E2EC' }
      ],
      grainOpacity: 0.03,
      noiseScale: 0.8,
      vignetteStrength: 0.1
    },
    image: {
      blurRadius: 12,
      saturation: 60,
      contrast: 85,
      brightness: 110,
      overlayColor: '#F0F4F8',
      overlayOpacity: 0.4,
      searchQuery: 'mist fog white texture sky'
    },

    fontFamily: 'Roboto-Regular',
    uppercase: false,
    scalingFactor: 1.0,
  },

  focused: {
    id: 'focused',
    label: 'Focused',
    bgColor: '#FFFFFF',
    textColor: '#111827',
    background: {
      type: 'linear',
      angle: 180,
      stops: [
        { offset: 0, color: '#FFFFFF' },
        { offset: 100, color: '#F3F4F6' }
      ],
      grainOpacity: 0.015,
      noiseScale: 0.5,
      vignetteStrength: 0
    },
    image: {
      blurRadius: 8,
      saturation: 0,
      contrast: 100,
      brightness: 105,
      overlayColor: '#FFFFFF',
      overlayOpacity: 0.3,
      searchQuery: 'abstract geometric minimal white grey'
    },

    fontFamily: 'Raleway-Regular',
    uppercase: false,
    scalingFactor: 0.85,
  },

  grounded: {
    id: 'grounded',
    label: 'Grounded',
    bgColor: '#FDF6E3',
    textColor: '#5D4037',
    background: {
      type: 'radial',
      cx: 50,
      cy: 40,
      stops: [
        { offset: 0, color: '#FDF6E3' },
        { offset: 100, color: '#F3EAC2' }
      ],
      grainOpacity: 0.05,
      noiseScale: 1.2,
      vignetteStrength: 0.2
    },
    image: {
      blurRadius: 10,
      saturation: 70,
      contrast: 90,
      brightness: 95,
      overlayColor: '#FDF6E3',
      overlayOpacity: 0.5,
      searchQuery: 'sand wood paper texture nature brown'
    },

    fontFamily: 'PlayfairDisplay-Regular',
    uppercase: false,
    scalingFactor: 1.15,
  },

  ambitious: {
    id: 'ambitious',
    label: 'Ambitious',
    bgColor: '#000000',
    textColor: '#FFFFFF',
    background: {
      type: 'linear',
      angle: 135,
      stops: [
        { offset: 0, color: '#1A1A1A' },
        { offset: 100, color: '#000000' }
      ],
      grainOpacity: 0.04,
      noiseScale: 1.5,
      vignetteStrength: 0.3
    },
    image: {
      blurRadius: 15,
      saturation: 30,
      contrast: 110,
      brightness: 60,
      overlayColor: '#000000',
      overlayOpacity: 0.6,
      searchQuery: 'dark black abstract texture stars space'
    },

    fontFamily: 'Oswald-Bold',
    uppercase: true,
    scalingFactor: 1.6,
  },
};

export const getMood = (id: string): Mood => MOODS[id] || MOODS.calm;
