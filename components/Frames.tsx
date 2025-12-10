import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FRAME_COUNT, TREE_HEIGHT, TREE_RADIUS_BASE, SCATTER_RADIUS, COLORS } from '../constants';
import { getTreeSurfacePoint, getRandomSpherePoint } from '../utils/geometry';

interface FramesProps {
  progressRef: React.MutableRefObject<number>;
  images: string[];
}

const FrameInstance: React.FC<{ 
  index: number; 
  progressRef: React.MutableRefObject<number>;
  imageSrc?: string;
}> = ({ index, progressRef, imageSrc }) => {
  const meshRef = useRef<THREE.Group>(null);
  
  // Use TextureLoader manually to ensure we control updates
  const texture = useMemo(() => {
      if (!imageSrc) return null;
      const tex = new THREE.TextureLoader().load(imageSrc);
      tex.colorSpace = THREE.SRGBColorSpace;
      // Optimize texture
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false; 
      return tex;
  }, [imageSrc]);

  // Calculate target positions
  const { treeTransform, scatterPos } = useMemo(() => {
    // Distribute spirally along the tree
    const normalizedY = (index + 0.5) / FRAME_COUNT; // 0.1 to 0.9
    const angle = index * (Math.PI * 2 / 1.618); // Golden ratio offset
    const surface = getTreeSurfacePoint(TREE_HEIGHT, TREE_RADIUS_BASE, normalizedY, angle);
    const scatter = getRandomSpherePoint(SCATTER_RADIUS * 1.5); // Further out
    return { treeTransform: surface, scatterPos: scatter };
  }, [index]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const progress = progressRef.current;

    // Position Lerp
    meshRef.current.position.lerpVectors(scatterPos, treeTransform.pos, progress);
    
    // Rotation Lerp (Slerp)
    // Scatter rotation is random tumbling
    const t = state.clock.elapsedTime;
    const tumbleRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(t * 0.2, t * 0.3, 0));
    
    meshRef.current.quaternion.slerpQuaternions(tumbleRot, treeTransform.rot, progress);
    
    // Scale up when in tree
    const s = 1.0 + 0.5 * progress;
    meshRef.current.scale.setScalar(s);
  });

  return (
    <group ref={meshRef}>
      {/* Frame Border - Reduced Size (~40% smaller) */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[0.72, 0.9, 0.05]} />
        <meshStandardMaterial color={COLORS.GOLD_METALLIC} metalness={1} roughness={0.1} />
      </mesh>
      {/* Photo Plane - Reduced Size */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[0.6, 0.78]} />
        {texture ? (
           <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
           <meshStandardMaterial color="#1a1a1a" emissive="#333" />
        )}
      </mesh>
    </group>
  );
};

const Frames: React.FC<FramesProps> = ({ progressRef, images }) => {
  return (
    <group>
      {Array.from({ length: FRAME_COUNT }).map((_, i) => (
        <FrameInstance 
            key={i} 
            index={i} 
            progressRef={progressRef} 
            imageSrc={images[i]} 
        />
      ))}
    </group>
  );
};

export default Frames;