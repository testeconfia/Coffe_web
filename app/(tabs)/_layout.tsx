import { Tabs, useFocusEffect } from 'expo-router';
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Platform, StyleSheet, useColorScheme, View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, onSnapshot, query, where, Timestamp, doc, updateDoc, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors, ThemeType } from '@/constants/Colors';
import { useApp } from '@/contexts/AppContext';

// Configurar o comportamento das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={28} style={{ marginBottom: -3 }} {...props} />;
}

function TabLayoutContent() {
  const systemColorScheme = useColorScheme();
  const { isAdmin, syncWithFirebase, userName } = useApp();
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('default');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotificationBadge, setShowNotificationBadge] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('');
  const [notificationVisible, setNotificationVisible] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load theme on component mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('selectedTheme');
        const followSystem = await AsyncStorage.getItem('followSystemTheme');
        const customThemeStr = await AsyncStorage.getItem('customTheme');

        if (followSystem === 'true') {
          setCurrentTheme(systemColorScheme as ThemeType || 'default');
        } else if (savedTheme === 'custom' && customThemeStr) {
          setCurrentTheme('custom');
        } else {
          setCurrentTheme(savedTheme as ThemeType || 'default');
        }
      } catch (error) {
        console.error('Error loading theme:', error);
        setCurrentTheme('default');
      }
    };
    loadTheme();
  }, [systemColorScheme]);

  // Adicionar um listener para mudanças no tema
  useEffect(() => {
    const checkThemeChanges = async () => {
      const savedTheme = await AsyncStorage.getItem('selectedTheme');
      const customThemeStr = await AsyncStorage.getItem('customTheme');
      
      if (savedTheme === 'custom' && customThemeStr) {
        setCurrentTheme('custom');
      } else if (savedTheme) {
        setCurrentTheme(savedTheme as ThemeType);
      }
    };

    // Verificar mudanças a cada 1 segundo
    const interval = setInterval(checkThemeChanges, 1000);
    return () => clearInterval(interval);
  }, []);

  // Atualizar o tema quando o sistema mudar
  useEffect(() => {
    const followSystem = async () => {
      const followSystemTheme = await AsyncStorage.getItem('followSystemTheme');
      if (followSystemTheme === 'true') {
        setCurrentTheme(systemColorScheme as ThemeType || 'default');
      }
    };
    followSystem();
  }, [systemColorScheme]);

  // Configurar notificações push
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        // Salvar o token no AsyncStorage para uso posterior
        AsyncStorage.setItem('expoPushToken', token);
        
        // Atualizar o token no Firestore para o usuário atual
        updateUserPushToken(token);
      }
    });

    // Configurar listeners para notificações
    notificationListener.current = Notifications.addNotificationReceivedListener((notification: Notifications.Notification) => {
      const { title, body, data } = notification.request.content;
      
      // Atualizar o estado para mostrar a notificação in-app
      if (title && body) {
        setNotificationMessage(body);
        setNotificationType(data?.type as string || 'info');
        setNotificationVisible(true);
        setShowNotificationBadge(true);
        
        // Incrementar o contador de notificações não lidas
        setUnreadNotifications(prev => prev + 1);
        
        // Animar a notificação
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(5000),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setNotificationVisible(false);
        });
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
      const { notification } = response;
      const { data } = notification.request.content;
      
      // Navegar para a tela apropriada com base nos dados da notificação
      if (data?.screen) {
        // Implementar navegação para a tela específica
        console.log('Navegando para:', data.screen);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // Função para atualizar o token de push no Firestore
  const updateUserPushToken = async (token: string) => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        console.log('Usuário não está autenticado, não é possível salvar o token');
        return;
      }
      
      console.log(`Salvando token para o usuário ${userToken}:`, token);
      const userRef = doc(db, 'users', userToken);
      await updateDoc(userRef, {
        pushToken: token,
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
          deviceName: Device.deviceName,
          appVersion: Constants.expoConfig?.version || '1.0.0',
        },
        lastTokenUpdate: Timestamp.now()
      });
      
      console.log('Token de push atualizado com sucesso no Firestore');
    } catch (error) {
      console.error('Erro ao atualizar token de push:', error);
    }
  };

  // Setup notification listeners
  useEffect(() => {
    let unsubscribeUserNotifications: (() => void) | undefined;
    let unsubscribeGlobalNotifications: (() => void) | undefined;
    let checkNotificationsInterval: NodeJS.Timeout;

    const setupNotificationListeners = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        if (!userToken) return;

        // Query for user-specific notifications
        const userNotificationsRef = collection(db, 'notifications');
        const userNotificationsQuery = query(
          userNotificationsRef,
          where('userId', '==', userToken),
          where('read', '==', false)
        );

        // Query for global notifications
        const globalNotificationsRef = collection(db, 'notifications');
        const globalNotificationsQuery = query(
          globalNotificationsRef,
          where('userId', '==', null)
        );

        // Listen for user notifications
        unsubscribeUserNotifications = onSnapshot(userNotificationsQuery, async (snapshot) => {
          const count = snapshot.size;
          
          // Handle notification check and delivery
          const handleNotification = async () => {
            if (count > 0 && snapshot.docs.length > 0) {
              const latestNotification = snapshot.docs[0].data();
              
              // Check if user has already received this notification
              const userNotificationsRef = collection(db, 'userNotifications');
              const userNotificationQuery = query(
                userNotificationsRef,
                where('userId', '==', userToken),
                where('notificationId', '==', snapshot.docs[0].id)
              );
              
              const userNotificationSnapshot = await getDocs(userNotificationQuery);
              
              // Only show notification if user hasn't received it yet
              if (userNotificationSnapshot.empty) {
                setNotificationMessage(latestNotification.message || 'Nova notificação');
                setNotificationType(latestNotification.type || 'info');
                showNotification(latestNotification.message, latestNotification.type);
                
                // Mark notification as delivered for this user
                await addDoc(userNotificationsRef, {
                  userId: userToken,
                  notificationId: snapshot.docs[0].id,
                  delivered: true,
                  deliveredAt: serverTimestamp()
                });
                
                // Enviar notificação local se o app estiver em segundo plano
                if (latestNotification.sendPush) {
                  sendLocalNotification(
                    latestNotification.title || 'Nova notificação',
                    latestNotification.message,
                    { 
                      type: latestNotification.type,
                      screen: latestNotification.screen || 'credito' 
                    }
                  );
                }
              }
            }
          };

          // Update unread count synchronously
          setUnreadNotifications(count);
          setShowNotificationBadge(count > 0);
          
          // Handle notification delivery asynchronously
          handleNotification();
        });

        // Listen for global notifications
        unsubscribeGlobalNotifications = onSnapshot(globalNotificationsQuery, async (snapshot) => {
          const count = snapshot.size;
          
          // Handle notification check and delivery
          const handleNotification = async () => {
            if (count > 0 && snapshot.docs.length > 0) {
              const latestNotification = snapshot.docs[0].data();
              
              // Check if user has already received this notification
              const userNotificationsRef = collection(db, 'userNotifications');
              const userNotificationQuery = query(
                userNotificationsRef,
                where('userId', '==', userToken),
                where('notificationId', '==', snapshot.docs[0].id)
              );
              
              const userNotificationSnapshot = await getDocs(userNotificationQuery);
              
              // Only show notification if user hasn't received it yet
              if (userNotificationSnapshot.empty) {
                setNotificationMessage(latestNotification.message || 'Nova notificação global');
                setNotificationType(latestNotification.type || 'info');
                showNotification(latestNotification.message, latestNotification.type);
                
                // Mark notification as delivered for this user
                await addDoc(userNotificationsRef, {
                  userId: userToken,
                  notificationId: snapshot.docs[0].id,
                  delivered: true,
                  deliveredAt: serverTimestamp()
                });
                
                // Enviar notificação local se o app estiver em segundo plano
                if (latestNotification.sendPush) {
                  sendLocalNotification(
                    latestNotification.title || 'Nova notificação global',
                    latestNotification.message,
                    { 
                      type: latestNotification.type,
                      screen: latestNotification.screen || 'credito' 
                    }
                  );
                }
              }
            }
          };

          // Update unread count synchronously
          setUnreadNotifications(prevCount => prevCount + count);
          setShowNotificationBadge(count > 0);
          
          // Handle notification delivery asynchronously
          handleNotification();
        });

        // Verificar periodicamente se há novas notificações não entregues
        checkNotificationsInterval = setInterval(async () => {
          try {
            // Buscar notificações globais não entregues
            const undeliveredNotificationsQuery = query(
              globalNotificationsRef,
              where('userId', '==', null),
              where('delivered', '==', false)
            );
            
            const undeliveredSnapshot = await getDocs(undeliveredNotificationsQuery);
            
            if (!undeliveredSnapshot.empty) {
              // Para cada notificação não entregue
              for (const doc of undeliveredSnapshot.docs) {
                const notification = doc.data();
                
                // Verificar se o usuário já visualizou esta notificação
                const userNotificationsRef = collection(db, 'userNotifications');
                const userNotificationQuery = query(
                  userNotificationsRef,
                  where('userId', '==', userToken),
                  where('notificationId', '==', doc.id)
                );
                
                const userNotificationSnapshot = await getDocs(userNotificationQuery);
                
                // Se o usuário ainda não visualizou a notificação
                if (userNotificationSnapshot.empty) {
                  // Enviar notificação local
                  await sendLocalNotification(
                    notification.title || 'Nova notificação',
                    notification.body,
                    { 
                      type: notification.data?.type || 'info',
                      screen: notification.data?.screen || 'credito',
                      notificationId: doc.id
                    }
                  );
                  
                  // Marcar como entregue para este usuário
                  await addDoc(userNotificationsRef, {
                    userId: userToken,
                    notificationId: doc.id,
                    delivered: true,
                    deliveredAt: serverTimestamp()
                  });
                }
              }
            }
          } catch (error) {
            console.error('Erro ao verificar notificações não entregues:', error);
          }
        }, 60000); // Verificar a cada minuto

        // Marcar como inicializado
        setIsInitialized(true);

      } catch (error) {
        console.error('Erro ao configurar listeners:', error);
        setError('Erro ao configurar conexões. Usando dados locais.');
        setLoading(false);
      }
    };

    // Adicionar um pequeno atraso para garantir que o token esteja disponível
    const timer = setTimeout(() => {
      setupNotificationListeners();
    }, 500);
    
    // Cleanup function
    return () => {
      console.log('Removendo todos os listeners');
      clearTimeout(timer);
      if (unsubscribeUserNotifications) unsubscribeUserNotifications();
      if (unsubscribeGlobalNotifications) unsubscribeGlobalNotifications();
      if (checkNotificationsInterval) clearInterval(checkNotificationsInterval);
    };
  }, [expoPushToken]);

  // Function to show notification
  const showNotification = (message: string, type: string) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setNotificationVisible(true);
    
    // Animate the notification
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(5000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotificationVisible(false);
    });
  };

  // Use useFocusEffect to reload data whenever any tab is focused
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        // Sync with Firebase to get the latest data
        await syncWithFirebase();
      };
      loadData();
    }, [])
  );

  // Function to navigate to notifications screen
  const navigateToNotifications = () => {
    // Reset notification badge
    setShowNotificationBadge(false);
    // Navigate to notifications screen
    // You'll need to implement this navigation based on your app's structure
  };

  return (
    <>
      {/* Notification Banner */}
      {notificationVisible && (
        <Animated.View 
          style={[
            styles.notificationBanner,
            { 
              opacity: fadeAnim,
              backgroundColor: notificationType === 'success' 
                ? Colors[currentTheme].success 
                : notificationType === 'error' 
                  ? Colors[currentTheme].error 
                  : notificationType === 'warning' 
                    ? Colors[currentTheme].warning 
                    : Colors[currentTheme].primary
            }
          ]}
        >
          <View style={styles.notificationContent}>
            <Ionicons 
              name={
                notificationType === 'success' ? 'checkmark-circle' : 
                notificationType === 'error' ? 'alert-circle' : 
                notificationType === 'warning' ? 'warning' : 'information-circle'
              } 
              size={24} 
              color="#FFFFFF" 
            />
            <Text style={styles.notificationText}>{notificationMessage}</Text>
          </View>
          <TouchableOpacity onPress={() => setNotificationVisible(false)}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[currentTheme].textLight,
          tabBarInactiveTintColor: Colors[currentTheme].cardBackground,
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            height: Platform.OS === 'ios' ? 90 : 70,
            paddingBottom: Platform.OS === 'ios' ? 20 : 10,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          },
          tabBarBackground: () => (
            <LinearGradient
              colors={[Colors[currentTheme].gradientStart, Colors[currentTheme].gradientEnd]}
              style={StyleSheet.absoluteFill}
            />
          ),
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Início',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => (
                <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="credito"
          options={{
            title: 'Crédito',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="card" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Admin',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="shield" size={size} color={color} />
            ),
            href: isAdmin ? undefined : null,
          }}
        />
      </Tabs>
    </>
  );
}

// Função para registrar o dispositivo para notificações
async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Falha ao obter permissão para notificações!');
    return;
  }

  return 'local-notifications-enabled';
}

// Função para enviar notificação local
async function sendLocalNotification(title: string, body: string, data: any = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null,
    });
    console.log('Notificação local enviada com sucesso');
  } catch (error) {
    console.error('Erro ao enviar notificação local:', error);
  }
}

export default function TabLayout() {
  return <TabLayoutContent />;
}

const styles = StyleSheet.create({
  notificationBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    display : 'none'
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationText: {
    color: '#FFFFFF',
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
