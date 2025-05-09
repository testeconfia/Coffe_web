import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, StatusBar, Modal, PanResponder, GestureResponderEvent, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface Neuron {
  id: number;
  x: number;
  y: number;
  activation: number;
  type: 'input' | 'hidden' | 'output';
}

interface CoffeeParameter {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  target: number;
  balance: number;
  ballPosition: number; // -1 a 1, onde 0 é o centro
  ballVelocity: number; // velocidade da bola
}

export default function CafeNeural() {
  // Configuração inicial
  const inputCount = 4;
  const hiddenCount = 6;
  const outputCount = 4;
  const layerSpacing = width * 0.3;
  const verticalMargin = height * 0.1;

  const [neurons, setNeurons] = useState<Neuron[]>([]);
  const [parameters, setParameters] = useState<CoffeeParameter[]>([
    { name: 'Temperatura (°C)', value: 25, min: 80, max: 100, step: 1, target: 92, balance: 0, ballPosition: -0.8, ballVelocity: 0 },
    { name: 'Pressão (bar)', value: 5, min: 1, max: 15, step: 1, target: 9, balance: 0, ballPosition: -0.8, ballVelocity: 0 },
    { name: 'Tempo (s)', value: 15, min: 5, max: 60, step: 5, target: 30, balance: 0, ballPosition: -0.8, ballVelocity: 0 },
    { name: 'Moagem', value: 3, min: 1, max: 10, step: 1, target: 7, balance: 0, ballPosition: -0.8, ballVelocity: 0 }
  ]);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(60);
  const [baseTime, setBaseTime] = useState(60);
  const [modalVisible, setModalVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const pan = useRef(new Animated.ValueXY()).current;
  const scaleRef = useRef(new Animated.Value(1)).current;
  const currentScale = useRef(1);
  const lastScale = useRef(1);
  const lastPan = useRef({ x: 0, y: 0 });
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#fff');
  const [combo, setCombo] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Atualiza o valor atual do zoom
  useEffect(() => {
    const listener = scaleRef.addListener(({ value }) => {
      currentScale.current = value;
    });
    return () => scaleRef.removeListener(listener);
  }, []);

  // PanResponder para panning
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        pan.setValue({
          x: dx,
          y: dy
        });
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
      }
    })
  ).current;

  // Atualiza o estilo do container da rede neural
  const networkStyle = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      { scale: scaleRef }
    ]
  };

  // Efeito para simular física da bola
  useEffect(() => {
    const physicsInterval = setInterval(() => {
      setParameters(prev => prev.map(p => {
        // Calcula nova posição baseada na inclinação e velocidade
        const gravity = 0.02; // Força da gravidade
        const friction = 0.98; // Atrito
        const balanceThreshold = 0.01; // Limiar de equilíbrio (1%)
        
        // Se a gangorra estiver equilibrada, para a bolinha
        if (Math.abs(p.balance) <= balanceThreshold) {
          return {
            ...p,
            ballVelocity: 0,
            value: p.value
          };
        }
        
        // Caso contrário, aplica a física normal
        const newVelocity = p.ballVelocity + (p.balance * gravity);
        const newPosition = Math.max(-1, Math.min(1, p.ballPosition + newVelocity));
        
        // Calcula novo valor baseado na posição da bola
        const range = p.max - p.min;
        let newValue = p.value;
        if (Math.abs(p.balance) > balanceThreshold || Math.abs(newPosition) > 0.1) {
          newValue = p.target + (newPosition * range * 0.8);
        }
        
        return {
          ...p,
          ballPosition: newPosition,
          ballVelocity: newVelocity * friction,
          value: Math.round(newValue)
        };
      }));
    }, 16); // ~60fps

    return () => clearInterval(physicsInterval);
  }, []);

  // PanResponder para a gangorra
  const balancePanResponder = (idx: number) => 
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const sensitivity = 0.005;
        const delta = gestureState.dy * sensitivity; // Invertido para movimento natural (para cima = positivo)
        console.log(gestureState.dy);
        setParameters(prev => prev.map((p, i) => {
          if (i === idx) {
            return {
              ...p,
              balance: Math.max(-1, Math.min(1, p.balance + delta))
            };
          }
          return p;
        }));
      }
    });

  // Funções de controle de zoom
  const zoomIn = () => {
    const newScale = Math.min(2, currentScale.current + 0.1);
    Animated.spring(scaleRef, {
      toValue: newScale,
      useNativeDriver: true,
      friction: 3,
      tension: 40
    }).start();
  };

  const zoomOut = () => {
    const newScale = Math.max(0.5, currentScale.current - 0.1);
    Animated.spring(scaleRef, {
      toValue: newScale,
      useNativeDriver: true,
      friction: 3,
      tension: 40
    }).start();
  };

  // Inicializa posições dos neurônios
  useEffect(() => {
    const list: Neuron[] = [];
    const centerY = height * 0.4; // Centraliza verticalmente
    const spacing = height * 0.15; // Espaçamento entre camadas
    const startX = width * 0.2; // Ajustado para começar mais à esquerda
    const endX = width * 0.8; // Ajustado para terminar mais à direita

    // Camada de entrada
    for (let i = 0; i < inputCount; i++) {
      list.push({
        id: i,
        x: startX,
        y: centerY - (spacing * (inputCount - 1) / 2) + (spacing * i),
        activation: 0,
        type: 'input'
      });
    }
    // Camada oculta
    for (let i = 0; i < hiddenCount; i++) {
      list.push({
        id: i + inputCount,
        x: width * 0.5,
        y: centerY - (spacing * (hiddenCount - 1) / 2) + (spacing * i),
        activation: 0,
        type: 'hidden'
      });
    }
    // Camada de saída
    for (let i = 0; i < outputCount; i++) {
      list.push({
        id: i + inputCount + hiddenCount,
        x: endX,
        y: centerY - (spacing * (outputCount - 1) / 2) + (spacing * i),
        activation: 0,
        type: 'output'
      });
    }
    setNeurons(list);
  }, []);

  // Timer para o jogo
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            clearInterval(interval);
            endGame();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Inicializa o jogo
  const startGame = () => {
    setModalVisible(false);
    setInfoVisible(false);
    setScore(0);
    setTimer(60);
    setBaseTime(60);
    setCombo(0);
    setFeedback('');
    setFeedbackColor('#fff');
    pan.setValue({ x: 0, y: 0 });
    resetNeurons();
    setParameters(prev => prev.map(p => ({ 
      ...p, 
      value: p.min,
      balance: 0,
      ballPosition: -0.8,
      ballVelocity: 0
    })));
  };

  // Reseta ativações
  const resetNeurons = () => {
    setNeurons(prev => prev.map(n => ({ ...n, activation: 0 })));
  };

  // Simula ativação e calcula pontuação
  const trainNetwork = () => {
    const vals = parameters.map(p => (p.value - p.min) / (p.max - p.min));
    let totalError = 0;
    let parameterErrors = parameters.map(p => 
      Math.abs((p.value - p.target) / (p.max - p.min))
    );

    setNeurons(prev => prev.map((n, idx) => {
      let activation = 0;
      if (n.type === 'input') {
        activation = vals[n.id] || 0;
      } else if (n.type === 'hidden') {
        activation = vals.reduce((a,b) => a + b, 0) / vals.length;
      } else {
        activation = prev.slice(inputCount, inputCount + hiddenCount)
          .reduce((sum, hn) => sum + hn.activation, 0) / hiddenCount;
      }
      totalError += Math.abs(activation - 0.5);
      return { ...n, activation };
    }));

    // Calcula pontuação baseada na proximidade dos valores alvo
    const parameterScore = parameterErrors.reduce((acc, err) => acc + (1 - err), 0) * 50; // Aumentado para 50 pontos por parâmetro
    const newScore = Math.round(parameterScore);

    // Sistema de combo e tempo
    if (newScore > score) {
      setCombo(prev => prev + 1);
      const comboBonus = Math.min(combo * 10, 100); // Bônus máximo de 100 pontos
      setScore(newScore + comboBonus);
      setFeedback(`Combo x${combo + 1}! +${comboBonus} pontos`);
      setFeedbackColor('#4caf50');
      
      // Adiciona tempo por acerto
      const timeBonus = Math.min(combo + 1, 5); // Máximo de 5 segundos por acerto
      setTimer(prev => prev + timeBonus);
      setBaseTime(prev => prev + timeBonus);
    } else {
      setCombo(0);
      setScore(newScore);
      setFeedback('Tente ajustar os parâmetros!');
      setFeedbackColor('#f44336');
      
      // Reduz tempo por erro
      const timePenalty = 2; // 2 segundos de penalidade
      setTimer(prev => Math.max(5, prev - timePenalty)); // Mínimo de 5 segundos
      setBaseTime(prev => Math.max(5, prev - timePenalty));
    }

    // Atualiza melhor pontuação
    if (newScore > bestScore) {
      setBestScore(newScore);
      setFeedback('Nova melhor pontuação!');
      setFeedbackColor('#ffd700');
    }

    // Feedback específico para cada parâmetro
    const worstParam = parameters[parameterErrors.indexOf(Math.max(...parameterErrors))];
    const bestParam = parameters[parameterErrors.indexOf(Math.min(...parameterErrors))];
    
    setTimeout(() => {
      setFeedback(`${worstParam.name} muito ${worstParam.value > worstParam.target ? 'alto' : 'baixo'}`);
    }, 1000);
  };

  // Encerra o jogo e mostra resultado
  const endGame = () => {
    setModalVisible(true);
  };

  // Reinicia para menu
  const resetGame = () => {
    setModalVisible(false);
    setInfoVisible(false);
    setScore(0);
    setTimer(60);
    setCombo(0);
    setFeedback('');
    setFeedbackColor('#fff');
    pan.setValue({ x: 0, y: 0 });
    resetNeurons();
    setParameters(prev => prev.map(p => ({ 
      ...p, 
      value: p.min,
      balance: 0,
      ballPosition: -0.8,
      ballVelocity: 0
    })));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient 
        colors={['#2C1810', '#3C2820', '#2C1810']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill} 
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>☕ Café Neural</Text>
        <View style={styles.headerRight}>
          <Text style={styles.timer}>⏱ {timer}s</Text>
          <Text style={styles.score}>🏆 {score}</Text>
          <Text style={[styles.combo, { color: combo > 0 ? '#4caf50' : '#fff' }]}>
            {combo > 0 ? `x${combo}` : ''}
          </Text>
          <TouchableOpacity onPress={() => setInfoVisible(true)} style={styles.iconBtn}>
            <Ionicons name="information-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleFullscreen} style={styles.iconBtn}>
            <Ionicons 
              name={isFullscreen ? "contract-outline" : "expand-outline"} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Feedback */}
      <Animated.Text 
        style={[
          styles.feedback,
          { color: feedbackColor }
        ]}
      >
        {feedback}
      </Animated.Text>

      {/* Árvore neural com panning e zoom */}
      <View style={[
        styles.networkContainer,
        isFullscreen && styles.networkContainerFullscreen
      ]}>
        <Animated.View
          style={[
            styles.networkArea,
            {
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { scale: scaleRef }
              ]
            }
          ]}
        >
          {/* Conexões entre neurônios */}
          {neurons.map((n1) => {
            if (n1.type === 'input') {
              return neurons
                .filter(n2 => n2.type === 'hidden')
                .map((n2) => {
                  const dx = n2.x - n1.x;
                  const dy = n2.y - n1.y;
                  const length = Math.sqrt(dx * dx + dy * dy);
                  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                  
                  return (
                    <View
                      key={`${n1.id}-${n2.id}`}
                      style={[
                        styles.connection,
                        {
                          left: n1.x + 25,
                          top: n1.y + 25,
                          width: length,
                          transform: [
                            { rotate: `${angle}deg` },
                            { translateX: 0 },
                            { translateY: 0 }
                          ],
                          opacity: (n1.activation + n2.activation) / 2
                        }
                      ]}
                    />
                  );
                });
            } else if (n1.type === 'hidden') {
              return neurons
                .filter(n2 => n2.type === 'output')
                .map((n2) => {
                  const dx = n2.x - n1.x;
                  const dy = n2.y - n1.y;
                  const length = Math.sqrt(dx * dx + dy * dy);
                  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                  
                  return (
                    <View
                      key={`${n1.id}-${n2.id}`}
                      style={[
                        styles.connection,
                        {
                          left: n1.x + 25,
                          top: n1.y + 25,
                          width: length,
                          transform: [
                            { rotate: `${angle}deg` },
                            { translateX: 0 },
                            { translateY: 0 }
                          ],
                          opacity: (n1.activation + n2.activation) / 2
                        }
                      ]}
                    />
                  );
                });
            }
            return null;
          })}

          {/* Neurônios */}
          {neurons.map(n => (
            <Animated.View
              key={n.id}
              style={[
                styles.neuron,
                {
                  left: n.x,
                  top: n.y,
                  backgroundColor: n.activation > 0.5 ? '#6b4' : '#446',
                  opacity: n.activation || 0.3
                }
              ]}
            >
              <Text style={styles.neuronText}>{n.activation.toFixed(2)}</Text>
              <View style={styles.neuronTypeContainer}>
                <Text style={styles.neuronType}>{n.type}</Text>
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Área de interação para pan */}
        <View 
          style={StyleSheet.absoluteFill}
          {...panResponder.panHandlers}
        />

        {/* Botões de zoom */}
        <View style={styles.zoomControls}>
          <TouchableOpacity 
            style={styles.zoomButton} 
            onPress={zoomIn}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.zoomButton} 
            onPress={zoomOut}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Botão de sair da tela cheia */}
        {isFullscreen && (
          <TouchableOpacity 
            style={styles.exitFullscreenButton}
            onPress={toggleFullscreen}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Parâmetros de café - esconde em tela cheia */}
      {!isFullscreen && (
        <>
          <ScrollView 
            style={styles.parametersScroll}
            contentContainerStyle={styles.parametersScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.parameters}>
              {parameters.map((p, i) => (
                <View key={i} style={styles.paramRow}>
                  <View style={styles.paramHeader}>
                    <Text style={styles.paramName}>{p.name}</Text>
                    <Text style={styles.paramTarget}>Será que é <Text style={{fontWeight: 'bold'}}>{p.target}</Text>?</Text>
                  </View>
                  <View style={styles.balanceContainer}>
                    <View 
                      {...balancePanResponder(i).panHandlers}
                      style={styles.balanceVisual}
                    >
                      <View style={[
                        styles.balanceBar,
                        { transform: [{ rotate: `${p.balance * 45}deg` }] }
                      ]}>
                        <View style={[
                          styles.balanceWeight,
                          { 
                            left: `${50 + (p.ballPosition * 50)}%`,
                            backgroundColor: Math.abs(p.ballPosition) < 0.1 ? '#4caf50' : '#ffab00',
                            transform: [
                              { translateX: -12 },
                              { scale: 1 + Math.abs(p.ballPosition) * 0.3 }
                            ]
                          }
                        ]} />
                      </View>
                      <Text style={[
                        styles.paramValue,
                        { 
                          color: Math.abs(p.ballPosition) < 0.1 ? '#4caf50' : '#fff',
                          transform: [{ scale: 1 + Math.abs(p.ballPosition) * 0.2 }]
                        }
                      ]}>
                        {p.value}
                      </Text>
                      <Text style={styles.balanceHint}>← Incline para equilibrar →</Text>
                      <Text style={styles.angleText}>
                        Ângulo: {Math.round(p.balance * 45)}°
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Botão de treinar */}
          <View style={styles.controls}>
            <TouchableOpacity 
              style={[styles.button, { opacity: timer > 0 ? 1 : 0.5 }]} 
              onPress={trainNetwork}
              disabled={timer === 0}
            >
              <Text style={styles.buttonText}>Treinar Rede</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      
      {/* Modal de resultado */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tempo Esgotado!</Text>
            <Text style={styles.modalText}>Sua pontuação final foi {score}</Text>
            <Text style={styles.modalSubtext}>
              {score > bestScore ? 'Novo recorde!' : 
               score > bestScore * 0.8 ? 'Bom trabalho!' : 
               'Continue praticando!'}
            </Text>
            <Text style={styles.modalSubtext}>
              {score >= 200 ? 'Excelente! Você dominou a arte do café!' :
               score >= 150 ? 'Muito bom! Você está quase lá!' :
               score >= 100 ? 'Bom trabalho! Continue praticando!' :
               'Continue tentando, você vai conseguir!'}
            </Text>
            <TouchableOpacity 
              style={styles.menuButton} 
              onPress={startGame}
              activeOpacity={0.7}
            >
              <Text style={styles.menuButtonText}>Jogar Novamente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de informações */}
      <Modal transparent visible={infoVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Como Jogar</Text>
            <View style={styles.infoSection}>
              <Text style={styles.infoSubtitle}>Objetivo</Text>
              <Text style={styles.infoText}>
                Ajuste os parâmetros do café para treinar a rede neural e conseguir a melhor pontuação possível antes que o tempo acabe!
              </Text>
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoSubtitle}>Parâmetros</Text>
              <Text style={styles.infoText}>
                • Temperatura: Ajuste a temperatura ideal do café{'\n'}
                • Pressão: Controle a pressão da extração{'\n'}
                • Tempo: Defina o tempo de extração{'\n'}
                • Moagem: Ajuste o tamanho dos grãos
              </Text>
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoSubtitle}>Rede Neural</Text>
              <Text style={styles.infoText}>
                • Camada de Entrada: Recebe os parâmetros do café{'\n'}
                • Camada Oculta: Processa as informações{'\n'}
                • Camada de Saída: Mostra o resultado do treinamento
              </Text>
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoSubtitle}>Pontuação</Text>
              <Text style={styles.infoText}>
                • A pontuação é calculada com base na precisão do treinamento{'\n'}
                • Quanto mais próximo de 1.0 a ativação dos neurônios, melhor{'\n'}
                • Você tem 30 segundos para conseguir a maior pontuação!
              </Text>
            </View>
            <TouchableOpacity style={styles.menuButton} onPress={() => setInfoVisible(false)}>
              <Text style={styles.menuButtonText}>Entendi!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#2C1810',
    backgroundImage: 'linear-gradient(45deg, #2C1810 25%, #3C2820 25%, #3C2820 50%, #2C1810 50%, #2C1810 75%, #3C2820 75%, #3C2820 100%)',
    backgroundSize: '40px 40px'
  },
  header: { 
    paddingTop: StatusBar.currentHeight || 20, 
    padding: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: 'rgba(44, 24, 16, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: '#8B4513'
  },
  title: { 
    color: '#D4A76A', 
    fontSize: 28, 
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2
  },
  headerRight: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  timer: { 
    color: '#D4A76A', 
    fontSize: 18, 
    marginRight: 16,
    fontWeight: 'bold'
  },
  score: { 
    color: '#D4A76A', 
    fontSize: 18,
    fontWeight: 'bold'
  },
  combo: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginRight: 16,
    color: '#D4A76A'
  },
  iconBtn: { 
    marginLeft: 16, 
    padding: 4,
    backgroundColor: 'rgba(212, 167, 106, 0.2)',
    borderRadius: 8
  },
  feedback: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
    height: 24,
    color: '#D4A76A'
  },
  networkContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(44, 24, 16, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B4513'
  },
  networkArea: {
    position: 'absolute',
    width: width * 1.5,
    height: height * 1.5,
    left: -width * 0.25,
    top: -height * 0.25
  },
  neuron: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    backgroundColor: '#8B4513',
    borderWidth: 2,
    borderColor: '#D4A76A'
  },
  neuronText: {
    color: '#D4A76A',
    fontSize: 12,
    fontWeight: 'bold'
  },
  neuronTypeContainer: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(44, 24, 16, 0.9)',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#8B4513'
  },
  neuronType: {
    color: '#D4A76A',
    fontSize: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
    fontWeight: 'bold'
  },
  parametersScroll: {
    maxHeight: height * 0.4,
    margin: 8,
    marginBottom: 50
  },
  parametersScrollContent: {
    flexGrow: 1
  },
  parameters: { 
    padding: 8,
    backgroundColor: 'rgba(44, 24, 16, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B4513'
  },
  paramRow: { 
    marginBottom: 12,
    backgroundColor: 'rgba(44, 24, 16, 0.4)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B4513'
  },
  paramHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  paramName: { 
    color: '#D4A76A', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  paramTarget: { 
    color: '#D4A76A', 
    fontSize: 12,
    fontWeight: 'bold',
    fontStyle: 'italic'
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  balanceVisual: {
    flex: 1,
    height: 110,
    marginHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(44, 24, 16, 0.4)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#8B4513'
  },
  balanceBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#8B4513',
    position: 'relative'
  },
  balanceWeight: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    top: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#D4A76A'
  },
  paramValue: {
    color: '#D4A76A',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2
  },
  balanceHint: {
    color: '#D4A76A',
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4
  },
  controls: { 
    padding: 8, 
    alignItems: 'center',
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    zIndex: 10
  },
  button: { 
    backgroundColor: '#8B4513', 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D4A76A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  buttonText: { 
    color: '#D4A76A', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(44, 24, 16, 0.9)', 
    justifyContent: 'center', 
    alignItems: 'center',
    backdropFilter: 'blur(5px)'
  },
  modalContent: { 
    backgroundColor: '#3C2820', 
    padding: 24, 
    borderRadius: 16, 
    alignItems: 'center', 
    width: '80%',
    borderWidth: 2,
    borderColor: '#D4A76A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10
  },
  modalTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 16,
    color: '#D4A76A',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2
  },
  modalText: { 
    fontSize: 20, 
    marginBottom: 24, 
    textAlign: 'center',
    color: '#D4A76A',
    fontWeight: 'bold'
  },
  modalSubtext: {
    fontSize: 16,
    color: '#D4A76A',
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.8
  },
  connection: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#6b4',
    transformOrigin: 'left center'
  },
  infoContent: {
    backgroundColor: '#3C2820',
    padding: 24,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: '#D4A76A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10
  },
  infoTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#D4A76A',
    marginBottom: 24,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2
  },
  infoSection: {
    marginBottom: 20,
    backgroundColor: 'rgba(44, 24, 16, 0.4)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B4513'
  },
  infoSubtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D4A76A',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2
  },
  infoText: {
    fontSize: 16,
    color: '#D4A76A',
    lineHeight: 24,
    opacity: 0.9
  },
  menuButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#D4A76A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  menuButtonText: {
    color: '#D4A76A',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2
  },
  angleText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
    textAlign: 'center'
  },
  zoomControls: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'column',
    backgroundColor: 'rgba(44, 24, 16, 0.8)',
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: '#8B4513'
  },
  zoomButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    backgroundColor: 'rgba(212, 167, 106, 0.2)',
    borderRadius: 4
  },
  networkContainerFullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(44, 24, 16, 0.95)'
  },
  exitFullscreenButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(44, 24, 16, 0.8)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
    borderWidth: 1,
    borderColor: '#8B4513'
  }
});
