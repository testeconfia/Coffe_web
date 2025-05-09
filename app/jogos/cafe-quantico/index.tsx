import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Animated, FlatList, Dimensions, StatusBar, Modal, ScrollView, Vibration } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Particle {
  id: number;
  userState: '0' | '1' | 'superposition';
  targetState: '0' | '1';
  animation: Animated.Value;
}

type Phase = 'tutorial' | 'preview' | 'play' | 'result';

interface LevelConfig {
  columns: number;
  previewTime: number;
  playTime: number;
  scoreMultiplier: number;
}

const LEVEL_CONFIGS: { [key: number]: LevelConfig } = {
  1: { columns: 6, previewTime: 5, playTime: 20, scoreMultiplier: 1 },
  2: { columns: 7, previewTime: 4, playTime: 18, scoreMultiplier: 1.5 },
  3: { columns: 8, previewTime: 4, playTime: 16, scoreMultiplier: 2 },
  4: { columns: 8, previewTime: 3, playTime: 15, scoreMultiplier: 2.5 },
  5: { columns: 9, previewTime: 3, playTime: 14, scoreMultiplier: 3 },
  6: { columns: 9, previewTime: 3, playTime: 13, scoreMultiplier: 3.5 },
  7: { columns: 10, previewTime: 2, playTime: 12, scoreMultiplier: 4 },
  8: { columns: 10, previewTime: 2, playTime: 11, scoreMultiplier: 4.5 },
  9: { columns: 11, previewTime: 2, playTime: 10, scoreMultiplier: 5 },
  10: { columns: 11, previewTime: 2, playTime: 9, scoreMultiplier: 6 },
};

