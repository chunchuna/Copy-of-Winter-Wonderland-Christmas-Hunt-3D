export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerState {
  id: string;
  position: Vector3;
  rotation: Vector3; // Euler angles
  color: string;
}

export enum MessageType {
  JOIN = 'JOIN',
  WELCOME = 'WELCOME',
  UPDATE = 'UPDATE',
  PLAYER_LEFT = 'PLAYER_LEFT'
}

export interface NetworkMessage {
  type: MessageType;
  payload: any;
}

export interface LocalInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
}