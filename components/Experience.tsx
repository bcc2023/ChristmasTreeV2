import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import Needles from './Needles';
import Ornaments from './Ornaments';
import Frames from './Frames';
import GiftBoxes from './GiftBoxes'; // Swapped from Ribbons
import { TRANSITION_SPEED } from '../constants';

export interface ControlsRef {
  isGathered: boolean;
  rotation: number;
}

interface ExperienceProps {
  controlsRef: React.MutableRefObject<ControlsRef>;
  images: string[];
}

const Experience: React.FC<ExperienceProps> = ({ controlsRef, images }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // We use a Ref for progress to avoid re-rendering the React component every frame.
  // This allows the animation loop to run at 60fps independently of React's render cycle.
  const progressRef = useRef(0);

  useFrame((state, delta) => {
    // 1. Read single source of truth from App
    const { isGathered, rotation } = controlsRef.current;

    // 2. Animate Progress
    const target = isGathered ? 1 : 0;
    progressRef.current = THREE.MathUtils.lerp(progressRef.current, target, delta * TRANSITION_SPEED);

    // 3. Apply Rotation (Smoothed)
    if (groupRef.current) {
        const currentY = groupRef.current.rotation.y;
        // Shortest path rotation logic could be added, but simple lerp works for limited range
        groupRef.current.rotation.y = THREE.MathUtils.lerp(currentY, rotation, delta * 5);
    }
  });

  return (
    <>
      {/* Center Camera Y to 0 for vertical centering */}
      <PerspectiveCamera makeDefault position={[0, 0, 18]} fov={50} />
      
      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffeebb" />
      <pointLight position={[-10, 5, -10]} intensity={0.5} color="#ccffcc" />
      <Environment preset="city" />

      {/* Background Ambience */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Main Tree Group */}
      <group ref={groupRef}>
        {/* Pass the mutable ref down. Children will read .current in their own useFrame loops */}
        <Needles progressRef={progressRef} />
        <Ornaments progressRef={progressRef} />
        <GiftBoxes progressRef={progressRef} />
        <Frames progressRef={progressRef} images={images} />
      </group>

      {/* Post Processing */}
      <EffectComposer disableNormalPass>
        <Bloom 
            luminanceThreshold={0.8} 
            mipmapBlur 
            intensity={1.5} 
            radius={0.6}
        />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
        <Noise opacity={0.05} />
      </EffectComposer>
    </>
  );
};

export default Experience;