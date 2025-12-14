import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { Box } from '@react-three/drei';
import * as THREE from 'three';

interface WorldProps {
    lightOn: boolean;
    onToggleLight: () => void;
}

// Ensure clicks work from the center of the screen when pointer is locked
const InteractionManager = () => {
    useFrame((state) => {
        // Set raycaster to always originate from center of screen (0,0)
        state.raycaster.setFromCamera(new THREE.Vector2(0, 0), state.camera);
    });
    return null;
}

const Snow = () => {
  const count = 500;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const speed = 0.02 + Math.random() / 50;
      const xFactor = -20 + Math.random() * 40; 
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
      p.my -= p.speed * 200 * delta; 
      if (p.yFactor + p.my < 0) {
        p.my = 0;
      }

      const t = state.clock.getElapsedTime() * 0.5;
      const wiggleX = Math.sin(t + p.xFactor) * 0.5;

      dummy.position.set(
        -15 + (p.xFactor + wiggleX), 
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

const Fireplace = () => {
    const lightRef = useRef<THREE.PointLight>(null);
    const particlesRef = useRef<THREE.Group>(null);
    
    useFrame((state) => {
        // Flicker effect for light
        // MODIFIED: Increased base intensity from 2 to 6 for brighter fire
        if (lightRef.current) {
            lightRef.current.intensity = 6 + Math.sin(state.clock.elapsedTime * 10) * 1.0 + Math.random() * 0.5;
        }

        // Fire particle animation
        if (particlesRef.current) {
            particlesRef.current.children.forEach((child: any, i) => {
                const speed = 1 + i * 0.5;
                child.position.y = (Math.sin(state.clock.elapsedTime * speed + i) * 0.15) + 0.2;
                child.scale.setScalar(0.8 + Math.sin(state.clock.elapsedTime * speed * 2 + i) * 0.2);
                child.rotation.z = Math.sin(state.clock.elapsedTime + i) * 0.2;
            });
        }
    });

    return (
        // Positioned inside the wall hole at Z=6
        // Moved up slightly so hearth sits on floor
        <group position={[0, 1.25, 6]} rotation={[0, Math.PI, 0]}>
             
             {/* Frame/Mantel Structure */}
             
             {/* Left Pillar */}
             <mesh position={[-1.1, 0, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.6, 2.5, 0.8]} />
                <meshStandardMaterial color="#5d4037" roughness={0.9} />
             </mesh>
             
             {/* Right Pillar */}
             <mesh position={[1.1, 0, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.6, 2.5, 0.8]} />
                <meshStandardMaterial color="#5d4037" roughness={0.9} />
             </mesh>

             {/* Top Mantel */}
             <mesh position={[0, 1.25, 0.1]} castShadow receiveShadow>
                <boxGeometry args={[3.2, 0.6, 1.0]} />
                <meshStandardMaterial color="#4e342e" roughness={0.8} />
             </mesh>

             {/* Hearth (Base) */}
             <mesh position={[0, -1.25, 0.2]} receiveShadow>
                <boxGeometry args={[3.2, 0.3, 1.2]} />
                <meshStandardMaterial color="#3e2723" roughness={1} />
             </mesh>

             {/* Inner Box (The fire chamber) - Recessed */}
             {/* Back Wall */}
             <mesh position={[0, 0, -0.2]}>
                <boxGeometry args={[1.6, 2.2, 0.2]} />
                {/* Lighter color brick to ensure visibility even in shadow */}
                <meshStandardMaterial color="#795548" roughness={1} /> 
             </mesh>
             {/* Side Walls of chamber */}
             <mesh position={[-0.7, 0, 0.2]}>
                <boxGeometry args={[0.2, 2.2, 0.8]} />
                <meshStandardMaterial color="#5d4037" />
             </mesh>
             <mesh position={[0.7, 0, 0.2]}>
                 <boxGeometry args={[0.2, 2.2, 0.8]} />
                 <meshStandardMaterial color="#5d4037" />
             </mesh>
             
             {/* Fire Logs */}
             <group position={[0, -1.0, 0.2]}>
                <mesh position={[-0.2, 0.1, 0]} rotation={[0, 0, 0.3]}>
                    <cylinderGeometry args={[0.08, 0.08, 0.7]} />
                    <meshStandardMaterial color="#3e2723" />
                </mesh>
                 <mesh position={[0.2, 0.1, 0]} rotation={[0, 0, -0.3]}>
                    <cylinderGeometry args={[0.08, 0.08, 0.7]} />
                    <meshStandardMaterial color="#3e2723" />
                </mesh>
                 <mesh position={[0, 0.2, 0]} rotation={[0, 0, Math.PI/2]}>
                    <cylinderGeometry args={[0.08, 0.08, 0.7]} />
                    <meshStandardMaterial color="#3e2723" />
                </mesh>
             </group>

             {/* Fire Particles - Emissive for visibility */}
             <group ref={particlesRef} position={[0, -0.8, 0.2]}>
                {[...Array(8)].map((_, i) => (
                     <mesh key={i} position={[ (i-3.5)*0.1, 0, 0]}>
                        <planeGeometry args={[0.25, 0.5]} />
                        {/* Use MeshBasicMaterial or high emissive standard material */}
                        <meshBasicMaterial color="#ff5722" transparent opacity={0.9} side={THREE.DoubleSide} />
                     </mesh>
                ))}
             </group>

             {/* Fire Light Source */}
             <pointLight 
                ref={lightRef}
                position={[0, -0.5, 0.5]} 
                color="#ff6d00" 
                distance={25} 
                decay={2} 
                castShadow
                shadow-bias={-0.001}
            />
        </group>
    )
}

const ChristmasTree = (props: any) => {
  return (
    <group {...props}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 1]} />
        <meshStandardMaterial color="#3e2723" />
      </mesh>
      
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

      <mesh position={[0, 5, 0]}>
        <dodecahedronGeometry args={[0.3]} />
        <meshBasicMaterial color="#ffd700" />
        <pointLight intensity={3} distance={8} color="#ffd700" decay={2} />
      </mesh>

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
             <meshStandardMaterial color={color} metalness={0.8} roughness={0.1} />
          </mesh>
        );
      })}
    </group>
  );
}

