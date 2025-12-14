import { useEffect, useRef, useState, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { PlayerState, NetworkMessage, MessageType, Vector3 } from '../types';
import { generateRandomColor } from '../utils';

// Helper to sanitize Vector3 data for network transmission
const sanitizeVec = (v: any) => ({ x: v.x || 0, y: v.y || 0, z: v.z || 0 });

export const useP2P = (localId: string) => {
  const [peerId, setPeerId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  
  // The definitive state of all players (including local)
  const [players, setPlayers] = useState<Record<string, PlayerState>>({});
  
  // World State
  const [lightOn, setLightOn] = useState(true);

  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<DataConnection[]>([]); // For Host: list of clients. For Client: [hostConnection]
  const localPlayerRef = useRef<PlayerState>({
    id: localId,
    position: { x: 0, y: 5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    color: generateRandomColor(),
  });

  // Initialize Peer
  const initPeer = useCallback((forcedId?: string) => {
    setStatus('connecting');
    try {
      // Create peer. If forcedId is provided, try to use it (acting as Host with known ID)
      const peer = forcedId ? new Peer(forcedId) : new Peer();
      
      peer.on('open', (id) => {
        setPeerId(id);
        setStatus('connected');
        // If we provided an ID, we are the host
        if (forcedId) {
          setIsHost(true);
          // Set initial local player in state
          setPlayers({ [localId]: localPlayerRef.current });
        }
      });

      peer.on('connection', (conn) => {
        handleIncomingConnection(conn);
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
        setErrorMsg(err.message || 'Connection Error');
        setStatus('error');
      });

      peerRef.current = peer;
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  }, [localId]);

  // Handle data received
  const handleData = useCallback((data: NetworkMessage, conn: DataConnection) => {
    if (!peerRef.current) return;

    // HOST LOGIC
    if (isHost) {
      switch (data.type) {
        case MessageType.JOIN:
          // A new player wants to join. Payload contains their initial state info (color usually)
          const newPlayerId = conn.peer;
          const newPlayer: PlayerState = {
            id: newPlayerId,
            position: { x: 0, y: 10, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            color: data.payload.color || generateRandomColor(),
          };
          
          setPlayers(prev => {
            const next = { ...prev, [newPlayerId]: newPlayer };
            // Broadcast full world state to everyone (including the new joiner)
            const payload = {
                players: next,
                lightOn
            };
            broadcast({ type: MessageType.UPDATE, payload: payload });
            return next;
          });
          break;

        case MessageType.UPDATE:
          // A client sent their position update
          const { id, position, rotation } = data.payload;
          setPlayers(prev => {
            if (!prev[id]) return prev;
            const updated = { ...prev };
            updated[id] = { ...updated[id], position, rotation };
            return updated;
          });
          break;

        case MessageType.TOGGLE_LIGHT:
          setLightOn(prev => !prev);
          break;
      }
    } 
    // CLIENT LOGIC
    else {
      switch (data.type) {
        case MessageType.UPDATE:
          // Host sent the full world state
          // Payload structure: { players: Record<string, PlayerState>, lightOn: boolean }
          const { players: worldPlayers, lightOn: serverLightOn } = data.payload;
          
          if (serverLightOn !== undefined) {
             setLightOn(serverLightOn);
          }

          setPlayers(prev => {
            const nextState = { ...worldPlayers };
            // We do NOT overwrite our own local position from the server to prevent lag/jitter loop
            if (nextState[localId]) {
              delete nextState[localId];
            }
            return { ...nextState, [localId]: localPlayerRef.current };
          });
          break;
      }
    }
  }, [isHost, localId, lightOn]);

  const handleIncomingConnection = (conn: DataConnection) => {
    conn.on('data', (data: any) => handleData(data, conn));
    
    conn.on('open', () => {
      connectionsRef.current.push(conn);
      // If host, send current state immediately
      if (isHost) {
        conn.send({ 
            type: MessageType.UPDATE, 
            payload: { players, lightOn } 
        });
      }
    });

    conn.on('close', () => {
      connectionsRef.current = connectionsRef.current.filter(c => c !== conn);
      // If host, remove player
      if (isHost) {
        setPlayers(prev => {
          const next = { ...prev };
          delete next[conn.peer];
          // We rely on the tick loop to broadcast deletion
          return next;
        });
      }
    });
  };

  // Broadcast to all connected peers (Host function)
  const broadcast = (msg: NetworkMessage) => {
    connectionsRef.current.forEach(conn => {
      if (conn.open) conn.send(msg);
    });
  };

  // Send to Host (Client function)
  const sendToHost = (msg: NetworkMessage) => {
    if (connectionsRef.current[0] && connectionsRef.current[0].open) {
      connectionsRef.current[0].send(msg);
    }
  };

  // Connect to a host
  const joinGame = (hostId: string) => {
    initPeer(); // Start own peer first
    // Wait for open
    const checkOpen = setInterval(() => {
      if (peerRef.current && !peerRef.current.disconnected && !peerRef.current.destroyed && peerRef.current.id) {
        clearInterval(checkOpen);
        const conn = peerRef.current.connect(hostId);
        handleIncomingConnection(conn);
        // Send initial Join
        conn.on('open', () => {
            conn.send({ 
                type: MessageType.JOIN, 
                payload: { color: localPlayerRef.current.color } 
            });
        });
      }
    }, 200);
  };

  const hostGame = (roomId: string) => {
    initPeer(roomId);
  };

  const toggleLight = () => {
    if (isHost) {
        setLightOn(prev => !prev);
    } else {
        sendToHost({ type: MessageType.TOGGLE_LIGHT, payload: null });
    }
  };

  // Frequent update loop (tick)
  useEffect(() => {
    if (status !== 'connected') return;

    const interval = setInterval(() => {
      if (isHost) {
        // Host broadcasts the authoritative state to everyone
        const fullState = { 
            players: { ...players, [localId]: localPlayerRef.current },
            lightOn // Include light state in tick
        };
        broadcast({ type: MessageType.UPDATE, payload: fullState });
      } else {
        // Client sends its local state to host
        sendToHost({ 
          type: MessageType.UPDATE, 
          payload: { 
            id: localId, 
            position: sanitizeVec(localPlayerRef.current.position), 
            rotation: sanitizeVec(localPlayerRef.current.rotation)
          } 
        });
      }
    }, 50); // 20 ticks per second

    return () => clearInterval(interval);
  }, [status, isHost, players, localId, lightOn]);

  const updateLocalState = useCallback((pos: Vector3, rot: Vector3) => {
    localPlayerRef.current.position = pos;
    localPlayerRef.current.rotation = rot;
  }, []);

  return {
    peerId,
    isHost,
    status,
    errorMsg,
    players,
    hostGame,
    joinGame,
    updateLocalState,
    lightOn,
    toggleLight
  };
};