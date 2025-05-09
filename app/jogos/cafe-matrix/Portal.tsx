import React, { memo, useEffect, useState, useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet, Pressable, Easing, Dimensions, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GAME_CONSTANTS } from './constants';
import graoImg from '../../../assets/imgs/grao.png';
import virusImg from '../../../assets/imgs/virus.png';

const { width, height } = Dimensions.get('window');

interface PortalProps {
  id: number;
  x: number;
  y: number;
  dimensionId: number;
  active: boolean;
  scale: Animated.Value;
  rotation: Animated.Value;
  glow: Animated.Value;
  opacity: Animated.Value;
  type?: 'cup' | 'bean' | 'fire' | 'goldenCup' | 'poison' | 'timePortal' | 'blackHole' | 'virus';
  onActivate: (id: number, isTeleport?: boolean) => void;
  onTimeout: (id: number) => void;
  portalLifetime: number;
  isMatrixDimension: boolean;
}

const Portal = memo(({ 
  id, 
  x, 
  y, 
  dimensionId, 
  active, 
  scale, 
  rotation, 
  glow, 
  opacity,
  type,
  onActivate,
  onTimeout,
  portalLifetime,
  isMatrixDimension
}: PortalProps) => {
  const [isTeleported, setIsTeleported] = useState(false);
  const [position, setPosition] = useState({ x, y });
  const [teleportCount, setTeleportCount] = useState(0);
  const [requiredTeleports, setRequiredTeleports] = useState(0);
  const [nextTeleportAngle, setNextTeleportAngle] = useState(0);
  const [showPoints, setShowPoints] = useState(false);
  const [points, setPoints] = useState(0);
  const pointsAnim = useRef(new Animated.Value(0)).current;
  const pointsOpacity = useRef(new Animated.Value(1)).current;
  const [virusEffect, setVirusEffect] = useState(false);
  const virusWidth = useRef(new Animated.Value(32)).current;
  const virusHeight = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    // Calcular duração da animação baseada no tempo de vida do portal
    const rotationDuration = Math.min(portalLifetime * 0.4, 2000);

    // Animação de entrada
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 40
      }),
      Animated.timing(rotation, {
        toValue: 1,
        duration: rotationDuration,
        useNativeDriver: true,
        easing: Easing.linear
      })
    ]).start();

    // Timer para desaparecer
    const timeout = setTimeout(() => {
      if (!active) {
        onTimeout(id);
      }
    }, portalLifetime);

    // Definir número aleatório de teleportes necessários (0-3)
    if (isMatrixDimension && isPositivePortal()) {
      setRequiredTeleports(Math.floor(Math.random() * 4)); // Gera número entre 0 e 3
      // Definir ângulo inicial do próximo teleporte
      setNextTeleportAngle(Math.random() * Math.PI * 2);
    }

    return () => clearTimeout(timeout);
  }, [portalLifetime]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5]
  });

  const getPortalIcon = () => {
    switch (type) {
      case 'cup': return 'cafe';
      case 'bean': return 'nutrition';
      case 'fire': return 'flame';
      case 'goldenCup': return 'star';
      case 'poison': return 'skull';
      case 'timePortal': return 'time';
      case 'blackHole': return 'infinite';
      default: return 'cafe-outline';
    }
  };

  const getPortalColor = () => {
    return 'transparent';
  };

  const getPortalSize = () => {
    switch (type) {
      case 'goldenCup': return 70;
      case 'blackHole': return 65;
      default: return 60;
    }
  };

  const isPositivePortal = () => {
    return type === 'cup' || type === 'bean' || type === 'goldenCup' || type === 'timePortal' || type === 'virus';
  };

  const getPoints = () => {
    if (!type) return 0;
    switch (type) {
      case 'cup': return GAME_CONSTANTS.POINTS.CUP;
      case 'bean': return GAME_CONSTANTS.POINTS.BEAN;
      case 'fire': return GAME_CONSTANTS.POINTS.FIRE;
      case 'goldenCup': return GAME_CONSTANTS.POINTS.GOLDEN_CUP;
      case 'poison': return GAME_CONSTANTS.POINTS.POISON;
      case 'timePortal': return GAME_CONSTANTS.POINTS.TIME_PORTAL;
      case 'blackHole': return GAME_CONSTANTS.POINTS.BLACK_HOLE;
      case 'virus': return GAME_CONSTANTS.POINTS.VIRUS;
      default: return 0;
    }
  };

  const animatePoints = () => {
    setPoints(getPoints());
    setShowPoints(true);
    pointsAnim.setValue(0);
    pointsOpacity.setValue(1);

    Animated.parallel([
      Animated.timing(pointsAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      }),
      Animated.timing(pointsOpacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      })
    ]).start(() => {
      setShowPoints(false);
    });
  };

  const handlePress = () => {
    if (!active) {
      if (type === 'virus') {
        setVirusEffect(true);
        Animated.parallel([
          Animated.timing(virusWidth, {
            toValue: width,
            duration: 400,
            useNativeDriver: false
          }),
          Animated.timing(virusHeight, {
            toValue: height,
            duration: 400,
            useNativeDriver: false
          })
        ]).start(() => {
          setTimeout(() => {
            setVirusEffect(false);
            onActivate(id, false);
          }, 400); // Mantém o vírus grande por mais 400ms antes de sumir
        });
        return;
      }
      if (isMatrixDimension && isPositivePortal()) {
        if (teleportCount < requiredTeleports) {
          // Teleportar o portal
          const radius = 150; // Raio de teleporte
          const newX = position.x + radius * Math.cos(nextTeleportAngle);
          const newY = position.y + radius * Math.sin(nextTeleportAngle);
          
          // Garantir que o portal fique dentro da tela
          const boundedX = Math.max(0, Math.min(width - getPortalSize(), newX));
          const boundedY = Math.max(0, Math.min(height - getPortalSize(), newY));
          
          setPosition({ x: boundedX, y: boundedY });
          setTeleportCount(prev => prev + 1);
          // Definir novo ângulo para o próximo teleporte
          setNextTeleportAngle(Math.random() * Math.PI * 2);
          onActivate(id, true);
        } else {
          animatePoints();
          onActivate(id, false);
        }
      } else {
        animatePoints();
        onActivate(id, false);
      }
    }
  };

  const pointsY = pointsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -50]
  });

  return (
    <Animated.View
      style={[
        styles.portalContainer,
        {
          left: position.x,
          top: position.y,
          transform: [
            { scale },
            { rotate: spin }
          ],
          opacity
        }
      ]}
    >
      <Animated.View
        style={[
          styles.portalGlow,
          {
            backgroundColor: 'transparent',
            opacity: glowOpacity,
            width: getPortalSize() + 30,
            height: getPortalSize() + 30,
            borderRadius: (getPortalSize() + 30) / 2
          }
        ]}
      />
      {isMatrixDimension && isPositivePortal() && teleportCount < requiredTeleports && (
        <Animated.View
          style={[
            styles.arrowContainer,
            {
              transform: [
                { rotate: `${nextTeleportAngle}rad` }
              ]
            }
          ]}
        >
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </Animated.View>
      )}
      {showPoints && (
        <Animated.Text
          style={[
            styles.pointsText,
            {
              transform: [{ translateY: pointsY }],
              opacity: pointsOpacity,
              color: points > 0 ? '#4CAF50' : '#F44336'
            }
          ]}
        >
          {points > 0 ? '+' : ''}{points}
        </Animated.Text>
      )}
      <Pressable
        style={({ pressed }) => [
          styles.portal,
          {
            backgroundColor: 'transparent',
            opacity: active ? 0.5 : pressed ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
            width: getPortalSize(),
            height: getPortalSize(),
            borderRadius: getPortalSize() / 2
          }
        ]}
        onPress={handlePress}
        disabled={active}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.3)', radius: 30 }}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        {type === 'bean' ? (
          <Image
            source={graoImg}
            style={{ width: 28, height: 28, resizeMode: 'contain', tintColor: '#fff' }}
          />
        ) : type === 'virus' ? (
          <Animated.Image
            source={virusImg}
            style={{ width: virusWidth, height: virusHeight, resizeMode: 'contain', tintColor: '#fff' }}
          />
        ) : (
          <Ionicons
            name={getPortalIcon()}
            size={type === 'goldenCup' ? 32 : 28}
            color="#fff"
          />
        )}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  portalContainer: {
    position: 'absolute',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  portalGlow: {
    position: 'absolute',
    opacity: 0.5,
  },
  portal: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  arrowContainer: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  pointsText: {
    position: 'absolute',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  virusContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden'
  },
  virusImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  }
});

export default Portal;