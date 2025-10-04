// src/lib/customStyles.ts

import { CaptionStyle } from "@/types/caption";

export interface CustomStyle {
  id: string;
  name: string;
  target: 'title' | 'question' | 'list' | 'stat' | 'quote' | 'graph';
  preview: string; // URL to an image preview
  style: Partial<CaptionStyle>;
}

export const CUSTOM_STYLES: CustomStyle[] = [
  // Styles for 'title'
  {
    id: 'title-cinematic',
    name: 'Cinematic Title',
    target: 'title',
    preview: 'https://placehold.co/600x120/1a1a1a/f5e5c5/png?text=Cinematic',
    style: {
      fontFamily: 'Playfair Display',
      fontSize: 64,
      color: '#f5e5c5',
      textShadow: '0 2px 15px rgba(0,0,0,0.7)',
      backgroundColor: 'transparent',
    },
  },
  {
    id: 'title-bold-banner',
    name: 'Bold Banner',
    target: 'title',
    preview: 'https://placehold.co/600x120/e94560/FFFFFF/png?text=Bold+Banner',
    style: {
      fontFamily: 'Montserrat',
      fontSize: 52,
      color: '#FFFFFF',
      backgroundColor: '#e94560',
      shape: 'rectangular',
    },
  },
  // Style for 'stat'
  {
    id: 'stat-highlight',
    name: 'Highlight Stat',
    target: 'stat',
    preview: 'https://placehold.co/600x120/1a1a1a/FFFF00/png?text=47%25',
    style: {
      color: '#FFFF00',
      fontFamily: 'Bebas Neue',
      fontSize: 80,
      textShadow: '0 0 10px #FFFF00',
    },
  },
  // Style for 'question'
  {
    id: 'question-casual',
    name: 'Casual Question',
    target: 'question',
    preview: 'https://placehold.co/600x120/FFFFFF/000000/png?text=Question%3F',
    style: {
      fontFamily: 'Inter',
      color: '#000000',
      backgroundColor: '#FFFFFF',
      shape: 'speech-bubble',
    },
  },
];