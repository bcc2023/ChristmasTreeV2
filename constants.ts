import * as THREE from 'three';

// Arix Signature Palette
export const COLORS = {
  EMERALD_DEEP: new THREE.Color('#002815'),
  EMERALD_LIGHT: new THREE.Color('#006B3C'),
  GOLD_METALLIC: new THREE.Color('#FFD700'),
  GOLD_ROSE: new THREE.Color('#E0BFB8'),
  GLOW_WARM: new THREE.Color('#FFF8E7'),
  BG_DARK: '#000502',
  RED_VELVET: new THREE.Color('#8a0303'),
};

// Saturated Gift Box Palette
export const GIFT_PALETTE = [
  new THREE.Color('#D50000'), // Vivid Red
  new THREE.Color('#2962FF'), // Royal Blue
  new THREE.Color('#00C853'), // Kelly Green
  new THREE.Color('#AA00FF'), // Deep Purple
  new THREE.Color('#FFD600'), // Vivid Gold
];

// Classic Christmas Ornament Palette
export const ORNAMENT_PALETTE = [
  new THREE.Color('#D4AF37'), // Gold
  new THREE.Color('#C0C0C0'), // Silver
  new THREE.Color('#B22222'), // Firebrick Red
  new THREE.Color('#228B22'), // Forest Green
];

// Dimensions
export const TREE_HEIGHT = 12;
export const TREE_RADIUS_BASE = 4.5;
export const SCATTER_RADIUS = 15;

// Counts
export const NEEDLE_COUNT = 8500;
export const ORNAMENT_COUNT = 400;
export const GIFT_COUNT = 35; // Heavy elements
export const FRAME_COUNT = 10;
export const RIBBON_SEGMENT_COUNT = 600;

// Animation
export const TRANSITION_SPEED = 2.5; // Lerp speed