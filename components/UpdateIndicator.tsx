import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Easing } from 'react-native';
import { useApp } from '@/contexts/AppContext';

interface UpdateIndicatorProps {
  onUpdatePress?: () => void;
}

export default function UpdateIndicator({ onUpdatePress }: UpdateIndicatorProps) {
  const [blinkAnimation] = useState(new Animated.Value(0));
  const [showIndicator, setShowIndicator] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  // Função para iniciar a animação de piscar
  const startBlinkAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnimation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnimation, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };
  
  // Função para parar a animação
  const stopBlinkAnimation = () => {
    blinkAnimation.stopAnimation();
    blinkAnimation.setValue(0);
  };
  
  // Efeito para monitorar atualizações
  useEffect(() => {
    // Aqui você pode adicionar lógica para verificar atualizações
    // Por exemplo, verificar o Firestore ou uma API
    
    // Simulação de verificação de atualizações a cada 30 segundos
    const checkForUpdates = () => {
      // Simulando uma atualização aleatória (você deve substituir isso pela sua lógica real)
      const hasUpdate = Math.random() > 0.7;
      
      if (hasUpdate) {
        setShowIndicator(true);
        setLastUpdateTime(new Date());
        startBlinkAnimation();
      }
    };
    
    // Verificar imediatamente
    checkForUpdates();
    
    // Configurar intervalo para verificar periodicamente
    const intervalId = setInterval(checkForUpdates, 30000);
    
    // Limpar o intervalo quando o componente for desmontado
    return () => {
      clearInterval(intervalId);
      stopBlinkAnimation();
    };
  }, []);
  
  // Interpolate a opacidade para a animação
  const opacity = blinkAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });
  
  // Interpolate a escala para a animação
  const scale = blinkAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2],
  });
  
  // Se não houver atualizações, não renderizar nada
  if (!showIndicator) {
    return null;
  }
  
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => {
        if (onUpdatePress) {
          onUpdatePress();
          setShowIndicator(false);
          stopBlinkAnimation();
        }
      }}
      activeOpacity={0.8}
    >
      <Animated.View 
        style={[
          styles.indicator, 
          { 
            opacity,
            transform: [{ scale }]
          }
        ]}
      >
        <Text style={styles.text}>Nova Atualização!</Text>
        {lastUpdateTime && (
          <Text style={styles.timeText}>
            {lastUpdateTime.toLocaleTimeString()}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1000,
  },
  indicator: {
    backgroundColor: '#8B4513',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  timeText: {
    color: '#D4A76A',
    fontSize: 10,
    marginTop: 2,
  },
}); 