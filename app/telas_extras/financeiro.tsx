import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Animated,
  Modal,
  FlatList,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, query, where, getDocs, doc, orderBy, limit, addDoc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { coffeeAlert } from '@/utils/coffeeAlert';
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

interface FinancialStats {
  totalRevenue: number;
  pendingPayments: number;
  approvedPayments: number;
  rejectedPayments: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
}

const { width, height } = Dimensions.get('window');

const FinanceiroScreen = () => {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'payments' | 'subscriptions'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<FinancialStats>({
    totalRevenue: 0,
    pendingPayments: 0,
    approvedPayments: 0,
    rejectedPayments: 0,
    monthlyRevenue: 0,
    activeSubscriptions: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPayments, setFilteredPayments] = useState<PaymentData[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [isReceiptModalVisible, setIsReceiptModalVisible] = useState(false);
  // Animações
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const tabIndicatorPosition = useState(new Animated.Value(0))[0];

  useEffect(() => {
    checkAccess();
    startAnimation();
    loadData();
  }, []);

  useEffect(() => {
    // Atualizar posição do indicador de tab
    Animated.timing(tabIndicatorPosition, {
      toValue: selectedTab === 'overview' ? 0 : selectedTab === 'payments' ? 1 : 2,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [selectedTab]);

  useEffect(() => {
    const filtered = payments.filter(payment => 
      payment.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.id.includes(searchQuery)
    );
    setFilteredPayments(filtered);
  }, [searchQuery, payments]);

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

  const checkAccess = async () => {
    try {
      const isAdmin = await AsyncStorage.getItem('isAdmin');
      if (isAdmin !== 'true') {
        coffeeAlert('Acesso Negado','error');
        router.back();
        return;
      }
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      coffeeAlert('Ocorreu um erro ao verificar suas permissões.','error');
      router.back();
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar pagamentos
      const paymentsQuery = query(
        collection(db, 'payments'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
        const paymentsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            userName: data.userName,
            amount: data.amount,
            status: data.status,
            date: data.createdAt?.toDate().toLocaleDateString('pt-BR'),
            method: data.method,
            receiptImage: data.receiptImage,
            installments: data.installments,
            pixCode: data.pixCode,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
          } as PaymentData;
        });

        setPayments(paymentsData);
        calculateStats(paymentsData);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      coffeeAlert('Ocorreu um erro ao carregar os dados.','error');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentsData: PaymentData[]) => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      totalRevenue: 0,
      pendingPayments: 0,
      approvedPayments: 0,
      rejectedPayments: 0,
      monthlyRevenue: 0,
      activeSubscriptions: 0
    };

    paymentsData.forEach(payment => {
      if (payment.status === 'approved') {
        stats.totalRevenue += payment.amount;
        if (payment.createdAt >= firstDayOfMonth) {
          stats.monthlyRevenue += payment.amount;
        }
      } else if (payment.status === 'pending') {
        stats.pendingPayments += payment.amount;
      } else if (payment.status === 'rejected') {
        stats.rejectedPayments += payment.amount;
      }
    });

    setStats(stats);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2)}`;
  };
  const renderReceiptModal = () => (
    <Modal
      visible={isReceiptModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setIsReceiptModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <BlurView intensity={80} style={styles.modalBlur}>
          <View style={styles.receiptModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comprovante de Pagamento</Text>
              <TouchableOpacity
                onPress={() => setIsReceiptModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {selectedPayment?.receiptImage && (
              <Image
                source={{ uri: selectedPayment.receiptImage }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
            )}
          </View>
        </BlurView>
      </View>
    </Modal>
  );
  const renderOverview = () => (
    <Animated.View 
      style={[
        styles.content, 
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.statsContainer}>
        <View style={styles.statsCard}>
          <LinearGradient
            colors={['#4CAF50', '#388E3C']}
            style={styles.statsCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="cash" size={32} color="#fff" />
            <Text style={styles.statsValue}>{formatCurrency(stats.totalRevenue)}</Text>
            <Text style={styles.statsLabel}>Receita Total</Text>
          </LinearGradient>
        </View>
        
        <View style={styles.statsCard}>
          <LinearGradient
            colors={['#FFC107', '#FFA000']}
            style={styles.statsCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="calendar" size={32} color="#fff" />
            <Text style={styles.statsValue}>{formatCurrency(stats.monthlyRevenue)}</Text>
            <Text style={styles.statsLabel}>Receita Mensal</Text>
          </LinearGradient>
        </View>
        
        <View style={styles.statsCard}>
          <LinearGradient
            colors={['#2196F3', '#1976D2']}
            style={styles.statsCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="time" size={32} color="#fff" />
            <Text style={styles.statsValue}>{formatCurrency(stats.pendingPayments)}</Text>
            <Text style={styles.statsLabel}>Pagamentos Pendentes</Text>
          </LinearGradient>
        </View>
        
        <View style={styles.statsCard}>
          <LinearGradient
            colors={['#F44336', '#D32F2F']}
            style={styles.statsCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="close-circle" size={32} color="#fff" />
            <Text style={styles.statsValue}>{formatCurrency(stats.rejectedPayments)}</Text>
            <Text style={styles.statsLabel}>Pagamentos Rejeitados</Text>
          </LinearGradient>
        </View>
      </View>
    </Animated.View>
  );

  const renderPayments = () => (
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
            placeholder="Pesquisar por nome ou ID..."
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

      <FlatList
        data={filteredPayments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.paymentCard,
              { 
                borderColor: 
                  item.status === 'approved' ? '#4CAF50' :
                  item.status === 'pending' ? '#FFC107' : '#F44336'
              }
            ]}
            onPress={() => {
              setSelectedPayment(item);
              setIsPaymentModalVisible(true);
            }}
          >
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentTitle}>{item.userName}</Text>
              <View style={[
                styles.statusBadge,
                { 
                  backgroundColor: 
                    item.status === 'approved' ? '#4CAF50' :
                    item.status === 'pending' ? '#FFC107' : '#F44336'
                }
              ]}>
                <Text style={styles.statusText}>
                  {item.status === 'approved' ? 'Aprovado' :
                   item.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                </Text>
              </View>
            </View>
            <Text style={styles.paymentAmount}>{formatCurrency(item.amount)}</Text>
            <Text style={styles.paymentDate}>{item.date}</Text>
            <Text style={styles.paymentMethod}>
              Método: {item.method === 'pix' ? 'PIX' : 'Cartão de Crédito'}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </Animated.View>
  );

  const renderPaymentModal = () => (
    <Modal
      visible={isPaymentModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setIsPaymentModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <BlurView intensity={80} style={styles.modalBlur}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes do Pagamento</Text>
              <TouchableOpacity
                onPress={() => setIsPaymentModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {selectedPayment && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Usuário:</Text>
                  <Text style={styles.modalValue}>{selectedPayment.userName}</Text>
                </View>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Valor:</Text>
                  <Text style={styles.modalValue}>{formatCurrency(selectedPayment.amount)}</Text>
                </View>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Data:</Text>
                  <Text style={styles.modalValue}>{selectedPayment.date}</Text>
                </View>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Método:</Text>
                  <Text style={styles.modalValue}>
                    {selectedPayment.method === 'pix' ? 'PIX' : 'Cartão de Crédito'}
                  </Text>
                </View>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Status:</Text>
                  <Text style={[
                    styles.modalValue,
                    { 
                      color: 
                        selectedPayment.status === 'approved' ? '#4CAF50' :
                        selectedPayment.status === 'pending' ? '#FFC107' : '#F44336'
                    }
                  ]}>
                    {selectedPayment.status === 'approved' ? 'Aprovado' :
                     selectedPayment.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                  </Text>
                </View>
                {selectedPayment.installments && selectedPayment.installments > 1 && (
                  <View style={styles.modalInfo}>
                    <Text style={styles.modalLabel}>Parcelas:</Text>
                    <Text style={styles.modalValue}>{selectedPayment.installments}x</Text>
                  </View>
                )}
                {selectedPayment.receiptImage && (
                  <TouchableOpacity
                    style={styles.viewReceiptButton}
                    onPress={() => {
                      setIsReceiptModalVisible(true);
                    }}
                  >
                    <Ionicons name="image" size={20} color="#fff" />
                    <Text style={styles.viewReceiptText}>Ver Comprovante</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
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
          <Text style={styles.title}>Financeiro</Text>
          <TouchableOpacity
            onPress={onRefresh}
            style={styles.refreshButton}
          >
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setSelectedTab('overview')}
          >
            <Text style={[styles.tabText, selectedTab === 'overview' && styles.selectedTabText]}>
              Visão Geral
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setSelectedTab('payments')}
          >
            <Text style={[styles.tabText, selectedTab === 'payments' && styles.selectedTabText]}>
              Pagamentos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setSelectedTab('subscriptions')}
          >
            <Text style={[styles.tabText, selectedTab === 'subscriptions' && styles.selectedTabText]}>
              Assinaturas
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

        {selectedTab === 'overview' ? renderOverview() : 
         selectedTab === 'payments' ? renderPayments() : 
         renderPayments()}
         {renderPaymentModal()}
         {renderReceiptModal()}
      </LinearGradient>
    </SafeAreaView>
  );
};

export default FinanceiroScreen;

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
  receiptModalContent: {
    width: '90%',
    backgroundColor: 'rgba(42, 42, 42, 0.9)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: height * 0.8,
  },
  receiptImage: {
    width: '100%',
    height: height * 0.6,
    borderRadius: 8,
    marginTop: 16,
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
  refreshButton: {
    padding: 8,
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
  listContent: {
    paddingBottom: 20,
  },
  paymentCard: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
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
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  paymentAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  paymentDate: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 14,
    color: '#999',
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
  modalBody: {
    maxHeight: height * 0.6,
  },
  modalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 16,
    color: '#999',
  },
  modalValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  viewReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4a90e2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    justifyContent: 'center',
  },
  viewReceiptText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
}); 