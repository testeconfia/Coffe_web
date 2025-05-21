import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Linking,
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { db, auth } from '@/config/firebase';
import { collection, doc, getDoc, onSnapshot, addDoc, serverTimestamp, query, where, getDocs, updateDoc, orderBy, limit } from 'firebase/firestore';
import UpdateIndicator from '@/components/UpdateIndicator';
import FirestoreUpdateIndicator from '@/components/FirestoreUpdateIndicator';
import MaskedView from '@react-native-masked-view/masked-view';
import StatisticsButton from '@/components/StatisticsButton';
import { Colors, ThemeType } from '@/constants/Colors';
import { coffeeAlert } from '@/utils/coffeeAlert';

//const BASE_URL = 'http://192.168.238.18';
//const BASE_URL = 'https://44e2-168-228-94-157.ngrok-free.app';
const { width, height } = Dimensions.get('window');

interface CoffeeStats {
  today: number;
  total: number;
  lastCoffee: Date | null;
}

interface SystemSettings {
  dailyCoffeeLimit: number;
  minTimeBetweenCoffees: number;
  subscriptionPrices: {
    monthly: number;
    quarterly: number;
    yearly: number;
  };
  maintenanceMode: boolean;
  welcomeMessage: string;
  serverUrl: string;
  pixKey: string;
  [key: string]: any;
}