const Chandelier = ({ lightOn }: { lightOn: boolean }) => {
    return (
        <group position={[0, 5, 0]}>
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 1]} />
                <meshStandardMaterial color="#222" />
            </mesh>
            <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.8, 0.1, 0.5]} />
                <meshStandardMaterial color="#443" metalness={0.8} />
            </mesh>
            {[0, 1, 2, 3].map((i) => {
                const angle = (i / 4) * Math.PI * 2;
                return (
                    <mesh key={i} position={[Math.cos(angle) * 0.6, -0.2, Math.sin(angle) * 0.6]}>
                        <sphereGeometry args={[0.2]} />
                        <meshStandardMaterial 
                            color={lightOn ? "#ffaa33" : "#555"} 
                            emissive={lightOn ? "#ffaa33" : "black"}
                            emissiveIntensity={lightOn ? 1 : 0}
                        />
                    </mesh>
                )
            })}
        </group>
    )
}

const LightSwitch = ({ onToggle, lightOn }: { onToggle: () => void, lightOn: boolean }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <group position={[5.95, 1.5, 2]}> 
            <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
                <boxGeometry args={[0.1, 0.4, 0.3]} />
                <meshStandardMaterial color="#ddd" />
            </mesh>
            <mesh 
                position={[0.05, 0, 0]} 
                rotation={[0, 0, lightOn ? -0.4 : 0.4]}
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <boxGeometry args={[0.05, 0.15, 0.1]} />
                <meshStandardMaterial color={hovered ? "#ffaa33" : "#fff"} />
            </mesh>
             <mesh position={[0.05, 0.12, 0]}>
                 <sphereGeometry args={[0.03]} />
                 <meshBasicMaterial color={lightOn ? "green" : "red"} />
             </mesh>
        </group>
    )
}

