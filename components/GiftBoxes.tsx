import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GIFT_COUNT, GIFT_PALETTE, COLORS, TREE_HEIGHT, TREE_RADIUS_BASE, SCATTER_RADIUS } from '../constants';
import { getTreePoint, getRandomSpherePoint } from '../utils/geometry';

interface GiftBoxesProps {
  progressRef: React.MutableRefObject<number>;
}

// Geometries pre-created
// IMPORTANT: Translate geometry so origin is at the TOP center (0, 0, 0)
// The box height is 1, so we translate y by -0.5
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
boxGeometry.translate(0, -0.5, 0);

// Ribbon 1: Vertical band around X axis
const ribbonGeo1 = new THREE.BoxGeometry(0.15, 1.02, 1.02);
ribbonGeo1.translate(0, -0.5, 0);

// Ribbon 2: Vertical band around Z axis
const ribbonGeo2 = new THREE.BoxGeometry(1.02, 1.02, 0.15);
ribbonGeo2.translate(0, -0.5, 0);

const GiftBoxes: React.FC<GiftBoxesProps> = ({ progressRef }) => {
  const boxMeshRef = useRef<THREE.InstancedMesh>(null);
  const ribbonMeshRef1 = useRef<THREE.InstancedMesh>(null);
  const ribbonMeshRef2 = useRef<THREE.InstancedMesh>(null);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Precompute transform data
  const data = useMemo(() => {
    return Array.from({ length: GIFT_COUNT }).map(() => {
      // Gifts hang from branches
      const treePos = getTreePoint(TREE_HEIGHT, TREE_RADIUS_BASE * 0.9); 
      
      const scatterPos = getRandomSpherePoint(SCATTER_RADIUS);
      
      // Heavier items scale larger
      const scale = 0.6 + Math.random() * 0.4; 
      
      // Random initial rotation for scatter
      const scatterRot = new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      
      // Tree Rotation:
      // Since pivot is at top, we want 0 rotation to be hanging straight down.
      // But we can add a random Y rotation so they don't all look identical
      const treeRot = new THREE.Euler(0, Math.random() * Math.PI * 2, 0);

      // Pendulum phase
      const swayPhase = Math.random() * 100;
      const swaySpeed = 1.0 + Math.random();

      return { treePos, scatterPos, scale, treeRot, scatterRot, swayPhase, swaySpeed };
    });
  }, []);

  useLayoutEffect(() => {
    if (boxMeshRef.current) {
      const color = new THREE.Color();
      for (let i = 0; i < GIFT_COUNT; i++) {
        // Pick a random saturated color
        const paletteColor = GIFT_PALETTE[Math.floor(Math.random() * GIFT_PALETTE.length)];
        color.copy(paletteColor);
        boxMeshRef.current.setColorAt(i, color);
      }
      boxMeshRef.current.instanceColor!.needsUpdate = true;
    }
  }, []);

  useFrame((state) => {
    if (!boxMeshRef.current || !ribbonMeshRef1.current || !ribbonMeshRef2.current) return;

    const t = state.clock.elapsedTime;
    const currentProgress = progressRef.current;
    
    data.forEach((item, i) => {
      // Lerp position
      const x = THREE.MathUtils.lerp(item.scatterPos.x, item.treePos.x, currentProgress);
      const y = THREE.MathUtils.lerp(item.scatterPos.y, item.treePos.y, currentProgress);
      const z = THREE.MathUtils.lerp(item.scatterPos.z, item.treePos.z, currentProgress);
      
      dummy.position.set(x, y, z);
      
      // Calculate Rotation
      // 1. Get base rotation (Scatter vs Tree)
      const qScatter = new THREE.Quaternion().setFromEuler(item.scatterRot);
      
      // 2. Tree State: Add Pendulum Sway
      // Simulate gravity hanging: sway mainly on X and Z axis
      const swayAngle = Math.sin(t * item.swaySpeed + item.swayPhase) * 0.15; // Max 0.15 rad sway
      const swayQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(swayAngle, item.treeRot.y, swayAngle * 0.5));
      
      // Tumble in scatter
      if (currentProgress < 0.9) {
          qScatter.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), t * 0.5));
      }

      dummy.quaternion.slerpQuaternions(qScatter, swayQ, currentProgress);
      
      // Scale: Pop in when forming tree
      const s = item.scale * (0.8 + 0.2 * currentProgress);
      dummy.scale.set(s, s, s);

      dummy.updateMatrix();
      
      // Update all 3 meshes with same transform
      boxMeshRef.current!.setMatrixAt(i, dummy.matrix);
      ribbonMeshRef1.current!.setMatrixAt(i, dummy.matrix);
      ribbonMeshRef2.current!.setMatrixAt(i, dummy.matrix);
    });
    
    boxMeshRef.current.instanceMatrix.needsUpdate = true;
    ribbonMeshRef1.current.instanceMatrix.needsUpdate = true;
    ribbonMeshRef2.current.instanceMatrix.needsUpdate = true;
  });

  const ribbonMaterial = <meshStandardMaterial 
    color={COLORS.GOLD_METALLIC} 
    metalness={1.0} 
    roughness={0.2} 
    emissive={COLORS.GOLD_METALLIC}
    emissiveIntensity={0.2}
  />;

  return (
    <group>
      {/* Main Box */}
      <instancedMesh ref={boxMeshRef} args={[boxGeometry, undefined, GIFT_COUNT]}>
        <meshPhysicalMaterial 
          roughness={0.3} 
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
        />
      </instancedMesh>

      {/* Ribbon Cross */}
      <instancedMesh ref={ribbonMeshRef1} args={[ribbonGeo1, undefined, GIFT_COUNT]}>
        {ribbonMaterial}
      </instancedMesh>
      <instancedMesh ref={ribbonMeshRef2} args={[ribbonGeo2, undefined, GIFT_COUNT]}>
        {ribbonMaterial}
      </instancedMesh>
    </group>
  );
};

export default GiftBoxes;