import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RIBBON_SEGMENT_COUNT, COLORS, TREE_HEIGHT, TREE_RADIUS_BASE, SCATTER_RADIUS } from '../constants';
import { getSpiralPoint, getRandomSpherePoint } from '../utils/geometry';

interface RibbonsProps {
  progressRef: React.MutableRefObject<number>;
}

const Ribbons: React.FC<RibbonsProps> = ({ progressRef }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Precompute transform data
  const data = useMemo(() => {
    const items = [];
    const ribbonCount = 6; // Number of separate ribbons
    const segmentsPerRibbon = Math.floor(RIBBON_SEGMENT_COUNT / ribbonCount);

    for (let r = 0; r < ribbonCount; r++) {
        const offsetAngle = (r / ribbonCount) * Math.PI * 2;
        
        for (let s = 0; s < segmentsPerRibbon; s++) {
            const t = s / segmentsPerRibbon; // 0 to 1
            
            // Tree State: Spiral
            const { pos: treePos, rot: treeRot } = getSpiralPoint(
                TREE_HEIGHT, 
                TREE_RADIUS_BASE, 
                t, 
                3, // loops
                offsetAngle
            );

            // Scatter State: Random with random rotation
            const scatterPos = getRandomSpherePoint(SCATTER_RADIUS);
            const scatterRot = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0)
            );

            items.push({ 
                treePos, 
                treeRot, 
                scatterPos, 
                scatterRot,
                scale: Math.random() * 0.5 + 0.5
            });
        }
    }
    return items;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;

    const currentProgress = progressRef.current;
    
    data.forEach((item, i) => {
      // Lerp position
      dummy.position.lerpVectors(item.scatterPos, item.treePos, currentProgress);
      
      // Slerp Rotation
      dummy.quaternion.slerpQuaternions(item.scatterRot, item.treeRot, currentProgress);
      
      // Scale logic: Ribbons are thin, they grow when forming tree
      // In scatter, they are like confetti
      const s = item.scale;
      dummy.scale.set(s, s, s);

      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, data.length]}>
      {/* Thin rectangular segment */}
      <boxGeometry args={[0.15, 0.02, 0.4]} /> 
      <meshStandardMaterial 
        color={COLORS.RED_VELVET} 
        roughness={0.4} 
        metalness={0.1}
        emissive={COLORS.RED_VELVET}
        emissiveIntensity={0.2}
      />
    </instancedMesh>
  );
};

export default Ribbons;
