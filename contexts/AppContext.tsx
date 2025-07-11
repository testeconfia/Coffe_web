import { db } from '@/config/firebase';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '@/services/NotificationService';
import { coffeeAlert } from '@/utils/coffeeAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { collection, doc, getDoc, limit, onSnapshot, query, Unsubscribe, updateDoc, where } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

interface SystemSettings {
  dailyCoffeeLimit: number;
  minTimeBetweenCoffees: number;
  subscriptionPrices: {
    monthly: number;
  };
  maintenanceMode: boolean;
  welcomeMessage: string;
  serverUrl: string;
  pixKey: string;
  appVersion: string;
  minAppVersion: string;
  [key: string]: any;
}

interface AppContextData {
  isAdmin: boolean;
  userName: string;
  userCredit: number;
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
  syncWithFirebase: () => Promise<void>;
  notificationsCount: number;
  systemSettings: SystemSettings;
  loadSystemSettings: () => Promise<Unsubscribe | undefined>;
  isConnected: boolean;
  checkConnection: () => Promise<void>;
  checkAppVersion: () => Promise<boolean>;
}

const AppContext = createContext<AppContextData>({} as AppContextData);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState('');
  const [userCredit, setUserCredit] = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({

    dailyCoffeeLimit: 5,
    minTimeBetweenCoffees: 30,
    subscriptionPrices: {
      monthly: 29.90,
    },
    maintenanceMode: false,
    welcomeMessage: 'Bem-vindo ao nosso sistema de café!',
    serverUrl: 'https://44e2-168-228-94-157.ngrok-free.app',
    pixKey: '+5566999086599',
    webhookUrl: 'https://6687-168-228-93-241.ngrok-free.app',
    appVersion: Constants.expoConfig?.version || '1.0.0',
    minAppVersion: '1.0.0',
  });
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Setup listener for unread notifications from Firestore
    const setupNotificationsListener = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        if (!userToken) return;

        const avisosRef = collection(db, 'avisos');
        const q = query(avisosRef, where('read', '==', false));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          setNotificationsCount(snapshot.size);
        }, (error) => {
          console.error('Error listening to notifications:', error);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up notifications listener:', error);
      }
    };

    setupNotificationsListener();
  }, []);

  // Registrar para notificações push
  useEffect(() => {
    const registerForPushNotifications = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        if (userToken) {
          await registerForPushNotificationsAsync();
        }
      } catch (error) {
        console.error('Error registering for push notifications:', error);
      }
    };

    registerForPushNotifications();
  }, []);

  // Configurar listeners de notificação
  useEffect(() => {
    const notificationListeners = setupNotificationListeners();
    
    return () => {
      notificationListeners.removeForegroundSubscription();
      notificationListeners.removeResponseSubscription();
    };
  }, []);

  // Carregar configurações do sistema
  const loadSystemSettings = async () => {
    try {
      // Primeiro, tentar carregar do AsyncStorage
      const savedSettings = await AsyncStorage.getItem('systemSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSystemSettings(parsedSettings);
      }

      // Configurar listener em tempo real para as configurações
      const settingsQuery = query(collection(db, 'settings'), limit(1));
      const unsubscribe = onSnapshot(settingsQuery, async (snapshot) => {
        if (!snapshot.empty) {
          const settingsData = snapshot.docs[0].data() as SystemSettings;
          setSystemSettings(settingsData);
          
          // Salvar no AsyncStorage
          await AsyncStorage.setItem('systemSettings', JSON.stringify(settingsData));

          // Verificar versão do app após carregar as configurações
          await checkAppVersion();
        }
      }, (error) => {
        console.error('Erro ao carregar configurações do sistema:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Erro ao carregar configurações do sistema:', error);
    }
  };

  // Carregar configurações do sistema ao iniciar
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupSettings = async () => {
      const cleanup = await loadSystemSettings();
      if (cleanup) {
        unsubscribe = cleanup;
      }
    };

    setupSettings();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const syncWithFirebase = async () => {
    try {
      // Buscar o ID do usuário no AsyncStorage
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (userToken && typeof userToken === 'string') {
        checkAdminDevice();
        const userDoc = await getDoc(doc(db, 'users', userToken));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Atualiza o estado local
          setIsAdmin(userData.isAdmin || false);
          setUserName(userData.userName || '');
          setUserCredit(userData.userCredit || 0);
          setSubscriptionStatus(userData.subscriptionStatus || 'inactive');
          
          // Tratar o subscriptionEndDate corretamente
          let endDateString = null;
          if (userData.subscriptionEndDate) {
            // Se for um Timestamp do Firestore, converter para string ISO
            if (userData.subscriptionEndDate.toDate) {
              endDateString = userData.subscriptionEndDate.toDate().toISOString();
            } else {
              // Se já for uma string, usar diretamente
              endDateString = userData.subscriptionEndDate;
            }
          }
          setSubscriptionEndDate(endDateString);

          // Salva no AsyncStorage
          await AsyncStorage.setItem('isAdmin', String(userData.isAdmin || false));
          await AsyncStorage.setItem('userName', userData.userName || '');
          await AsyncStorage.setItem('userCredit', String(userData.userCredit || 0));
          await AsyncStorage.setItem('subscriptionStatus', userData.subscriptionStatus || 'inactive');
          await AsyncStorage.setItem('subscriptionEndDate', endDateString || '');
        }
      }
    } catch (error) {
      console.log('Erro ao sincronizar com Firebase:', error);
      coffeeAlert('Não foi possível sincronizar os dados. Verifique sua conexão com a internet e tente novamente.','error');
    }
  };

  // Sincronizar com Firebase em um useEffect separado
  useEffect(() => {
    const initializeData = async () => {
      try {
        await syncWithFirebase();
      } catch (error) {
        console.error('Erro na inicialização dos dados:', error);
      }
    };
    
    initializeData();
  }, []);

  const checkConnection = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) return;

      const userDoc = await getDoc(doc(db, 'users', userToken));
      setIsConnected(true);
    } catch (error) {
      console.log('Erro de conexão:', error);
      coffeeAlert('Não foi possível conectar ao banco de dados. Verifique sua conexão com a internet e tente novamente.','error');
      setIsConnected(false);
    }
  };

  // Adicionar listener para mudanças de conexão
  useEffect(() => {
    const interval = setInterval(checkConnection, 10000); // Verifica a cada 10 segundos
    return () => clearInterval(interval);
  }, []);

  const checkAdminDevice = () => {
    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const tokens = await AsyncStorage.getItem('userToken');
        if (!tokens) return;

        // Obter informações do dispositivo
        const deviceName = Device.deviceName;
        const deviceModel = Device.modelName;
        const deviceBrand = Device.brand;
        const deviceOS = Device.osName;
        const deviceOSVersion = Device.osVersion;
        
        // Criar um identificador único baseado nas informações do dispositivo
        const deviceIdentifier = `${deviceBrand}-${deviceModel}-${deviceOS}-${deviceOSVersion}`;
        
        // ID do dispositivo do administrador
        const ADMIN_DEVICE_IDENTIFIER = 'samsung-SM-A546E-samsung/a54xnsxx/a54x:14/UP1A.231005.007/A546EXXU9CXH4:user/release-keys-14';
        
        // Configurar listener em tempo real para as configurações
        const settingsQuery = query(collection(db, 'settings'), limit(1));
        unsubscribe = onSnapshot(settingsQuery, async (snapshot) => {
          if (!snapshot.empty) {
            const settingsData = snapshot.docs[0].data();
            const superAdmins = settingsData.superAdmins || [];
            const isSuperAdminFromSettings = tokens ? superAdmins.includes(tokens) : false;
            
            // Verificar se este é o dispositivo do administrador ou se está na lista de super admins
            if (deviceIdentifier === ADMIN_DEVICE_IDENTIFIER || isSuperAdminFromSettings) {
              await AsyncStorage.setItem('isSuperAdmin', 'true');
              if (deviceIdentifier === ADMIN_DEVICE_IDENTIFIER) {
                if (tokens && typeof tokens === 'string') {
                  const userRef = doc(db, 'users', tokens);
                  await updateDoc(userRef, {
                    isAdmin: true
                  });
                }
              }
            } else {
              await AsyncStorage.setItem('isSuperAdmin', 'false');
            }
          }
        }, (error) => {
          console.log('Erro ao verificar dispositivo de administrador:', error);
        });
      } catch (error) {
        console.log('Erro ao verificar dispositivo de administrador:', error);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  };

  useEffect(() => {
    const cleanup = checkAdminDevice();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const checkAppVersion = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return true;
    try {
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      const settingsDoc = await getDoc(doc(db, 'settings','Um2M0ZVZ9CBbkoWKhYHR'));
      const minVersion = settingsDoc.data()?.minAppVersion || '1.0.0';
      if (!minVersion) return true;
      
      const compareVersions = (v1: string, v2: string): number => {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
          const num1 = parts1[i] || 0;
          const num2 = parts2[i] || 0;
          
          if (num1 > num2) return 1;
          if (num1 < num2) return -1;
        }

        return 0;
      };
      
      const needsUpdate = compareVersions(currentVersion, minVersion) < 0;
      
      if (needsUpdate) {
        coffeeAlert(
          'Uma nova versão do aplicativo está disponível. Por favor, atualize para continuar usando.',
          'warning',
          [
            {
              text: 'OK',
              onPress: () => {
                router.push('/acesso');
                Linking.openURL('https://cafezaodacomputacao.netlify.app');
              }
            }
          ]
        );
      }

      return !needsUpdate;
    } catch (error) {
      console.error('Erro ao verificar versão do app:', error);
      return true;
    }
  };

  return (
    <AppContext.Provider
      value={{
        isAdmin,
        userName,
        userCredit,
        subscriptionStatus,
        subscriptionEndDate,
        syncWithFirebase,
        notificationsCount,
        systemSettings,
        loadSystemSettings,
        isConnected,
        checkConnection,
        checkAppVersion
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
} 