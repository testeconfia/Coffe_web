import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Animated,
  Modal,
  FlatList,
  Dimensions,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy, limit, addDoc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  lastLogin?: Date;
  status?: 'active' | 'inactive';
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  coffeesToday?: number;
  totalCoffees?: number;
  lastCoffeeAt?: Date;
  subscriptionStatus?: string;
  subscriptionEndDate?: string;
  updatedAt?: Date;
}

interface SystemSettings {
  dailyCoffeeLimit: number;
  minTimeBetweenCoffees: number; // em minutos
  subscriptionPrices: {
    monthly: number;
  };
  maintenanceMode: boolean;
  welcomeMessage: string;
  serverUrl: string;
  pixKey: string;
  superAdmins: string[]; // Array of user IDs who are super admins
  [key: string]: any; // Adicionar índice de string para compatibilidade com Firestore
}

const { width, height } = Dimensions.get('window');

const SuperAdminScreen = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'admins' | 'stats' | 'settings'>('admins');
  const [refreshing, setRefreshing] = useState(false);
  const [isAddAdminModalVisible, setIsAddAdminModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isSuperAdminModalVisible, setIsSuperAdminModalVisible] = useState(false);
  const [selectedSuperAdmin, setSelectedSuperAdmin] = useState<AdminUser | null>(null);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    dailyCoffeeLimit: 5,
    minTimeBetweenCoffees: 30,
    subscriptionPrices: {
      monthly: 29.90,
    },
    maintenanceMode: false,
    welcomeMessage: 'Bem-vindo ao nosso sistema de café!',
    serverUrl: 'https://44e2-168-228-94-157.ngrok-free.app',
    pixKey: '+5566999086599',
    superAdmins: [],
  });
  const [stats, setStats] = useState({
    totalAdmins: 0,
    activeAdmins: 0,
    totalUsers: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredAdmins, setFilteredAdmins] = useState<AdminUser[]>([]);
  
  // Animações
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const tabIndicatorPosition = useState(new Animated.Value(0))[0];

  useEffect(() => {
    checkSuperAdminAccess();
    startAnimation();
    
    // Configurar o listener de configurações e armazenar a função de limpeza
    const cleanup = loadSettings();
    
    // Limpar o listener quando o componente for desmontado
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  useEffect(() => {
    // Atualizar posição do indicador de tab
    Animated.timing(tabIndicatorPosition, {
      toValue: selectedTab === 'admins' ? 0 : selectedTab === 'stats' ? 1 : 2,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [selectedTab]);

  useEffect(() => {
    const filtered = admins.filter(admin => 
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredAdmins(filtered);
  }, [searchQuery, admins]);

  const startAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const checkSuperAdminAccess = async () => {
    try {
      const isSuperAdmin = await AsyncStorage.getItem('isSuperAdmin');
      
      if (isSuperAdmin !== 'true') {
        Alert.alert('Acesso Negado', 'Você não tem permissão para acessar esta tela.');
        router.back();
        return;
      }
      
      loadData();
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao verificar suas permissões.');
      router.back();
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar configurações primeiro
      const settingsQuery = query(collection(db, 'settings'), limit(1));
      const settingsDoc = await getDocs(settingsQuery);
      let superAdminsList: string[] = [];
      
      if (!settingsDoc.empty) {
        const settingsData = settingsDoc.docs[0].data() as SystemSettings;
        setSettings(settingsData);
        superAdminsList = settingsData.superAdmins || [];
      }

      // Carregar todos os usuários
      const usersQuery = query(
        collection(db, 'users')
      );
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        const userId = doc.id;
        return {
          id: userId,
          name: data.userName || data.name || 'Sem nome',
          email: data.email || '',
          createdAt: data.createdAt?.toDate?.() || new Date(),
          lastCoffeeAt: data.lastCoffeeAt?.toDate?.() || null,
          updatedAt: data.updatedAt?.toDate?.() || null,
          status: data.subscriptionStatus || 'inactive',
          isAdmin: Boolean(data.isAdmin),
          coffeesToday: Number(data.coffeesToday) || 0,
          totalCoffees: Number(data.totalCoffees) || 0,
          subscriptionStatus: data.subscriptionStatus || 'inactive',
          subscriptionEndDate: data.subscriptionEndDate || null,
          isSuperAdmin: superAdminsList.includes(userId)
        };
      }) as AdminUser[];
      
      setAdmins(usersData);

      // Calcular estatísticas
      const adminUsers = usersData.filter(user => user.isAdmin);
      const activeAdmins = adminUsers.filter(admin => admin.subscriptionStatus === 'active').length;

      setStats({
        totalAdmins: adminUsers.length,
        activeAdmins,
        totalUsers: usersData.length,
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao carregar os dados.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleRemoveAdmin = async (adminId: string) => {
    Alert.alert(
      'Remover Privilégios de Administrador',
      'Tem certeza que deseja remover os privilégios de administrador deste usuário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remover privilégios de admin
              await updateDoc(doc(db, 'users', adminId), {
                isAdmin: false
              });

              // Se o usuário for super admin, remover também
              const admin = admins.find(a => a.id === adminId);
              if (admin?.isSuperAdmin) {
                // Atualizar a lista de super admins nas configurações
                const currentSuperAdmins = settings.superAdmins || [];
                const newSuperAdmins = currentSuperAdmins.filter(id => id !== adminId);

                const settingsQuery = query(collection(db, 'settings'), limit(1));
                const settingsDoc = await getDocs(settingsQuery);
                
                const settingsData = {
                  ...settings,
                  superAdmins: newSuperAdmins,
                  updatedAt: serverTimestamp(),
                };
                
                if (settingsDoc.empty) {
                  await addDoc(collection(db, 'settings'), settingsData);
                } else {
                  await updateDoc(doc(db, 'settings', settingsDoc.docs[0].id), settingsData);
                }

                // Atualizar estado local das configurações
                setSettings(prev => ({
                  ...prev,
                  superAdmins: newSuperAdmins
                }));
              }

              // Atualizar lista de admins
              setAdmins(admins.map(admin => 
                admin.id === adminId 
                  ? { ...admin, isAdmin: false, isSuperAdmin: false }
                  : admin
              ));
              
              Alert.alert('Sucesso', 'Privilégios de administrador removidos com sucesso.');
            } catch (error) {
              console.error('Erro ao remover privilégios de administrador:', error);
              Alert.alert('Erro', 'Ocorreu um erro ao remover os privilégios de administrador.');
            }
          },
        },
      ]
    );
  };

  const handleAddAdmin = async () => {
    if (!newAdminName || !newAdminEmail || !newAdminPassword) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    setIsAddingAdmin(true);
    try {
      // Adicionar novo usuário com privilégios de administrador
      const newAdminRef = await addDoc(collection(db, 'users'), {
        name: newAdminName,
        email: newAdminEmail,
        isAdmin: true,
        status: 'active',
        createdAt: serverTimestamp(),
        lastLogin: null,
      });

      // Atualizar lista de usuários
      const newAdmin: AdminUser = {
        id: newAdminRef.id,
        name: newAdminName,
        email: newAdminEmail,
        createdAt: new Date(),
        status: 'active',
        isAdmin: true,
      };
      
      setAdmins([newAdmin, ...admins]);
      setIsAddAdminModalVisible(false);
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      
      Alert.alert('Sucesso', 'Administrador adicionado com sucesso.');
    } catch (error) {
      console.error('Erro ao adicionar administrador:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao adicionar o administrador.');
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleToggleAdminStatus = async (adminId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const admin = admins.find(a => a.id === adminId);
    
    try {
      await updateDoc(doc(db, 'users', adminId), {
        status: newStatus,
      });
      
      setAdmins(admins.map(a => 
        a.id === adminId ? { ...a, status: newStatus } : a
      ));
      
      Alert.alert('Sucesso', `Status do usuário alterado para ${newStatus}.`);
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao alterar o status do usuário.');
    }
  };

  const handleToggleAdminPrivileges = async (userId: string, isCurrentlyAdmin: boolean) => {
    const user = admins.find(a => a.id === userId);
    const newAdminStatus = !isCurrentlyAdmin;
    
    try {
      await updateDoc(doc(db, 'users', userId), {
        isAdmin: newAdminStatus,
      });
      
      setAdmins(admins.map(a => 
        a.id === userId ? { ...a, isAdmin: newAdminStatus } : a
      ));
      
      Alert.alert('Sucesso', `${user?.name} ${newAdminStatus ? 'agora é' : 'não é mais'} um administrador.`);
    } catch (error) {
      console.error('Erro ao alterar privilégios de administrador:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao alterar os privilégios de administrador.');
    }
  };

  const handleToggleSuperAdmin = async (userId: string, isCurrentlySuperAdmin: boolean) => {
    const user = admins.find(a => a.id === userId);
    const newSuperAdminStatus = !isCurrentlySuperAdmin;
    
    try {
      // Atualizar a lista de super admins nas configurações
      const currentSuperAdmins = settings.superAdmins || [];
      const newSuperAdmins = newSuperAdminStatus
        ? [...currentSuperAdmins, userId]
        : currentSuperAdmins.filter(id => id !== userId);

      const settingsQuery = query(collection(db, 'settings'), limit(1));
      const settingsDoc = await getDocs(settingsQuery);
      
      const settingsData = {
        ...settings,
        superAdmins: newSuperAdmins,
        updatedAt: serverTimestamp(),
      };
      
      if (settingsDoc.empty) {
        // Criar novo documento de configurações
        await addDoc(collection(db, 'settings'), settingsData);
      } else {
        // Atualizar documento existente
        await updateDoc(doc(db, 'settings', settingsDoc.docs[0].id), settingsData);
      }

      // Atualizar estado local
      setSettings(prev => ({
        ...prev,
        superAdmins: newSuperAdmins
      }));
      
      // Atualizar a lista de admins
      setAdmins(prevAdmins => 
        prevAdmins.map(admin => 
          admin.id === userId 
            ? { ...admin, isSuperAdmin: newSuperAdminStatus }
            : admin
        )
      );

      // Se estiver removendo o super admin, atualizar o AsyncStorage
      if (!newSuperAdminStatus) {
        await AsyncStorage.setItem('isSuperAdmin', 'false');
      }
      
      Alert.alert('Sucesso', `${user?.name} ${newSuperAdminStatus ? 'agora é' : 'não é mais'} um super administrador.`);
    } catch (error) {
      console.error('Erro ao alterar privilégios de super administrador:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao alterar os privilégios de super administrador.');
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (typeof date === 'string') return date;
    if (date.seconds) {
      // Se for um Timestamp do Firestore
      return new Date(date.seconds * 1000).toLocaleString();
    }
    if (date instanceof Date) {
      return date.toLocaleString();
    }
    return 'Data inválida';
  };

  const renderAdmins = () => (
    <Animated.View 
      style={[
        styles.content, 
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >      
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar por nome ou email..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsSuperAdminModalVisible(true)}
        >
          <LinearGradient
            colors={['#4CAF50', '#388E3C']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="shield" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Gerenciar Super Admins</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={filteredAdmins}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[
            styles.card,
            item.isAdmin && styles.adminCard,
            item.isSuperAdmin && styles.superAdminCard
          ]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[
                  styles.statusIndicator, 
                  { backgroundColor: item.subscriptionStatus === 'active' ? '#4CAF50' : '#F44336' }
                ]} />
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.isSuperAdmin && (
                  <View style={styles.superAdminBadge}>
                    <Text style={styles.superAdminBadgeText}>Super Admin</Text>
                  </View>
                )}
                {item.isAdmin && !item.isSuperAdmin && (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>Admin</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => handleToggleAdminStatus(item.id, item.status || 'active')}
                  style={styles.actionButton}
                >
                  <Ionicons 
                    name={item.subscriptionStatus === 'active' ? 'checkmark-circle' : 'close-circle'} 
                    size={24} 
                    color={item.subscriptionStatus === 'active' ? '#4CAF50' : '#F44336'} 
                  />
                </TouchableOpacity>
                {item.isAdmin ? (
                  <TouchableOpacity
                    onPress={() => handleRemoveAdmin(item.id)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="shield-outline" size={24} color="#ff4444" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleToggleAdminPrivileges(item.id, false)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <Text style={styles.cardText}>Email: {item.email}</Text>
            <Text style={styles.cardText}>
              Criado em: {formatDate(item.createdAt)}
            </Text>
            <Text style={styles.cardText}>
              Status da Assinatura: {item.subscriptionStatus || 'Inativo'}
            </Text>
            {item.subscriptionEndDate && (
              <Text style={styles.cardText}>
                Assinatura até: {formatDate(item.subscriptionEndDate)}
              </Text>
            )}
            <View style={styles.coffeeStats}>
              <Text style={styles.cardText}>Cafés hoje: {item.coffeesToday || 0}</Text>
              <Text style={styles.cardText}>Total de cafés: {item.totalCoffees || 0}</Text>
            </View>
            {item.lastCoffeeAt && (
              <Text style={styles.cardText}>
                Último café: {formatDate(item.lastCoffeeAt)}
              </Text>
            )}
            {item.updatedAt && (
              <Text style={styles.cardText}>
                Última atualização: {formatDate(item.updatedAt)}
              </Text>
            )}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </Animated.View>
  );

  const renderStats = () => (
    <Animated.View 
      style={[
        styles.content, 
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.statsContainer}>
        <View style={styles.statsCard}>
          <LinearGradient
            colors={['#4a90e2', '#357abd']}
            style={styles.statsCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="people" size={32} color="#fff" />
            <Text style={styles.statsValue}>{stats.totalUsers}</Text>
            <Text style={styles.statsLabel}>Total de Usuários</Text>
          </LinearGradient>
        </View>
        
        <View style={styles.statsCard}>
          <LinearGradient
            colors={['#4CAF50', '#388E3C']}
            style={styles.statsCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="shield-checkmark" size={32} color="#fff" />
            <Text style={styles.statsValue}>{stats.totalAdmins}</Text>
            <Text style={styles.statsLabel}>Administradores</Text>
          </LinearGradient>
        </View>
        
        <View style={styles.statsCard}>
          <LinearGradient
            colors={['#FFC107', '#FFA000']}
            style={styles.statsCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="checkmark-circle" size={32} color="#fff" />
            <Text style={styles.statsValue}>{stats.activeAdmins}</Text>
            <Text style={styles.statsLabel}>Administradores Ativos</Text>
          </LinearGradient>
        </View>
      </View>
      
      <View style={styles.activityChart}>
        <Text style={styles.chartTitle}>Distribuição de Usuários</Text>
        <View style={styles.chartContainer}>
          {/* Aqui você pode adicionar um gráfico real usando uma biblioteca como react-native-chart-kit */}
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>Gráfico de Distribuição</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const loadSettings = () => {
    try {
      const settingsQuery = query(collection(db, 'settings'), limit(1));
      const unsubscribe = onSnapshot(settingsQuery, (snapshot) => {
        if (!snapshot.empty) {
          const settingsData = snapshot.docs[0].data() as SystemSettings;
          setSettings(settingsData);
        }
      }, (error) => {
        console.error('Erro ao carregar configurações:', error);
        Alert.alert('Erro', 'Ocorreu um erro ao carregar as configurações do sistema.');
      });

      // Retornar a função de limpeza para remover o listener quando o componente for desmontado
      return unsubscribe;
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao carregar as configurações do sistema.');
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const settingsQuery = query(collection(db, 'settings'), limit(1));
      const settingsDoc = await getDocs(settingsQuery);
      
      // Converter os dados para o formato esperado pelo Firestore
      const settingsData = {
        ...settings,
        updatedAt: serverTimestamp(),
      };
      
      if (settingsDoc.empty) {
        // Criar novo documento de configurações
        await addDoc(collection(db, 'settings'), settingsData);
      } else {
        // Atualizar documento existente
        await updateDoc(doc(db, 'settings', settingsDoc.docs[0].id), settingsData);
      }
      
      // Salvar no AsyncStorage para acesso offline
      await AsyncStorage.setItem('systemSettings', JSON.stringify(settingsData));
      
      setIsSettingsModalVisible(false);
      Alert.alert('Sucesso', 'Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar as configurações.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const renderSettings = () => (
    <Animated.View 
      style={[
        styles.content, 
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      <ScrollView style={styles.settingsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>Configurações do Sistema</Text>
          
          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>Limites e Restrições</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Limite Diário de Cafés</Text>
              <TextInput
                style={styles.input}
                placeholder="Número máximo de cafés por dia"
                placeholderTextColor="#999"
                value={settings.dailyCoffeeLimit.toString()}
                onChangeText={(value) => setSettings({
                  ...settings,
                  dailyCoffeeLimit: parseInt(value) || 0
                })}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Tempo Mínimo Entre Cafés (minutos)</Text>
              <TextInput
                style={styles.input}
                placeholder="Tempo mínimo entre cafés"
                placeholderTextColor="#999"
                value={settings.minTimeBetweenCoffees.toString()}
                onChangeText={(value) => setSettings({
                  ...settings,
                  minTimeBetweenCoffees: parseInt(value) || 0
                })}
                keyboardType="numeric"
              />
            </View>
          </View>
          
          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>Preços das Assinaturas</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Mensal (R$)</Text>
              <TextInput
                style={styles.input}
                placeholder="Preço da assinatura mensal"
                placeholderTextColor="#999"
                value={settings.subscriptionPrices.monthly.toString()}
                onChangeText={(value) => setSettings({
                  ...settings,
                  subscriptionPrices: {
                    ...settings.subscriptionPrices,
                    monthly: parseFloat(value) || 0
                  }
                })}
                keyboardType="numeric"
              />
            </View>
          </View>
          
          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>Outras Configurações</Text>
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Modo de Manutenção</Text>
              <Switch
                value={settings.maintenanceMode}
                onValueChange={(value) => setSettings({
                  ...settings,
                  maintenanceMode: value
                })}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={settings.maintenanceMode ? '#4a90e2' : '#f4f3f4'}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Mensagem de Boas-vindas</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Mensagem de boas-vindas"
                placeholderTextColor="#999"
                value={settings.welcomeMessage}
                onChangeText={(value) => setSettings({
                  ...settings,
                  welcomeMessage: value
                })}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>Coisas Chatas</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>URL do Servidor</Text>
              <TextInput
                style={styles.input}
                value={settings.serverUrl}
                onChangeText={(value) => setSettings({
                  ...settings,
                  serverUrl: value
                })}
                placeholder="URL do servidor"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Chave PIX</Text>
              <TextInput
                style={styles.input}
                value={settings.pixKey}
                onChangeText={(value) => setSettings({
                  ...settings,
                  pixKey: value
                })}
                placeholder="Chave PIX"
                placeholderTextColor="#999"
              />
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveSettings}
            disabled={isSavingSettings}
          >
            <LinearGradient
              colors={['#4a90e2', '#357abd']}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isSavingSettings ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Salvar Configurações</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );

  const renderSuperAdminModal = () => (
    <Modal
      visible={isSuperAdminModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setIsSuperAdminModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <BlurView intensity={80} style={styles.modalBlur}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Super Admin</Text>
              <TouchableOpacity
                onPress={() => setIsSuperAdminModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={admins.filter(admin => admin.isAdmin)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.superAdminItem,
                    item.isSuperAdmin && styles.superAdminItemSelected
                  ]}
                  onPress={() => handleToggleSuperAdmin(item.id, item.isSuperAdmin || false)}
                >
                  <View style={styles.superAdminItemContent}>
                    <Text style={styles.superAdminItemName}>{item.name}</Text>
                    <Text style={styles.superAdminItemEmail}>{item.email}</Text>
                  </View>
                  {item.isSuperAdmin && (
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.superAdminList}
            />
          </View>
        </BlurView>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2a2a2a']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Super Admin</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={() => router.push('/telas_extras/financeiro')}
              style={styles.headerButton}
            >
              <Ionicons name="cash" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onRefresh}
              style={styles.headerButton}
            >
              <Ionicons name="refresh" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setSelectedTab('admins')}
          >
            <Text style={[styles.tabText, selectedTab === 'admins' && styles.selectedTabText]}>
              Usuários
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setSelectedTab('stats')}
          >
            <Text style={[styles.tabText, selectedTab === 'stats' && styles.selectedTabText]}>
              Estatísticas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setSelectedTab('settings')}
          >
            <Text style={[styles.tabText, selectedTab === 'settings' && styles.selectedTabText]}>
              Configurações
            </Text>
          </TouchableOpacity>
          <Animated.View 
            style={[
              styles.tabIndicator, 
              { 
                transform: [{ 
                  translateX: tabIndicatorPosition.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [0, width / 3, (width / 3) * 2]
                  })
                }] 
              }
            ]} 
          />
        </View>

        {selectedTab === 'admins' ? renderAdmins() : 
         selectedTab === 'stats' ? renderStats() : 
         renderSettings()}
         
        {renderSuperAdminModal()}
      </LinearGradient>
    </SafeAreaView>
  );
};

export default SuperAdminScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: width / 3,
    backgroundColor: '#4a90e2',
  },
  tabText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  cardActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  addButtonContainer: {
    marginBottom: 16,
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statsCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  statsCardGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 8,
  },
  statsLabel: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  activityChart: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  chartContainer: {
    height: 200,
  },
  chartPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  chartPlaceholderText: {
    color: '#999',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'rgba(42, 42, 42, 0.9)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  modalButton: {
    marginTop: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    padding: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adminCard: {
    borderColor: '#4a90e2',
    borderWidth: 1,
  },
  adminBadge: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  coffeeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 8,
    borderRadius: 8,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 8,
  },
  settingsContainer: {
    flex: 1,
  },
  settingsCard: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    padding: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  superAdminCard: {
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  superAdminBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  superAdminBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  superAdminList: {
    maxHeight: 400,
  },
  superAdminItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  superAdminItemSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  superAdminItemContent: {
    flex: 1,
  },
  superAdminItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  superAdminItemEmail: {
    fontSize: 14,
    color: '#999',
  },
}); 