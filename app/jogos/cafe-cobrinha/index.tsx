import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView, StatusBar, Image, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Picker } from '@react-native-picker/picker';

const { width, height } = Dimensions.get('window');

const GAME_AREA_PADDING = 20;
const GAME_AREA_WIDTH = width - (GAME_AREA_PADDING * 2);

// Alturas fixas dos elementos
const HEADER_HEIGHT = 100; // Altura do cabeçalho (título + score)
const CONTROLS_HEIGHT = 300; // Altura fixa dos controles

// Calcula a altura disponível para o jogo
const GAME_AREA_HEIGHT = height - HEADER_HEIGHT - CONTROLS_HEIGHT;

// Tamanho fixo da célula em pixels
const CELL_SIZE = 20;

// Calcula quantas células cabem na área de jogo
const GRID_SIZE_X = Math.floor(GAME_AREA_WIDTH / CELL_SIZE);
const GRID_SIZE_Y = Math.floor(GAME_AREA_HEIGHT / CELL_SIZE);

console.log('📏 Dimensões do jogo:', {
  screen: { width, height },
  availableSpace: {
    width: GAME_AREA_WIDTH,
    height: GAME_AREA_HEIGHT,
    headerHeight: HEADER_HEIGHT,
    controlsHeight: CONTROLS_HEIGHT,
    totalUsed: HEADER_HEIGHT + CONTROLS_HEIGHT
  },
  grid: {
    cellsX: GRID_SIZE_X,
    cellsY: GRID_SIZE_Y,
    cellSize: CELL_SIZE
  }
});

// Posição inicial centralizada
const INITIAL_SNAKE = [{ 
  x: Math.floor(GRID_SIZE_X / 2), 
  y: Math.floor(GRID_SIZE_Y / 2) 
}];
const INITIAL_DIRECTION = { x: 1, y: 0 };
const GAME_SPEED = 150;

type Difficulty = 'very-easy' | 'easy' | 'medium' | 'hard';
const DIFFICULTY_SPEEDS = {
  'very-easy': 150,
  easy: 200,
  medium: 150,
  hard: 100
};

type Position = { x: number; y: number };
type Direction = { x: number; y: number };
type MovementLog = {
  position: Position;
  direction: Direction;
  timestamp: number;
};

type PowerUp = {
  type: 'speed' | 'points' | 'shield';
  position: Position;
};

