import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CapsuleCollider } from '@react-three/rapier';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import * as THREE from 'three';
import { Vector3 } from '../types';

interface Props {
  onUpdate: (pos: Vector3, rot: Vector3) => void;
  color: string;
}

const SPEED = 5;
const JUMP_FORCE = 5;

// Global flag outside component to ensure camera init happens EXACTLY once per page load.
// This prevents camera snapping if the component remounts or re-renders unexpectedly.
let hasGlobalCameraInit = false;

export const LocalPlayer: React.FC<Props> = ({ onUpdate, color }) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const controls = useKeyboardControls();
  
  // Reuse vector to avoid GC
  const direction = new THREE.Vector3();
  const frontVector = new THREE.Vector3();
  const sideVector = new THREE.Vector3();

  useEffect(() => {
    // Only set the initial camera angle ONCE.
    if (!hasGlobalCameraInit) {
        // Look at the center/tree
        camera.lookAt(0, 2, 0);
        hasGlobalCameraInit = true;
    }
  }, [camera]);

  useFrame(() => {
    if (!rigidBodyRef.current) return;

    // 1. Handle Physics Movement
    const velocity = rigidBodyRef.current.linvel();
    
    // Calculate forward/backward based on Camera direction (projected to flat plane)
    frontVector.set(0, 0, Number(controls.backward) - Number(controls.forward));
    sideVector.set(Number(controls.left) - Number(controls.right), 0, 0);

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(SPEED)
      .applyEuler(camera.rotation);

    // Apply velocity, preserving vertical velocity (gravity)
    rigidBodyRef.current.setLinvel({ x: direction.x, y: velocity.y, z: direction.z }, true);

    // Jumping
    if (controls.jump && Math.abs(velocity.y) < 0.1) {
      rigidBodyRef.current.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
    }

    // 2. Sync Camera to Physics Body
    const translation = rigidBodyRef.current.translation();
    camera.position.set(translation.x, translation.y + 1.5, translation.z);

    // 3. Report state back to networking
    onUpdate(
      { x: translation.x, y: translation.y, z: translation.z },
      { x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z }
    );
  });

  return (
    <RigidBody 
      ref={rigidBodyRef} 
      colliders={false} 
      mass={1} 
      type="dynamic" 
      position={[3, 2, 3]} // Set initial position here via prop
      enabledRotations={[false, false, false]} // Prevent tipping over
    >
      <CapsuleCollider args={[0.75, 0.5]} />
    </RigidBody>
  );
};