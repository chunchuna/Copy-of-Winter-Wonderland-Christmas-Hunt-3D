import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { PointerLockControls } from '@react-three/drei';
import { useP2P } from './hooks/useP2P';
import { generateShortId } from './utils';
import { World } from './components/World';
import { LocalPlayer } from './components/LocalPlayer';
import { RemotePlayer } from './components/RemotePlayer';
import { PlayerState } from './types';
import { Users, Wifi, Copy, Play } from 'lucide-react';

const LOCAL_ID = generateShortId();

const App: React.FC = () => {
  const { 
    peerId, 
    status, 
    errorMsg, 
    players, 
    hostGame, 
    joinGame, 
    updateLocalState,
    isHost
  } = useP2P(LOCAL_ID);

  const [roomIdInput, setRoomIdInput] = useState('');
  const [hasJoined, setHasJoined] = useState(false);

  const handleHost = () => {
    const newRoomId = generateShortId();
    hostGame(newRoomId);
    setHasJoined(true);
  };

  const handleJoin = () => {
    if (!roomIdInput) return;
    joinGame(roomIdInput);
    setHasJoined(true);
  };

  // Filter out self from the players list for rendering remote players
  const remotePlayers = (Object.values(players) as PlayerState[]).filter(p => p.id !== LOCAL_ID);

  if (!hasJoined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white font-sans">
        <div className="w-full max-w-md p-8 bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
          <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-green-400 to-red-500 bg-clip-text text-transparent">
            Holiday 3D Room
          </h1>
          <p className="text-gray-400 text-center mb-8">Enter a cozy Christmas cabin</p>

          <div className="space-y-6">
            <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
              <h2 className="text-lg font-semibold mb-3 flex items-center">
                <Play className="w-5 h-5 mr-2 text-green-400" /> Host a Room
              </h2>
              <button
                onClick={handleHost}
                className="w-full py-3 px-4 bg-green-700 hover:bg-green-800 rounded-lg font-medium transition-colors shadow-lg hover:shadow-green-500/20"
              >
                Create New Room
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">Or</span>
              </div>
            </div>

            <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
              <h2 className="text-lg font-semibold mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2 text-red-400" /> Join Room
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Room ID"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                  className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none uppercase"
                />
                <button
                  onClick={handleJoin}
                  className="px-6 py-2 bg-red-700 hover:bg-red-800 rounded-lg font-medium transition-colors shadow-lg hover:shadow-red-500/20"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center text-xs text-gray-500">
            Powered by PeerJS & React Three Fiber
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 z-10 p-4 bg-black/60 backdrop-blur-md rounded-lg text-white border border-white/10 min-w-[200px]">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
            <span className="font-bold text-sm tracking-wide">
              {status === 'connected' ? 'LIVE' : status.toUpperCase()}
            </span>
          </div>
          <Wifi className="w-4 h-4 text-gray-400" />
        </div>

        {peerId && (
          <div className="mb-4 bg-white/5 p-2 rounded flex items-center justify-between group">
            <div className="text-xs text-gray-400">
              Room ID: <span className="text-blue-300 font-mono text-sm ml-1 select-all">{peerId}</span>
            </div>
            <button 
              onClick={() => navigator.clipboard.writeText(peerId)}
              className="text-gray-400 hover:text-white transition-colors p-1"
              title="Copy ID"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        )}

        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Guests ({Object.keys(players).length})</h3>
        <ul className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
          {(Object.values(players) as PlayerState[]).map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm bg-white/5 p-2 rounded">
              <div 
                className="w-2 h-8 rounded-full shadow-[0_0_10px]" 
                style={{ backgroundColor: p.color, shadowColor: p.color }}
              />
              <div className="flex flex-col">
                <span className="font-mono text-xs text-gray-300">
                  {p.id === LOCAL_ID ? `${p.id} (YOU)` : p.id}
                </span>
                <span className="text-[10px] text-gray-500">
                  {Math.round(p.position.x)}, {Math.round(p.position.z)}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {errorMsg && (
            <div className="mt-4 p-2 bg-red-500/20 border border-red-500/50 rounded text-xs text-red-200">
                {errorMsg}
            </div>
        )}
        
        <div className="mt-4 pt-2 border-t border-white/10 text-[10px] text-gray-500 text-center">
            Click to Lock Mouse • WASD to Move • Space to Jump
        </div>
      </div>

      {/* 3D Scene */}
      <Canvas shadows camera={{ fov: 75 }}>
        {/* Dark night background */}
        <color attach="background" args={['#050810']} />
        
        {/* Light fog for atmosphere */}
        <fog attach="fog" args={['#050810', 0, 40]} />

        <Physics gravity={[0, -9.81, 0]}>
          <World />
          <LocalPlayer onUpdate={updateLocalState} color={players[LOCAL_ID]?.color || '#fff'} />
          {remotePlayers.map((p) => (
            <RemotePlayer key={p.id} data={p} />
          ))}
        </Physics>
        <PointerLockControls />
      </Canvas>
    </div>
  );
};

export default App;