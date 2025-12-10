import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NEEDLE_COUNT, COLORS, TREE_HEIGHT, TREE_RADIUS_BASE, SCATTER_RADIUS } from '../constants';
import { getTreePoint, getRandomSpherePoint } from '../utils/geometry';

// Custom Shader for performance and sparkle effect
const NeedleShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uMix: { value: 0 }, // 0 = Scatter, 1 = Tree
    uColor1: { value: COLORS.EMERALD_DEEP },
    uColor2: { value: COLORS.EMERALD_LIGHT },
    uSize: { value: 6.0 }, // Base particle size
  },
  vertexShader: `
    uniform float uTime;
    uniform float uMix;
    uniform float uSize;
    attribute vec3 aScatterPos;
    attribute vec3 aTreePos;
    attribute float aRandom;
    
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      // Cubic ease out for smooth snap
      float t = uMix;
      float ease = 1.0 - pow(1.0 - t, 3.0);

      vec3 pos = mix(aScatterPos, aTreePos, ease);
      
      // Breathing effect
      float breath = sin(uTime * 2.0 + aRandom * 10.0) * 0.1;
      pos += normalize(pos) * breath * ease; 

      // Wind/Float effect in scatter mode
      if (uMix < 0.9) {
         pos.y += sin(uTime + aRandom * 100.0) * 0.5 * (1.0 - ease);
         pos.x += cos(uTime * 0.5 + aRandom * 50.0) * 0.3 * (1.0 - ease);
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Size attenuation
      gl_PointSize = uSize * (20.0 / -mvPosition.z);

      // Sparkle fade
      vAlpha = 0.6 + 0.4 * sin(uTime * 3.0 + aRandom * 20.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    varying float vAlpha;

    void main() {
      // Circular particle
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      if (dist > 0.5) discard;

      // Gradient color from center
      vec3 color = mix(uColor2, uColor1, dist * 2.0);
      
      gl_FragColor = vec4(color, vAlpha);
    }
  `
};

interface NeedlesProps {
  progressRef: React.MutableRefObject<number>;
}

const Needles: React.FC<NeedlesProps> = ({ progressRef }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  // Generate geometry data once
  const { positions, scatterPositions, randoms } = useMemo(() => {
    const pos = new Float32Array(NEEDLE_COUNT * 3);
    const scat = new Float32Array(NEEDLE_COUNT * 3);
    const rnd = new Float32Array(NEEDLE_COUNT);

    for (let i = 0; i < NEEDLE_COUNT; i++) {
      const treeP = getTreePoint(TREE_HEIGHT, TREE_RADIUS_BASE);
      const scatP = getRandomSpherePoint(SCATTER_RADIUS);
      
      pos.set([treeP.x, treeP.y, treeP.z], i * 3);
      scat.set([scatP.x, scatP.y, scatP.z], i * 3);
      rnd[i] = Math.random();
    }
    return { positions: pos, scatterPositions: scat, randoms: rnd };
  }, []);

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      // Read directly from Ref
      shaderRef.current.uniforms.uMix.value = progressRef.current;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-aTreePos"
          count={NEEDLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScatterPos"
          count={NEEDLE_COUNT}
          array={scatterPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={NEEDLE_COUNT}
          array={randoms}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-position" // Required by Three.js internally
          count={NEEDLE_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        args={[NeedleShaderMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default Needles;