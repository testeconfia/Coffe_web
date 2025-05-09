import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Image,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  Text,
  Animated,
  Easing,
  useWindowDimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

// Hook para detectar mudanças na orientação
const useOrientation = () => {
  const { width, height } = useWindowDimensions();
  return width > height ? 'landscape' : 'portrait';
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const GROUND_Y = SCREEN_H * 0.8;
const GRAVITY = 1;
const JUMP_VELOCITY = -18;
const OBSTACLE_SPEED = 6;
const OBSTACLE_INTERVAL = 1500;

// Game states
type GameState = 'start' | 'playing' | 'gameOver';

// **1. Array de sprites do stickman**
const stickmanFrames = [
  require('@/assets/icons/sprits/stickmen_01.png'),
  require('@/assets/icons/sprits/stickmen_02.png'),
  require('@/assets/icons/sprits/stickmen_03.png'),
  require('@/assets/icons/sprits/stickmen_04.png'),
  require('@/assets/icons/sprits/stickmen_05.png'),
  require('@/assets/icons/sprits/stickmen_06.png'),
  require('@/assets/icons/sprits/stickmen_07.png'),
  require('@/assets/icons/sprits/stickmen_08.png'),
  require('@/assets/icons/sprits/stickmen_09.png'),
  require('@/assets/icons/sprits/stickmen_10.png'),
  require('@/assets/icons/sprits/stickmen_11.png'),
  require('@/assets/icons/sprits/stickmen_12.png'),
];

// Array de imagens dos obstáculos
const obstacleImages = [
  require('@/assets/icons/obstaculos/arvore_a.png'),
  require('@/assets/icons/obstaculos/arvore_fp.png'),
  require('@/assets/icons/obstaculos/arvore_p.png'),
];

type ObstacleType = 'tree' | 'hole';

type Obstacle = { 
  x: number; 
  height: number; 
  key: number;
  imageIndex: number;
  type: ObstacleType;
};

// Importar a imagem do chão
const groundImage = require('@/assets/icons/obstaculos/chao_puro.png');
const GROUND_IMAGE_WIDTH = 300;
const GROUND_IMAGE_HEIGHT = 310;
const SCREEN_WIDTH = Dimensions.get('window').width;
const holeImage = require('@/assets/icons/obstaculos/buraco_.png');

export default function StickmanRunner() {
  const orientation = useOrientation();
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const [isRotating, setIsRotating] = useState(false);
  
  // Ajusta as constantes baseado na orientação
  const GROUND_Y = orientation === 'landscape' ? SCREEN_H * 0.7 : SCREEN_H * 0.8;
  const GRAVITY = 1;
  const JUMP_VELOCITY = -18;
  const OBSTACLE_SPEED = orientation === 'landscape' ? 8 : 6;
  const OBSTACLE_INTERVAL = orientation === 'landscape' ? 1200 : 1500;

  const [gameState, setGameState] = useState<GameState>('start');
  const [playerY, setPlayerY] = useState(GROUND_Y);
  const [velocity, setVelocity] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const frameTimer = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(1)).current;
  const [groundX, setGroundX] = useState(0);

  // Efeito de fade in/out para transições
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [gameState]);

  // Efeito de bounce para o score
  const animateScore = useCallback(() => {
    Animated.sequence([
      Animated.timing(scoreAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scoreAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scoreAnim]);

  // Physics and movement loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    let rafId: number;
    const loop = () => {
      setVelocity(v => v + GRAVITY);
      setPlayerY(y => Math.min(y + velocity, GROUND_Y));

      setObstacles(obs =>
        obs
          .map(o => ({ ...o, x: o.x - OBSTACLE_SPEED }))
          .filter(o => o.x + 30 > 0)
      );

      // Check collisions
      const playerWidth = 35;
      const playerHeight = 35;
      const playerBottom = playerY;
      const playerTop = playerBottom - playerHeight;

      const hasCollision = obstacles.some(o => {
        const obstacleWidth = o.type === 'hole' ? 60 : 20;
        const obstacleTop = GROUND_Y - o.height;
        const obstacleBottom = GROUND_Y;

        // Colisão mais precisa
        const horizontalCollision = 
          50 < o.x + obstacleWidth && 
          50 + playerWidth > o.x;

        const verticalCollision = 
          playerTop < obstacleBottom && 
          playerBottom > obstacleTop;

        const collision = horizontalCollision && verticalCollision;

        if (collision) {
          console.log('Colisão detectada!');
        }

        return collision;
      });

      if (hasCollision) {
        console.log('Game Over - Colisão');
        setGameState('gameOver');
        if (score > highScore) {
          setHighScore(score);
        }
        return;
      }

      if (gameState === 'playing') {
        setScore(s => s + 1);
        if (score % 10 === 0) {
          animateScore();
        }
        rafId = requestAnimationFrame(loop);
      }
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [velocity, obstacles, gameState, score, highScore, animateScore]);

  // Frame animation
  useEffect(() => {
    if (gameState !== 'playing') {
      frameTimer.current && clearInterval(frameTimer.current);
      return;
    }

    // Só anima quando estiver no chão
    if (playerY >= GROUND_Y) {
      const baseInterval = 5;
      const speedMultiplier = Math.max(0.5, 1 - (score / 1000));
      const interval = baseInterval * speedMultiplier;

      frameTimer.current = setInterval(() => {
        setFrameIndex(idx => (idx + 1) % stickmanFrames.length);
      }, interval);
    } else {
      // Quando estiver no ar, mantém o frame de pulo
      setFrameIndex(4); // Frame do meio do pulo
      frameTimer.current && clearInterval(frameTimer.current);
    }

    return () => {
      if (frameTimer.current) {
        clearInterval(frameTimer.current);
      }
    };
  }, [gameState, score, playerY]);

  // Obstacle generation with adjusted heights
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      const isHole = Math.random() < 0.3; // 30% de chance de ser um buraco
      setObstacles(obs => [
        ...obs,
        {
          x: SCREEN_W + 100,
          height: isHole ? 60 : Math.random() * 80 + 40, // Altura fixa para buracos
          key: Date.now(),
          imageIndex: Math.floor(Math.random() * obstacleImages.length),
          type: isHole ? 'hole' : 'tree',
        },
      ]);
    }, OBSTACLE_INTERVAL);

    return () => clearInterval(interval);
  }, [gameState, SCREEN_W]);

  const handlePress = useCallback(() => {
    if (gameState === 'start') {
      setGameState('playing');
      return;
    }

    if (gameState === 'playing' && playerY >= GROUND_Y) {
      setVelocity(JUMP_VELOCITY);
      // Efeito de bounce ao pular
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (gameState === 'gameOver') {
      setGameState('playing');
      setObstacles([]);
      setScore(0);
      setPlayerY(GROUND_Y);
      setVelocity(0);
      setFrameIndex(0);
    }
  }, [gameState, playerY, bounceAnim]);

  // Ajusta o layout quando a orientação muda
  useEffect(() => {
    // Reseta a posição do jogador quando a orientação muda
    setPlayerY(GROUND_Y);
    setVelocity(0);
    setObstacles([]);
  }, [orientation]);

  // Função para rotacionar a tela
  const toggleOrientation = useCallback(async () => {
    if (isRotating) return;
    
    setIsRotating(true);
    try {
      const newOrientation = orientation === 'portrait' 
        ? ScreenOrientation.OrientationLock.LANDSCAPE
        : ScreenOrientation.OrientationLock.PORTRAIT;
      
      await ScreenOrientation.lockAsync(newOrientation);
    } catch (error) {
      console.log('Erro ao mudar orientação:', error);
    } finally {
      setTimeout(() => {
        setIsRotating(false);
      }, 500);
    }
  }, [orientation, isRotating]);

  // Efeito para resetar a orientação quando sair do jogo
  useEffect(() => {
    return () => {
      // Quando o componente for desmontado, força a orientação para portrait
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT)
        .catch(error => console.log('Erro ao resetar orientação:', error));
    };
  }, []);

  // Loop de animação do chão
  useEffect(() => {
    if (gameState !== 'playing') return;
    let rafId: number;
    const speed = OBSTACLE_SPEED;
    function animate() {
      setGroundX(prev => {
        let next = prev - speed;
        if (Math.abs(next) >= GROUND_IMAGE_WIDTH) {
          next += GROUND_IMAGE_WIDTH;
        }
        return next;
      });
      rafId = requestAnimationFrame(animate);
    }
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [gameState, OBSTACLE_SPEED]);

  const renderStartScreen = () => (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <Text style={styles.title}>Café Runner</Text>
      <Text style={styles.subtitle}>Toque para começar</Text>
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>• Pule tocando na tela</Text>
        <Text style={styles.instructionText}>• Desvie dos grãos de café</Text>
        <Text style={styles.instructionText}>• Quanto mais longe, mais rápido!</Text>
      </View>
    </Animated.View>
  );

  const renderGameOverScreen = () => (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <Text style={styles.gameOverText}>Fim de Jogo</Text>
      <Text style={styles.scoreText}>Xícaras: {score}</Text>
      <Text style={styles.highScoreText}>Recorde: {highScore}</Text>
      <Text style={styles.tapText}>Toque para jogar novamente</Text>
    </Animated.View>
  );

  // Renderizar imagens suficientes para cobrir toda a tela
  const numGroundImages = Math.ceil(SCREEN_WIDTH / GROUND_IMAGE_WIDTH) + 5;
  const groundImages = [];
  for (let i = 0; i < numGroundImages; i++) {
    groundImages.push(
      <Image
        key={i}
        source={groundImage}
        style={[
          styles.groundImage,
          { left: Math.round(groundX + i * (GROUND_IMAGE_WIDTH - 1)) } // overlap de 1px
        ]}
        resizeMode="stretch"
      />
    );
  }

  return (
    <TouchableWithoutFeedback onPress={handlePress}>
      <View style={[
        styles.container,
        orientation === 'landscape' && styles.containerLandscape
      ]}>
        <View style={styles.background}>
          <View style={[
            styles.clouds,
            orientation === 'landscape' && styles.cloudsLandscape
          ]} />
          <View style={[
            styles.mountains,
            orientation === 'landscape' && styles.mountainsLandscape
          ]} />
        </View>

        {/* Chão animado - AGORA AO FUNDO */}
        <View style={[styles.groundContainer, { top: GROUND_Y - 40 }]}> 
          {groundImages}
        </View>

        {/* Botão de rotação */}
        <TouchableOpacity 
          style={[
            styles.rotateButton,
            orientation === 'landscape' && styles.rotateButtonLandscape
          ]} 
          onPress={toggleOrientation}
          disabled={isRotating}
        >
          <Text style={styles.rotateButtonText}>↻</Text>
        </TouchableOpacity>

        <Animated.Text 
          style={[
            styles.score,
            orientation === 'landscape' && styles.scoreLandscape,
            {
              transform: [
                { scale: scoreAnim },
                { translateY: bounceAnim }
              ]
            }
          ]}
        >
          🏆 {score}
        </Animated.Text>

        <Animated.Image
          source={stickmanFrames[frameIndex]}
          style={[
            styles.stickman,
            orientation === 'landscape' && styles.stickmanLandscape,
            { 
              top: playerY - 50,
              tintColor: '#000',
              transform: [{ translateY: bounceAnim }]
            }
          ]}
        />

        {obstacles.map(o => (
          <View
            key={o.key}
            style={[
              styles.obstacle,
              orientation === 'landscape' && styles.obstacleLandscape,
              { 
                height: o.type === 'hole' ? 100 : o.height,
                width: o.type === 'hole' ? 120 : o.height * 0.8,
                top: o.type === 'hole' ? GROUND_Y : GROUND_Y - o.height,
                left: o.x,
                backgroundColor: 'transparent',
                opacity: 1,
              }
            ]}
          >
            {o.type === 'hole' ? (
              <Image
                source={holeImage}
                style={{ width: '100%', height: 300, position: 'absolute', left: 0, top: -1 }}
                resizeMode="stretch"
              />
            ) : (
              <Image
                source={obstacleImages[o.imageIndex]}
                style={[
                  styles.obstacleImage,
                  { height: '100%', width: '100%', zIndex: 1, top: 2 }
                ]}
                resizeMode="contain"
              />
            )}
          </View>
        ))}

        <View
          style={[
            styles.debugHitbox,
            {
              top: playerY - 35,
              left: 50,
              width: 35,
              height: 35,
            }
          ]}
        />

        {gameState === 'start' && renderStartScreen()}
        {gameState === 'gameOver' && renderGameOverScreen()}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5E6D3',
  },
  containerLandscape: {
    backgroundColor: '#F5E6D3',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  clouds: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(210, 180, 140, 0.2)',
  },
  cloudsLandscape: {
    top: 30,
    height: 60,
  },
  mountains: {
    position: 'absolute',
    top: 150,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(139, 69, 19, 0.15)',
  },
  mountainsLandscape: {
    top: 90,
    height: 120,
  },
  stickman: {
    position: 'absolute',
    left: 50,
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  stickmanLandscape: {
    width: 40,
    height: 40,
  },
  obstacle: {
    position: 'absolute',
    borderRadius: 4,
  },
  obstacleLandscape: {
    borderRadius: 4,
  },
  obstacleImage: {
    // Removida a tintColor
  },
  groundContainer: {
    position: 'absolute',
    width: '100%',
    height: GROUND_IMAGE_HEIGHT,
    overflow: 'hidden',
    bottom: 20,
    zIndex: 0,
  },
  groundImage: {
    position: 'absolute',
    width: GROUND_IMAGE_WIDTH,
    height: GROUND_IMAGE_HEIGHT,
  },
  debugHitbox: {
    position: 'absolute',
    borderWidth: 2,
    //borderColor: '#00FF00',
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    //backgroundColor: 'rgba(0, 255, 0, 0.2)',
  },
  score: {
    position: 'absolute',
    top: 40,
    left: 20,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  scoreLandscape: {
    top: 20,
    fontSize: 28,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 24,
    color: '#FFF',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  instructions: {
    marginTop: 20,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  instructionText: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  gameOverText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#D2691E',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  scoreText: {
    fontSize: 32,
    color: '#FFF',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  highScoreText: {
    fontSize: 24,
    color: '#FFD700',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  tapText: {
    fontSize: 20,
    color: '#FFF',
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  rotateButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 36,
    height: 36,
    backgroundColor: 'rgba(139, 69, 19, 0.5)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  rotateButtonLandscape: {
    top: 20,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  rotateButtonText: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: '500',
  },
});
