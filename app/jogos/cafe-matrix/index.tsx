import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Image, StatusBar, SafeAreaView, Easing, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GAME_CONSTANTS, DIMENSIONS, Dimension } from './constants';
import Portal from './Portal';
import { spawnData, PortalData } from './helpers';

const { width, height } = Dimensions.get('window');

interface Portal {
  id: number;
  x: number;
  y: Animated.Value;
  dimensionId: number;
  active: boolean;
  scale: Animated.Value;
  rotation: Animated.Value;
  glow: Animated.Value;
  speed: number;
  isFalling: boolean;
  type?: 'cup' | 'bean' | 'fire' | 'goldenCup' | 'poison' | 'timePortal' | 'blackHole';
  isTeleported?: boolean;
}

interface ScoreChange {
  id: number;
  value: number;
  y: Animated.Value;
  opacity: Animated.Value;
  type: 'score' | 'time';
}

const CafeMatrix = () => {
  const [dimensions, setDimensions] = useState<Dimension[]>(DIMENSIONS);
  const [portals, setPortals] = useState<PortalData[]>([]);
  const [currentDimension, setCurrentDimension] = useState(1);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'gameOver'>('playing');
  const [showDescription, setShowDescription] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(GAME_CONSTANTS.INITIAL_TIME);
  const [scoreChanges, setScoreChanges] = useState<ScoreChange[]>([]);
  const [showInfo, setShowInfo] = useState(false);

  // Refs para animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(1)).current;
  const dimensionAnim = useRef(new Animated.Value(1)).current;
  const spawnInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (gameState === 'playing') {
      startSpawningPortals();
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        clearInterval(timer);
        stopSpawningPortals();
      };
    } else {
      stopSpawningPortals();
    }
  }, [gameState]);

  const animateScore = useCallback(() => {
    Animated.sequence([
      Animated.timing(scoreAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.ease
      }),
      Animated.timing(scoreAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.ease
      })
    ]).start();
  }, [scoreAnim]);

  const animateScoreChange = useCallback((value: number, type: 'score' | 'time' = 'score') => {
    const newScoreChange: ScoreChange = {
      id: Date.now(),
      value: value,
      y: new Animated.Value(0),
      opacity: new Animated.Value(1),
      type: type
    };

    setScoreChanges(prev => [...prev, newScoreChange]);

    Animated.parallel([
      Animated.timing(newScoreChange.y, {
        toValue: -50,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      }),
      Animated.timing(newScoreChange.opacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      })
    ]).start(() => {
      setScoreChanges(prev => prev.filter(change => change.id !== newScoreChange.id));
    });
  }, []);

  const startSpawningPortals = useCallback(() => {
    if (spawnInterval.current) {
      clearInterval(spawnInterval.current);
    }
    const currentDimensionData = dimensions[currentDimension - 1];
    const interval = GAME_CONSTANTS.SPAWN_INTERVAL / currentDimensionData.spawnRate;
    spawnInterval.current = setInterval(spawnPortal, interval);
  }, [currentDimension, dimensions]);

  const stopSpawningPortals = useCallback(() => {
    if (spawnInterval.current) {
      clearInterval(spawnInterval.current);
      spawnInterval.current = null;
    }
  }, []);

  const spawnPortal = useCallback(() => {
    const currentDimensionData = dimensions[currentDimension - 1];
    const portalTypes = currentDimensionData.portalTypes;
    
    // Calcular o tipo do portal baseado nas probabilidades
    const random = Math.random();
    let cumulativeProbability = 0;
    let selectedType: 'cup' | 'bean' | 'fire' | 'goldenCup' | 'poison' | 'timePortal' | 'blackHole' | undefined;
    
    for (const portalType of portalTypes) {
      cumulativeProbability += portalType.probability;
      if (random <= cumulativeProbability) {
        selectedType = portalType.type;
        break;
      }
    }

    const dimensionId = Math.floor(Math.random() * dimensions.length) + 1;
    const newPortal = spawnData(dimensionId, selectedType);
    
    setPortals(prev => [...prev, newPortal]);
  }, [currentDimension, dimensions]);

  const handlePortalTimeout = useCallback((portalId: number) => {
    const portal = portals.find(p => p.id === portalId);
    if (!portal || portal.active) return;

    const dimensionData = dimensions[Math.max(0, currentDimension - 1)];
    const animationDuration = Math.min(dimensionData.portalLifetime * 0.3, 300);

    // Animação de desaparecimento
    Animated.parallel([
      Animated.timing(portal.scale, {
        toValue: 0,
        duration: animationDuration,
        useNativeDriver: true,
        easing: Easing.ease
      }),
      Animated.timing(portal.opacity, {
        toValue: 0,
        duration: animationDuration,
        useNativeDriver: true,
        easing: Easing.ease
      })
    ]).start(() => {
      setPortals(prev => prev.filter(p => p.id !== portalId));
    });
  }, [portals, currentDimension, dimensions]);

  const handlePortalActivation = useCallback((portalId: number, isTeleport: boolean = false) => {
    const portal = portals.find(p => p.id === portalId);
    if (!portal || portal.active) return;

    // Se for teleporte, apenas atualiza o estado do portal
    if (isTeleport) {
      setPortals(prevPortals =>
        prevPortals.map(p =>
          p.id === portalId
            ? { ...p, isTeleported: true }
            : p
        )
      );
      return;
    }

    // Marcar o portal como ativo imediatamente
    setPortals(prevPortals =>
      prevPortals.map(p =>
        p.id === portalId
          ? { ...p, active: true }
          : p
      )
    );

    // Animações de ativação
    const dimensionData = dimensions[Math.max(0, currentDimension - 1)];
    const animationDuration = Math.min(dimensionData.portalLifetime * 0.15, 150);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(portal.scale, {
          toValue: 1.2,
          duration: animationDuration,
          useNativeDriver: true,
          easing: Easing.ease
        }),
        Animated.timing(portal.scale, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: true,
          easing: Easing.ease
        })
      ]),
      Animated.timing(portal.glow, {
        toValue: 1,
        duration: animationDuration * 2,
        useNativeDriver: true,
        easing: Easing.ease
      })
    ]).start();

    // Corrigindo o acesso aos pontos
    let points = 0;
    if (portal.type) {
      switch (portal.type) {
        case 'cup':
          points = GAME_CONSTANTS.POINTS.CUP;
          break;
        case 'bean':
          points = GAME_CONSTANTS.POINTS.BEAN;
          break;
        case 'fire':
          points = GAME_CONSTANTS.POINTS.FIRE;
          break;
        case 'goldenCup':
          points = GAME_CONSTANTS.POINTS.GOLDEN_CUP;
          break;
        case 'poison':
          points = GAME_CONSTANTS.POINTS.POISON;
          break;
        case 'timePortal':
          points = GAME_CONSTANTS.POINTS.TIME_PORTAL;
          break;
        case 'blackHole':
          points = GAME_CONSTANTS.POINTS.BLACK_HOLE;
          break;
        default:
          points = GAME_CONSTANTS.POINTS.CUP;
      }
    } else {
      points = GAME_CONSTANTS.POINTS.CUP;
    }

    const newScore =  score + points * (combo + 1);
    setScore(newScore);
    
    if (portal.type) {
      let timeBonus = 0;
      switch (portal.type) {
        case 'cup':
          timeBonus = GAME_CONSTANTS.TIME_BONUS.CUP;
          break;
        case 'bean':
          timeBonus = GAME_CONSTANTS.TIME_BONUS.BEAN;
          break;
        case 'fire':
          timeBonus = GAME_CONSTANTS.TIME_BONUS.FIRE;
          break;
        case 'goldenCup':
          timeBonus = GAME_CONSTANTS.TIME_BONUS.GOLDEN_CUP;
          break;
        case 'poison':
          timeBonus = GAME_CONSTANTS.TIME_BONUS.POISON;
          break;
        case 'timePortal':
          timeBonus = GAME_CONSTANTS.TIME_BONUS.TIME_PORTAL;
          break;
        case 'blackHole':
          timeBonus = GAME_CONSTANTS.TIME_BONUS.BLACK_HOLE;
          break;
        default:
          timeBonus = 0;
      }
      
      setTimeLeft(prev => Math.max(5, prev + timeBonus));
      
      if (timeBonus > 0 || timeBonus < 0) {
        animateScoreChange(timeBonus, 'time');
      }
    }
    
    animateScoreChange(points * (combo + 1), 'score');
    
    if (points > 0) {
      setCombo(prev => prev + 1);
      animateScore();
    } else {
      setCombo(0);
    }

    // Verificar desbloqueio de dimensões
    setDimensions(prevDimensions => {
      const newDimensions = [...prevDimensions];
      for (let i = 0; i < newDimensions.length; i++) {
        const dimension = newDimensions[i];
        if (i === 0) {
          dimension.unlocked = true; // Primeira dimensão sempre desbloqueada
        } else {
          dimension.unlocked = newScore >= dimension.requiredPoints;
        }
      }
      return newDimensions;
    });

    // Remover o portal após a animação
    setTimeout(() => {
      setPortals(prev => prev.filter(p => p.id !== portalId));
    }, animationDuration * 2);
  }, [portals, score, combo, animateScore, animateScoreChange, currentDimension, dimensions]);

  const startGame = useCallback(() => {
    setTimeLeft(GAME_CONSTANTS.INITIAL_TIME);
    setCombo(0);
    setScore(0);
    setGameState('playing');
    // Resetar dimensões ao iniciar novo jogo
    setDimensions(prevDimensions => {
      const newDimensions = [...prevDimensions];
      for (let i = 0; i < newDimensions.length; i++) {
        const dimension = newDimensions[i];
        dimension.unlocked = i === 0; // Apenas a primeira dimensão desbloqueada
      }
      return newDimensions;
    });
    animateScore();
  }, [animateScore]);

  const endGame = useCallback(() => {
    setGameState('gameOver');
    if (score > bestScore) {
      setBestScore(score);
      Alert.alert('Novo Recorde!', `Parabéns! Você fez ${score} pontos!`);
    }
  }, [score, bestScore]);

  const changeDimension = useCallback((dimensionId: number) => {
    const dimension = dimensions.find(d => d.id === dimensionId);
    if (dimension?.unlocked && score >= dimension.requiredPoints) {
      Animated.sequence([
        Animated.timing(dimensionAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.ease
        }),
        Animated.timing(dimensionAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.ease
        })
      ]).start();

      setCurrentDimension(Math.min(dimensionId, dimensions.length));
      setGameState('playing');
      setTimeLeft(GAME_CONSTANTS.INITIAL_TIME);
      setCombo(0);
    }
  }, [dimensions, dimensionAnim, score]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[dimensions[currentDimension - 1].color, '#1a1a1a']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowDescription(!showDescription)}>
            <Text style={styles.title}>Café Matrix</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.infoButton}
            onPress={() => setShowInfo(true)}
          >
            <Ionicons name="information-circle" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.scoreContainer}>
            <Animated.View style={{ transform: [{ scale: scoreAnim }] }}>
              <Text style={styles.score}>Pontos: {score}</Text>
            </Animated.View>
            {scoreChanges.map(change => (
              <Animated.Text
                key={change.id}
                style={[
                  styles.scoreChange,
                  {
                    transform: [{ translateY: change.y }],
                    opacity: change.opacity,
                    color: change.type === 'score' 
                      ? (change.value > 0 ? '#4CAF50' : '#F44336')
                      : (change.value > 0 ? '#2196F3' : '#F44336'),
                    fontSize: change.type === 'time' ? 16 : 20
                  }
                ]}
              >
                {change.value > 0 ? '+' : ''}{change.value}
                {change.type === 'time' ? 's' : ''}
              </Animated.Text>
            ))}
          </View>
          <Animated.View style={{ transform: [{ scale: dimensionAnim }] }}>
            <Text style={styles.dimension}>
              Dimensão: {dimensions[currentDimension - 1].name}
            </Text>
          </Animated.View>
        </View>

        {showDescription && (
          <Animated.View style={[styles.description, { opacity: fadeAnim }]}>
            <Text style={styles.descriptionText}>
              {dimensions[currentDimension - 1].description}
            </Text>
          </Animated.View>
        )}

        <View style={styles.gameArea}>
          {portals.map(portal => (
            <Portal
              key={portal.id}
              {...portal}
              onActivate={handlePortalActivation}
              onTimeout={handlePortalTimeout}
              portalLifetime={dimensions[currentDimension - 1].portalLifetime}
              isMatrixDimension={currentDimension === 4}
            />
          ))}
        </View>

        <View style={styles.stats}>
          <Text style={styles.statText}>Combo: x{combo}</Text>
          <Text style={styles.statText}>Tempo: {timeLeft}s</Text>
          <Text style={styles.statText}>Recorde: {bestScore}</Text>
        </View>

        <View style={styles.dimensionsList}>
          {dimensions.map(dimension => (
            <TouchableOpacity
              key={dimension.id}
              style={[
                styles.dimensionButton,
                {
                  backgroundColor: dimension.unlocked ? dimension.color : 'rgba(255, 255, 255, 0.1)',
                  opacity: dimension.unlocked ? 1 : 0.5
                }
              ]}
              onPress={() => changeDimension(dimension.id)}
              disabled={!dimension.unlocked}
            >
              <Text style={styles.dimensionButtonText}>
                {dimension.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {gameState === 'gameOver' && (
          <View style={styles.gameOver}>
            <Text style={styles.gameOverText}>Fim de Jogo!</Text>
            <Text style={styles.gameOverScore}>Pontuação: {score}</Text>
            <TouchableOpacity style={styles.restartButton} onPress={startGame}>
              <Text style={styles.restartButtonText}>Jogar Novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal
          visible={showInfo}
          transparent
          animationType="fade"
          onRequestClose={() => setShowInfo(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Como Jogar</Text>
              
              <Text style={styles.modalSubtitle}>Portais:</Text>
              <View style={styles.portalInfoContainer}>
                <View style={styles.portalInfo}>
                  <Ionicons name="cafe" size={24} color="#fff" />
                  <Text style={styles.portalInfoText}>Café: +10 pontos, +5s</Text>
                </View>
                <View style={styles.portalInfo}>
                  <Ionicons name="nutrition" size={24} color="#fff" />
                  <Text style={styles.portalInfoText}>Grão: +5 pontos, +3s</Text>
                </View>
                <View style={styles.portalInfo}>
                  <Ionicons name="flame" size={24} color="#fff" />
                  <Text style={styles.portalInfoText}>Fogo: -20 pontos, -10s</Text>
                </View>
                <View style={styles.portalInfo}>
                  <Ionicons name="star" size={24} color="#fff" />
                  <Text style={styles.portalInfoText}>Café Dourado: +50 pontos, +10s</Text>
                </View>
                <View style={styles.portalInfo}>
                  <Ionicons name="skull" size={24} color="#fff" />
                  <Text style={styles.portalInfoText}>Veneno: -40 pontos, -15s</Text>
                </View>
                <View style={styles.portalInfo}>
                  <Ionicons name="time" size={24} color="#fff" />
                  <Text style={styles.portalInfoText}>Portal do Tempo: +30 pontos, +20s</Text>
                </View>
                <View style={styles.portalInfo}>
                  <Ionicons name="infinite" size={24} color="#fff" />
                  <Text style={styles.portalInfoText}>Buraco Negro: -100 pontos, -30s</Text>
                </View>
              </View>

              <Text style={styles.modalSubtitle}>Dimensões:</Text>
              <View style={styles.dimensionInfoContainer}>
                <Text style={styles.dimensionInfoText}>• Café Clássico: Dimensão inicial</Text>
                <Text style={styles.dimensionInfoText}>• Café Quântico: Desbloqueado com 500 pontos</Text>
                <Text style={styles.dimensionInfoText}>• Café Neural: Desbloqueado com 1000 pontos</Text>
                <Text style={styles.dimensionInfoText}>• Café Matrix: Desbloqueado com 2000 pontos</Text>
              </View>

              <Text style={styles.modalSubtitle}>Dicas:</Text>
              <View style={styles.tipsContainer}>
                <Text style={styles.tipText}>• Colete portais positivos para ganhar pontos e tempo</Text>
                <Text style={styles.tipText}>• Evite portais negativos que reduzem pontos e tempo</Text>
                <Text style={styles.tipText}>• Na dimensão Matrix, os portais positivos precisam ser teleportados antes de coletados</Text>
                <Text style={styles.tipText}>• Mantenha um combo para multiplicar seus pontos</Text>
              </View>

              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowInfo(false)}
              >
                <Text style={styles.closeButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: StatusBar.currentHeight || 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  scoreContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  score: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scoreChange: {
    position: 'absolute',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  dimension: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  description: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  descriptionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  gameArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  statText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dimensionsList: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dimensionButton: {
    padding: 10,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dimensionButtonText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  gameOver: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  gameOverScore: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 30,
  },
  restartButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  restartButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  infoButton: {
    padding: 8,
    marginRight: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    marginBottom: 10,
  },
  portalInfoContainer: {
    marginBottom: 10,
  },
  portalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  portalInfoText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 16,
  },
  dimensionInfoContainer: {
    marginBottom: 10,
  },
  dimensionInfoText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
  },
  tipsContainer: {
    marginBottom: 20,
  },
  tipText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
  },
  closeButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CafeMatrix; 