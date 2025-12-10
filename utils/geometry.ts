import * as THREE from 'three';
import { TREE_HEIGHT, TREE_RADIUS_BASE, SCATTER_RADIUS } from '../constants';

// Helper to get a random point in a sphere (Scatter state)
export const getRandomSpherePoint = (radius: number): THREE.Vector3 => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
};

// Helper to get a point on a Cone volume (Tree state)
export const getTreePoint = (height: number, maxRadius: number, verticalBias: number = 1): THREE.Vector3 => {
  // y goes from -height/2 to height/2
  const y = (Math.random() - 0.5) * height;
  
  // Normalized height factor (0 at top, 1 at bottom) to determine radius
  const hNorm = 0.5 - (y / height); 
  
  // Radius at this height
  const rAtHeight = maxRadius * hNorm;
  
  // Random angle
  const angle = Math.random() * Math.PI * 2;
  
  // Random radius offset (volume, not just surface)
  const rRandom = Math.sqrt(Math.random()) * rAtHeight;

  const x = rRandom * Math.cos(angle);
  const z = rRandom * Math.sin(angle);

  return new THREE.Vector3(x, y, z);
};

// For surface only (frames)
export const getTreeSurfacePoint = (height: number, maxRadius: number, normalizedY: number, angleOffset: number): { pos: THREE.Vector3, rot: THREE.Quaternion } => {
  const y = (normalizedY - 0.5) * height;
  const hNorm = 0.5 - (y / height);
  const rAtHeight = maxRadius * hNorm * 0.9; // Slightly inside

  const x = rAtHeight * Math.cos(angleOffset);
  const z = rAtHeight * Math.sin(angleOffset);

  const pos = new THREE.Vector3(x, y, z);
  
  // Rotation: Look away from center, slightly up
  const dummy = new THREE.Object3D();
  dummy.position.copy(pos);
  dummy.lookAt(0, y, 0); // Look at center
  dummy.rotateY(Math.PI); // Look away
  
  return { pos, rot: dummy.quaternion };
};

// For spiral ribbons
export const getSpiralPoint = (
  height: number, 
  maxRadius: number, 
  t: number, // 0 to 1 progress along ribbon
  spiralCount: number, 
  offsetAngle: number
): { pos: THREE.Vector3, rot: THREE.Quaternion } => {
  // Map t to Y (Top to Bottom)
  const y = (0.5 - t) * height; // +6 to -6
  
  // Radius increases as we go down
  const hNorm = t; // 0 at top, 1 at bottom
  const r = maxRadius * hNorm * 1.05; // Slightly outside foliage

  // Angle: spirals around
  const angle = t * Math.PI * 2 * spiralCount + offsetAngle;

  const x = r * Math.cos(angle);
  const z = r * Math.sin(angle);

  const pos = new THREE.Vector3(x, y, z);

  // Rotation: Tangent to the spiral + facing outwards
  const dummy = new THREE.Object3D();
  dummy.position.copy(pos);
  
  // Look at next point to align segment
  const nextT = t + 0.01;
  const nextY = (0.5 - nextT) * height;
  const nextR = maxRadius * nextT * 1.05;
  const nextAngle = nextT * Math.PI * 2 * spiralCount + offsetAngle;
  const nextPos = new THREE.Vector3(nextR * Math.cos(nextAngle), nextY, nextR * Math.sin(nextAngle));
  
  dummy.lookAt(nextPos);
  
  return { pos, rot: dummy.quaternion };
};
