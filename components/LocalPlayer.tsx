import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CapsuleCollider } from '@react-three/rapier';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import * as THREE from 'three';
import { Vector3 } from '../types';

interface Props {
  onUpdate: (pos: Vector3, rot: Vector3, isFlashlightOn: boolean) => void;
  color: string;
}

const SPEED = 5;
const JUMP_FORCE = 5;

// SFX for Flashlight
const FLASHLIGHT_SFX = "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3";

export const LocalPlayer: React.FC<Props> = ({ onUpdate, color }) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const { camera, scene } = useThree();
  const controls = useKeyboardControls();
  
  // Track if camera has been initialized for this component instance
  const cameraInitRef = useRef(false);
  
  // Flashlight State
  const [flashlightOn, setFlashlightOn] = useState(false);
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const spotLightTargetRef = useRef<THREE.Object3D>(new THREE.Object3D());
  const clickSound = useRef(new Audio(FLASHLIGHT_SFX));

  // Reuse vector to avoid GC
  const direction = new THREE.Vector3();
  const frontVector = new THREE.Vector3();
  const sideVector = new THREE.Vector3();

  // Add Spotlight Target to scene once
  useEffect(() => {
    scene.add(spotLightTargetRef.current);
    return () => {
        scene.remove(spotLightTargetRef.current);
    }
  }, [scene]);

  // Flashlight Toggle Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'KeyT') {
            setFlashlightOn(prev => !prev);
            // Play click sound
            clickSound.current.currentTime = 0;
            clickSound.current.volume = 0.5;
            clickSound.current.play().catch(() => {}); // Catch play errors if user hasn't interacted
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // Only set the initial camera angle ONCE per mount
    if (!cameraInitRef.current) {
        // Look at the center/tree
        camera.lookAt(0, 2, 0);
        cameraInitRef.current = true;
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

    // 3. Sync Flashlight to Camera
    if (spotLightRef.current && spotLightTargetRef.current) {
        // Light sits at camera position
        spotLightRef.current.position.copy(camera.position);
        
        // Target is projected in front of camera
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        spotLightTargetRef.current.position.copy(camera.position).add(forward.multiplyScalar(20));
        
        spotLightRef.current.target = spotLightTargetRef.current;
    }

    // 4. Report state back to networking
    onUpdate(
      { x: translation.x, y: translation.y, z: translation.z },
      { x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z },
      flashlightOn
    );
  });

  return (
    <>
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

        {/* Flashlight Object */}
        <spotLight
            ref={spotLightRef}
            visible={flashlightOn}
            intensity={80} 
            angle={0.6} // INCREASED FROM 0.4 TO 0.6 FOR WIDER RADIUS
            penumbra={0.2}
            distance={60}
            decay={1.5}
            color="#fff8e1"
            castShadow
            shadow-mapSize={[1024, 1024]}
        />
    </>
  );
};