import { Stack } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function JogosLayout() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2a2a2a']}
        style={styles.gradient}
      >
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: 'transparent',
            },
            headerTintColor: '#fff',
            headerShown : false,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            headerBackTitle: 'Voltar',
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: 'Jogos',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="cafe-quantico/index"
            options={{
              title: 'Café Quântico',
            }}
          />
          <Stack.Screen
            name="cafe-neural/index"
            options={{
              title: 'Café Neural',
            }}
          />
          <Stack.Screen
            name="cafe-matrix/index"
            options={{
              title: 'Café Matrix',
            }}
          />
        </Stack>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
}); 