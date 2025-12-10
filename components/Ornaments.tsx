import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ORNAMENT_COUNT, COLORS, ORNAMENT_PALETTE, TREE_HEIGHT, TREE_RADIUS_BASE, SCATTER_RADIUS } from '../constants';
import { getTreePoint, getRandomSpherePoint } from '../utils/geometry';

interface OrnamentsProps {
  progressRef: React.MutableRefObject<number>;
}

const Ornaments: React.FC<OrnamentsProps> = ({ progressRef }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Precompute transform data
  const data = useMemo(() => {
    return Array.from({ length: ORNAMENT_COUNT }).map(() => {
      const treePos = getTreePoint(TREE_HEIGHT, TREE_RADIUS_BASE * 0.9); // Slightly inside
      const scatterPos = getRandomSpherePoint(SCATTER_RADIUS);
      const scale = 0.1 + Math.random() * 0.15;
      return { treePos, scatterPos, scale, phase: Math.random() * Math.PI * 2 };
    });
  }, []);

  useLayoutEffect(() => {
    if (meshRef.current) {
      // Set initial colors from Christmas Palette
      const color = new THREE.Color();
      for (let i = 0; i < ORNAMENT_COUNT; i++) {
        const paletteColor = ORNAMENT_PALETTE[Math.floor(Math.random() * ORNAMENT_PALETTE.length)];
        color.copy(paletteColor);
        meshRef.current.setColorAt(i, color);
      }
      meshRef.current.instanceColor!.needsUpdate = true;
    }
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;

    const t = state.clock.elapsedTime;
    const currentProgress = progressRef.current;
    
    data.forEach((item, i) => {
      // Lerp position
      const x = THREE.MathUtils.lerp(item.scatterPos.x, item.treePos.x, currentProgress);
      const y = THREE.MathUtils.lerp(item.scatterPos.y, item.treePos.y, currentProgress);
      const z = THREE.MathUtils.lerp(item.scatterPos.z, item.treePos.z, currentProgress);
      
      // Add float
      const floatY = Math.sin(t + item.phase) * 0.1 * (1 - currentProgress); // Float more in scatter
      
      dummy.position.set(x, y + floatY, z);
      
      // Rotate slowly
      dummy.rotation.set(t * 0.2 + item.phase, t * 0.1, 0);
      dummy.scale.setScalar(item.scale * (0.5 + 0.5 * currentProgress)); // Grow slightly when forming tree

      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, ORNAMENT_COUNT]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial 
        roughness={0.2} 
        metalness={0.9} 
        envMapIntensity={1.5}
      />
    </instancedMesh>
  );
};

export default Ornaments;