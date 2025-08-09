import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  Image,
  Dimensions,
  StatusBar,
  Keyboard,
  BackHandler,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { CoffeeModal, useCoffeeModal } from '@/components/CoffeeModal';
import { EmailService } from '@/utils/emailService';

const { width, height } = Dimensions.get('window');

interface UserData {
  email: string;
  userName: string;
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const router = useRouter();
  const { visible, message, type, showModal, hideModal } = useCoffeeModal();

  // Animações para os pontos de carregamento
  const dot1Animation = useRef(new Animated.Value(0)).current;
  const dot2Animation = useRef(new Animated.Value(0)).current;
  const dot3Animation = useRef(new Animated.Value(0)).current;
  const containerAnimation = useRef(new Animated.Value(0)).current;
  
  // Função para animar os pontos
  const startLoadingAnimation = useCallback(() => {
    // Animação de fade in do container
    Animated.timing(containerAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const createPulseAnimation = (animation: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animation, {
            toValue: 1,
            duration: 800,
            delay: delay,
            useNativeDriver: true,
          }),
          Animated.timing(animation, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
    };

    // Iniciar animações com delays diferentes para efeito de onda
    createPulseAnimation(dot1Animation, 0).start();
    createPulseAnimation(dot2Animation, 150).start();
    createPulseAnimation(dot3Animation, 300).start();
  }, [dot1Animation, dot2Animation, dot3Animation, containerAnimation]);

  // Parar animações quando não estiver carregando
  useEffect(() => {
    if (isLoading) {
      startLoadingAnimation();
    } else {
      // Fade out do container
      Animated.timing(containerAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      dot1Animation.setValue(0);
      dot2Animation.setValue(0);
      dot3Animation.setValue(0);
    }
  }, [isLoading, startLoadingAnimation, containerAnimation]);

  // Adicionar um useEffect para lidar com o evento de voltar do dispositivo
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'email') {
        Keyboard.dismiss();
        return false;
      } else {
        setStep('email');
        return true;
      }
    });

    return () => backHandler.remove();
  }, [step]);

  const handleSendResetCode = async () => {
    if (!email) {
      showModal('Por favor, informe seu email', 'error');
      return;
    }

    // Validar formato do email
    if (!EmailService.validateEmail(email)) {
      showModal('Por favor, informe um email válido', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // Verificar se o email existe
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        showModal('Email não encontrado. Verifique se o email está correto.', 'error');
        setIsLoading(false);
        return;
      }

      // Obter dados do usuário
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as UserData;
      const userName = userData.userName || 'Usuário';

      // Gerar código de reset usando o EmailService
      const code = EmailService.generateResetCode();
      
      // Salvar o código de reset no Firestore
      await addDoc(collection(db, 'passwordResets'), {
        email: email.toLowerCase(),
        code: code,
        createdAt: Timestamp.now(),
        expiresAt: new Timestamp(Timestamp.now().seconds + (15 * 60), 0), // 15 minutos
        used: false
      });

      // Enviar email com o código
      const emailSent = await EmailService.sendPasswordResetEmail(
        email.toLowerCase(),
        userName,
        code,
        15 // 15 minutos de expiração
      );

      if (emailSent) {
        showModal(
          'Código de recuperação enviado para seu email!\n\nVerifique sua caixa de entrada e spam.',
          'success',
          [
            {
              text: 'OK',
              onPress: () => setStep('code')
            }
          ]
        );
      } else {
        showModal(
          'Erro ao enviar email. Verifique sua conexão e tente novamente.',
          'error'
        );
      }

    } catch (error: any) {
      console.error('Send reset code error:', error);
      showModal('Ocorreu um erro ao enviar o código. Tente novamente.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!resetCode) {
      showModal('Por favor, informe o código de recuperação', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // Verificar se o código existe e é válido
      const resetsRef = collection(db, 'passwordResets');
      const q = query(
        resetsRef, 
        where('email', '==', email.toLowerCase()),
        where('code', '==', resetCode),
        where('used', '==', false)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        showModal('Código inválido ou expirado. Tente novamente.', 'error');
        setIsLoading(false);
        return;
      }

      const resetDoc = querySnapshot.docs[0];
      const resetData = resetDoc.data();
      
      // Verificar se o código não expirou
      const now = Timestamp.now();
      if (now.seconds > resetData.expiresAt.seconds) {
        showModal('Código expirado. Solicite um novo código.', 'error');
        setIsLoading(false);
        return;
      }
      showModal('Código verificado com sucesso!', 'success');
      setStep('password');
    } catch (error: any) {
      console.error('Verify code error:', error);
      showModal('Ocorreu um erro ao verificar o código. Tente novamente.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      showModal('Por favor, preencha todos os campos', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showModal('As senhas não coincidem', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showModal('A senha deve ter pelo menos 6 caracteres', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // Atualizar a senha do usuário
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        
        // Atualizar senha no Firestore
        await updateDoc(userDoc.ref, {
          password: newPassword
        });
        
        // Marcar o código como usado
        const resetsRef = collection(db, 'passwordResets');
        const resetQuery = query(
          resetsRef, 
          where('email', '==', email.toLowerCase()),
          where('code', '==', resetCode)
        );
        const resetSnapshot = await getDocs(resetQuery);
        
        if (!resetSnapshot.empty) {
          const resetDoc = resetSnapshot.docs[0];
          await updateDoc(resetDoc.ref, {
            used: true,
            usedAt: new Date().toISOString()
          });
        }

        showModal('Senha alterada com sucesso!', 'success');
        setTimeout(() => {
          router.replace('/acesso');
        }, 1500);
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      showModal('Ocorreu um erro ao alterar a senha. Tente novamente.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailStep = () => (
    <View style={styles.form}>
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, styles.stepActive]} />
        <View style={styles.stepLine} />
        <View style={styles.stepDot} />
        <View style={styles.stepLine} />
        <View style={styles.stepDot} />
      </View>

      <Text style={styles.stepTitle}>Recuperação de Senha</Text>
      <Text style={styles.stepDescription}>
        Informe seu email para receber um código de recuperação
      </Text>

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

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={handleSendResetCode}
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
            <Animated.View 
              style={[
                styles.loadingContainer,
                {
                  opacity: containerAnimation,
                  transform: [{
                    scale: containerAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    })
                  }]
                }
              ]}
            >
              <Text style={styles.loadingText}>Enviando código de segurança</Text>
              <Text style={styles.loadingSubtext}>Aguarde um momento...</Text>
              <View style={styles.loadingDotsContainer}>
                <Animated.View 
                  style={[
                    styles.loadingDot,
                    {
                      transform: [{
                        scale: dot1Animation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1.2],
                        })
                      }],
                      opacity: dot1Animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1],
                      })
                    }
                  ]} 
                />
                <Animated.View 
                  style={[
                    styles.loadingDot,
                    {
                      transform: [{
                        scale: dot2Animation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1.2],
                        })
                      }],
                      opacity: dot2Animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1],
                      })
                    }
                  ]} 
                />
                <Animated.View 
                  style={[
                    styles.loadingDot,
                    {
                      transform: [{
                        scale: dot3Animation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1.2],
                        })
                      }],
                      opacity: dot3Animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1],
                      })
                    }
                  ]} 
                />
              </View>
            </Animated.View>
          ) : (
            <Text style={styles.buttonText}>Enviar Código</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderCodeStep = () => (
    <View style={styles.form}>
      <View style={styles.stepIndicator}>
        <View style={styles.stepDot} />
        <View style={styles.stepLine} />
        <View style={[styles.stepDot, styles.stepActive]} />
        <View style={styles.stepLine} />
        <View style={styles.stepDot} />
      </View>

      <Text style={styles.stepTitle}>Verificar Código</Text>
      <Text style={styles.stepDescription}>
        Digite o código enviado para {email}
      </Text>

      <View style={styles.inputContainer}>
        <Ionicons name="key-outline" size={20} color="#A0A0A0" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Código de 6 dígitos"
          placeholderTextColor="#A0A0A0"
          value={resetCode}
          onChangeText={setResetCode}
          keyboardType="number-pad"
          maxLength={6}
          editable={!isLoading}
        />
      </View>

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={handleVerifyCode}
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
            <Animated.View 
              style={[
                styles.loadingContainer,
                {
                  opacity: containerAnimation,
                  transform: [{
                    scale: containerAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    })
                  }]
                }
              ]}
            >
              <Text style={styles.loadingText}>Verificando código de segurança</Text>
              <Text style={styles.loadingSubtext}>Aguarde um momento...</Text>
              <View style={styles.loadingDotsContainer}>
                <Animated.View 
                  style={[
                    styles.loadingDot,
                    {
                      transform: [{
                        scale: dot1Animation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1.2],
                        })
                      }],
                      opacity: dot1Animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1],
                      })
                    }
                  ]} 
                />
                <Animated.View 
                  style={[
                    styles.loadingDot,
                    {
                      transform: [{
                        scale: dot2Animation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1.2],
                        })
                      }],
                      opacity: dot2Animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1],
                      })
                    }
                  ]} 
                />
                <Animated.View 
                  style={[
                    styles.loadingDot,
                    {
                      transform: [{
                        scale: dot3Animation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1.2],
                        })
                      }],
                      opacity: dot3Animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1],
                      })
                    }
                  ]} 
                />
              </View>
            </Animated.View>
          ) : (
            <Text style={styles.buttonText}>Verificar Código</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

    </View>
  );

  const renderPasswordStep = () => (
    <View style={styles.form}>
      <View style={styles.stepIndicator}>
        <View style={styles.stepDot} />
        <View style={styles.stepLine} />
        <View style={styles.stepDot} />
        <View style={styles.stepLine} />
        <View style={[styles.stepDot, styles.stepActive]} />
      </View>

      <Text style={styles.stepTitle}>Nova Senha</Text>
      <Text style={styles.stepDescription}>
        Crie uma nova senha para sua conta
      </Text>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#A0A0A0" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Nova senha"
          placeholderTextColor="#A0A0A0"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showNewPassword}
          editable={!isLoading}
        />
        <TouchableOpacity 
          onPress={() => setShowNewPassword(!showNewPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons 
            name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
            size={20} 
            color="#A0A0A0" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#A0A0A0" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Confirmar nova senha"
          placeholderTextColor="#A0A0A0"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          editable={!isLoading}
        />
        <TouchableOpacity 
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons 
            name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
            size={20} 
            color="#A0A0A0" 
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={handleResetPassword}
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
            <Animated.View 
              style={[
                styles.loadingContainer,
                {
                  opacity: containerAnimation,
                  transform: [{
                    scale: containerAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    })
                  }]
                }
              ]}
            >
              <Text style={styles.loadingText}>Alterando senha</Text>
              <Text style={styles.loadingSubtext}>Aguarde um momento...</Text>
              <View style={styles.loadingDotsContainer}>
                <Animated.View 
                  style={[
                    styles.loadingDot,
                    {
                      transform: [{
                        scale: dot1Animation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1.2],
                        })
                      }],
                      opacity: dot1Animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1],
                      })
                    }
                  ]} 
                />
                <Animated.View 
                  style={[
                    styles.loadingDot,
                    {
                      transform: [{
                        scale: dot2Animation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1.2],
                        })
                      }],
                      opacity: dot2Animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1],
                      })
                    }
                  ]} 
                />
                <Animated.View 
                  style={[
                    styles.loadingDot,
                    {
                      transform: [{
                        scale: dot3Animation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1.2],
                        })
                      }],
                      opacity: dot3Animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1],
                      })
                    }
                  ]} 
                />
              </View>
            </Animated.View>
          ) : (
            <Text style={styles.buttonText}>Alterar Senha</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#2C1810', '#4A2C2A', '#2C1810']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
              <Text style={styles.subtitle}>Recuperação de Senha</Text>
            </View>

            {step === 'email' && renderEmailStep()}
            {step === 'code' && renderCodeStep()}
            {step === 'password' && renderPasswordStep()}

            <View style={styles.botoes_baixos}>

            <TouchableOpacity
              style={styles.devButton}
              onPress={() => {
                if (step === 'email') {
                  router.back();
                } else {
                  setStep(step === 'code' ? 'email' : 'code');
                }
              }}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Text style={styles.devButtonText}>
                {step === 'email' ? 'Voltar ao Login' : 'Voltar'}
              </Text>
            </TouchableOpacity>

            {/* Botão para inserir código manualmente (apenas para desenvolvimento) */}
            {step === 'email' && (
              <TouchableOpacity
                style={styles.devButton}
                onPress={() => {
                  setStep('code');
                }}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Text style={styles.devButtonText}>
                Por código -{'>'}
                </Text>
              </TouchableOpacity>
            )}
            </View>

          </View>
        </ScrollView>
      </LinearGradient>
      <CoffeeModal
        visible={visible}
        message={message}
        type={type}
        onClose={hideModal}
      />
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    minHeight: height,
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  stepActive: {
    backgroundColor: '#8B4513',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 10,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  stepDescription: {
    fontSize: 16,
    textAlign: 'center',
    color: '#E0E0E0',
    marginBottom: 30,
    lineHeight: 22,
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
  copyIcon: {
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 25,
    minHeight: 120,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingSubtext: {
    color: '#E0E0E0',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.9,
  },
  loadingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  loadingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#8B4513',
    shadowColor: '#8B4513',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backText: {
    color: '#E0E0E0',
    fontSize: 16,
  },
  devButton: {
    marginTop: 15,
    backgroundColor: 'rgba(74, 44, 42, 0.8)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  devButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  devNote: {
    marginTop: 15,
    color: '#E0E0E0',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  botoes_baixos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
}); 