export default function HomeScreen() {
  const { 
    userName, 
    subscriptionStatus, 
    subscriptionEndDate, 
    syncWithFirebase,
    isConnected,
    checkConnection 
  } = useApp();
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('default');
  const systemColorScheme = useColorScheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState<'1/4' | '2/4' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [dailyTip, setDailyTip] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [refreshing, setRefreshing] = useState(false);
  const [sequence, setSequence] = useState<number[]>([]);
  const [inputSequence, setInputSequence] = useState('');
  const [subscriptionData, setSubscriptionData] = useState({
    status: 'inactive',
    endDate: null as string | null,
  });
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [countdown, setCountdown] = useState(60);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [coffeeStats, setCoffeeStats] = useState<CoffeeStats>({
    today: 0,
    total: 0,
    lastCoffee: null
  });
  const [recentCoffees, setRecentCoffees] = useState<any[]>([]);
  const [isAdminDevice, setIsAdminDevice] = useState(false);
  const [statsLayout, setStatsLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    dailyCoffeeLimit: 5,
    minTimeBetweenCoffees: 30,
    subscriptionPrices: {
      monthly: 29.90,
      quarterly: 79.90,
      yearly: 299.90,
    },
    maintenanceMode: false,
    welcomeMessage: 'Bem-vindo ao nosso sistema de café!',
    serverUrl: 'https://44e2-168-228-94-157.ngrok-free.app',
    pixKey: '+5566999086599'
  });

  useEffect(() => {
    loadUserData();
    loadSubscriptionData();
    loadCoffeeStats();
    loadRecentCoffees();
    setGreetingText();
    setRandomTip();
    startAnimation();
    checkAuthStatus();
    atualiza_tudo();
    loadSystemSettings();
    // Configurar listeners do Firestore para atualizações automáticas
    setupFirestoreListeners();
    
    // Limpar listeners quando o componente for desmontado
    return () => {
      // Os listeners serão limpos automaticamente quando o componente for desmontado
    };
  }, []);
  
  // Reload data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        atualiza_tudo();
        const followSystem = await AsyncStorage.getItem('followSystemTheme');
        if (followSystem === 'true') {
          setCurrentTheme(systemColorScheme as ThemeType || 'default');
        }
        console.log('Home screen focused, refreshing data...');
        refreshAllData();
      };
      loadData();
    }, [])
  );
  
  const atualiza_tudo = async () => {
    await syncWithFirebase();
    const isdev = await AsyncStorage.getItem('isSuperAdmin');
    console.log('isdev', isdev);
    if (isdev === 'true') {
      setIsAdminDevice(true);
    } else {
      setIsAdminDevice(false);
    }
    await refreshSubscriptionData();
    const theme = await AsyncStorage.getItem('selectedTheme');
    const followSystem = await AsyncStorage.getItem('followSystemTheme');
    if (followSystem === 'true') {
      setCurrentTheme(systemColorScheme as ThemeType || 'default');
    } else {
      setCurrentTheme(theme as ThemeType || 'default');
    }
    loadUserData();
    loadSubscriptionData();
    //setGreetingText();
    //setRandomTip();
  }
  
  // Função para verificar se o usuário está logado
  const checkAuthStatus = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const userName = await AsyncStorage.getItem('userName');
      const subscriptionStatus = await AsyncStorage.getItem('subscriptionStatus');
      if (!userToken || !subscriptionStatus) {
        router.replace('/acesso');
        return false;
      }
      if (!userName){
        coffeeAlert('Poderia me informar seu nome? \n Vá em "Perfil" e informe seu nome.', 'info');
      }
      return true;
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      return false;
    }
  };

  const startAnimation = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const loadUserData = async () => {
    try {
      if (!auth.currentUser) {
        console.log('No user logged in, cannot load user data');
        return;
      }
      
      console.log('User data loaded from AppContext');
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Função para carregar dados da assinatura do contexto
  const loadSubscriptionData = async () => {
    const subscriptionStatus = await AsyncStorage.getItem('subscriptionStatus');
    const subscriptionEndDate = await AsyncStorage.getItem('subscriptionEndDate');
    try {
      setSubscriptionData({
        status: subscriptionStatus || 'inactive',
        endDate: subscriptionEndDate,
      });
    } catch (error) {
      console.error('Error loading subscription data:', error);
    }
  };

  // Função para atualizar dados da assinatura diretamente do Firestore
  const refreshSubscriptionData = async () => {
    setIsSubscriptionLoading(true);
    try {
      if (!auth.currentUser) {
        console.log('No user logged in, cannot refresh subscription data');
        setIsSubscriptionLoading(false);
        return;
      }

      // Depois, buscar dados diretamente do Firestore para garantir
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const newStatus = userData.subscriptionStatus || 'inactive';
        const newEndDate = userData.subscriptionEndDate || null;
        
        console.log('Subscription data refreshed from Firestore:', { status: newStatus, endDate: newEndDate });
        
        setSubscriptionData({
          status: newStatus,
          endDate: newEndDate,
        });
      }
    } catch (error) {
      console.error('Error refreshing subscription data:', error);
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

  // Função para verificar se este é o dispositivo do administrador
  

  // Função para atualizar todos os dados da tela
  const refreshAllData = async () => {
    try {
      // Atualizar dados do contexto
      await syncWithFirebase();
      
      // Atualizar dados da assinatura
      await refreshSubscriptionData();
      
      // Atualizar cafés recentes
      await loadRecentCoffees();
      
      
      // Atualizar saudação e dica do dia
      //setGreetingText();
      //setRandomTip();
      
      // Reiniciar animação
      //fadeAnim.setValue(0);
      //startAnimation();
      
      console.log('All data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing all data:', error);
    }
  };

  // Função para lidar com o pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAllData();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const setGreetingText = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  };

  const setRandomTip = () => {
    const tips = [
      "Um café bem passado é a melhor maneira de começar o dia!",
      "Experimente diferentes tipos de grãos para descobrir seu favorito.",
      "O café é melhor apreciado quando compartilhado com amigos.",
      "Um café gelado é perfeito para os dias mais quentes.",
      "O café espresso é a base para muitas bebidas deliciosas.",
      "Adicionar um pouco de canela ao café traz um sabor especial.",
      "O café é rico em antioxidantes e pode trazer benefícios à saúde.",
      "Um café após o almoço ajuda a manter a energia durante a tarde.",
    ];
    
    const randomIndex = Math.floor(Math.random() * tips.length);
    setDailyTip(tips[randomIndex]);
  };

  const handleNewCoffee = async () => {
    setIsLoading(true);
    syncWithFirebase();
    // Verificar se o usuário está logado antes de abrir o modal
    const isAuthenticated = await checkAuthStatus();
    if (!isAuthenticated) return;
    const status = await AsyncStorage.getItem('subscriptionStatus');
    if (status != 'active') {
      coffeeAlert('Verifique sua assinatura e tente novamente', 'error');
      return;
    }
    console.log('Gerando sequência...');
    console.log('systemSettings.serverUrl', systemSettings.serverUrl);
    try {
      const response = await fetch(`${systemSettings.serverUrl}/generate-sequence`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': window.location.origin,
          'Access-Control-Allow-Origin': '*',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36',
          'ngrok-skip-browser-warning': '69420'    
        },
        mode: 'cors',
        credentials: 'omit'
      });

      console.log('response', response);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Erro ao gerar sequência.' }));
        coffeeAlert(
          `${errorData.detail || 'Erro ao gerar sequência.'}\n\nQue tal jogar um dos nossos mini-games enquanto espera a máquina ser liberada?`,
          'warning',
          [
            {
              text: 'Não, obrigado',
              style: 'cancel',
              onPress: () => {}
            },
            {
              text: 'Vamos jogar!',
              onPress: () => router.push('/jogos')
            }
          ]
        );
        setIsModalVisible(false);
        setIsLoading(false);
        return;
      }
      const data = await response.json();
      console.log('Sequência gerada:', data.sequence);
      
      // Verificar se data.sequence existe e é um array antes de usar join
      if (data.sequence) {
        setSequence(data.sequence);
      } else {
        console.log('Sequência inválida recebida:', data);
        coffeeAlert('A sequência gerada não está no formato esperado.', 'error');
      }
      setIsModalVisible(true);
      setIsLoading(false);
      // Iniciar o contador regressivo quando o modal for aberto
      setCountdown(60);
      startCountdown();
    } catch (error) {
      setIsModalVisible(false);
      console.log('Erro no generateSequence:', error);
      coffeeAlert('Verifique se a cafeteira esta ligada. \nCaso nao estiver ligada chame o monitor...\nLembre-se que voce deve estar conectado ao wifi "Hard_Lab"', 'error');
      setIsLoading(false);
    } 
  };

  // Função para iniciar o contador regressivo
  const startCountdown = () => {
    // Limpar qualquer contador existente
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    
    // Iniciar um novo contador
    countdownRef.current = setInterval(() => {
      setCountdown(prevCount => {
        if (prevCount <= 1) {
          // Quando o contador chegar a zero, fechar o modal
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
          }
          setIsModalVisible(false);
          coffeeAlert('O tempo para inserir o código expirou. Tente novamente.','warning');
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);
  };

  // Limpar o contador quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const handleConfirmCode = async () => {
    if (confirmationCode.length < 4) {
      coffeeAlert('Por favor, insira um código válido.(4 dígitos)','warning');
      return;
    }
    const tokens = await AsyncStorage.getItem('userToken');
    if (!tokens) {
      coffeeAlert('Usuário não autenticado','error');
      return;
    }
    if (!selectedQuantity) {
      coffeeAlert('Por favor, selecione a quantidade de café desejada.','warning');
      return;
    }
    console.log(confirmationCode, selectedQuantity);
    setIsLoading(true);
    try {
      if (confirmationCode.trim() === '') {
        coffeeAlert('Informe a sequência para validação.','warning');
        return;
      }
      
      const response = await fetch(`${systemSettings.serverUrl}/validate-sequence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': window.location.origin,
          'Access-Control-Allow-Origin': '*',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36',
          'ngrok-skip-browser-warning': '69420'    
        },
        mode: 'cors',
        body: JSON.stringify({ sequence: confirmationCode, quantity: selectedQuantity })
      });

      const result = await response.json();

      if (response.ok) {
        // Salvar o café no Firestore
        await addDoc(collection(db, 'coffees'), {
          userId: tokens,
          userName: userName,
          quantity: selectedQuantity,
          createdAt: serverTimestamp(),
          status: 'completed'
        });

        // Atualizar os dados do usuário no Firestore
        const userRef = doc(db, 'users', tokens);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Buscar cafés de hoje
          const todayQuery = query(
            collection(db, 'coffees'),
            where('userId', '==', tokens),
            where('createdAt', '>=', today)
          );
          
          // Buscar total de cafés
          const totalQuery = query(
            collection(db, 'coffees'),
            where('userId', '==', tokens)
          );
          
          const [todaySnapshot, totalSnapshot] = await Promise.all([
            getDocs(todayQuery),
            getDocs(totalQuery)
          ]);
          
          // Atualizar os dados do usuário
          await updateDoc(userRef, {
            coffeesToday: todaySnapshot.size,
            totalCoffees: totalSnapshot.size,
            lastCoffeeAt: serverTimestamp()
          });
          loadCoffeeStats();
          // Atualizar o contexto local
          await syncWithFirebase();
        }

        const message = typeof result.message === 'string' ? result.message : 'Operação realizada com sucesso';
        coffeeAlert(message, 'success');
        setSequence([]);          // limpa a sequência gerada
        setInputSequence('');       // limpa a entrada do usuário
        await syncWithFirebase();
        coffeeAlert('Código confirmado! Seu café ja ta saindo ... Lembre de por um copo para receber. (Aguarde alguns instantes)', 'success');
        setIsModalVisible(false);
        setConfirmationCode('');
        setSelectedQuantity(null);
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }
      } else {
        setConfirmationCode('');
        const errorMessage = typeof result.detail === 'string' ? result.detail : 'Erro ao validar a sequência';
        coffeeAlert('Código inválido', 'error');
        setIsModalVisible(false);
      }
    } catch (error) {
      console.error('Erro no validateSequence:', error);
      coffeeAlert('Não foi possível validar a sequência.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToCredit = async () => {
    console.log('systemSettings.pixKey', systemSettings.pixKey);
    router.push({
      pathname: '/telas_extras/pagamento',
      params: { 
        valor: '20.00', 
        chave_pix: systemSettings.pixKey 
      }
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const isSubscriptionExpired = () => {
    if (subscriptionData.status !== 'active' || !subscriptionData.endDate) return true;
    
    const endDate = new Date(subscriptionData.endDate);
    const today = new Date();
    
    return endDate < today;
  };

  // Função para configurar os listeners do Firestore
  const setupFirestoreListeners = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) return;
      
      console.log('Configurando listeners do Firestore para atualizações automáticas na tela inicial');
      
      // Listener para dados do usuário
      const userDocRef = doc(db, 'users', userToken);
      const unsubscribeUser = onSnapshot(userDocRef, async (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          
          // Verificar se o usuário tem dados de assinatura
          const hasSubscription = data.subscriptionStatus && data.subscriptionEndDate;
          
          // Verificar se a data de término é anterior à data atual
          if (hasSubscription && data.subscriptionEndDate.toDate() < new Date() && data.subscriptionStatus === 'active') {
            // Atualizar o status da assinatura para inativo
            await updateDoc(userDocRef, {
              subscriptionStatus: 'inactive'
            });
          }
          
          console.log('Dados do usuário atualizados no Firestore (tela inicial)');
          handleUpdate();
        }
      }, (error) => {
        console.error('Erro no listener de dados do usuário:', error);
      });
      
      // Listener para notificações do usuário
      const userNotificationsRef = doc(db, 'notifications', userToken);
      const unsubscribeNotifications = onSnapshot(userNotificationsRef, (doc) => {
        if (doc.exists()) {
          console.log('Notificações do usuário atualizadas no Firestore (tela inicial)');
          handleUpdate();
        }
      }, (error) => {
        console.error('Erro no listener de notificações do usuário:', error);
      });
      
      // Listener para notificações globais
      const globalNotificationsRef = doc(db, 'globalNotifications', 'global');
      const unsubscribeGlobal = onSnapshot(globalNotificationsRef, (doc) => {
        if (doc.exists()) {
          console.log('Notificações globais atualizadas no Firestore (tela inicial)');
          handleUpdate();
        }
      }, (error) => {
        console.error('Erro no listener de notificações globais:', error);
      });
      
      // Listener para configurações do sistema
      const settingsQuery = query(collection(db, 'settings'), limit(1));
      const unsubscribeSettings = onSnapshot(settingsQuery, (snapshot) => {
        if (!snapshot.empty) {
          console.log('Configurações do sistema atualizadas no Firestore (tela inicial)');
          const settingsData = snapshot.docs[0].data() as SystemSettings;
          setSystemSettings(settingsData);
        }
      }, (error) => {
        console.error('Erro no listener de configurações do sistema:', error);
      });
      
      // Armazenar as funções de limpeza para serem chamadas quando o componente for desmontado
      return () => {
        unsubscribeUser();
        unsubscribeNotifications();
        unsubscribeGlobal();
        unsubscribeSettings();
      };
    } catch (error) {
      console.error('Erro ao configurar listeners do Firestore:', error);
    }
  };

  // Função para lidar com atualizações
  const handleUpdate = () => {
    setLastUpdateTime(new Date());
    setUpdateCount(prev => prev + 1);
    atualiza_tudo();
  };

  const loadCoffeeStats = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Buscar cafés de hoje
      const todayQuery = query(
        collection(db, 'coffees'),
        where('userId', '==', userToken),
        where('createdAt', '>=', today)
      );

      // Buscar todos os cafés
      const totalQuery = query(
        collection(db, 'coffees'),
        where('userId', '==', userToken)
      );

      try {
        const [todaySnapshot, totalSnapshot] = await Promise.all([
          getDocs(todayQuery),
          getDocs(totalQuery)
        ]);

        // Buscar último café
        const lastCoffeeQuery = query(
          collection(db, 'coffees'),
          where('userId', '==', userToken)
        );
        const lastCoffeeSnapshot = await getDocs(lastCoffeeQuery);
        const lastCoffee = lastCoffeeSnapshot.docs[0]?.data()?.createdAt?.toDate() || null;

        setCoffeeStats({
          today: todaySnapshot.size,
          total: totalSnapshot.size,
          lastCoffee
        });
      } catch (indexError: any) {
        // Verificar se é um erro de índice ausente
        if (indexError.message && indexError.message.includes('requires an index')) {
          //console.warn('Índice composto necessário. Usando método alternativo para carregar estatísticas.');
          
          // Método alternativo: buscar todos os cafés e filtrar localmente
          const allCoffeesQuery = query(
            collection(db, 'coffees'),
            where('userId', '==', userToken)
          );
          
          const allCoffeesSnapshot = await getDocs(allCoffeesQuery);
          const allCoffees = allCoffeesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt
          }));
          
          // Filtrar cafés de hoje localmente
          const todayCoffees = allCoffees.filter(coffee => {
            const coffeeDate = coffee.createdAt?.toDate();
            return coffeeDate && coffeeDate >= today;
          });
          
          // Encontrar o último café
          const lastCoffee = allCoffees.length > 0 
            ? allCoffees[0].createdAt?.toDate() 
            : null;
          
          setCoffeeStats({
            today: todayCoffees.length,
            total: allCoffees.length,
            lastCoffee
          });
          
          // Mostrar alerta para o administrador sobre o índice ausente
          const isAdmin = await AsyncStorage.getItem('isAdmin') === 'true';
          if (isAdmin) {
            coffeeAlert(
              "Aviso para Administrador \n\nUm índice composto é necessário para consultas eficientes. Por favor, crie o índice no console do Firebase.",
              'warning',
              [
                { 
                  text: "Criar Índice", 
                  onPress: () => Linking.openURL(indexError.message.match(/https:\/\/[^\s]+/)?.[0] || 'https://console.firebase.google.com') 
                },
                { text: "OK", onPress: () => {} }
              ]
            );
          }
        } else {
          // Se for outro tipo de erro, propague
          throw indexError;
        }
      }
    } catch (error) {
      console.log('Erro ao carregar estatísticas:', error);
      coffeeAlert(
        'Não foi possível carregar as estatísticas. Verifique sua conexão com a internet e tente novamente.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Função para carregar cafés recentes
  const loadRecentCoffees = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) return;
      
      // Buscar os 5 cafés mais recentes do usuário
      const recentCoffeesQuery = query(
        collection(db, 'coffees'),
        where('userId', '==', userToken),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      
      try {
        const recentCoffeesSnapshot = await getDocs(recentCoffeesQuery);
        const coffees = recentCoffeesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
        
        setRecentCoffees(coffees);
      } catch (indexError: any) {
        // Verificar se é um erro de índice ausente
        if (indexError.message && indexError.message.includes('requires an index')) {
          console.warn('Índice composto necessário. Usando método alternativo para carregar cafés recentes.');
          
          // Método alternativo: buscar todos os cafés e ordenar localmente
          const allCoffeesQuery = query(
            collection(db, 'coffees'),
            where('userId', '==', userToken)
          );
          
          const allCoffeesSnapshot = await getDocs(allCoffeesQuery);
          const allCoffees = allCoffeesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
          }));
          
          // Ordenar por data de criação (mais recente primeiro) e limitar a 5
          const sortedCoffees = allCoffees
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 5);
          
          setRecentCoffees(sortedCoffees);
          
          // Mostrar alerta para o administrador sobre o índice ausente
          const isAdmin = await AsyncStorage.getItem('isAdmin') === 'true';
          if (isAdmin) {
            coffeeAlert(
              "Aviso para Administrador \n\nUm índice composto é necessário para consultas eficientes. Por favor, crie o índice no console do Firebase.",
              'warning',
              [
                { 
                  text: "Criar Índice", 
                  onPress: () => Linking.openURL(indexError.message.match(/https:\/\/[^\s]+/)?.[0] || 'https://console.firebase.google.com') 
                },
                { text: "OK", onPress: () => {} }
              ]
            );
          }
        } else {
          // Se for outro tipo de erro, propague
          throw indexError;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar cafés recentes:', error);
      // Definir um array vazio em caso de erro
      setRecentCoffees([]);
    }
  };

  const renderSubscriptionSection = () => (
    <Animated.View style={[styles.subscriptionContainer, { opacity: fadeAnim, backgroundColor: Colors[currentTheme].cardBackground }]}>
      <View style={styles.subscriptionHeader}>
        <Ionicons name="cafe" size={24} color={Colors[currentTheme].primary} />
        <Text style={[styles.subscriptionTitle, { color: Colors[currentTheme].textLight }]}>Assinatura Cafezão Premium</Text>
      </View>
      
      {isSubscriptionLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors[currentTheme].primary} />
          <Text style={[styles.loadingText, { color: Colors[currentTheme].textLight }]}>Atualizando assinatura...</Text>
        </View>
      ) : subscriptionData.status === 'active' ? (
        <View style={[styles.activeSubscription, { backgroundColor: Colors[currentTheme].activeSubscription }]}>
          <Text style={[styles.activeText, { color: Colors[currentTheme].activeText }]}>Assinatura Ativa</Text>
          <Text style={[styles.endDateText, { color: Colors[currentTheme].endDateText }]}>
            Válido até: {formatDate(subscriptionData.endDate)}
          </Text>
        </View>
      ) : subscriptionData.status === 'avaliando' ? (
        <View style={[styles.evaluatingSubscription, { backgroundColor: Colors[currentTheme].evaluatingSubscription }]}>
          <Text style={[styles.evaluatingText, { color: Colors[currentTheme].evaluatingText }]}>Pagamento em Análise</Text>
          <Text style={[styles.evaluatingDescription, { color: Colors[currentTheme].evaluatingDescription }]}>
            Seu pagamento está sendo verificado. Em breve sua assinatura será ativada.
          </Text>
        </View>
      ) : (
        <View style={[styles.expiredSubscription, { backgroundColor: 'rgba(255, 0, 0, 0.1)' }]}>
          <Text style={[styles.expiredText, { color: Colors[currentTheme].error }]}>
            {subscriptionData.status === 'active' ? 'Assinatura Expirada' : `Assinatura Invalida` }
          </Text>
          <TouchableOpacity
            style={[styles.subscribeButton, { backgroundColor: Colors[currentTheme].subscribeButton }]}
            onPress={navigateToCredit}
          >
            <Text style={[styles.subscribeButtonText, { color: Colors[currentTheme].subscribeButtonText }]}>Assinar</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );

  const renderConfirmationModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isModalVisible}
      onRequestClose={() => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }
        setIsModalVisible(false);
      }}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: Colors[currentTheme].background }]}>
          <Text style={[styles.modalTitle, { color: Colors[currentTheme].textLight }]}>Confirmar Pedido</Text>
          
          <Text style={[styles.modalDescription, { color: Colors[currentTheme].textLight }]}>
            Por favor, insira o código de confirmação e selecione a quantidade de café.
          </Text>
          
          <View style={[styles.countdownContainer, { backgroundColor: Colors[currentTheme].activeSubscription }]}>
            <Text style={[styles.countdownText, { color: Colors[currentTheme].activeText }]}>
              Tempo restante: {countdown} segundos
            </Text>
          </View>

          <TextInput
            style={[styles.codeInput, { 
              backgroundColor: Colors[currentTheme].cardBackground,
              color: Colors[currentTheme].textLight
            }]}
            value={confirmationCode}
            onChangeText={setConfirmationCode}
            placeholder="Código de confirmação"
            placeholderTextColor={Colors[currentTheme].textLight}
            keyboardType="numeric"
            maxLength={4}
            autoFocus
          />

          <Text style={[styles.quantityTitle, { color: Colors[currentTheme].textLight }]}>Selecione a quantidade:</Text>
          <View style={styles.quantityContainer}>
            <TouchableOpacity 
              style={[
                styles.quantityButton,
                { backgroundColor: Colors[currentTheme].cardBackground },
                selectedQuantity === '1/4' && [
                  styles.quantityButtonSelected,
                  { 
                    backgroundColor: Colors[currentTheme].activeSubscription,
                    borderColor: Colors[currentTheme].primary
                  }
                ]
              ]}
              onPress={() => setSelectedQuantity('1/4')}
            >
              <MaskedView
                style={styles.maskedView}
                maskElement={
                  <View style={styles.mask}>
                    <Image
                      source={require('@/assets/imgs/xicara.png')}
                      style={styles.image}
                      resizeMode="contain"
                    />
                  </View>
                }
              >
                <LinearGradient
                  style={styles.gradient}
                  colors={['#fff', '#fff', Colors[currentTheme].primary, Colors[currentTheme].primary]}
                  locations={[0, 0.65, 0.7, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
              </MaskedView>
              <Text style={[
                styles.quantityText,
                { color: Colors[currentTheme].textLight },
                selectedQuantity === '1/4' && [
                  styles.quantityTextSelected,
                  { color: Colors[currentTheme].primary }
                ]
              ]}>1/4 copo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.quantityButton,
                { backgroundColor: Colors[currentTheme].cardBackground },
                selectedQuantity === '2/4' && [
                  styles.quantityButtonSelected,
                  { 
                    backgroundColor: Colors[currentTheme].activeSubscription,
                    borderColor: Colors[currentTheme].primary
                  }
                ]
              ]}
              onPress={() => setSelectedQuantity('2/4')}
            >
              <MaskedView
                style={styles.maskedView}
                maskElement={
                  <View style={styles.mask}>
                    <Image
                      source={require('@/assets/imgs/xicara.png')}
                      style={styles.image}
                      resizeMode="contain"
                    />
                  </View>
                }
              >
                <LinearGradient
                  style={styles.gradient}
                  colors={['#fff', '#fff', Colors[currentTheme].primary, Colors[currentTheme].primary]}
                  locations={[0, 0.55, 0.6, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
              </MaskedView>
              <Text style={[
                styles.quantityText,
                { color: Colors[currentTheme].textLight },
                selectedQuantity === '2/4' && [
                  styles.quantityTextSelected,
                  { color: Colors[currentTheme].primary }
                ]
              ]}>2/4 copo</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton, { backgroundColor: Colors[currentTheme].cardBackground }]} 
              onPress={async () => {
                try {
                  const response = await fetch(`${systemSettings.serverUrl}/cancel-sequence`, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36',
                      'ngrok-skip-browser-warning': '69420'    
                    }
                  });
                  
                  if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Error canceling sequence:', errorData);
                  }
                } catch (error) {
                  console.error('Error sending cancel request:', error);
                } finally {
                  if (countdownRef.current) {
                    clearInterval(countdownRef.current);
                  }
                  setIsModalVisible(false);
                  setConfirmationCode('');
                  setSelectedQuantity(null);
                }
              }}
            >
              <Text style={[styles.modalButtonText, { color: Colors[currentTheme].textLight }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.confirmButton, { backgroundColor: Colors[currentTheme].primary }]} 
              onPress={handleConfirmCode}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={[styles.modalButtonText, { color: Colors[currentTheme].textLight }]}>Verificando...</Text>
              ) : (
                <Text style={[styles.modalButtonText, { color: Colors[currentTheme].textLight }]}>Confirmar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Função para formatar a data relativa
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Agora mesmo';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `Há ${days} ${days === 1 ? 'dia' : 'dias'}`;
    }
  };

  // Função para alternar o layout das estatísticas
  const toggleStatsLayout = () => {
    setStatsLayout(prev => prev === 'horizontal' ? 'vertical' : 'horizontal');
  };

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

  const loadSystemSettings = async () => {
    try {
      const settingsQuery = query(collection(db, 'settings'), limit(1));
      const settingsSnapshot = await getDocs(settingsQuery);
      
      if (!settingsSnapshot.empty) {
        const settingsData = settingsSnapshot.docs[0].data() as SystemSettings;
        setSystemSettings(settingsData);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações do sistema:', error);
    }
  };

  const handleSubscribe = async (amount: number) => {
    try {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      router.push({
        pathname: '/telas_extras/pagamento',
        params: { 
          valor: amount.toString(), 
          chave_pix: systemSettings.pixKey 
        }
      });
      return;
    } catch (error) {
      coffeeAlert('Não foi possível ativar a assinatura. Tente novamente.', 'error');
    }
  };

  useEffect(() => {
    if (!isConnected) {
      coffeeAlert(
        'Erro de Conexão\n\nNão foi possível conectar ao banco de dados. Verifique sua conexão com a internet e tente novamente.',
        'error',
        [
          {
            text: 'Tentar Novamente',
            onPress: () => checkConnection()
          },
          {
            text: 'OK',
            style: 'cancel',
            onPress: () => {}
          }
        ]
      );
    }
  }, [isConnected]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[currentTheme].background }]}>
      <LinearGradient
        colors={[Colors[currentTheme].gradientStart, Colors[currentTheme].gradientEnd]}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <View style={styles.greetingContainer}>
              <Text style={[styles.greeting, { color: Colors[currentTheme].textLight }]}>{greeting}, {userName}</Text>
              <Text style={[styles.userName, { color: Colors[currentTheme].textLight }]}>Bem vindo ao </Text>
              <Text style={[styles.userName, { color: Colors[currentTheme].textLight }]}>Cafezão da Computação</Text>
            </View>
            <Image
              source={require('@/assets/imgs/xicara.png')}
              style={[styles.headerImage, { tintColor: Colors[currentTheme].textLight }]}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View style={[styles.tipContainer, { opacity: fadeAnim, backgroundColor: Colors[currentTheme].cardBackground }]}>
            <Text style={[styles.tipText, { color: Colors[currentTheme].textLight }]}>{dailyTip}</Text>
          </Animated.View>

          {/* Seção de Assinatura */}
          {renderSubscriptionSection()}

          <Animated.View style={[styles.statsContainer, { opacity: fadeAnim, borderTopColor: Colors[currentTheme].divider }]}>
            <View style={styles.statsHeader}>
              <Text style={[styles.statsTitle, { color: Colors[currentTheme].textLight }]}>Estatísticas</Text>
              <TouchableOpacity onPress={toggleStatsLayout} style={[styles.layoutToggleButton, { backgroundColor: Colors[currentTheme].cardBackground }]}>
                <Ionicons 
                  name={statsLayout === 'horizontal' ? 'grid-outline' : 'list-outline'} 
                  size={20} 
                  color={Colors[currentTheme].primary} 
                />
              </TouchableOpacity>
            </View>
            
            <View style={[
              styles.statsContent, 
              statsLayout === 'vertical' && styles.statsContentVertical
            ]}>
              <View style={[
                styles.statCard,
                statsLayout === 'vertical' && styles.statCardVertical,
                { backgroundColor: Colors[currentTheme].cardBackground }
              ]}>
                <Ionicons name="cafe" size={24} color={Colors[currentTheme].primary} />
                <Text style={[styles.statNumber, { color: Colors[currentTheme].textLight }]}>{coffeeStats.today}</Text>
                <Text style={[styles.statLabel, { color: Colors[currentTheme].textLight }]}>Cafés hoje</Text>
              </View>
              <View style={[
                styles.statCard,
                statsLayout === 'vertical' && styles.statCardVertical,
                { backgroundColor: Colors[currentTheme].cardBackground }
              ]}>
                <Ionicons name="calendar" size={24} color={Colors[currentTheme].primary} />
                <Text style={[styles.statNumber, { color: Colors[currentTheme].textLight }]}>{coffeeStats.total}</Text>
                <Text style={[styles.statLabel, { color: Colors[currentTheme].textLight }]}>Total</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.quickActions, { opacity: fadeAnim }]}>
            <Text style={[styles.sectionTitle, { color: Colors[currentTheme].textLight }]}>Ações Rápidas</Text>
            <View style={styles.actionButtons}>
              {isAdminDevice && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/telas_extras/notifications')}
                >
                  <LinearGradient
                    colors={[Colors[currentTheme].primary, Colors[currentTheme].accent]}
                    style={styles.actionButtonGradient}
                  >
                    <Ionicons name="notifications" size={24} color={Colors[currentTheme].textLight} />
                    <Text style={[styles.actionButtonText, { color: Colors[currentTheme].textLight }]}>Notificações</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              <StatisticsButton />
            </View>
          </Animated.View>

          <Animated.View style={[styles.recentActivity, { opacity: fadeAnim }]}>
            <Text style={[styles.sectionTitle, { color: Colors[currentTheme].textLight }]}>Atividade Recente</Text>
            <View style={[styles.activityList, { backgroundColor: Colors[currentTheme].cardBackground }]}>
              {recentCoffees.length > 0 ? (
                recentCoffees.map((coffee) => (
                  <View key={coffee.id} style={[styles.activityItem, { borderBottomColor: Colors[currentTheme].divider }]}>
                    <View style={[styles.activityIcon, { backgroundColor: Colors[currentTheme].cardBackground }]}>
                      <Ionicons name="cafe" size={20} color={Colors[currentTheme].primary} />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={[styles.activityText, { color: Colors[currentTheme].textLight }]}>
                        {coffee.quantity === '1/4' ? 'Café Pequeno' : 'Café Medio'}
                      </Text>
                      <Text style={[styles.activityTime, { color: Colors[currentTheme].textLight }]}>
                        {formatRelativeTime(coffee.createdAt)}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyActivityContainer}>
                  <Ionicons name="cafe-outline" size={40} color={Colors[currentTheme].primary} />
                  <Text style={[styles.emptyActivityText, { color: Colors[currentTheme].textLight }]}>
                    Nenhum café registrado ainda
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
          
          <Animated.View style={[styles.recommendations, { opacity: fadeAnim }]}>
            <Text style={[styles.sectionTitle, { color: Colors[currentTheme].textLight }]}>Recomendações</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendationsContainer}
            >
              <TouchableOpacity style={[styles.recommendationCard, { backgroundColor: Colors[currentTheme].cardBackground }]}>
                <Image 
                  source={require('@/assets/imgs/xicara.png')} 
                  style={[styles.recommendationImage, { tintColor: Colors[currentTheme].textLight }]}
                />
                <Text style={[styles.recommendationTitle, { color: Colors[currentTheme].textLight }]}>Café Especial</Text>
                <Text style={[styles.recommendationPrice, { color: Colors[currentTheme].primary }]}>R$ 12,00</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.recommendationCard, { backgroundColor: Colors[currentTheme].cardBackground }]}>
                <Image 
                  source={require('@/assets/imgs/xicara.png')} 
                  style={[styles.recommendationImage, { tintColor: Colors[currentTheme].textLight }]}
                />
                <Text style={[styles.recommendationTitle, { color: Colors[currentTheme].textLight }]}>Cappuccino</Text>
                <Text style={[styles.recommendationPrice, { color: Colors[currentTheme].primary }]}>R$ 8,00</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.recommendationCard, { backgroundColor: Colors[currentTheme].cardBackground }]}>
                <Image 
                  source={require('@/assets/imgs/xicara.png')} 
                  style={[styles.recommendationImage, { tintColor: Colors[currentTheme].textLight }]}
                />
                <Text style={[styles.recommendationTitle, { color: Colors[currentTheme].textLight }]}>Latte</Text>
                <Text style={[styles.recommendationPrice, { color: Colors[currentTheme].primary }]}>R$ 10,00</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
          
          <View style={styles.bottomSpacing} />
        </ScrollView>
        
        <TouchableOpacity 
          style={[
            styles.floatingButton,
            (subscriptionData.status !== 'active' || isLoading) && styles.disabledButton
          ]} 
          onPress={handleNewCoffee}
          disabled={subscriptionData.status !== 'active' || isLoading}
        >
          <LinearGradient
            colors={
              subscriptionData.status === 'active' && !isLoading
                ? [Colors[currentTheme].primary, Colors[currentTheme].accent]
                : [Colors[currentTheme].textLight, Colors[currentTheme].textLight]
            }
            style={styles.floatingButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons 
              name="add-circle" 
              size={24} 
              color={subscriptionData.status === 'active' && !isLoading ? Colors[currentTheme].text : Colors[currentTheme].textLight} 
            />
            <Text style={[
              styles.floatingButtonText, 
              { 
                color: subscriptionData.status === 'active' && !isLoading
                  ? Colors[currentTheme].textLight 
                  : Colors[currentTheme].textLight 
              }
            ]}>
              {isLoading ? 'Carregando...' : subscriptionData.status === 'active' ? 'Novo Café' : 'Assinatura Necessária'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {renderConfirmationModal()}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: height * 0.056,
    marginBottom:height*0.03,
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    marginBottom: 5,
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  headerImage: {
    width: width * 0.3,
    height: width * 0.3,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  tipText: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  subscriptionContainer: {
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  activeSubscription: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  endDateText: {
    fontSize: 14,
    marginTop: 5,
  },
  expiredSubscription: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  expiredText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subscribeButton: {
    padding: 10,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    width: '100%',
    paddingHorizontal: 10,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  layoutToggleButton: {
    padding: 8,
    borderRadius: 8,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statsContentVertical: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  statCard: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    width: width * 0.4,
    minHeight: 120,
    justifyContent: 'center',
    marginBottom: 10,
  },
  statCardVertical: {
    width: '100%',
    marginBottom: 15,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 16,
    textAlign: 'center',
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  actionButton: {
    width: width * 0.4,
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
  recentActivity: {
    padding: 20,
  },
  activityList: {
    borderRadius: 12,
    padding: 10,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 16,
  },
  activityTime: {
    fontSize: 12,
  },
  activityPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  recommendations: {
    display: 'none',
    padding: 20,
  },
  recommendationsContainer: {
    paddingRight: 20,
  },
  recommendationCard: {
    borderRadius: 12,
    padding: 15,
    marginRight: 15,
    width: width * 0.4,
    alignItems: 'center',
  },
  recommendationImage: {
    width: width * 0.25,
    height: width * 0.25,
    marginBottom: 10,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  recommendationPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 100,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 25,
    alignSelf: 'center',
    width: width * 0.5,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  floatingButtonGradient: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  codeInput: {
    width: '100%',
    borderRadius: 12,
    padding: 15,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    padding: 15,
    borderRadius: 12,
    width: '48%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  confirmButton: {
    backgroundColor: '#8B4513',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  evaluatingSubscription: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  evaluatingText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  evaluatingDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
  },
  countdownContainer: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
    width: '100%',
  },
  countdownText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityTitle: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  quantityButton: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    width: '45%',
  },
  quantityButtonSelected: {
    borderWidth: 2,
  },
  quantityVisual: {
    width: 120,
    height: 150,
    backgroundColor: 'transparent',
    marginBottom: 10,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 14,
  },
  quantityTextSelected: {
    fontWeight: 'bold',
  },
  maskedView: {
    width: 150,
    height: 150,
  },
  mask: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyActivityContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyActivityText: {
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  themeToggle: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  disabledButton: {
    opacity: 0.7,
  },
});
