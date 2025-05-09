import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Alert, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const games = [
  {
    id: 'cafe-quantico',
    title: 'Café Quântico',
    description: 'Explore a física quântica através de partículas de café!',
    image: require('@/assets/icons/cafe-quantico.png'),
    color: '#6F4E37',
    path: '/jogos/cafe-quantico',
    gradient: ['#2C1810', '#3C2415']
  },
  {
    id: 'cafe-neural',
    title: 'Café Neural',
    description: 'Treine uma rede neural para fazer o café perfeito!',
    image: require('@/assets/icons/cafe-neural.png'),
    color: '#8B4513',
    path: '/jogos/cafe-neural',
    gradient: ['#3C2415', '#4A2C1A']
  },
  {
    id: 'cafe-matrix',
    title: 'Café Matrix',
    description: 'Navegue entre diferentes dimensões do café!',
    image: require('@/assets/icons/cafe-matrix.png'),
    color: '#A0522D',
    path: '/jogos/cafe-matrix',
    gradient: ['#4A2C1A', '#5A3C25']
  },
  {
    id: 'cafe-cobrinha',
    title: 'Cobrinha',
    description: 'Jogo da cobrinha com café!',
    image: require('@/assets/icons/cafe-cobrinha.png'),
    color: '#A0522D',
    path: '/jogos/cafe-cobrinha',
    gradient: ['#4A2C1A', '#5A3C25']
  },
  {
    id: 'cafe-dino',
    title: 'Café Dino',
    description: 'Jogo do dinossauro com café!',
    image: require('@/assets/icons/stickmen.png'),
    color: '#A0522D',
    path: '/jogos/cafe-dino',
    gradient: ['#4A2C1A', '#5A3C25']
  }
];

export default function JogosScreen() {
  const router = useRouter();

  const handleGamePress = (game: typeof games[0]) => {
    if (game.id === 'cafe-dino') {
      Alert.alert(
        'Em Desenvolvimento',
        'O Café Dino ainda está em desenvolvimento. Deseja jogar o jogo do dinossauro do Google?',
        [
          {
            text: 'Não',
            style: 'cancel'
          },
          {
            text: 'Sim',
            onPress: () => {
              // Open Chrome Dino game in browser
              Linking.openURL('https://trex-runner.com');
            }
          }
        ]
      );
    } else {
      router.push(game.path as any);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2C1810', '#3C2415']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Image 
            source={require('@/assets/imgs/grao.png')}
            style={styles.headerImage}
          />
          <Text style={styles.title}>Jogos</Text>
          <Text style={styles.subtitle}>Divirta-se enquanto toma seu café</Text>
        </View>

        <ScrollView 
          style={styles.gamesList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gamesListContent}
        >
          {games.map((game) => (
            <TouchableOpacity
              key={game.id}
              style={styles.gameCard}
              onPress={() => handleGamePress(game)}
              activeOpacity={0.9}
            >
              <BlurView intensity={20} style={styles.gameCardBlur}>
                <LinearGradient
                  colors={game.gradient}
                  style={styles.gameCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.gameContent}>
                    <View style={styles.gameIconContainer}>
                      <LinearGradient
                        colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                        style={styles.gameIcon}
                      >
                        <Image 
                          source={game.image}
                          style={styles.gameImage}
                          resizeMode="contain"
                        />
                      </LinearGradient>
                    </View>
                    <View style={styles.gameInfo}>
                      <Text style={styles.gameTitle}>{game.title}</Text>
                      <Text style={styles.gameDescription}>{game.description}</Text>
                    </View>
                    <View style={styles.gameArrow}>
                      <Ionicons name="chevron-forward" size={24} color="#E6C9A8" />
                    </View>
                  </View>
                </LinearGradient>
              </BlurView>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ☕ Desenvolvido com amor ao café por{' '}
            <Text style={{ fontSize: 12, color: '#E6C9A8', fontWeight: 'bold'}}>
              Giuseph Giangarli
            </Text>
          </Text>
        </View>
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
  header: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  headerImage: {
    width: 80,
    height: 80,
    marginBottom: 20,
    tintColor: '#E6C9A8',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#E6C9A8',
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#E6C9A8',
    opacity: 0.8,
    textAlign: 'center',
  },
  gamesList: {
    flex: 1,
  },
  gamesListContent: {
    padding: 20,
    paddingBottom: 40,
  },
  gameCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  gameCardBlur: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  gameCardGradient: {
    padding: 20,
  },
  gameContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameIconContainer: {
    marginRight: 15,
  },
  gameIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(230, 201, 168, 0.3)',
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E6C9A8',
    marginBottom: 5,
  },
  gameDescription: {
    fontSize: 14,
    color: 'rgba(230, 201, 168, 0.8)',
    lineHeight: 20,
  },
  gameArrow: {
    marginLeft: 10,
    opacity: 0.8,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#E6C9A8',
    opacity: 0.5,
    fontSize: 12,
  },
  gameImage: {
    width: 40,
    height: 40,
    tintColor: '#E6C9A8',
  },
}); 