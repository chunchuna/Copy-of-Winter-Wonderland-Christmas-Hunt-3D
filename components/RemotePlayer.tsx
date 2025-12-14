import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Capsule, Text } from '@react-three/drei';
import * as THREE from 'three';
import { PlayerState } from '../types';

interface Props {
  data: PlayerState;
}

export const RemotePlayer: React.FC<Props> = ({ data }) => {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const spotLightTargetRef = useRef<THREE.Object3D>(new THREE.Object3D());
  const { scene } = useThree();

  // Add target to scene for remote player flashlight
  useEffect(() => {
    scene.add(spotLightTargetRef.current);
    return () => {
        scene.remove(spotLightTargetRef.current);
    }
  }, [scene]);

  useFrame(() => {
    if (groupRef.current && headRef.current) {
      // 1. Position Interpolation (Linear)
      groupRef.current.position.lerp(new THREE.Vector3(data.position.x, data.position.y, data.position.z), 0.2);
      
      // 2. Body Rotation (Yaw / Y-axis only)
      groupRef.current.rotation.set(0, data.rotation.y, 0); 
      
      // 3. Head Rotation (Pitch / X-axis) - Looking up/down
      // The local player sends camera.rotation.x. We apply this to the head group.
      headRef.current.rotation.x = data.rotation.x;

      // 4. Update Spotlight Target
      if (spotLightRef.current && data.isFlashlightOn) {
         // Calculate absolute position of the head
         const headPos = new THREE.Vector3();
         headRef.current.getWorldPosition(headPos);
         
         // Calculate forward direction based on Head quaternion (which combines body Yaw + head Pitch)
         const forward = new THREE.Vector3(0, 0, -1);
         const headQuat = new THREE.Quaternion();
         headRef.current.getWorldQuaternion(headQuat);
         forward.applyQuaternion(headQuat);
         
         // Place target in front of the head
         spotLightTargetRef.current.position.copy(headPos).add(forward.multiplyScalar(20));
         spotLightRef.current.target = spotLightTargetRef.current;
      }
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
      <Capsule args={[0.5, 1.5]} position={[0, 1, 0]}>
        <meshStandardMaterial color={data.color} />
      </Capsule>
      
      {/* Head Group - Handles looking up/down (Pitch) */}
      <group ref={headRef} position={[0, 2, 0]}>
          {/* Visual Eyes */}
          <mesh position={[0, 0, 0.4]}>
            <boxGeometry args={[0.6, 0.2, 0.2]} />
            <meshStandardMaterial color="black" />
          </mesh>

          {/* Remote Flashlight */}
          <spotLight
            ref={spotLightRef}
            visible={data.isFlashlightOn}
            intensity={80}
            angle={0.6} // Match LocalPlayer radius
            penumbra={0.2}
            distance={60}
            decay={1.5}
            color="#fff8e1"
            castShadow
            position={[0, 0, 0.5]} // Emits from front of face
            shadow-mapSize={[512, 512]} // Lower res shadow for remote players to save perf
          />
      </group>
    </group>
  );
};