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
            broadcast({ type: MessageType.UPDATE, payload: next });
            return next;
          });
          break;

        case MessageType.UPDATE:
          // A client sent their position update
          const { id, position, rotation } = data.payload;
          setPlayers(prev => {
            // Update this specific player's data in the host's source of truth
            if (!prev[id]) return prev;
            const updated = { ...prev };
            updated[id] = { ...updated[id], position, rotation };
            return updated;
          });
          break;
      }
    } 
    // CLIENT LOGIC
    else {
      switch (data.type) {
        case MessageType.UPDATE:
          // Host sent the full world state
          const worldState = data.payload as Record<string, PlayerState>;
          // Remove ourselves from the received state to avoid overwriting local prediction
          // But actually, for this simple demo, we can just merge. 
          // However, to prevent "jitter" on self, we typically filter self out or ignore self updates.
          
          setPlayers(prev => {
            const nextState = { ...worldState };
            // Ensure we keep our local color if host didn't have it correct (edge case), 
            // but mostly just trust the host for others.
            // We do NOT overwrite our own local position from the server to prevent lag/jitter loop
            // unless we want server reconciliation. For this demo, client is authoritative over self.
            if (nextState[localId]) {
              delete nextState[localId];
            }
            return { ...nextState, [localId]: localPlayerRef.current };
          });
          break;
      }
    }
  }, [isHost, localId]);

  const handleIncomingConnection = (conn: DataConnection) => {
    conn.on('data', (data: any) => handleData(data, conn));
    
    conn.on('open', () => {
      connectionsRef.current.push(conn);
      // If host, send current state immediately
      if (isHost) {
        conn.send({ type: MessageType.UPDATE, payload: players });
      }
    });

    conn.on('close', () => {
      connectionsRef.current = connectionsRef.current.filter(c => c !== conn);
      // If host, remove player
      if (isHost) {
        setPlayers(prev => {
          const next = { ...prev };
          delete next[conn.peer];
          broadcast({ type: MessageType.UPDATE, payload: next });
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

  // Frequent update loop (tick)
  useEffect(() => {
    if (status !== 'connected') return;

    const interval = setInterval(() => {
      if (isHost) {
        // Host broadcasts the authoritative state to everyone
        // Merging local host player state into the broadcast
        const fullState = { ...players, [localId]: localPlayerRef.current };
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
  }, [status, isHost, players, localId]);

  const updateLocalState = (pos: Vector3, rot: Vector3) => {
    localPlayerRef.current.position = pos;
    localPlayerRef.current.rotation = rot;
  };

  return {
    peerId,
    isHost,
    status,
    errorMsg,
    players,
    hostGame,
    joinGame,
    updateLocalState
  };
};