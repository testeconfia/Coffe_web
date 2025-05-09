export const GAME_CONSTANTS = {
  SPAWN_INTERVAL: 2000,
  PORTAL_LIFETIME: 5000,
  FALL_DURATION: 6000,
  MIN_SPEED: 0.5,
  MAX_SPEED: 1,
  INITIAL_TIME: 60,
  TIME_BONUS: {
    CUP: 5,
    BEAN: 3,
    FIRE: -10,
    GOLDEN_CUP: 10,
    POISON: -15,
    TIME_PORTAL: 20,
    BLACK_HOLE: -30
  },
  POINTS: {
    CUP: 10,
    BEAN: 5,
    FIRE: -20,
    GOLDEN_CUP: 50,
    POISON: -40,
    TIME_PORTAL: 30,
    BLACK_HOLE: -100,
    VIRUS: 0
  },
  COLORS: {
    CUP: '#4CAF50',
    BEAN: '#FFC107',
    FIRE: '#F44336',
    GOLDEN_CUP: '#FFD700',
    POISON: '#9C27B0',
    TIME_PORTAL: '#2196F3',
    BLACK_HOLE: '#000000',
    VIRUS: '#00FFF0'
  }
} as const;

export interface Dimension {
  id: number;
  name: string;
  color: string;
  unlocked: boolean;
  completed: boolean;
  description: string;
  requiredPoints: number;
  spawnRate: number; // Taxa de spawn (1.0 = normal, 1.5 = 50% mais rápido, 0.5 = 50% mais lento)
  portalLifetime: number; // Tempo de vida do portal em ms (menor = mais rápido para desaparecer)
  portalTypes: Array<{
    type: 'cup' | 'bean' | 'fire' | 'goldenCup' | 'poison' | 'timePortal' | 'blackHole' | 'virus';
    probability: number;
  }>;
  fallSpeed: number; // Multiplicador da velocidade de queda
}

export const DIMENSIONS: Dimension[] = [
  {
    id: 1,
    name: 'Café Clássico',
    color: '#8B4513',
    unlocked: true,
    completed: false,
    description: 'O mundo tradicional do café, onde tudo começou.',
    requiredPoints: 0,
    spawnRate: 1.0,
    portalLifetime: 5000,
    portalTypes: [
      { type: 'cup', probability: 0.2 },
      { type: 'bean', probability: 0.5 },
      { type: 'fire', probability: 0.1 },
      { type: 'poison', probability: 0.05 },
      { type: 'virus', probability: 0.05 }
    ],
    fallSpeed: 1
  },
  {
    id: 2,
    name: 'Café Quântico',
    color: '#4B0082',
    unlocked: false,
    completed: false,
    description: 'Onde as partículas de café existem em múltiplos estados.',
    requiredPoints: 500,
    spawnRate: 1.2,
    portalLifetime: 4000,
    portalTypes: [
      { type: 'cup', probability: 0.3 },
      { type: 'bean', probability: 0.2 },
      { type: 'fire', probability: 0.2 },
      { type: 'goldenCup', probability: 0.1 },
      { type: 'poison', probability: 0.15 },
      { type: 'blackHole', probability: 0.05 },
      { type: 'virus', probability: 0.05 }
    ],
    fallSpeed: 1.2
  },
  {
    id: 3,
    name: 'Café Neural',
    color: '#006400',
    unlocked: false,
    completed: false,
    description: 'A inteligência artificial do café.',
    requiredPoints: 1000,
    spawnRate: 1.5,
    portalLifetime: 3000,
    portalTypes: [
      { type: 'cup', probability: 0.25 },
      { type: 'fire', probability: 0.15 },
      { type: 'goldenCup', probability: 0.25 },
      { type: 'poison', probability: 0.15 },
      { type: 'timePortal', probability: 0.1 },
      { type: 'blackHole', probability: 0.1 },
      { type: 'virus', probability: 0.05 }
    ],
    fallSpeed: 1.4
  },
  {
    id: 4,
    name: 'Café Matrix',
    color: '#FFD700',
    unlocked: false,
    completed: false,
    description: 'O nível mais profundo da realidade do café.',
    requiredPoints: 2000,
    spawnRate: 2.0,
    portalLifetime: 2000,
    portalTypes: [
      { type: 'cup', probability: 0.2 },
      { type: 'bean', probability: 0.1 },
      { type: 'fire', probability: 0.1 },
      { type: 'goldenCup', probability: 0.1 },
      { type: 'poison', probability: 0.2 },
      { type: 'timePortal', probability: 0.1 },
      { type: 'blackHole', probability: 0.2 },
      { type: 'virus', probability: 0.05 }
    ],
    fallSpeed: 1.6
  }
]; 