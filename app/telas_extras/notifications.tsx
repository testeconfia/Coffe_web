import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Switch, ScrollView, Dimensions } from 'react-native';
import { collection, onSnapshot, query, orderBy, Timestamp, where, doc, DocumentSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useApp } from '@/contexts/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Notification {
  id: string;
  message: string;
  timestamp: Date;
  type: string;
  read: boolean;
  userId?: string | null;
}

interface UserData {
  userName: string;
  userCredit: number;
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
  isAdmin: boolean;
}

const NOTIFICATIONS_STORAGE_KEY = '@notifications';
const USER_DATA_STORAGE_KEY = '@userData';

const { width, height } = Dimensions.get('window');

export default function NotificationsScreen() {
  const { userName } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [updateCounter, setUpdateCounter] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [autoReloadEnabled, setAutoReloadEnabled] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Função para carregar dados do usuário do AsyncStorage
  const loadUserDataFromStorage = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem(USER_DATA_STORAGE_KEY);
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        setUserData(parsedUserData);
        console.log('Dados do usuário carregados do AsyncStorage:', parsedUserData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário do AsyncStorage:', error);
    }
  };

  // Função para salvar dados do usuário no AsyncStorage
  const saveUserDataToStorage = async (data: UserData) => {
    try {
      await AsyncStorage.setItem(USER_DATA_STORAGE_KEY, JSON.stringify(data));
      console.log('Dados do usuário salvos no AsyncStorage:', data);
    } catch (error) {
      console.error('Erro ao salvar dados do usuário no AsyncStorage:', error);
    }
  };

  // Função para carregar notificações do AsyncStorage
  const loadNotificationsFromStorage = async () => {
    try {
      const storedNotifications = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (storedNotifications) {
        const parsedNotifications = JSON.parse(storedNotifications).map((notification: any) => ({
          ...notification,
          timestamp: new Date(notification.timestamp)
        }));
        console.log('Notificações carregadas do AsyncStorage:', parsedNotifications.length, parsedNotifications);
        setNotifications(parsedNotifications);
        updateUnreadCount(parsedNotifications);
      } else {
        console.log('Nenhuma notificação encontrada no AsyncStorage');
        // Inicializar com array vazio se não houver notificações
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Erro ao carregar notificações do AsyncStorage:', error);
      // Inicializar com array vazio em caso de erro
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  // Função para salvar notificações no AsyncStorage
  const saveNotificationsToStorage = async (newNotifications: Notification[]) => {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(newNotifications));
      console.log('Notificações salvas no AsyncStorage:', newNotifications.length);
    } catch (error) {
      console.error('Erro ao salvar notificações no AsyncStorage:', error);
    }
  };

  // Função para atualizar a contagem de notificações não lidas
  const updateUnreadCount = (notifs: Notification[]) => {
    const count = notifs.filter(n => !n.read).length;
    setUnreadCount(count);
  };

  // Função para marcar uma notificação como lida
  const markAsRead = async (notificationId: string) => {
    const updatedNotifications = notifications.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true } 
        : notification
    );
    
    setNotifications(updatedNotifications);
    saveNotificationsToStorage(updatedNotifications);
    updateUnreadCount(updatedNotifications);
  };

  // Função para marcar todas as notificações como lidas
  const markAllAsRead = async () => {
    const updatedNotifications = notifications.map(notification => ({
      ...notification,
      read: true
    }));
    
    setNotifications(updatedNotifications);
    saveNotificationsToStorage(updatedNotifications);
    setUnreadCount(0);
  };

  // Função para filtrar notificações por tipo
  const getFilteredNotifications = () => {
    if (filterType === 'all') return notifications;
    if (filterType === 'unread') return notifications.filter(n => !n.read);
    return notifications.filter(n => n.type === filterType);
  };

  useEffect(() => {
    let unsubscribeUserData: (() => void) | undefined;
    let unsubscribeNotifications: (() => void) | undefined;
    let unsubscribeGlobalNotifications: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        
        // Se não houver token, não configuramos os listeners
        if (!token) {
          console.log('Token do usuário não encontrado');
          setError('Usuário não autenticado');
          setLoading(false);
          return;
        }
        
        setUserToken(token);
        console.log('Iniciando listeners...', { userName, token });
        setError(null);
        
        // Carregar dados do AsyncStorage primeiro
        await loadUserDataFromStorage();
        await loadNotificationsFromStorage();
        
        // Listener para dados do usuário
        const userRef = doc(db, 'users', token);
        unsubscribeUserData = onSnapshot(userRef, 
          (docSnapshot: DocumentSnapshot) => {
            if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              console.log('Dados do usuário atualizados:', data);
              
              const userData: UserData = {
                userName: data.userName || '',
                userCredit: data.userCredit || 0,
                subscriptionStatus: data.subscriptionStatus || 'inactive',
                subscriptionEndDate: data.subscriptionEndDate ? 
                  (data.subscriptionEndDate instanceof Timestamp ? 
                    data.subscriptionEndDate.toDate().toISOString() : 
                    data.subscriptionEndDate) : 
                  null,
                isAdmin: data.isAdmin || false
              };
              setUserData(userData);
              saveUserDataToStorage(userData);
              
              // Atualizar o tempo da última atualização
              setLastUpdateTime(new Date());
              
              // Mostrar banner de atualização
              setShowUpdateBanner(true);
              
              // Se auto-reload estiver habilitado, recarregar a tela
              if (autoReloadEnabled) {
                setTimeout(() => {
                  onRefresh();
                }, 1000);
              }
            } else {
              console.log('Documento do usuário não encontrado');
            }
          },
          (error: Error) => {
            console.error('Erro ao carregar dados do usuário:', error);
            setError('Erro ao carregar dados do usuário. Usando dados locais.');
          }
        );

        // Listener para notificações - Simplificando a query
        const notificationsRef = collection(db, 'notifications');
        
        // Primeiro, vamos tentar buscar apenas as notificações do usuário
        // Verificar se o token é válido antes de fazer a consulta
        if (token) {
          const userNotificationsQuery = query(
            notificationsRef,
            where('userId', '==', token)
          );

          // Listener para notificações do usuário
          unsubscribeNotifications = onSnapshot(userNotificationsQuery,
            (snapshot) => {
              console.log('Snapshot de notificações do usuário recebido:', snapshot.size, 'documentos');
              const userNotifications: Notification[] = [];
              
              if (snapshot.empty) {
                console.log('Nenhuma notificação do usuário encontrada');
              }
              
              snapshot.forEach((doc) => {
                const data = doc.data();
                console.log('Processando notificação do usuário:', doc.id, data);
                
                const timestamp = data.timestamp instanceof Timestamp 
                  ? data.timestamp.toDate() 
                  : new Date(data.timestamp || Date.now());

                userNotifications.push({
                  id: doc.id,
                  message: data.message || 'Sem mensagem',
                  timestamp: timestamp,
                  type: data.type || 'info',
                  read: data.read || false,
                  userId: data.userId
                });
              });

              // Ordenar as notificações por timestamp (mais recentes primeiro)
              userNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

              // Atualizar apenas as notificações do usuário
              setNotifications(prev => {
                // Manter apenas as notificações globais
                const globalNotifications = prev.filter(n => n.userId === null);
                // Combinar com as novas notificações do usuário
                const newNotifications = [...globalNotifications, ...userNotifications];
                console.log('Atualizando notificações do usuário. Total:', newNotifications.length, newNotifications);
                // Salvar no AsyncStorage
                saveNotificationsToStorage(newNotifications);
                // Incrementar o contador para forçar atualização
                setUpdateCounter(prev => prev + 1);
                
                // Atualizar o tempo da última atualização
                setLastUpdateTime(new Date());
                
                // Mostrar banner de atualização
                setShowUpdateBanner(true);
                
                // Atualizar contagem de não lidas
                updateUnreadCount(newNotifications);
                
                // Se auto-reload estiver habilitado, recarregar a tela
                if (autoReloadEnabled) {
                  setTimeout(() => {
                    onRefresh();
                  }, 1000);
                }
                
                return newNotifications;
              });
            },
            (error: Error) => {
              console.error('Erro ao carregar notificações do usuário:', error);
              if (error.message.includes('requires an index')) {
                setError('Configurando banco de dados. Por favor, aguarde alguns minutos e tente novamente.');
              } else {
                setError('Erro ao carregar notificações. Usando dados locais.');
              }
            }
          );
        }

        // Depois, vamos buscar as notificações globais
        const globalNotificationsQuery = query(
          notificationsRef,
          where('userId', '==', null)
        );

        console.log('Queries de notificações criadas');

        // Listener para notificações globais
        unsubscribeGlobalNotifications = onSnapshot(globalNotificationsQuery,
          (snapshot) => {
            console.log('Snapshot de notificações globais recebido:', snapshot.size, 'documentos');
            const globalNotifications: Notification[] = [];
            
            if (snapshot.empty) {
              console.log('Nenhuma notificação global encontrada');
            }
            
            snapshot.forEach((doc) => {
              const data = doc.data();
              console.log('Processando notificação global:', doc.id, data);
              
              const timestamp = data.timestamp instanceof Timestamp 
                ? data.timestamp.toDate() 
                : new Date(data.timestamp || Date.now());

              globalNotifications.push({
                id: doc.id,
                message: data.message || 'Sem mensagem',
                timestamp: timestamp,
                type: data.type || 'info',
                read: data.read || false,
                userId: null
              });
            });

            // Ordenar as notificações por timestamp (mais recentes primeiro)
            globalNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            // Atualizar apenas as notificações globais
            setNotifications(prev => {
              // Manter apenas as notificações do usuário
              const userNotifications = prev.filter(n => n.userId === token);
              // Combinar com as novas notificações globais
              const newNotifications = [...userNotifications, ...globalNotifications];
              console.log('Atualizando notificações globais. Total:', newNotifications.length, newNotifications);
              // Salvar no AsyncStorage
              saveNotificationsToStorage(newNotifications);
              setLoading(false);
              // Incrementar o contador para forçar atualização
              setUpdateCounter(prev => prev + 1);
              
              // Atualizar o tempo da última atualização
              setLastUpdateTime(new Date());
              
              // Mostrar banner de atualização
              setShowUpdateBanner(true);
              
              // Atualizar contagem de não lidas
              updateUnreadCount(newNotifications);
              
              // Se auto-reload estiver habilitado, recarregar a tela
              if (autoReloadEnabled) {
                setTimeout(() => {
                  onRefresh();
                }, 1000);
              }
              
              return newNotifications;
            });
          },
          (error: Error) => {
            console.error('Erro ao carregar notificações globais:', error);
            if (error.message.includes('requires an index')) {
              setError('Configurando banco de dados. Por favor, aguarde alguns minutos e tente novamente.');
            } else {
              setError('Erro ao carregar notificações. Usando dados locais.');
            }
            setLoading(false);
          }
        );

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
      setupListeners();
    }, 500);
    
    // Cleanup function
    return () => {
      console.log('Removendo todos os listeners');
      clearTimeout(timer);
      if (unsubscribeUserData) unsubscribeUserData();
      if (unsubscribeNotifications) unsubscribeNotifications();
      if (unsubscribeGlobalNotifications) unsubscribeGlobalNotifications();
    };
  }, [userName]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    setError(null);
    setShowUpdateBanner(false); // Esconder o banner de atualização
    
    try {
      // Recarregar dados do usuário
      await loadUserDataFromStorage();
      
      // Recarregar notificações do AsyncStorage durante o refresh
      await loadNotificationsFromStorage();
      
      // Forçar uma nova sincronização com o Firebase
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        // Atualizar o token para garantir que os listeners sejam atualizados
        setUserToken(token);
        // Incrementar o contador para forçar atualização
        setUpdateCounter(prev => prev + 1);
      }
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      setError('Erro ao atualizar dados. Tente novamente mais tarde.');
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 1000);
    }
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'info':
        return 'information-circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'alert-circle';
      case 'success':
        return 'checkmark-circle';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'info':
        return '#3498db';
      case 'warning':
        return '#f39c12';
      case 'error':
        return '#e74c3c';
      case 'success':
        return '#2ecc71';
      default:
        return '#8B4513';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      style={[
        styles.notificationItem, 
        !item.read && styles.unreadNotification
      ]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={[styles.notificationIcon, { backgroundColor: getNotificationColor(item.type) }]}>
        <Ionicons name={getNotificationIcon(item.type)} size={24} color="#FFFFFF" />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationType}>{item.type.toUpperCase()}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>
          {item.timestamp.toLocaleString('pt-BR')}
        </Text>
      </View>
      {!item.read && (
        <View style={styles.unreadIndicator} />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B4513" />
        <Text style={styles.loadingText}>Carregando notificações...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={50} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorSubText}>Puxe para baixo para tentar novamente</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredNotifications = getFilteredNotifications();

  return (
    <LinearGradient
      colors={['#4A2C2A', '#2C1810']}
      style={styles.container}
    >
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.header}>
          <Ionicons name="notifications" size={32} color="#8B4513" />
          <Text style={styles.title}>Notificações</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {showUpdateBanner && (
        <View style={styles.updateBanner}>
          <Text style={styles.updateBannerText}>
            Novas atualizações disponíveis! Última atualização: {lastUpdateTime.toLocaleTimeString()}
          </Text>
          <TouchableOpacity 
            style={styles.updateButton}
            onPress={() => {
              setShowUpdateBanner(false);
              onRefresh();
            }}
          >
            <Text style={styles.updateButtonText}>Atualizar</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {userData && (
        <View style={styles.userInfoContainer}>
          <View style={styles.userInfoHeader}>
            <Ionicons name="person-circle" size={24} color="#8B4513" />
            <Text style={styles.userInfoTitle}>Dados do Usuário</Text>
          </View>
          <View style={styles.userInfoContent}>
            <View style={styles.userInfoRow}>
              <Text style={styles.userInfoLabel}>Nome:</Text>
              <Text style={styles.userInfoValue}>{userData.userName}</Text>
            </View>
            <View style={styles.userInfoRow}>
              <Text style={styles.userInfoLabel}>Crédito:</Text>
              <Text style={styles.userInfoValue}>R$ {userData.userCredit.toFixed(2)}</Text>
            </View>
            <View style={styles.userInfoRow}>
              <Text style={styles.userInfoLabel}>Status:</Text>
              <Text style={[
                styles.userInfoValue, 
                { color: userData.subscriptionStatus === 'active' ? '#2ecc71' : '#e74c3c' }
              ]}>
                {userData.subscriptionStatus === 'active' ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
            {userData.subscriptionEndDate && (
              <View style={styles.userInfoRow}>
                <Text style={styles.userInfoLabel}>Expira em:</Text>
                <Text style={styles.userInfoValue}>
                  {new Date(userData.subscriptionEndDate).toLocaleDateString()}
                </Text>
              </View>
            )}
            <View style={styles.userInfoRow}>
              <Text style={styles.userInfoLabel}>Admin:</Text>
              <Text style={styles.userInfoValue}>
                {userData.isAdmin ? 'Sim' : 'Não'}
              </Text>
            </View>
          </View>
        </View>
      )}
      
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            style={[styles.filterButton, filterType === 'all' && styles.activeFilterButton]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterButtonText, filterType === 'all' && styles.activeFilterButtonText]}>
              Todas ({notifications.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filterType === 'unread' && styles.activeFilterButton]}
            onPress={() => setFilterType('unread')}
          >
            <Text style={[styles.filterButtonText, filterType === 'unread' && styles.activeFilterButtonText]}>
              Não Lidas ({unreadCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filterType === 'info' && styles.activeFilterButton]}
            onPress={() => setFilterType('info')}
          >
            <Text style={[styles.filterButtonText, filterType === 'info' && styles.activeFilterButtonText]}>
              Informações
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filterType === 'warning' && styles.activeFilterButton]}
            onPress={() => setFilterType('warning')}
          >
            <Text style={[styles.filterButtonText, filterType === 'warning' && styles.activeFilterButtonText]}>
              Avisos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filterType === 'error' && styles.activeFilterButton]}
            onPress={() => setFilterType('error')}
          >
            <Text style={[styles.filterButtonText, filterType === 'error' && styles.activeFilterButtonText]}>
              Erros
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      <View style={styles.autoReloadContainer}>
        <Text style={styles.autoReloadText}>Atualização automática:</Text>
        <Switch
          value={autoReloadEnabled}
          onValueChange={setAutoReloadEnabled}
          trackColor={{ false: '#767577', true: '#8B4513' }}
          thumbColor={autoReloadEnabled ? '#D4A76A' : '#f4f3f4'}
        />
      </View>
      
      {filteredNotifications.length > 0 ? (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#8B4513']}
              tintColor="#8B4513"
            />
          }
          extraData={updateCounter}
          key={`notifications-${updateCounter}`}
          ListHeaderComponent={
            <TouchableOpacity 
              style={styles.markAllReadButton}
              onPress={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <Ionicons name="checkmark-done" size={20} color={unreadCount === 0 ? '#999' : '#8B4513'} />
              <Text style={[styles.markAllReadText, unreadCount === 0 && styles.markAllReadTextDisabled]}>
                Marcar todas como lidas
              </Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off" size={50} color="#8B4513" />
          <Text style={styles.emptyText}>Nenhuma notificação encontrada</Text>
          <Text style={styles.emptySubText}>
            {filterType === 'all' 
              ? 'Você não tem notificações no momento' 
              : `Não há notificações do tipo "${filterType}"`}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: height * 0.04,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
    marginRight: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -15,
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  updateBanner: {
    backgroundColor: '#8B4513',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
  },
  updateBannerText: {
    color: '#fff',
    flex: 1,
  },
  updateButton: {
    backgroundColor: '#D4A76A',
    padding: 8,
    borderRadius: 4,
    marginLeft: 10,
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  userInfoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  userInfoContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 10,
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  userInfoLabel: {
    color: '#E0E0E0',
    fontSize: 14,
  },
  userInfoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  filterContainer: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 10,
  },
  activeFilterButton: {
    backgroundColor: '#8B4513',
  },
  filterButtonText: {
    color: '#E0E0E0',
    fontSize: 14,
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  autoReloadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 20,
  },
  autoReloadText: {
    color: '#E0E0E0',
    marginRight: 10,
  },
  markAllReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginBottom: 10,
  },
  markAllReadText: {
    color: '#8B4513',
    marginLeft: 5,
    fontWeight: '500',
  },
  markAllReadTextDisabled: {
    color: '#999',
  },
  listContainer: {
    padding: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    position: 'relative',
  },
  unreadNotification: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#E0E0E0',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e74c3c',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4A2C2A',
  },
  loadingText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4A2C2A',
    padding: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
  },
  errorSubText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  emptySubText: {
    color: '#E0E0E0',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
});
