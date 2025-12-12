import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { Box, Cylinder, Sphere, Cone } from '@react-three/drei';
import * as THREE from 'three';

const Snow = () => {
  const count = 500;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const speed = 0.02 + Math.random() / 50;
      const xFactor = -20 + Math.random() * 40; // Spread around the outside view
      const yFactor = Math.random() * 20 + 5;
      const zFactor = -20 + Math.random() * 40;
      temp.push({ t, speed, xFactor, yFactor, zFactor, my: 0 });
    }
    return temp;
  }, []);

  useFrame((state, delta) => {
    if (!mesh.current) return;
    
    let i = 0;
    for (let p of particles) {
      // Update position
      p.my -= p.speed * 200 * delta; // Fall down
      
      // Reset if below ground
      if (p.yFactor + p.my < 0) {
        p.my = 0;
      }

      // Wiggle
      const t = state.clock.getElapsedTime() * 0.5;
      const wiggleX = Math.sin(t + p.xFactor) * 0.5;

      dummy.position.set(
        -15 + (p.xFactor + wiggleX), // Shift entire snow cloud outside the window area
        p.yFactor + p.my, 
        p.zFactor
      );
      
      const scale = 0.05 + Math.random() * 0.05;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i++, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} position={[0, 0, 0]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="white" />
    </instancedMesh>
  );
};

const ChristmasTree = (props: any) => {
  return (
    <group {...props}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 1]} />
        <meshStandardMaterial color="#3e2723" />
      </mesh>
      
      {/* Leaves */}
      <mesh position={[0, 1.5, 0]}>
        <coneGeometry args={[1.5, 2.5, 16]} />
        <meshStandardMaterial color="#1b5e20" roughness={0.8} />
      </mesh>
      <mesh position={[0, 3, 0]}>
        <coneGeometry args={[1.2, 2, 16]} />
        <meshStandardMaterial color="#1b5e20" roughness={0.8} />
      </mesh>
      <mesh position={[0, 4.2, 0]}>
        <coneGeometry args={[0.8, 1.5, 16]} />
        <meshStandardMaterial color="#1b5e20" roughness={0.8} />
      </mesh>

      {/* Star */}
      <mesh position={[0, 5, 0]}>
        <dodecahedronGeometry args={[0.3]} />
        <meshBasicMaterial color="#ffd700" />
        <pointLight intensity={2} distance={5} color="#ffd700" decay={2} />
      </mesh>

      {/* Ornaments */}
      {[...Array(12)].map((_, i) => {
        const y = 1 + Math.random() * 3;
        const radius = 1.2 - (y * 0.25);
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const color = Math.random() > 0.5 ? '#d32f2f' : '#ffb300';
        
        return (
          <mesh key={i} position={[x, y, z]}>
             <sphereGeometry args={[0.1]} />
             <meshStandardMaterial color={color} metallic={0.8} roughness={0.1} />
          </mesh>
        );
      })}
    </group>
  );
}

