import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Dimensions,
  Modal,
  ActivityIndicator,
  Animated,
  RefreshControl,
  PanResponder,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { db } from '@/config/firebase';
import { collection, getDocs, doc, updateDoc, serverTimestamp, query, where, and, onSnapshot, orderBy } from 'firebase/firestore';
import { useApp } from '@/contexts/AppContext';
import Device from 'react-native-device-info';
import { Colors, ThemeType } from '../../constants/Colors';
import { useColorScheme } from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import { coffeeAlert } from '@/utils/coffeeAlert';
const { width, height } = Dimensions.get('window');

// Interface para os dados de pagamento
interface PaymentData {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  method: string;
  receiptImage?: string;
  installments?: number;
  pixCode?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Interface para os dados de assinatura
interface SubscriptionData {
  id: string;
  userId: string;
  userName: string;
  status: 'active' | 'inactive';
  plan: string;
  startDate: Date;
  endDate: Date;
}

interface FirestoreSubscriptionData {
  userId: string;
  userName: string;
  plan: string;
  startDate: { toDate(): Date };
  endDate: { toDate(): Date };
  status: 'active' | 'inactive';
}

interface PinchContext extends Record<string, unknown> {
  startScale: number;
}

interface PanContext extends Record<string, unknown> {
  startX: number;
  startY: number;
}

export default function AdminScreen() {
  const { syncWithFirebase } = useApp();
  const [activeTab, setActiveTab] = useState<'payments' | 'subscriptions'>('payments');
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PaymentData | SubscriptionData | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReceiptImage, setShowReceiptImage] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [loadingActionType, setLoadingActionType] = useState<string | null>(null);
  const [isSuperAdminDevice, setIsSuperAdminDevice] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('default');
  const systemColorScheme = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderGrant: () => true,
      onPanResponderMove: () => true,
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > width * 0.2) {
          if (gestureState.dx > 0 && activeTab === 'subscriptions') {
            setActiveTab('payments');
          } else if (gestureState.dx < 0 && activeTab === 'payments') {
            setActiveTab('subscriptions');
          }
        }
      },
    })
  ).current;

  useEffect(() => {
    checkAdminStatus();
    checkSuperAdminDevice();
    setupRealtimeListeners();
    
    if (isSuperAdminDevice) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isSuperAdminDevice]);

  useEffect(() => {
    const loadTheme = async () => {
      const selectedTheme = await AsyncStorage.getItem('selectedTheme');
      const followSystem = await AsyncStorage.getItem('followSystemTheme');
      
      if (followSystem === 'true') {
        setCurrentTheme(systemColorScheme as ThemeType || 'default');
      } else if (selectedTheme) {
        setCurrentTheme(selectedTheme as ThemeType);
      }
    };
    
    loadTheme();
  }, [systemColorScheme]);

  const checkAdminStatus = async () => {
    try {
      const adminStatus = await AsyncStorage.getItem('isAdmin');
      setIsAdmin(adminStatus === 'true');
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const checkSuperAdminDevice = async () => {
    try {
      const isSuperAdmin = await AsyncStorage.getItem('isSuperAdmin');
      console.log('isSuperAdmin', isSuperAdmin);
      setIsSuperAdminDevice(isSuperAdmin === 'true');
    } catch (error) {
      console.error('Erro ao verificar dispositivo:', error);
    }
  };

  const setupRealtimeListeners = () => {
    try {
      console.log('Setting up real-time listeners...');
      
      // Query for payments
      const paymentsQuery = query(
        collection(db, 'payments'),
        orderBy('createdAt', 'desc')
      );
      
      console.log('Created payments query');
      
      // Set up real-time listener for payments
      const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
        console.log('Received payments snapshot with', snapshot.docs.length, 'documents');
        
        const paymentsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId || '',
            userName: data.userName || '',
            amount: data.amount || 0,
            status: data.status || 'pending',
            date: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
            method: data.method || 'pix',
            receiptImage: data.receiptImage || '',
            installments: data.installments || 1,
            pixCode: data.pixCode || '',
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : undefined
          } as PaymentData;
        });
        
        // Sort payments to prioritize pending ones
        const sortedPayments = paymentsData.sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
        
        console.log('Setting payments:', sortedPayments.length);
        setPayments(sortedPayments);
        setIsLoading(false);
      }, (error) => {
        console.error('Error listening to payments:', error);
        setIsLoading(false);
      });
      
      // Set up real-time listener for users
      const usersQuery = query(collection(db, 'users'));
      console.log('Created users query');
      
      const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        console.log('Received users snapshot with', snapshot.docs.length, 'documents');
        
        const usersData = snapshot.docs.map(docSnapshot => {
          const data = docSnapshot.data();
          return {
            id: docSnapshot.id,
            userId: docSnapshot.id,
            userName: data.userName || 'Usuário sem nome',
            status: (data.subscriptionStatus || 'inactive') as 'active' | 'inactive',
            plan: data.plan || 'Básico',
            startDate: data.subscriptionStartDate ? data.subscriptionStartDate.toDate() : new Date(),
            endDate: data.subscriptionEndDate ? data.subscriptionEndDate.toDate() : new Date()
          } as SubscriptionData;
        });
        
        const sortedUsers = usersData.sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          return a.userName.localeCompare(b.userName);
        });
        
        console.log('Setting subscriptions:', sortedUsers.length);
        setSubscriptions(sortedUsers);
        setIsLoading(false);
      }, (error) => {
        console.error('Error listening to users:', error);
        setIsLoading(false);
      });
      
      return () => {
        console.log('Cleaning up listeners...');
        unsubscribePayments();
        unsubscribeUsers();
      };
    } catch (error) {
      console.error('Error setting up real-time listeners:', error);
      setIsLoading(false);
    }
  };

  const handleViewDetails = (item: PaymentData | SubscriptionData) => {
    setSelectedItem(item);
    setIsModalVisible(true);
  };

  const handleApprovePayment = async (payment: PaymentData) => {
    try {
      setIsActionLoading(true);
      setLoadingActionType('approve');
      
      const paymentRef = doc(db, 'payments', payment.id);
      await updateDoc(paymentRef, { status: 'approved' });
      const userRef = doc(db, 'users', payment.userId);
      
      // Calculate date one month in the future
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
      
      await updateDoc(userRef, { 
        subscriptionStatus: 'active', 
        subscriptionStartDate: new Date(),
        subscriptionEndDate: oneMonthFromNow 
      });
      
      // Recarregar dados após aprovar o pagamento
      await syncWithFirebase();
      await setupRealtimeListeners();
      
      setIsModalVisible(false);
      coffeeAlert('Pagamento aprovado com sucesso!', 'success');
    } catch (error) {
      console.error('Error approving payment:', error);
      coffeeAlert('Não foi possível aprovar o pagamento. Tente novamente.', 'error');
    } finally {
      setIsActionLoading(false);
      setLoadingActionType(null);
    }
  };

  const handleRejectPayment = async (payment: PaymentData) => {
    try {
      setIsActionLoading(true);
      setLoadingActionType('reject');
      
      const paymentRef = doc(db, 'payments', payment.id);
      await updateDoc(paymentRef, { status: 'rejected' });

      const userRef = doc(db, 'users', payment.userId);
      await updateDoc(userRef, { subscriptionStatus: 'rejected' });
      
      // Recarregar dados após rejeitar o pagamento
      await syncWithFirebase();
      await setupRealtimeListeners();
      
      coffeeAlert('Pagamento rejeitado com sucesso!', 'success');
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error rejecting payment:', error);
      coffeeAlert('Não foi possível rejeitar o pagamento. Tente novamente.', 'error');
    } finally {
      setIsActionLoading(false);
      setLoadingActionType(null);
    }
  };

  const handleToggleSubscription = async (subscription: SubscriptionData) => {
    try {
      setIsActionLoading(true);
      setLoadingActionType(subscription.status === 'active' ? 'deactivate' : 'activate');
      const adm = await AsyncStorage.getItem('isAdmin');
      if (adm !== 'true') {
        coffeeAlert('Você não tem permissão para alterar o status da assinatura.', 'error');
        router.push('/(tabs)');
        return;
      }
      // Get the user document reference
      const userRef = doc(db, 'users', subscription.userId);
      
      // Determine the new status
      const newStatus = subscription.status === 'active' ? 'inactive' as const : 'active' as const;
      
      // Update the user's subscription status in Firestore
      await updateDoc(userRef, { 
        subscriptionStatus: newStatus,
        // If activating, set start date to now and end date to 30 days from now
        ...(newStatus === 'active' ? {
          subscriptionStartDate: new Date(),
          subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        } : {})
      });
      
      // Update local state
      const updatedSubscriptions = subscriptions.map(s => 
        s.id === subscription.id ? { 
          ...s, 
          status: newStatus,
          // If activating, update both start and end dates
          ...(newStatus === 'active' ? {
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          } : {})
        } : s
      );
      
      setSubscriptions(updatedSubscriptions);
      setIsModalVisible(false);
      
      // Refresh data
      await syncWithFirebase();
    } catch (error) {
      console.error('Erro ao alterar status da assinatura:', error);
        coffeeAlert('Não foi possível alterar o status da assinatura.', 'error');
    } finally {
      setIsActionLoading(false);
      setLoadingActionType(null);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return '#4CAF50'; // Verde
      case 'pending':
      case 'avaliando':
        return '#FFC107'; // Amarelo
      case 'rejected':
      case 'inactive':
        return '#F44336'; // Vermelho
      default:
        return '#9E9E9E'; // Cinza
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprovado';
      case 'pending':
        return 'Pendente';
      case 'rejected':
        return 'Rejeitado';
      case 'active':
        return 'Ativa';
      case 'avaliando':
        return 'Em Análise';
      case 'inactive':
        return 'Inativa';
      default:
        return status;
    }
  };

  const filteredPayments = payments.filter(payment => 
    payment.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payment.id.includes(searchQuery)
  );

  const filteredSubscriptions = subscriptions.filter(subscription => 
    subscription.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subscription.id.includes(searchQuery)
  );

  const renderPaymentItem = ({ item }: { item: PaymentData }) => {
    console.log('Rendering payment item:', item);
    return (
      <TouchableOpacity
        style={[styles.paymentItem, { backgroundColor: Colors[currentTheme].cardBackground }]}
        onPress={() => handleViewDetails(item)}
      >
        <View style={styles.paymentHeader}>
          <Text style={[styles.paymentUserName, { color: Colors[currentTheme].textLight }]}>{item.userName}</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: 
              item.status === 'approved' ? Colors[currentTheme].success :
              item.status === 'rejected' ? Colors[currentTheme].error : Colors[currentTheme].warning
            }
          ]}>
            <Text style={styles.statusText}>
              {item.status === 'approved' ? 'Aprovado' :
               item.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
            </Text>
          </View>
        </View>
        <View style={styles.paymentDetails}>
          <Text style={[styles.paymentAmount, { color: Colors[currentTheme].textLight }]}>R$ {item.amount.toFixed(2)}</Text>
          <Text style={[styles.paymentDate, { color: Colors[currentTheme].textLight }]}>{item.date}</Text>
        </View>
        {item.receiptImage && (
          <TouchableOpacity
            style={[styles.viewReceiptButton, { backgroundColor: Colors[currentTheme].primary }]}
            onPress={() => {
              setSelectedItem(item);
              setShowReceiptImage(true);
            }}
          >
            <Ionicons name="image" size={16} color={Colors[currentTheme].textLight} />
            <Text style={[styles.viewReceiptText, { color: Colors[currentTheme].textLight }]}>Ver Comprovante</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderSubscriptionItem = ({ item }: { item: SubscriptionData }) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.item, { backgroundColor: Colors[currentTheme].cardBackground }]}
      onPress={() => handleViewDetails(item)}
    >
      <View style={styles.itemHeader}>
        <Text style={[styles.itemTitle, { color: Colors[currentTheme].textLight }]}>{item.userName}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'active' ? Colors[currentTheme].success : Colors[currentTheme].error }
        ]}>
          <Text style={styles.statusText}>
            {item.status === 'active' ? 'Ativo' : 'Inativo'}
          </Text>
        </View>
      </View>
      <View style={styles.itemDetails}>
        <Text style={[styles.itemDetail, { color: Colors[currentTheme].textLight }]}>{item.plan}</Text>
        <Text style={[styles.dateText, { color: Colors[currentTheme].textLight }]}>
          {formatDate(item.startDate)} - {formatDate(item.endDate)}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            item.status === 'active' ? styles.deactivateButton : styles.activateButton,
            { backgroundColor: item.status === 'active' ? Colors[currentTheme].error : Colors[currentTheme].success }
          ]}
          onPress={() => handleToggleSubscription(item)}
          disabled={isActionLoading}
        >
          {isActionLoading && loadingActionType === (item.status === 'active' ? 'deactivate' : 'activate') ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.actionButtonText}>
              {item.status === 'active' ? 'Desativar' : 'Ativar'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderPaymentModal = () => (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setIsModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: Colors[currentTheme].background }]}>
          <Text style={[styles.modalTitle, { color: Colors[currentTheme].textLight }]}>Detalhes do Pagamento</Text>
          
          {selectedItem && 'amount' in selectedItem && (
            <>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: Colors[currentTheme].textLight }]}>Usuário:</Text>
                <Text style={[styles.modalValue, { color: Colors[currentTheme].textLight }]}>{selectedItem.userName}</Text>
              </View>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: Colors[currentTheme].textLight }]}>Valor:</Text>
                <Text style={[styles.modalValue, { color: Colors[currentTheme].textLight }]}>R$ {selectedItem.amount.toFixed(2)}</Text>
              </View>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: Colors[currentTheme].textLight }]}>Data:</Text>
                <Text style={[styles.modalValue, { color: Colors[currentTheme].textLight }]}>{selectedItem.date}</Text>
              </View>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: Colors[currentTheme].textLight }]}>Método:</Text>
                <Text style={[styles.modalValue, { color: Colors[currentTheme].textLight }]}>
                  {selectedItem.method === 'credit_card' ? 'Cartão de Crédito' : 'PIX'}
                </Text>
              </View>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: Colors[currentTheme].textLight }]}>Status:</Text>
                <Text style={[
                  styles.modalValue,
                  { color: 
                    selectedItem.status === 'approved' ? Colors[currentTheme].success :
                    selectedItem.status === 'rejected' ? Colors[currentTheme].error : Colors[currentTheme].warning
                  }
                ]}>
                  {selectedItem.status === 'approved' ? 'Aprovado' :
                   selectedItem.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                </Text>
              </View>

              {(selectedItem.status === 'pending' || selectedItem.status === 'rejected') && (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: Colors[currentTheme].error }]}
                    onPress={() => handleRejectPayment(selectedItem as PaymentData)}
                    disabled={isActionLoading}
                  >
                    {isActionLoading && loadingActionType === 'reject' ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalButtonText}>Rejeitar</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: Colors[currentTheme].success }]}
                    onPress={() => handleApprovePayment(selectedItem as PaymentData)}
                    disabled={isActionLoading}
                  >
                    {isActionLoading && loadingActionType === 'approve' ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalButtonText}>Aprovar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
          
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: Colors[currentTheme].cardBackground }]}
            onPress={() => setIsModalVisible(false)}
          >
            <Text style={[styles.closeButtonText, { color: Colors[currentTheme].textLight }]}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderSubscriptionModal = () => (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setIsModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: Colors[currentTheme].cardBackground }]}>
          <Text style={[styles.modalTitle, { color: Colors[currentTheme].textLight }]}>Detalhes da Assinatura</Text>
          
          {selectedItem && 'plan' in selectedItem && (
            <>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: Colors[currentTheme].textLight }]}>Usuário:</Text>
                <Text style={[styles.modalValue, { color: Colors[currentTheme].textLight }]}>{selectedItem.userName}</Text>
              </View>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: Colors[currentTheme].textLight }]}>Plano:</Text>
                <Text style={[styles.modalValue, { color: Colors[currentTheme].textLight }]}>{selectedItem.plan}</Text>
              </View>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: Colors[currentTheme].textLight }]}>Data de Início:</Text>
                <Text style={[styles.modalValue, { color: Colors[currentTheme].textLight }]}>{formatDate(selectedItem.startDate)}</Text>
              </View>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: Colors[currentTheme].textLight }]}>Data de Término:</Text>
                <Text style={[styles.modalValue, { color: Colors[currentTheme].textLight }]}>{formatDate(selectedItem.endDate)}</Text>
              </View>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: Colors[currentTheme].textLight }]}>Status:</Text>
                <Text style={[
                  styles.modalValue,
                  { color: selectedItem.status === 'active' ? Colors[currentTheme].success : Colors[currentTheme].error }
                ]}>
                  {selectedItem.status === 'active' ? 'Ativo' : 'Inativo'}
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    { backgroundColor: selectedItem.status === 'active' ? Colors[currentTheme].error : Colors[currentTheme].success }
                  ]}
                  onPress={() => handleToggleSubscription(selectedItem as SubscriptionData)}
                  disabled={isActionLoading}
                >
                  {isActionLoading && loadingActionType === (selectedItem.status === 'active' ? 'deactivate' : 'activate') ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalButtonText}>
                      {selectedItem.status === 'active' ? 'Desativar' : 'Ativar'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
          
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: Colors[currentTheme].cardBackground }]}
            onPress={() => setIsModalVisible(false)}
          >
            <Text style={[styles.closeButtonText, { color: Colors[currentTheme].textLight }]}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderPaymentDetails = () => {
    if (!selectedItem || !('amount' in selectedItem)) return null;
    
    const payment = selectedItem as PaymentData;
    
    return (
      <View style={[styles.modalContent, { backgroundColor: Colors[currentTheme].cardBackground }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: Colors[currentTheme].textLight }]}>Detalhes do Pagamento</Text>
          <TouchableOpacity onPress={() => setIsModalVisible(false)}>
            <Ionicons name="close" size={24} color={Colors[currentTheme].textLight} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalBody}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: Colors[currentTheme].textLight }]}>Usuário:</Text>
            <Text style={[styles.detailValue, { color: Colors[currentTheme].textLight }]}>{payment.userName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: Colors[currentTheme].textLight }]}>Valor:</Text>
            <Text style={[styles.detailValue, { color: Colors[currentTheme].textLight }]}>R$ {payment.amount.toFixed(2)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: Colors[currentTheme].textLight }]}>Data:</Text>
            <Text style={[styles.detailValue, { color: Colors[currentTheme].textLight }]}>{payment.date}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: Colors[currentTheme].textLight }]}>Método:</Text>
            <Text style={[styles.detailValue, { color: Colors[currentTheme].textLight }]}>
              {payment.method === 'pix' ? 'PIX' : 
               payment.method === 'credit' ? 'Cartão de Crédito' : 
               payment.method === 'debit' ? 'Cartão de Débito' : payment.method}
            </Text>
          </View>
          
          {payment.installments && payment.installments > 1 && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: Colors[currentTheme].textLight }]}>Parcelas:</Text>
              <Text style={[styles.detailValue, { color: Colors[currentTheme].textLight }]}>{payment.installments}x</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: Colors[currentTheme].textLight }]}>Status:</Text>
            <Text style={[
              styles.detailValue,
              { color: 
                payment.status === 'approved' ? Colors[currentTheme].success :
                payment.status === 'rejected' ? Colors[currentTheme].error : Colors[currentTheme].warning
              }
            ]}>
              {payment.status === 'approved' ? 'Aprovado' :
               payment.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
            </Text>
          </View>
          
          {payment.receiptImage && (
            <View style={[styles.receiptContainer, { backgroundColor: Colors[currentTheme].cardBackground }]}>
              <Text style={[styles.receiptTitle, { color: Colors[currentTheme].textLight }]}>Comprovante de Pagamento</Text>
              <TouchableOpacity
                style={[styles.viewReceiptButton, { backgroundColor: Colors[currentTheme].primary }]}
                onPress={() => {
                  setShowReceiptImage(true);
                }}
              >
                <Ionicons name="image" size={16} color={Colors[currentTheme].textLight} />
                <Text style={styles.viewReceiptText}>Ver Comprovante</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {payment.status === 'pending' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: Colors[currentTheme].error }]}
                onPress={() => handleRejectPayment(payment)}
              >
                <Text style={styles.actionButtonText}>Rejeitar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: Colors[currentTheme].success }]}
                onPress={() => handleApprovePayment(payment)}
              >
                <Text style={styles.actionButtonText}>Aprovar</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderReceiptModal = () => {
    if (!showReceiptImage || !selectedItem || !('receiptImage' in selectedItem) || !selectedItem.receiptImage) return null;

    const images = [{
      url: selectedItem.receiptImage
    }];

    return (
      <Modal
        visible={showReceiptImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReceiptImage(false)}
      >
        <View style={styles.receiptModalOverlay}>
          <TouchableOpacity 
            style={styles.receiptModalCloseButton}
            onPress={() => setShowReceiptImage(false)}
          >
            <Ionicons name="close-circle" size={30} color="#fff" />
          </TouchableOpacity>
          <ImageViewer
            imageUrls={images}
            enableSwipeDown
            onSwipeDown={() => setShowReceiptImage(false)}
            backgroundColor="rgba(0,0,0,0.9)"
            saveToLocalByLongPress={false}
            onClick={() => setShowReceiptImage(false)}
          />
        </View>
      </Modal>
    );
  };

  // Add a refresh handler function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await setupRealtimeListeners();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[currentTheme].background }]}>
      <LinearGradient
        colors={[Colors[currentTheme].gradientStart, Colors[currentTheme].gradientEnd]}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity >
          </TouchableOpacity>
        </View>

        <View style={[styles.tabContainer, { backgroundColor: Colors[currentTheme].cardBackground }]}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'payments' && { backgroundColor: Colors[currentTheme].primary }]}
            onPress={() => setActiveTab('payments')}
          >
            <Text style={[styles.tabText, activeTab === 'payments' && { color: Colors[currentTheme].textLight }]}>
              Pagamentos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'subscriptions' && { backgroundColor: Colors[currentTheme].primary }]}
            onPress={() => setActiveTab('subscriptions')}
          >
            <Text style={[styles.tabText, activeTab === 'subscriptions' && { color: Colors[currentTheme].textLight }]}>
              Assinaturas
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: Colors[currentTheme].cardBackground }]}>
          <Ionicons name="search" size={20} color={Colors[currentTheme].textLight} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: Colors[currentTheme].textLight }]}
            placeholder="Buscar por nome ou ID..."
            placeholderTextColor={Colors[currentTheme].textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors[currentTheme].textLight} />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors[currentTheme].primary} />
          </View>
        ) : (
          <View {...panResponder.panHandlers} style={{ flex: 1 }}>
            <ScrollView 
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[Colors[currentTheme].primary]}
                  tintColor={Colors[currentTheme].primary}
                />
              }
            >
              {activeTab === 'payments' ? (
                filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <View key={payment.id}>
                      {renderPaymentItem({ item: payment })}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={50} color={Colors[currentTheme].textLight} />
                    <Text style={[styles.emptyText, { color: Colors[currentTheme].textLight }]}>
                      Nenhum pagamento encontrado
                    </Text>
                  </View>
                )
              ) : (
                filteredSubscriptions.length > 0 ? (
                  filteredSubscriptions.map((subscription) => (
                    <View key={subscription.id}>
                      {renderSubscriptionItem({ item: subscription })}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={50} color={Colors[currentTheme].textLight} />
                    <Text style={[styles.emptyText, { color: Colors[currentTheme].textLight }]}>
                      Nenhuma assinatura encontrada
                    </Text>
                  </View>
                )
              )}
              <View style={styles.bottomPadding} />
            </ScrollView>
          </View>
        )}

        {activeTab === 'payments' ? renderPaymentModal() : renderSubscriptionModal()}
        
        {renderReceiptModal()}

        {isSuperAdminDevice && (
          <Animated.View style={[
            styles.floatingSuperAdminButton,
            { transform: [{ scale: pulseAnim }] }
          ]}>
            <TouchableOpacity
              onPress={() => router.push('/telas_extras/super_admin')}
            >
              <LinearGradient
                colors={[Colors[currentTheme].primary, Colors[currentTheme].accent]}
                style={styles.floatingSuperAdminGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.floatingSuperAdminIconContainer, { backgroundColor: Colors[currentTheme].cardBackground }]}>
                  <Ionicons name="shield-checkmark" size={24} color={Colors[currentTheme].textLight} />
                </View>
                <Text style={[styles.floatingSuperAdminButtonText, { color: Colors[currentTheme].textLight }]}>Super Admin</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: StatusBar.currentHeight,
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: height * 0.03,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  item: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemDetails: {
    marginTop: 5,
  },
  itemDetail: {
    fontSize: 14,
    marginBottom: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '90%',
    borderRadius: 15,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 16,
  },
  modalValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  receiptContainer: {
    marginTop: 15,
    padding: 10,
    borderRadius: 8,
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  viewReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  viewReceiptText: {
    fontSize: 12,
    marginLeft: 5,
  },
  receiptModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  receiptModalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  receiptImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptModalImage: {
    width: width,
    height: height * 0.8,
    resizeMode: 'contain',
  },
  modalBody: {
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 16,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100, // Add extra padding at the bottom for the floating button
  },
  bottomPadding: {
    height: 20,
  },
  paymentItem: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentUserName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentAmount: {
    fontSize: 14,
  },
  paymentDate: {
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  modalButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 14,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  activateButton: {
    backgroundColor: '#4CAF50',
  },
  deactivateButton: {
    backgroundColor: '#F44336',
  },
  floatingSuperAdminButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    zIndex: 1000,
  },
  floatingSuperAdminGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
  },
  floatingSuperAdminIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  floatingSuperAdminButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gestureContainer: {
    flex: 1,
  },
}); 