// Componente para cada grão de café/qubit com animação
const ParticleItem = ({
  particle,
  onPress,
  phase,
  size
}: {
  particle: Particle;
  onPress: (id: number) => void;
  phase: Phase;
  size: number;
}) => {
  const { userState, targetState, animation } = particle;
  const correct = userState !== 'superposition' && userState === targetState;

  // Define cor do ícone de café
  let iconColor = '#888';
  if (phase === 'play') {
    iconColor = '#fff';
  }
  if (userState !== 'superposition') {
    iconColor = correct ? '#4caf50' : '#f44336';
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={phase !== 'play' || userState !== 'superposition'}
      onPress={() => onPress(particle.id)}
    >
      <Animated.View
        style={[
          styles.particle,
          { 
            width: size, 
            height: size, 
            transform: [
              { scale: animation },
              { rotate: animation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg']
              })}
            ]
          }
        ]}
      >
        <Ionicons name="cafe" size={size * 0.6} color={iconColor} />
        {phase === 'preview' && (
          <View style={styles.targetOverlay}>
            <Text style={styles.targetText}>{targetState}</Text>
          </View>
        )}
        {phase === 'play' && userState !== 'superposition' && (
          <Animated.View style={[
            styles.feedbackOverlay,
            { opacity: animation }
          ]}>
            <Ionicons 
              name={correct ? "checkmark-circle" : "close-circle"} 
              size={size * 0.4} 
              color={correct ? '#4caf50' : '#f44336'} 
            />
          </Animated.View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function CafeQuantico() {
  const windowWidth = Dimensions.get('window').width;
  const [currentLevel, setCurrentLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  
  const levelConfig = LEVEL_CONFIGS[currentLevel];
  const columns = levelConfig.columns;
  const total = columns * columns;
  const itemSize = windowWidth / columns - 12;

  const [particles, setParticles] = useState<Particle[]>([]);
  const [phase, setPhase] = useState<Phase>('tutorial');
  const [timer, setTimer] = useState(levelConfig.previewTime);
  const [score, setScore] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Carrega high score salvo
  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const savedHighScore = await AsyncStorage.getItem('cafeQuanticoHighScore');
        if (savedHighScore) {
          setHighScore(parseInt(savedHighScore));
        }
      } catch (error) {
        console.error('Erro ao carregar high score:', error);
      }
    };
    loadHighScore();
  }, []);

  // Salva high score
  const saveHighScore = async (newScore: number) => {
    try {
      if (newScore > highScore) {
        await AsyncStorage.setItem('cafeQuanticoHighScore', newScore.toString());
        setHighScore(newScore);
      }
    } catch (error) {
      console.error('Erro ao salvar high score:', error);
    }
  };

  // Carrega efeitos sonoros
  useEffect(() => {
    const loadSound = async () => {
      const { sound } = await Audio.Sound.createAsync(
        require('../../../assets/sounds/click.mp3')
      );
      setSound(sound);
    };
    loadSound();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // Inicializa partículas e fase de pré-visualização
  const initGame = () => {
    const list: Particle[] = Array.from({ length: total }, (_, i) => ({
      id: i,
      targetState: Math.random() > 0.5 ? '1' : '0',
      userState: 'superposition',
      animation: new Animated.Value(1)
    }));
    setParticles(list);
    setPhase('preview');
    setTimer(levelConfig.previewTime);
    setScore(0);
    setModalVisible(false);
  };

  useEffect(() => {
    initGame();
  }, [currentLevel]);

  // Controle de tempo e transição de fases
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          if (phase === 'tutorial') {
            setPhase('preview');
            return levelConfig.previewTime;
          }
          if (phase === 'preview') {
            setPhase('play');
            return levelConfig.playTime;
          }
          if (phase === 'play') {
            setPhase('result');
            setModalVisible(true);
            return 0;
          }
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, levelConfig]);

  // Colapsa grão de café/qubit
  const collapseParticle = async (id: number) => {
    if (sound) {
      await sound.replayAsync();
    }
    Vibration.vibrate(50);

    setParticles((prev) =>
      prev.map((p) => {
        if (p.id === id && p.userState === 'superposition') {
          const isCorrect = p.targetState === '1';
          const points = Math.floor(100 * levelConfig.scoreMultiplier);
          
          if (isCorrect) {
            setScore((s) => s + points);
            setTotalScore((ts) => ts + points);
          } else {
            // Perde pontos ao errar
            const penalty = Math.floor(points * 0.5); // Perde metade dos pontos que ganharia
            setScore((s) => Math.max(0, s - penalty));
            setTotalScore((ts) => Math.max(0, ts - penalty));
          }
          
          Animated.sequence([
            Animated.timing(p.animation, {
              toValue: 0.8,
              duration: 100,
              useNativeDriver: true
            }),
            Animated.spring(p.animation, {
              toValue: 1,
              friction: 3,
              useNativeDriver: true
            })
          ]).start();

          return { ...p, userState: '1' };
        }
        return p;
      })
    );
  };

  // Avança para o próximo nível ou reinicia
  const handleLevelComplete = () => {
    const newTotalScore = totalScore + score;
    saveHighScore(newTotalScore);
    
    if (currentLevel < 10) {
      setCurrentLevel(prev => prev + 1);
      initGame();
    } else {
      // Jogo completo
      setModalVisible(true);
    }
  };

  // Reinicia jogo
  const restart = () => {
    setCurrentLevel(1);
    setTotalScore(0);
    initGame();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient 
        colors={['#2C1810', '#4A2C2A', '#2C1810']} 
        style={StyleSheet.absoluteFill} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Header com info */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>☕ Café Quântico</Text>
          <Text style={styles.levelText}>Nível {currentLevel}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.scoreText}>Pontos: {totalScore}</Text>
          <Text style={styles.timer}>⏱ {timer}s</Text>
          <TouchableOpacity onPress={() => setInfoVisible(true)} style={styles.iconBtn}>
            <Ionicons name="information-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Grade de grãos/qubits */}
      <FlatList
        key={`grid-${columns}`}
        data={particles}
        keyExtractor={(item) => item.id.toString()}
        numColumns={columns}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <ParticleItem
            particle={item}
            onPress={collapseParticle}
            phase={phase}
            size={itemSize}
          />
        )}
        scrollEnabled={false}
      />

      {/* Modal de resultado */}
      {phase === 'result' && (
        <Modal transparent visible={modalVisible} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>
                {currentLevel === 10 ? 'Parabéns! Você completou todos os níveis!' : 'Nível Completo!'}
              </Text>
              <Text style={styles.modalScore}>Pontuação: {score}</Text>
              <Text style={styles.modalSubtext}>
                {currentLevel === 10 ? 'Você dominou a computação quântica!' :
                 score === total ? 'Perfeito! Avançando para o próximo nível!' :
                 score > total/2 ? 'Bom trabalho! Continue praticando!' :
                 'Não desista! A computação quântica é desafiadora!'}
              </Text>
              <Text style={styles.highScoreText}>Recorde: {highScore}</Text>
              <TouchableOpacity 
                onPress={currentLevel === 10 ? restart : handleLevelComplete} 
                style={styles.button}
              >
                <Text style={styles.buttonText}>
                  {currentLevel === 10 ? 'Jogar Novamente' : 'Próximo Nível'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal informativo */}
      <Modal transparent visible={infoVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.infoContent}>
            <ScrollView>
              <Text style={styles.infoTitle}>Sobre Café Quântico</Text>
              <Text style={styles.infoText}>
                Neste jogo, cada grão de café representa um qubit em superposição. Durante a pré-visualização, você vê se cada qubit estará em 0 ou 1.
                Em seguida, na fase de jogo, os qubits retornam à superposição e cabe a você colapsá-los corretamente, lembrando o padrão apresentado.
              </Text>
              <Text style={styles.infoText}>
                Qubits são unidades básicas de informação quântica que, ao contrário dos bits clássicos, podem representar 0 e 1 ao mesmo tempo até serem medidos —
                assim como o aroma do café permanece indefinido até a degustação. Boa sorte e divirta-se aprendendo conceitos de computação quântica!
              </Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setInfoVisible(false)} style={[styles.button, { marginTop: 16 }]}>  
              <Text style={styles.buttonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Tutorial inicial */}
      {phase === 'tutorial' && (
        <Modal transparent visible={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.tutorialContent}>
              <Text style={styles.tutorialTitle}>Bem-vindo ao Café Quântico!</Text>
              <Text style={styles.tutorialText}>
                1. Observe os números durante a pré-visualização{'\n'}
                2. Memorize o padrão de 0s e 1s{'\n'}
                3. Na fase de jogo, toque nos grãos para colapsá-los{'\n'}
                4. Tente acertar o maior número possível!
              </Text>
              <TouchableOpacity onPress={() => setPhase('preview')} style={styles.button}>
                <Text style={styles.buttonText}>Começar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 , paddingTop: StatusBar.currentHeight},
  header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  title: { color: '#E6D5AC', fontSize: 26, fontWeight: 'bold' },
  levelText: {
    color: '#E6D5AC',
    fontSize: 14,
    marginTop: 4
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  scoreText: {
    color: '#E6D5AC',
    fontSize: 16,
    marginRight: 12
  },
  timer: { color: '#E6D5AC', fontSize: 16, marginRight: 12 },
  iconBtn: { padding: 4 },
  grid: { alignItems: 'center' },
  particle: { 
    margin: 4, 
    borderRadius: 8, 
    backgroundColor: '#4A2C2A', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#8B4513'
  },
  targetOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  targetText: { color: '#E6D5AC', fontSize: 18, fontWeight: 'bold' },
  feedbackOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { 
    backgroundColor: '#E6D5AC', 
    padding: 24, 
    borderRadius: 10, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  modalText: { fontSize: 24, fontWeight: 'bold', marginBottom: 12, color: '#2C1810' },
  modalScore: { fontSize: 18, marginBottom: 8, color: '#4A2C2A' },
  modalSubtext: { fontSize: 16, color: '#8B4513', marginBottom: 20, textAlign: 'center' },
  button: { 
    backgroundColor: '#8B4513', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  buttonText: { color: '#E6D5AC', fontSize: 16 },
  infoContent: { 
    backgroundColor: '#E6D5AC', 
    padding: 20, 
    borderRadius: 10, 
    width: '90%', 
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  infoTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#2C1810' },
  infoText: { fontSize: 16, marginBottom: 8, lineHeight: 22, color: '#4A2C2A' },
  tutorialContent: {
    backgroundColor: '#E6D5AC',
    padding: 24,
    borderRadius: 10,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  tutorialTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#2C1810'
  },
  tutorialText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
    color: '#4A2C2A'
  },
  highScoreText: {
    fontSize: 16,
    color: '#8B4513',
    marginBottom: 16,
    textAlign: 'center'
  }
});