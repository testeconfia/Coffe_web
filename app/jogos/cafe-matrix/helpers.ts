import { Animated, Dimensions } from 'react-native';
import { GAME_CONSTANTS } from './constants';

const { width, height } = Dimensions.get('window');

export interface PortalData {
  id: number;
  x: number;
  y: number;
  dimensionId: number;
  active: boolean;
  scale: Animated.Value;
  rotation: Animated.Value;
  glow: Animated.Value;
  opacity: Animated.Value;
  type?: 'cup' | 'bean' | 'fire' | 'goldenCup' | 'poison' | 'timePortal' | 'blackHole';
}

export const spawnData = (
  dimensionId: number,
  type?: 'cup' | 'bean' | 'fire' | 'goldenCup' | 'poison' | 'timePortal' | 'blackHole'
): PortalData => {
  // Garantir que o portal apareça em uma área jogável
  const margin = 100; // Margem para não aparecer muito perto das bordas
  const x = Math.random() * (width - margin * 2) + margin;
  const y = Math.random() * (height - margin * 2) + margin;

  return {
    id: Date.now(),
    x,
    y,
    dimensionId,
    active: false,
    scale: new Animated.Value(0),
    rotation: new Animated.Value(0),
    glow: new Animated.Value(0),
    opacity: new Animated.Value(1),
    type
  };
}; 