export default function SnakeGame() {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Position>(generateFood(INITIAL_SNAKE));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [movementLog, setMovementLog] = useState<MovementLog[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [activeEffects, setActiveEffects] = useState<{
    speed?: boolean;
    points?: boolean;
    shield?: boolean;
  }>({});
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [laserIntersects, setLaserIntersects] = useState(false);
  const [autoGuide, setAutoGuide] = useState(false);

  const moveInterval = useRef<NodeJS.Timeout | null>(null);
  const lastDirection = useRef<Direction>(INITIAL_DIRECTION);
  const gameState = useRef({ snake, direction, food, score, gameOver });

  useEffect(() => {
    gameState.current = { snake, direction, food, score, gameOver };
  }, [snake, direction, food, score, gameOver]);

  const isValidMove = useCallback((newHead: Position): boolean => {
    if (
      newHead.x < 0 || 
      newHead.x >= GRID_SIZE_X || 
      newHead.y < 0 || 
      newHead.y >= GRID_SIZE_Y
    ) {
      return false;
    }

    const willCollide = gameState.current.snake.some(segment => 
      segment.x === newHead.x && segment.y === newHead.y
    );

    if (willCollide) {
      return false;
    }

    return true;
  }, []);

  const checkLaserIntersection = useCallback((head: Position) => {
    if (difficulty !== 'very-easy') return false;
    
    // Verifica se a comida está na mesma linha ou coluna que a cabeça
    const sameRow = head.y === food.y;
    const sameColumn = head.x === food.x;
    
    return sameRow || sameColumn;
  }, [food, difficulty]);

  const autoGuideSnake = useCallback((head: Position) => {
    if (!autoGuide) return;
    if (difficulty !== 'very-easy') return false;

    // Função para verificar se uma direção é segura
    const isSafeDirection = (newHead: Position) => {
      // Verifica colisão com as paredes
      if (
        newHead.x < 0 || 
        newHead.x >= GRID_SIZE_X || 
        newHead.y < 0 || 
        newHead.y >= GRID_SIZE_Y
      ) {
        return false;
      }

      // Verifica colisão com o próprio corpo
      return !snake.some(segment => 
        segment.x === newHead.x && segment.y === newHead.y
      );
    };

    // Calcula a distância em X e Y até a comida
    const dx = food.x - head.x;
    const dy = food.y - head.y;

    // Determina a direção principal (horizontal ou vertical)
    const isHorizontalPriority = Math.abs(dx) > Math.abs(dy);

    if (isHorizontalPriority) {
      // Tenta mover horizontalmente primeiro
      const horizontalDirection = { x: dx > 0 ? 1 : -1, y: 0 };
      const nextHorizontalHead = {
        x: head.x + horizontalDirection.x,
        y: head.y
      };

      if (isSafeDirection(nextHorizontalHead)) {
        setDirection(horizontalDirection);
      } else {
        // Se horizontal não for seguro, tenta vertical
        const verticalDirection = { x: 0, y: dy > 0 ? 1 : -1 };
        const nextVerticalHead = {
          x: head.x,
          y: head.y + verticalDirection.y
        };
        if (isSafeDirection(nextVerticalHead)) {
          setDirection(verticalDirection);
        }
      }
    } else {
      // Tenta mover verticalmente primeiro
      const verticalDirection = { x: 0, y: dy > 0 ? 1 : -1 };
      const nextVerticalHead = {
        x: head.x,
        y: head.y + verticalDirection.y
      };

      if (isSafeDirection(nextVerticalHead)) {
        setDirection(verticalDirection);
      } else {
        // Se vertical não for seguro, tenta horizontal
        const horizontalDirection = { x: dx > 0 ? 1 : -1, y: 0 };
        const nextHorizontalHead = {
          x: head.x + horizontalDirection.x,
          y: head.y
        };
        if (isSafeDirection(nextHorizontalHead)) {
          setDirection(horizontalDirection);
        }
      }
    }
  }, [food, autoGuide, snake]);

  const moveSnake = useCallback(() => {
    if (gameState.current.gameOver) return;

    setSnake(prev => {
      const currentHead = prev[0];
      const newHead = {
        x: currentHead.x + gameState.current.direction.x,
        y: currentHead.y + gameState.current.direction.y
      };

      // Verifica interseção do laser
      const intersects = checkLaserIntersection(newHead);
      setLaserIntersects(intersects);

      // Aplica o auto-guide se estiver ativo
      autoGuideSnake(newHead);

      if (!isValidMove(newHead)) {
        if (activeEffects.shield) {
          setActiveEffects(prev => ({ ...prev, shield: false }));
          return prev;
        }
        endGame();
        return prev;
      }

      const newSnake = [newHead, ...prev];

      // Verificar power-ups
      const powerUpIndex = powerUps.findIndex(p => 
        p.position.x === newHead.x && p.position.y === newHead.y
      );

      if (powerUpIndex !== -1) {
        const powerUp = powerUps[powerUpIndex];
        setActiveEffects(prev => ({ ...prev, [powerUp.type]: true }));
        setPowerUps(prev => prev.filter((_, i) => i !== powerUpIndex));
        setTimeout(() => {
          setActiveEffects(prev => ({ ...prev, [powerUp.type]: false }));
        }, 5000);
      }

      // Verificar comida
      if (newHead.x === gameState.current.food.x && newHead.y === gameState.current.food.y) {
        const points = activeEffects.points ? 2 : 1;
        const newScore = gameState.current.score + points;
        setScore(newScore);
        if (newScore > highScore) {
          setHighScore(newScore);
        }
        const newFood = generateFood(newSnake);
        setFood(newFood);

        // Gerar power-up com 20% de chance
        if (Math.random() < 0.2) { // 20% de chance
          const types: PowerUp['type'][] = ['speed', 'points', 'shield'];
          const type = types[Math.floor(Math.random() * types.length)];
          const position = generateFood(newSnake);
          setPowerUps(prev => [...prev, { type, position }]);
        }
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [highScore, isValidMove, powerUps, activeEffects, checkLaserIntersection, autoGuideSnake]);

  useEffect(() => {
    if (gameOver) return;
    
    // Calcula o multiplicador de velocidade baseado na pontuação
    const newSpeedMultiplier = 1 + (Math.floor(score / 10) * 0.1);
    setSpeedMultiplier(newSpeedMultiplier);
    
    const baseSpeed = activeEffects.speed ? DIFFICULTY_SPEEDS[difficulty] / 2 : DIFFICULTY_SPEEDS[difficulty];
    const adjustedSpeed = baseSpeed / newSpeedMultiplier;
    
    moveInterval.current = setInterval(moveSnake, adjustedSpeed);
    return () => {
      if (moveInterval.current) {
        clearInterval(moveInterval.current);
      }
    };
  }, [gameOver, moveSnake, difficulty, activeEffects.speed, score]);

  const endGame = useCallback(() => {
    console.log('🎮 Fim de jogo - Pontuação final:', score);
    console.log('📝 Total de movimentos registrados:', movementLog.length);
    console.log('📊 Log de movimentos:', movementLog);
    
    if (moveInterval.current) {
      clearInterval(moveInterval.current);
    }
    setGameOver(true);
  }, [score, movementLog]);

  const resetGame = useCallback(() => {
    console.log('🔄 Reiniciando jogo');
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    lastDirection.current = INITIAL_DIRECTION;
    setFood(generateFood(INITIAL_SNAKE));
    setScore(0);
    setGameOver(false);
    setMovementLog([]);
  }, []);

  const changeDirection = useCallback((dx: number, dy: number) => {
    const newDirection = { x: dx, y: dy };
    const currentHead = gameState.current.snake[0];
    const nextHead = {
      x: currentHead.x + dx,
      y: currentHead.y + dy
    };

    console.log('🎮 Mudando direção:', {
      currentDirection: gameState.current.direction,
      newDirection,
      nextHead,
      gridLimits: {
        x: { min: 0, max: GRID_SIZE_X - 1 },
        y: { min: 0, max: GRID_SIZE_Y - 1 }
      }
    });

    // Previne movimento em 180 graus
    if (
      (dx === -gameState.current.direction.x && dy === -gameState.current.direction.y) ||
      (dx === gameState.current.direction.x && dy === gameState.current.direction.y)
    ) {
      console.log('⚠️ Direção inválida - Movimento em 180 graus');
      return;
    }

    // Verifica se o próximo movimento é válido
    if (!isValidMove(nextHead)) {
      console.log('⚠️ Direção inválida - Próximo movimento causaria colisão');
      return;
    }

    lastDirection.current = newDirection;
    setDirection(newDirection);
  }, [isValidMove]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#2C1810', '#3C2415']} style={styles.gradient}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Image 
              source={require('@/assets/icons/cafe-cobrinha.png')}
              style={styles.headerIcon}
            />
            <Text style={styles.title}>Café Cobrinha</Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.score}>☕ {score}</Text>
            <Text style={styles.highScore}>🏆 {highScore}</Text>
            <TouchableOpacity onPress={() => setShowInfo(!showInfo)}>
              <Ionicons name="information-circle-outline" size={32} color="#E6C9A8" />
            </TouchableOpacity>
          </View>
        </View>

        {showInfo && (
          <View style={styles.infoContainer}>
            <BlurView intensity={20} style={styles.infoBlur}>
              <View style={styles.infoHeader}>
                <Image 
                  source={require('@/assets/icons/cafe-cobrinha.png')}
                  style={styles.infoIcon}
                />
                <Text style={styles.infoTitle}>Como Jogar</Text>
              </View>

              <View style={styles.infoContent}>
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>🎮 Controles</Text>
                  <Text style={styles.infoText}>• Use os botões direcionais para mover a cobrinha</Text>
                  <Text style={styles.infoText}>• Não pode fazer movimento em 180°</Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>☕ Objetivo</Text>
                  <Text style={styles.infoText}>• Colete as xícaras de café para crescer</Text>
                  <Text style={styles.infoText}>• Cada xícara vale 1 ponto</Text>
                  <Text style={styles.infoText}>• Tente bater seu recorde!</Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>⚡ Velocidade</Text>
                  <Text style={styles.infoText}>• A cada 10 pontos, a velocidade aumenta 10%</Text>
                  <Text style={styles.infoText}>• A velocidade atual é: {Math.round(speedMultiplier * 100)}%</Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>⚡ Power-ups</Text>
                  <Text style={styles.infoText}>Após coletar uma xícara, tem 20% de chance de aparecer um power-up !</Text>
                  <Text style={styles.infoText}>• ⚡ Velocidade: A cobrinha fica mais rápida</Text>
                  <Text style={styles.infoText}>• ⭐ Pontos: Ganha o dobro de pontos</Text>
                  <Text style={styles.infoText}>• 🛡️ Escudo: Protege contra uma colisão</Text>
                  <Text style={styles.infoText}>• Os efeitos duram 5 segundos</Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>⚠️ Cuidado</Text>
                  <Text style={styles.infoText}>• Evite colidir com as paredes</Text>
                  <Text style={styles.infoText}>• Não bata no próprio corpo</Text>
                  <Text style={styles.infoText}>• A cobrinha cresce a cada xícara</Text>
                </View>

                {difficulty === 'very-easy' && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>👶 Modo Bebê</Text>
                    <Text style={styles.infoText}>• Disponível apenas na dificuldade "Muito Fácil"</Text>
                    <Text style={styles.infoText}>• Clique no ícone de bebê para ativar</Text>
                    <Text style={styles.infoText}>• A cobrinha seguirá automaticamente a comida</Text>
                    <Text style={styles.infoText}>• O laser mostra o caminho até a comida</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowInfo(false)}
              >
                <LinearGradient
                  colors={['#E6C9A8', '#8B4513']}
                  style={styles.closeButtonGradient}
                >
                  <Text style={styles.closeButtonText}>Entendi!</Text>
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          </View>
        )}

        <View style={styles.gameArea}>
          <BlurView intensity={20} style={styles.gameAreaBlur}>
            <View style={styles.grid} />
            <View style={styles.border} />
            {snake.map((segment, idx) => (
              <Animated.View
                key={idx}
                style={[
                  styles.snake,
                  {
                    left: segment.x * CELL_SIZE,
                    top: segment.y * CELL_SIZE,
                    width: CELL_SIZE - 2,
                    height: CELL_SIZE - 2,
                    backgroundColor: idx === 0 ? '#E6C9A8' : '#8B4513',
                    zIndex: idx === 0 ? 2 : 1,
                    transform: [{ scale: idx === 0 ? scaleAnim : 1 }],
                  },
                ]}
              />
            ))}
            {difficulty === 'very-easy' && (
              <>
                {/* Laser para cima */}
                <View
                  style={[
                    styles.laser,
                    {
                      left: snake[0].x * CELL_SIZE + (CELL_SIZE / 2) - 1,
                      top: 0,
                      width: 2,
                      height: snake[0].y * CELL_SIZE + (CELL_SIZE / 2),
                    },
                  ]}
                />
                {/* Laser para baixo */}
                <View
                  style={[
                    styles.laser,
                    {
                      left: snake[0].x * CELL_SIZE + (CELL_SIZE / 2) - 1,
                      top: snake[0].y * CELL_SIZE + (CELL_SIZE / 2),
                      width: 2,
                      height: GAME_AREA_HEIGHT - (snake[0].y * CELL_SIZE + (CELL_SIZE / 2)),
                    },
                  ]}
                />
                {/* Laser para esquerda */}
                <View
                  style={[
                    styles.laser,
                    {
                      left: 0,
                      top: snake[0].y * CELL_SIZE + (CELL_SIZE / 2) - 1,
                      width: snake[0].x * CELL_SIZE + (CELL_SIZE / 2),
                      height: 2,
                    },
                  ]}
                />
                {/* Laser para direita */}
                <View
                  style={[
                    styles.laser,
                    {
                      left: snake[0].x * CELL_SIZE + (CELL_SIZE / 2),
                      top: snake[0].y * CELL_SIZE + (CELL_SIZE / 2) - 1,
                      width: GAME_AREA_WIDTH - (snake[0].x * CELL_SIZE + (CELL_SIZE / 2)),
                      height: 2,
                    },
                  ]}
                />
              </>
            )}
            {powerUps.map((powerUp, idx) => (
              <View
                key={idx}
                style={[
                  styles.powerUp,
                  {
                    left: powerUp.position.x * CELL_SIZE,
                    top: powerUp.position.y * CELL_SIZE,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                  },
                ]}
              >
                <Ionicons 
                  name={
                    powerUp.type === 'speed' ? 'flash' : 
                    powerUp.type === 'points' ? 'star' : 'shield'
                  }
                  size={CELL_SIZE * 0.8}
                  color="#E6C9A8"
                />
              </View>
            ))}
            <View
              style={[
                styles.food,
                {
                  left: food.x * CELL_SIZE,
                  top: food.y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  zIndex: 3,
                  borderWidth: laserIntersects ? 2 : 0,
                  borderColor: '#00FF00',
                },
              ]}
            >
              <Image 
                source={require('@/assets/imgs/xicara.png')}
                style={[styles.foodIcon, { width: CELL_SIZE * 0.8, height: CELL_SIZE * 0.8 }]}
              />
            </View>
            {gameOver && (
              <BlurView intensity={30} style={styles.gameOverOverlay}>
                <Text style={styles.gameOverText}>Fim de Jogo</Text>
                <Text style={styles.finalScore}>Pontuação: {score}</Text>
                <TouchableOpacity style={styles.restartButton} onPress={resetGame}>
                  <LinearGradient
                    colors={['#E6C9A8', '#8B4513']}
                    style={styles.restartButtonGradient}
                  >
                    <Text style={styles.restartText}>Jogar Novamente</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </BlurView>
            )}
          </BlurView>
        </View>

        <View style={styles.controls}>
          <View style={styles.controlRow}>
            <TouchableOpacity 
              onPress={() => changeDirection(0, -1)} 
              style={styles.controlButton}
            >
              <Ionicons name="chevron-up" size={32} color="#E6C9A8" />
            </TouchableOpacity>
          </View>
          <View style={styles.controlRow}>
            <TouchableOpacity 
              onPress={() => changeDirection(-1, 0)} 
              style={styles.controlButton}
            >
              <Ionicons name="chevron-back" size={32} color="#E6C9A8" />
            </TouchableOpacity>
            <View style={{ width: CELL_SIZE * 2 }} />
            <TouchableOpacity 
              onPress={() => changeDirection(1, 0)} 
              style={styles.controlButton}
            >
              <Ionicons name="chevron-forward" size={32} color="#E6C9A8" />
            </TouchableOpacity>
          </View>
          <View style={styles.controlRow}>
            <TouchableOpacity 
              onPress={() => changeDirection(0, 1)} 
              style={styles.controlButton}
            >
              <Ionicons name="chevron-down" size={32} color="#E6C9A8" />
            </TouchableOpacity>
          </View>
        </View>

        {difficulty === 'very-easy' && (
          <View style={styles.autoGuideContainer}>
            <TouchableOpacity 
              style={[
                styles.autoGuideButton,
                autoGuide && styles.autoGuideButtonActive
              ]}
              onPress={() => setAutoGuide(!autoGuide)}
            >
              <Image
                source={require('@/assets/icons/baby.png')}
                style={{
                  width: 32,
                  height: 32,
                  tintColor: autoGuide ? '#2C1810' : '#E6C9A8'
                }}
              />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.difficultyContainer}>
          <Text style={styles.difficultyLabel}>Dificuldade</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={difficulty}
              onValueChange={(value: Difficulty) => setDifficulty(value)}
              style={styles.picker}
              dropdownIconColor="#E6C9A8"
              itemStyle={styles.pickerItem}
              mode="dropdown"
            >
              <Picker.Item 
                label="Muito Fácil" 
                value="very-easy" 
                color="#E6C9A8"
                style={styles.pickerItem}
              />
              <Picker.Item 
                label="Fácil" 
                value="easy" 
                color="#E6C9A8"
                style={styles.pickerItem}
              />
              <Picker.Item 
                label="Médio" 
                value="medium" 
                color="#E6C9A8"
                style={styles.pickerItem}
              />
              <Picker.Item 
                label="Difícil" 
                value="hard" 
                color="#E6C9A8"
                style={styles.pickerItem}
              />
            </Picker>
          </View>
        </View>

        <View style={styles.effectsContainer}>
          {activeEffects.speed && (
            <View style={styles.effectItem}>
              <Ionicons name="flash" size={20} color="#E6C9A8" />
              <Text style={styles.effectText}>Velocidade x2</Text>
            </View>
          )}
          {activeEffects.points && (
            <View style={styles.effectItem}>
              <Ionicons name="star" size={20} color="#E6C9A8" />
              <Text style={styles.effectText}>Pontos x2</Text>
            </View>
          )}
          {activeEffects.shield && (
            <View style={styles.effectItem}>
              <Ionicons name="shield" size={20} color="#E6C9A8" />
              <Text style={styles.effectText}>Escudo Ativo</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

function generateFood(snake: Position[]): Position {
  let newPos: Position;
  while (true) {
    newPos = {
      x: Math.floor(Math.random() * GRID_SIZE_X),
      y: Math.floor(Math.random() * GRID_SIZE_Y),
    };
    if (!snake.some(seg => seg.x === newPos.x && seg.y === newPos.y)) break;
  }
  return newPos;
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  gradient: { 
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    height: HEADER_HEIGHT,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
    marginRight: 10,
    tintColor: '#E6C9A8',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E6C9A8',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  scoreContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E6C9A8',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
},
highScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E6C9A8',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
},
gameArea: {
    flex: 1,
    marginHorizontal: GAME_AREA_PADDING,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(230, 201, 168, 0.3)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    height: GAME_AREA_HEIGHT,
},
gameAreaBlur: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    position: 'relative',
  },
  grid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(230, 201, 168, 0.1)',
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: 'rgba(230, 201, 168, 0.5)',
  },
  snake: {
    position: 'absolute',
    width: CELL_SIZE - 2,
    height: CELL_SIZE - 2,
    borderRadius: 4,
    margin: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  food: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodIcon: {
    width: CELL_SIZE * 0.8,
    height: CELL_SIZE * 0.8,
    tintColor: '#E6C9A8',
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  gameOverText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#E6C9A8',
    marginBottom: 10,
  },
  finalScore: {
    fontSize: 24,
    color: '#E6C9A8',
    marginBottom: 30,
  },
  restartButton: {
    overflow: 'hidden',
    borderRadius: 25,
  },
  restartButtonGradient: {
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  restartText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C1810',
  },
  controls: {
    alignItems: 'center',
    height: CONTROLS_HEIGHT,
  },
  controlRow: {
    flexDirection: 'row',
    marginVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: 'rgba(230, 201, 168, 0.2)',
    padding: 20,
    borderRadius: 40,
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(230, 201, 168, 0.3)',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  infoBlur: {
    width: '90%',
    maxWidth: 400,
    padding: 25,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(230, 201, 168, 0.3)',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  infoIcon: {
    width: 40,
    height: 40,
    marginRight: 15,
    tintColor: '#E6C9A8',
  },
  infoTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E6C9A8',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  infoContent: {
    marginBottom: 25,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E6C9A8',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#E6C9A8',
    marginBottom: 8,
    lineHeight: 24,
    opacity: 0.9,
  },
  closeButton: {
    overflow: 'hidden',
    borderRadius: 15,
  },
  closeButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#2C1810',
    fontSize: 18,
    fontWeight: 'bold',
  },
  powerUp: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  effectsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  effectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    gap: 5,
  },
  effectText: {
    color: '#E6C9A8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  difficultyContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(230, 201, 168, 0.3)',
    width: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  difficultyLabel: {
    color: '#E6C9A8',
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  pickerContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(230, 201, 168, 0.3)',
    height: 45,
  },
  picker: {
    height: 60,
    color: '#E6C9A8',
    backgroundColor: 'transparent',
    marginTop: -8,
  },
  pickerItem: {
    backgroundColor: '#2C1810',
    color: '#E6C9A8',
    fontSize: 16,
    height: 50,
    textAlign: 'center',
  },
  laser: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 0, 0, 0.5)',
    zIndex: 1,
  },
  autoGuideContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
  },
  autoGuideButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 15,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(230, 201, 168, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  autoGuideButtonActive: {
    backgroundColor: '#E6C9A8',
  },
});
