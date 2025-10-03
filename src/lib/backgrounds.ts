export interface BackgroundOption {
  id: string;
  name: string;
  type: 'image';
  thumbnailUrl: string;
  imageUrl: string;
}

// Sourced from Unsplash for demonstration purposes.
export const BACKGROUND_PRESETS: BackgroundOption[] = [
  {
    id: 'office-1',
    name: 'Modern Office',
    type: 'image',
    thumbnailUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=200&h=120&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1920&h=1080&fit=crop',
  },
  {
    id: 'cafe-1',
    name: 'Cozy Cafe',
    type: 'image',
    thumbnailUrl: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=200&h=120&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=1920&h=1080&fit=crop',
  },
  {
    id: 'nature-1',
    name: 'Forest Path',
    type: 'image',
    thumbnailUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&h=120&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
  },
  {
    id: 'gradient-1',
    name: 'Abstract Gradient',
    type: 'image',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&h=120&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&h=1080&fit=crop',
  },
];