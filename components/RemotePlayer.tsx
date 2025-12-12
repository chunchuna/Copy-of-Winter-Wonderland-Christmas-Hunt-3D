import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Capsule, Text } from '@react-three/drei';
import * as THREE from 'three';
import { PlayerState } from '../types';

interface Props {
  data: PlayerState;
}

export const RemotePlayer: React.FC<Props> = ({ data }) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (groupRef.current) {
      // Linear interpolation for smoother movement
      groupRef.current.position.lerp(new THREE.Vector3(data.position.x, data.position.y, data.position.z), 0.2);
      
      // Simple rotation sync
      groupRef.current.rotation.set(0, data.rotation.y, 0); // Only Sync Y rotation for visual body
    }
  });

  return (
    <group ref={groupRef}>
      {/* Name tag */}
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {data.id.substring(0, 5)}
      </Text>
      
      {/* Player Body */}
      <Capsule ref={bodyRef} args={[0.5, 1.5]} position={[0, 1, 0]}>
        <meshStandardMaterial color={data.color} />
      </Capsule>
      
      {/* Direction indicator (eyes) */}
      <mesh position={[0, 1.5, 0.4]}>
        <boxGeometry args={[0.6, 0.2, 0.2]} />
        <meshStandardMaterial color="black" />
      </mesh>
    </group>
  );
};