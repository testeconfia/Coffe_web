import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ThemeType } from '@/constants/Colors';

interface StatisticsButtonProps {
  style?: any;
}

export default function StatisticsButton({ style }: StatisticsButtonProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('default');
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    checkTheme();
  }, []);

  // Add effect to listen for system theme changes
  useEffect(() => {
    const checkSystemTheme = async () => {
      const followSystem = await AsyncStorage.getItem('followSystemTheme');
      if (followSystem === 'true') {
        setCurrentTheme(systemColorScheme as ThemeType || 'default');
      }
    };
    checkSystemTheme();
  }, [systemColorScheme]);

  const checkTheme = async () => {
    const theme = await AsyncStorage.getItem('selectedTheme');
    const followSystem = await AsyncStorage.getItem('followSystemTheme');
    if (followSystem === 'true') {
      setCurrentTheme(systemColorScheme as ThemeType || 'default');
    } else {
      setCurrentTheme(theme as ThemeType || 'default');
    }
  };

  const handlePress = () => {
    router.push('/telas_extras/estatisticas');
  };

  return (
    <TouchableOpacity style={[styles.actionButton, style]} onPress={handlePress}>
      <LinearGradient
        colors={[Colors[currentTheme].primary, Colors[currentTheme].accent]}
        style={styles.actionButtonGradient}
      >
        <Ionicons name="stats-chart" size={24} color={Colors[currentTheme].textLight} />
        <Text style={[styles.actionButtonText, { color: Colors[currentTheme].textLight }]}>Estatísticas</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    width: '45%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
}); 