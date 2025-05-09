import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
  Image,
  Dimensions,
  StatusBar,
  Keyboard,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface UserData {
  email: string;
  password: string;
  userName: string;
  isAdmin: boolean;
  userCredit: number;
  subscriptionStatus: string;
  subscriptionEndDate: Timestamp | string | null;
  createAt: Timestamp;
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Adicionar um useEffect para lidar com o evento de voltar do dispositivo
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Keyboard.dismiss();
      return false; // Permite que o evento de voltar continue normalmente
    });

    return () => backHandler.remove();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }
    console.log(email.toLowerCase(), password);
    // Fechar o teclado antes de prosseguir
    Keyboard.dismiss();

    setIsLoading(true);
    try {
      // Buscar usuário no Firestore
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef, 
        where('email', '==', email.toLowerCase()), 
        where('password', '==', password)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        Alert.alert('Erro', 'Email ou senha incorretos');
        setIsLoading(false);
        return;
      }

      // Usuário encontrado
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as UserData;

      // Tratar a data de expiração da assinatura de forma segura
      let subscriptionEndDate = '';
      if (userData.subscriptionEndDate) {
        try {
          // Se for um Timestamp do Firestore
          if (userData.subscriptionEndDate instanceof Timestamp) {
            subscriptionEndDate = userData.subscriptionEndDate.toDate().toISOString();
          } 
          // Se for uma string ISO
          else if (typeof userData.subscriptionEndDate === 'string') {
            const date = new Date(userData.subscriptionEndDate);
            if (!isNaN(date.getTime())) {
              subscriptionEndDate = date.toISOString();
            }
          }
        } catch (error) {
          console.warn('Erro ao processar data de expiração:', error);
        }
      }

      // Salvar dados no AsyncStorage
      await Promise.all([
        AsyncStorage.setItem('userToken', userDoc.id),
        AsyncStorage.setItem('userName', userData.userName || ''),
        AsyncStorage.setItem('userEmail', userData.email || ''),
        AsyncStorage.setItem('isAdmin', String(userData.isAdmin || false)),
        AsyncStorage.setItem('userCredit', String(userData.userCredit || 0)),
        AsyncStorage.setItem('subscriptionStatus', userData.subscriptionStatus || 'inactive'),
        AsyncStorage.setItem('subscriptionEndDate', subscriptionEndDate)
      ]);

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Erro', 'Ocorreu um erro durante o login. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#2C1810', '#4A2C2A', '#2C1810']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/imgs/xicara.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>Cafezão da Computação</Text>
            <Text style={styles.subtitle}>Gerencie seus cafés</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#A0A0A0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#A0A0A0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#A0A0A0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="#A0A0A0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#A0A0A0" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#8B4513', '#A0522D']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <View style={styles.loadingDot} />
                    <View style={styles.loadingDot} />
                    <View style={styles.loadingDot} />
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Entrar</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => {
                Keyboard.dismiss();
                router.push('/acesso/register');
              }}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Text style={styles.registerText}>
                Não tem uma conta? <Text style={styles.registerTextBold}>Cadastre-se</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: width * 0.4,
    tintColor: '#FFFFFF',
    height: width * 0.4,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFFFFF',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#E0E0E0',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginLeft: 15,
  },
  input: {
    flex: 1,
    padding: 15,
    color: '#FFFFFF',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 15,
  },
  button: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    padding: 15,
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    color: '#E0E0E0',
    fontSize: 16,
  },
  registerTextBold: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
}); 