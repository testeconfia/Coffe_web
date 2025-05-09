import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Easing } from 'react-native';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FirestoreUpdateIndicatorProps {
  onUpdatePress?: () => void;
  checkInterval?: number; // Intervalo em milissegundos para verificar atualizações
}

export default function FirestoreUpdateIndicator({ 
  onUpdatePress, 
  checkInterval = 30000 
}: FirestoreUpdateIndicatorProps) {
  const [blinkAnimation] = useState(new Animated.Value(0));
  const [showIndicator, setShowIndicator] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [userToken, setUserToken] = useState<string | null>(null);
  const lastCheckTime = useRef<Date>(new Date());
  
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
  
  // Função para carregar o token do usuário
  const loadUserToken = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setUserToken(token);
      return token;
    } catch (error) {
      console.error('Erro ao carregar token do usuário:', error);
      return null;
    }
  };
  
  // Efeito para monitorar atualizações no Firestore
  useEffect(() => {
    let unsubscribeUserData: (() => void) | undefined;
    let unsubscribeNotifications: (() => void) | undefined;
    let unsubscribeGlobalNotifications: (() => void) | undefined;
    
    const setupListeners = async () => {
      try {
        const token = await loadUserToken();
        
        if (!token) {
          console.log('Token do usuário não encontrado');
          return;
        }
        
        // Listener para dados do usuário
        const userRef = collection(db, 'users');
        const userQuery = query(userRef, where('__name__', '==', token));
        
        unsubscribeUserData = onSnapshot(userQuery, 
          (snapshot) => {
            if (!snapshot.empty) {
              const now = new Date();
              const timeSinceLastCheck = now.getTime() - lastCheckTime.current.getTime();
              
              // Só mostrar atualização se passou tempo suficiente desde a última verificação
              if (timeSinceLastCheck > checkInterval) {
                console.log('Dados do usuário atualizados');
                setShowIndicator(true);
                setLastUpdateTime(now);
                setUpdateCount(prev => prev + 1);
                startBlinkAnimation();
                lastCheckTime.current = now;
              }
            }
          },
          (error) => {
            console.error('Erro ao monitorar dados do usuário:', error);
          }
        );
        
        // Listener para notificações do usuário
        const notificationsRef = collection(db, 'notifications');
        const userNotificationsQuery = query(
          notificationsRef,
          where('userId', '==', token)
        );
        
        unsubscribeNotifications = onSnapshot(userNotificationsQuery,
          (snapshot) => {
            if (!snapshot.empty) {
              const now = new Date();
              const timeSinceLastCheck = now.getTime() - lastCheckTime.current.getTime();
              
              // Só mostrar atualização se passou tempo suficiente desde a última verificação
              if (timeSinceLastCheck > checkInterval) {
                console.log('Notificações do usuário atualizadas:', snapshot.size);
                setShowIndicator(true);
                setLastUpdateTime(now);
                setUpdateCount(prev => prev + 1);
                startBlinkAnimation();
                lastCheckTime.current = now;
              }
            }
          },
          (error) => {
            console.error('Erro ao monitorar notificações do usuário:', error);
          }
        );
        
        // Listener para notificações globais
        const globalNotificationsQuery = query(
          notificationsRef,
          where('userId', '==', null)
        );
        
        unsubscribeGlobalNotifications = onSnapshot(globalNotificationsQuery,
          (snapshot) => {
            if (!snapshot.empty) {
              const now = new Date();
              const timeSinceLastCheck = now.getTime() - lastCheckTime.current.getTime();
              
              // Só mostrar atualização se passou tempo suficiente desde a última verificação
              if (timeSinceLastCheck > checkInterval) {
                console.log('Notificações globais atualizadas:', snapshot.size);
                setShowIndicator(true);
                setLastUpdateTime(now);
                setUpdateCount(prev => prev + 1);
                startBlinkAnimation();
                lastCheckTime.current = now;
              }
            }
          },
          (error) => {
            console.error('Erro ao monitorar notificações globais:', error);
          }
        );
        
      } catch (error) {
        console.error('Erro ao configurar listeners:', error);
      }
    };
    
    setupListeners();
    
    // Cleanup function
    return () => {
      if (unsubscribeUserData) unsubscribeUserData();
      if (unsubscribeNotifications) unsubscribeNotifications();
      if (unsubscribeGlobalNotifications) unsubscribeGlobalNotifications();
      stopBlinkAnimation();
    };
  }, [checkInterval]);
  
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
        {updateCount > 1 && (
          <Text style={styles.countText}>
            +{updateCount} atualizações
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
  countText: {
    color: '#D4A76A',
    fontSize: 10,
    marginTop: 2,
    fontWeight: 'bold',
  },
}); 