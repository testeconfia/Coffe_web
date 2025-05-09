import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/config/firebase';
import { collection, doc, getDoc, updateDoc, query, where, onSnapshot, limit, getDocs } from 'firebase/firestore';
import * as Device from 'expo-device';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '@/services/NotificationService';
import { Alert } from 'react-native';

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
  loadSystemSettings: () => Promise<void>;
  isConnected: boolean;
  checkConnection: () => Promise<void>;
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
    pixKey: '+5566999086599'
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
  const loadSystemSettings = () => {
    try {
      // Primeiro, tentar carregar do AsyncStorage
      AsyncStorage.getItem('systemSettings').then(savedSettings => {
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setSystemSettings(parsedSettings);
          console.log('Configurações do sistema carregadas do AsyncStorage');
        }
      });

      // Configurar listener em tempo real para as configurações
      const settingsQuery = query(collection(db, 'settings'), limit(1));
      const unsubscribe = onSnapshot(settingsQuery, async (snapshot) => {
        if (!snapshot.empty) {
          const settingsData = snapshot.docs[0].data() as SystemSettings;
          setSystemSettings(settingsData);
          
          // Salvar no AsyncStorage
          await AsyncStorage.setItem('systemSettings', JSON.stringify(settingsData));
          console.log('Configurações do sistema atualizadas do Firestore e salvas no AsyncStorage');
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
    const cleanup = loadSystemSettings();
    return () => {
      if (cleanup) cleanup();
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
          console.log('Dados sincronizados com sucesso do Firebase');
        }
      }
    } catch (error) {
      console.log('Erro ao sincronizar com Firebase:', error);
      Alert.alert(
        'Erro de Sincronização',
        'Não foi possível sincronizar os dados. Verifique sua conexão com a internet e tente novamente.'
      );
    }
  };

  useEffect(() => {
    // Depois sincroniza com o Firebase
    syncWithFirebase();
  }, []);

  const checkConnection = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) return;

      const userDoc = await getDoc(doc(db, 'users', userToken));
      setIsConnected(true);
    } catch (error) {
      console.log('Erro de conexão:', error);
      Alert.alert(
        'Erro de Conexão',
        'Não foi possível conectar ao banco de dados. Verifique sua conexão com a internet e tente novamente.'
      );
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
        console.log('Identificador do dispositivo:', deviceIdentifier);
        
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
              console.log('Este é um dispositivo de super administrador');
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
              console.log('Este não é um dispositivo de super administrador');
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
        loadSystemSettings: () => Promise.resolve(),
        isConnected,
        checkConnection
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