const CabinStructure = () => {
    const size = 12;
    const height = 6;
    const thick = 0.5;
    const wallColor = "#4e342e";
    const woodColor = "#5d4037";

    return (
        <group>
            {/* Floor */}
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

            {/* Back Wall (Positive X) */}
            <RigidBody type="fixed" position={[size/2, height/2, 0]}>
                <Box args={[thick, height, size]}>
                    <meshStandardMaterial color={wallColor} />
                </Box>
            </RigidBody>

            {/* Right Wall (Positive Z) - WITH HOLE FOR FIREPLACE */}
            {/* Split into Left, Right, and Top segments to create a gap at bottom center */}
            
            {/* 1. Left segment of Right Wall */}
            {/* Starts at -6, ends at -1. Width 5. Center -3.5 */}
            <RigidBody type="fixed" position={[ -3.5, height/2, size/2]}>
                <Box args={[5, height, thick]}>
                     <meshStandardMaterial color={wallColor} />
                </Box>
            </RigidBody>
            
            {/* 2. Right segment of Right Wall */}
            {/* Starts at 1, ends at 6. Width 5. Center 3.5 */}
             <RigidBody type="fixed" position={[ 3.5, height/2, size/2]}>
                <Box args={[5, height, thick]}>
                     <meshStandardMaterial color={wallColor} />
                </Box>
            </RigidBody>

            {/* 3. Top segment of Right Wall (Above fireplace) */}
            {/* Gap is width 2 (-1 to 1). Wall Height 6. Fireplace Height ~2.5. */}
            {/* Top starts y=2.5, ends y=6. Height 3.5. Center y = 2.5 + 1.75 = 4.25 */}
            <RigidBody type="fixed" position={[ 0, 4.25, size/2]}>
                <Box args={[2, 3.5, thick]}>
                     <meshStandardMaterial color={wallColor} />
                </Box>
            </RigidBody>
            
            {/* Fireplace Backing (Outdoor enclosure behind fireplace) */}
             <RigidBody type="fixed" position={[ 0, 1.25, size/2 + 0.5]}>
                <Box args={[2.5, 3, thick]}>
                     <meshStandardMaterial color="#3e2723" />
                </Box>
            </RigidBody>


            {/* Left Wall (Negative Z) */}
            <RigidBody type="fixed" position={[0, height/2, -size/2]}>
                 <Box args={[size, height, thick]}>
                    <meshStandardMaterial color={wallColor} />
                </Box>
            </RigidBody>
            
            {/* WINDOW WALL (Negative X side) */}
            <RigidBody type="fixed" position={[-size/2, 1, 0]}>
                 <Box args={[thick, 2, size]}>
                    <meshStandardMaterial color={wallColor} />
                 </Box>
            </RigidBody>
            <RigidBody type="fixed" position={[-size/2, height - 0.5, 0]}>
                 <Box args={[thick, 1, size]}>
                    <meshStandardMaterial color={wallColor} />
                 </Box>
            </RigidBody>
             <RigidBody type="fixed" position={[-size/2, height/2, -4]}>
                 <Box args={[thick, height, 4]}>
                    <meshStandardMaterial color={wallColor} />
                 </Box>
            </RigidBody>
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
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.1, 0]}>
                <planeGeometry args={[40, 40]} />
                <meshStandardMaterial color="#eceff1" />
            </mesh>
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

export const World: React.FC<WorldProps> = ({ lightOn, onToggleLight }) => {
  return (
    <group>
      <InteractionManager />
      <CabinStructure />
      <ChristmasTree position={[0, 0, 0]} />
      <Chandelier lightOn={lightOn} />
      <Fireplace />
      <LightSwitch onToggle={onToggleLight} lightOn={lightOn} />
      <RigidBody type="fixed" position={[0, 0.5, 0]}>
         <cylinderGeometry args={[0.5, 0.5, 1]} />
      </RigidBody>
      <OutsideView />
      
      {/* MODIFIED: Increased ambient light intensity from 0.1 to 0.4 */}
      <ambientLight intensity={0.1} color="#b3e5fc" /> 
      
      {/* MODIFIED: Increased main light intensity from 2 to 5 */}
      <pointLight position={[0, 4.5, 0]} intensity={lightOn ? 10 : 0} color="#ffaa33" distance={20} decay={2} castShadow />
      
      {/* MODIFIED: Increased fill light intensity from 0.5 to 2 */}
      <pointLight position={[3, 4, 3]} intensity={lightOn ? 5 : 0} color="#ff8800" distance={10} decay={2} />
      
      <pointLight position={[0, 2, 0]} intensity={1.5} color="#ffcc00" distance={5} decay={2} />
      <spotLight position={[-20, 15, 0]} target-position={[0, 0, 0]} intensity={0.8} color="#e1f5fe" angle={0.5} penumbra={0.5} castShadow />
    </group>
  );
};