const CabinStructure = () => {
    const size = 12;
    const height = 6;
    const thick = 0.5;
    const woodColor = "#5d4037";
    const wallColor = "#4e342e";

    return (
        <group>
             {/* Floor - Wood Planks texture simulated by color */}
            <RigidBody type="fixed" friction={1}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                    <planeGeometry args={[size, size]} />
                    <meshStandardMaterial color={woodColor} roughness={0.8} />
                </mesh>
            </RigidBody>

             {/* Ceiling */}
            <RigidBody type="fixed">
                <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, 0]}>
                    <planeGeometry args={[size, size]} />
                    <meshStandardMaterial color={wallColor} />
                </mesh>
            </RigidBody>

            {/* Back Wall */}
            <RigidBody type="fixed" position={[size/2, height/2, 0]}>
                <Box args={[thick, height, size]}>
                    <meshStandardMaterial color={wallColor} />
                </Box>
            </RigidBody>

            {/* Front Wall */}
            <RigidBody type="fixed" position={[-size/2, height/2, 0]}>
                 {/* This wall has the window looking out to negative X */}
                 {/* We construct it from parts to make a hole */}
            </RigidBody>

             {/* Right Wall (Solid) */}
            <RigidBody type="fixed" position={[0, height/2, size/2]}>
                <Box args={[size, height, thick]}>
                    <meshStandardMaterial color={wallColor} />
                </Box>
            </RigidBody>

            {/* Left Wall (Solid) */}
            <RigidBody type="fixed" position={[0, height/2, -size/2]}>
                 <Box args={[size, height, thick]}>
                    <meshStandardMaterial color={wallColor} />
                </Box>
            </RigidBody>
            
            {/* WINDOW WALL (Negative X side) */}
             {/* Bottom */}
            <RigidBody type="fixed" position={[-size/2, 1, 0]}>
                 <Box args={[thick, 2, size]}>
                    <meshStandardMaterial color={wallColor} />
                 </Box>
            </RigidBody>
            {/* Top */}
            <RigidBody type="fixed" position={[-size/2, height - 0.5, 0]}>
                 <Box args={[thick, 1, size]}>
                    <meshStandardMaterial color={wallColor} />
                 </Box>
            </RigidBody>
            {/* Left of window */}
             <RigidBody type="fixed" position={[-size/2, height/2, -4]}>
                 <Box args={[thick, height, 4]}>
                    <meshStandardMaterial color={wallColor} />
                 </Box>
            </RigidBody>
             {/* Right of window */}
             <RigidBody type="fixed" position={[-size/2, height/2, 4]}>
                 <Box args={[thick, height, 4]}>
                    <meshStandardMaterial color={wallColor} />
                 </Box>
            </RigidBody>

            {/* Window Frame bars */}
            <mesh position={[-size/2, 3.5, 0]}>
                <boxGeometry args={[0.6, 3, 0.2]} />
                <meshStandardMaterial color="#3e2723" />
            </mesh>
            <mesh position={[-size/2, 3.5, 0]}>
                <boxGeometry args={[0.6, 0.2, 4]} />
                <meshStandardMaterial color="#3e2723" />
            </mesh>
        </group>
    )
}

const OutsideView = () => {
    return (
        <group position={[-20, 0, 0]}>
             {/* Ground */}
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.1, 0]}>
                <planeGeometry args={[40, 40]} />
                <meshStandardMaterial color="#eceff1" />
            </mesh>
            
            {/* Trees */}
            {[...Array(20)].map((_, i) => (
                <group key={i} position={[Math.random() * 20 - 10, 0, Math.random() * 40 - 20]}>
                     <mesh position={[0, 2, 0]}>
                        <cylinderGeometry args={[0.4, 0.6, 4]} />
                        <meshStandardMaterial color="#3e2723" />
                    </mesh>
                    <mesh position={[0, 5, 0]}>
                         <coneGeometry args={[2, 4, 8]} />
                         <meshStandardMaterial color="#fff" />
                    </mesh>
                </group>
            ))}
            <Snow />
        </group>
    )
}

export const World: React.FC = () => {
  return (
    <group>
      <CabinStructure />
      
      {/* Centerpiece */}
      <ChristmasTree position={[0, 0, 0]} />
      
      {/* Collision for Tree base */}
      <RigidBody type="fixed" position={[0, 0.5, 0]}>
         <cylinderGeometry args={[0.5, 0.5, 1]} />
      </RigidBody>

      {/* Outside Scenery */}
      <OutsideView />

      {/* Atmosphere Lights */}
      <ambientLight intensity={0.15} color="#b3e5fc" /> {/* Cool low ambient */}
      
      {/* Warm Cozy Interior Lights */}
      <pointLight position={[3, 5, 3]} intensity={1.5} color="#ffaa33" distance={15} decay={2} castShadow />
      <pointLight position={[-3, 4, -3]} intensity={1} color="#ff8800" distance={12} decay={2} />
      
      {/* Tree Lights Glow */}
      <pointLight position={[0, 2, 0]} intensity={2} color="#ffcc00" distance={5} decay={2} />

      {/* Moonlight coming through window */}
      <spotLight 
        position={[-20, 15, 0]} 
        target-position={[0, 0, 0]}
        intensity={0.8}
        color="#e1f5fe"
        angle={0.5}
        penumbra={0.5}
        castShadow
      />
    </group>
  );
};