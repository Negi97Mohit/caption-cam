export interface FilterPreset {
  id: string;
  name: string;
  style: string; // The CSS filter value
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: 'none', name: 'None', style: 'none' },
  { id: 'vintage', name: 'Vintage', style: 'sepia(0.6) brightness(0.9) contrast(1.2)' },
  { id: 'noir', name: 'Noir', style: 'grayscale(1) contrast(1.3)' },
  { id: 'dreamy', name: 'Dreamy', style: 'saturate(1.8) blur(0.5px) brightness(1.1)' },
  { id: 'technicolor', name: 'Technicolor', style: 'hue-rotate(90deg) saturate(2.5)' },
  { id: 'icy', name: 'Icy', style: 'contrast(1.2) brightness(1.1) saturate(0.8)' },
  { id: 'crimson', name: 'Crimson', style: 'sepia(0.4) hue-rotate(-20deg) saturate(1.5)' },
];