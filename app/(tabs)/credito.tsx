import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  StatusBar,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { db, auth } from '@/config/firebase';
import { doc, onSnapshot, collection, query, where, orderBy, getDoc } from 'firebase/firestore';
import { Colors, ThemeType } from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import { coffeeAlert } from '@/utils/coffeeAlert';

const { width,height } = Dimensions.get('window');

interface SystemSettings {
  subscriptionPrices: {
    monthly: number;
  };
  pixKey: string;
  [key: string]: any;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  status: string;
  receiptImage: string | null;
}

export default function CreditScreen() {
  const { userCredit, subscriptionStatus, subscriptionEndDate, syncWithFirebase } = useApp();
  const [userData, setUserData] = useState({
    credit: 0,
    subscriptionStatus: 'inactive',
    subscriptionEndDate: null as string | null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [transactions, setTransactions] = useState<Array<{
    id: string;
    amount: number;
    status: string;
    date: string;
    type: string;
  }>>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const systemColorScheme = useColorScheme();
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('default');
  const [settings, setSettings] = useState<SystemSettings>({
    subscriptionPrices: {
      monthly: 25.00
    },
    pixKey: '+5566999086599'
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showReceiptImage, setShowReceiptImage] = useState(false);

  // Initial load
  useEffect(() => {
    loadUserData();
    loadTheme();
    loadSystemSettings();
    
    // Configurar listeners do Firestore para atualizações automáticas
    setupFirestoreListeners();
    
    // Limpar listeners quando o componente for desmontado
    return () => {
      // Os listeners serão limpos automaticamente quando o componente for desmontado
    };
  }, [systemColorScheme]);

  const loadTheme = async () => {
    const theme = await AsyncStorage.getItem('selectedTheme');
    const followSystem = await AsyncStorage.getItem('followSystemTheme');
    if (followSystem === 'true') {
      setCurrentTheme(systemColorScheme as ThemeType || 'default');
    } else {
      setCurrentTheme(theme as ThemeType || 'default');
    }
  };

  const loadSystemSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings','Um2M0ZVZ9CBbkoWKhYHR'));
      console.log(settingsDoc)
      if (settingsDoc.exists()) {
        const settingsData = settingsDoc.data() as SystemSettings;
        console.log(settingsData)
        setSettings(settingsData);
      }
    } catch (error) {
      console.log('Erro ao carregar configurações do sistema:', error);
      console.error('Erro ao carregar configurações do sistema:', error);
    }
  };

  // Reload data when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadUserData();
      console.log('Credit screen focused, refreshing data...');
      refreshAllData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      // Sincronizar com o Firebase para obter os dados mais recentes
      await syncWithFirebase();
      const subscriptionStatus = await AsyncStorage.getItem('subscriptionStatus');
      setUserData({
        credit: userCredit,
        subscriptionStatus: subscriptionStatus || 'inactive',
        subscriptionEndDate: subscriptionEndDate,
      });
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Função para atualizar todos os dados da tela
  const refreshAllData = async () => {
    try {
      // Atualizar dados do contexto
      await syncWithFirebase();
      
      // Atualizar dados do usuário
      const subscriptionStatus = await AsyncStorage.getItem('subscriptionStatus');
      setUserData({
        credit: userCredit,
        subscriptionStatus: subscriptionStatus || 'inactive',
        subscriptionEndDate: subscriptionEndDate,
      });
      
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
      await refreshTransactions();
      loadSystemSettings();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Função para configurar os listeners do Firestore
  const setupFirestoreListeners = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) return;
      
      console.log('Configurando listeners do Firestore para atualizações automáticas na tela de crédito');
      
      // Listener para dados do usuário
      const userDocRef = doc(db, 'users', userToken);
      const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          console.log('Dados do usuário atualizados no Firestore (tela de crédito)');
          handleUpdate();
        }
      }, (error) => {
        console.error('Erro no listener de dados do usuário:', error);
      });
      
      // Listener para notificações do usuário
      const userNotificationsRef = doc(db, 'notifications', userToken);
      const unsubscribeNotifications = onSnapshot(userNotificationsRef, (doc) => {
        if (doc.exists()) {
          console.log('Notificações do usuário atualizadas no Firestore (tela de crédito)');
          handleUpdate();
        }
      }, (error) => {
        console.error('Erro no listener de notificações do usuário:', error);
      });
      
      // Listener para notificações globais
      const globalNotificationsRef = doc(db, 'globalNotifications', 'global');
      const unsubscribeGlobal = onSnapshot(globalNotificationsRef, (doc) => {
        if (doc.exists()) {
          console.log('Notificações globais atualizadas no Firestore (tela de crédito)');
          handleUpdate();
        }
      }, (error) => {
        console.error('Erro no listener de notificações globais:', error);
      });
      
      // Armazenar as funções de limpeza para serem chamadas quando o componente for desmontado
      return () => {
        unsubscribeUser();
        unsubscribeNotifications();
        unsubscribeGlobal();
      };
    } catch (error) {
      console.error('Erro ao configurar listeners do Firestore:', error);
    }
  };

  // Função para lidar com atualizações
  const handleUpdate = () => {
    setLastUpdateTime(new Date());
    setUpdateCount(prev => prev + 1);
    refreshAllData();
  };

  const handleAddCredit = async (amount: number) => {
    try {
      const newCredit = userData.credit + amount;
      await AsyncStorage.setItem('userCredit', newCredit.toString());
      await syncWithFirebase();
      coffeeAlert(`R$ ${amount.toFixed(2)} adicionados ao seu saldo!`, 'success');

    } catch (error) {
      coffeeAlert('Não foi possível adicionar crédito. Tente novamente.', 'error');
    }
  };

  const handleSubscribe = async () => {
    try {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      router.push({
        pathname: '/telas_extras/pagamento',
        params: { 
          valor: settings.subscriptionPrices.monthly.toString(),
          chave_pix: settings.pixKey
        }
      });
      return;
    } catch (error) {
      coffeeAlert('Não foi possível ativar a assinatura. Tente novamente.', 'error');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const setupTransactionListener = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        console.log('No user token found');
        return;
      }

      console.log('Setting up transaction listener for user:', userToken);

      // Remove any existing listener before setting up a new one
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // Temporarily using a simpler query while the index is being created
      const transactionsQuery = query(
        collection(db, 'payments'),
        where('userId', '==', userToken)
      );

      const unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
        
        const transactionsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            amount: data.amount || 0,
            status: data.status || 'pending',
            date: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
            type: data.type || 'payment',
            receiptImage: data.receiptImage || null
          };
        });

        // Sort the transactions by date manually
        const sortedTransactions = transactionsData.sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        console.log('Setting transactions:', sortedTransactions);
        setTransactions(sortedTransactions);
      }, (error) => {
        console.error('Error listening to transactions:', error);
      });

      // Store the unsubscribe function in the ref
      unsubscribeRef.current = unsubscribe;

      return () => {
        console.log('Cleaning up transaction listener');
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error setting up transaction listener:', error);
    }
  };

  useEffect(() => {
    console.log('Setting up transaction listener on mount');
    setupTransactionListener();
    
    return () => {
      console.log('Component unmounting, cleanup will be handled by onSnapshot');
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Add a function to manually refresh transactions
  const refreshTransactions = async () => {
    console.log('Manually refreshing transactions');
    await setupTransactionListener();
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2)}`;
  };

  const getTransactionTitle = (type: string, status: string) => {
    if (type === 'payment') {
      return status === 'approved' ? 'Pagamento Aprovado' : 
             status === 'pending' ? 'Pagamento Pendente' : 
             'Pagamento Rejeitado';
    }
    return 'Transação';
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalVisible(true);
  };

  const renderTransactionModal = () => (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setIsModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: Colors[currentTheme].background }]}>
          <Text style={[styles.modalTitle, { color: Colors[currentTheme].textLight }]}>Detalhes da Transação</Text>
          
          {selectedTransaction && (
            <>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: Colors[currentTheme].textLight }]}>Tipo:</Text>
                <Text style={[styles.modalValue, { color: Colors[currentTheme].textLight }]}>
                  {getTransactionTitle(selectedTransaction.type, selectedTransaction.status)}
                </Text>
              </View>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: Colors[currentTheme].textLight }]}>Valor:</Text>
                <Text style={[styles.modalValue, { color: Colors[currentTheme].textLight }]}>
                  {formatCurrency(selectedTransaction.amount)}
                </Text>
              </View>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: Colors[currentTheme].textLight }]}>Data:</Text>
                <Text style={[styles.modalValue, { color: Colors[currentTheme].textLight }]}>
                  {selectedTransaction.date}
                </Text>
              </View>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: Colors[currentTheme].textLight }]}>Status:</Text>
                <Text style={[
                  styles.modalValue,
                  { color: 
                    selectedTransaction.status === 'approved' ? Colors[currentTheme].success :
                    selectedTransaction.status === 'pending' ? Colors[currentTheme].warning : Colors[currentTheme].error
                  }
                ]}>
                  {selectedTransaction.status === 'approved' ? 'Aprovado' :
                   selectedTransaction.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                </Text>
              </View>

              {selectedTransaction.receiptImage && (
                <TouchableOpacity
                  style={[styles.viewReceiptButton, { backgroundColor: Colors[currentTheme].primary }]}
                  onPress={() => setShowReceiptImage(true)}
                >
                  <Ionicons name="receipt-outline" size={20} color={Colors[currentTheme].textLight} />
                  <Text style={[styles.viewReceiptText, { color: Colors[currentTheme].textLight }]}>Ver Comprovante</Text>
                </TouchableOpacity>
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

  const renderReceiptModal = () => {
    if (!showReceiptImage || !selectedTransaction || !selectedTransaction.receiptImage) return null;

    const images = [{
      url: selectedTransaction.receiptImage
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[currentTheme].background }]}>
      <LinearGradient
        colors={[Colors[currentTheme].gradientStart, Colors[currentTheme].gradientEnd]}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.header}>
            <View style={[styles.creditCard, { backgroundColor: Colors[currentTheme].cardBackground }]}>
              <Text style={[styles.creditTitle, { color: Colors[currentTheme].textLight }]}>Saldo Disponível</Text>
              <Text style={[styles.creditAmount, { color: Colors[currentTheme].textLight }]}>R$ {userData.credit.toFixed(2)}</Text>
              <View style={styles.creditDetails}>
                <Ionicons name="card" size={24} color={Colors[currentTheme].textLight} />
                <Text style={[styles.creditInfo, { color: Colors[currentTheme].textLight }]}>Cafezão Card</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors[currentTheme].textLight }]}>Assinatura Mensal</Text>
            <View style={[styles.subscriptionCard, { backgroundColor: Colors[currentTheme].cardBackground }]}>
              <View style={styles.subscriptionHeader}>
                <Ionicons name="cafe" size={24} color={Colors[currentTheme].primary} />
                <Text style={[styles.subscriptionTitle, { color: Colors[currentTheme].textLight }]}>Cafezão Premium</Text>
              </View>
              <Text style={[styles.subscriptionPrice, { color: Colors[currentTheme].primary }]}>
                R$ {settings.subscriptionPrices.monthly.toFixed(2)}/mês
              </Text>
              <Text style={[styles.subscriptionBenefits, { color: Colors[currentTheme].textLight }]}>
                • 10% de desconto em todos os cafés{'\n'}
                • Acesso a cafés especiais{'\n'}
              </Text>
              {userData.subscriptionStatus === 'active' ? (
                <View style={[styles.activeSubscription, { backgroundColor: Colors[currentTheme].activeSubscription }]}>
                  <Text style={[styles.activeText, { color: Colors[currentTheme].activeText }]}>Assinatura Ativa</Text>
                  <Text style={[styles.endDateText, { color: Colors[currentTheme].endDateText }]}>
                    Válido até: {userData.subscriptionEndDate ? new Date(userData.subscriptionEndDate).toLocaleDateString('pt-BR') : '-'}
                  </Text>
                </View>
              ) : userData.subscriptionStatus === 'avaliando' ? (
                <View style={[styles.evaluatingSubscription, { backgroundColor: Colors[currentTheme].evaluatingSubscription }]}>
                  <Text style={[styles.evaluatingText, { color: Colors[currentTheme].evaluatingText }]}>Pagamento em Análise</Text>
                  <Text style={[styles.evaluatingDescription, { color: Colors[currentTheme].evaluatingDescription }]}>
                    Seu pagamento está sendo verificado. Em breve sua assinatura será ativada.
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.subscribeButton, { backgroundColor: Colors[currentTheme].subscribeButton }]}
                  onPress={handleSubscribe}
                >
                  <Text style={[styles.subscribeButtonText, { color: Colors[currentTheme].subscribeButtonText }]}>Assinar Agora</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors[currentTheme].textLight , display :'none' }]}>Adicionar Crédito</Text>
            <View style={styles.creditOptions}>
              <TouchableOpacity
                style={[styles.creditOption, { backgroundColor: Colors[currentTheme].creditOption }]}
                onPress={() => handleAddCredit(20)}
              >
                <Text style={[styles.creditOptionAmount, { color: Colors[currentTheme].creditOptionAmount }]}>R$ 25,00</Text>
                <Text style={[styles.creditOptionBonus, { color: Colors[currentTheme].creditOptionBonus }]}>+ R$ 3,00 de bônus</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.creditOption, { backgroundColor: Colors[currentTheme].creditOption }]}
                onPress={() => handleAddCredit(50)}
              >
                <Text style={[styles.creditOptionAmount, { color: Colors[currentTheme].creditOptionAmount }]}>R$ 50,00</Text>
                <Text style={[styles.creditOptionBonus, { color: Colors[currentTheme].creditOptionBonus }]}>+ R$ 7,00 de bônus</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.creditOption, { backgroundColor: Colors[currentTheme].creditOption }]}
                onPress={() => handleAddCredit(100)}
              >
                <Text style={[styles.creditOptionAmount, { color: Colors[currentTheme].creditOptionAmount }]}>R$ 100,00</Text>
                <Text style={[styles.creditOptionBonus, { color: Colors[currentTheme].creditOptionBonus }]}>+ R$ 15,00 de bônus</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors[currentTheme].textLight }]}>Histórico de Transações</Text>
            <View style={[styles.transactionList, { backgroundColor: Colors[currentTheme].transactionList }]}>
              {transactions.map((transaction) => (
                <TouchableOpacity 
                  key={transaction.id} 
                  style={[styles.transactionItem, { backgroundColor: Colors[currentTheme].transactionItem }]}
                  onPress={() => handleViewDetails(transaction)}
                >
                  <View style={styles.transactionInfo}>
                    <Text style={[styles.transactionTitle, { color: Colors[currentTheme].transactionTitle }]}>
                      {getTransactionTitle(transaction.type, transaction.status)}
                    </Text>
                    <Text style={[styles.transactionDate, { color: Colors[currentTheme].transactionDate }]}>{transaction.date}</Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { color: transaction.status === 'approved' ? Colors[currentTheme].success : 
                            transaction.status === 'pending' ? Colors[currentTheme].warning : Colors[currentTheme].error }
                  ]}>
                    {formatCurrency(transaction.amount)}
                  </Text>
                </TouchableOpacity>
              ))}
              {transactions.length === 0 && (
                <Text style={[styles.emptyText, { color: Colors[currentTheme].emptyText }]}>Nenhuma transação encontrada</Text>
              )}
            </View>
          </View>
        </ScrollView>
      </LinearGradient>

      {renderTransactionModal()}
      {renderReceiptModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop:StatusBar.currentHeight,
    paddingBottom:height*0.056,
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
    padding: 20,
    marginTop: 20,
    display:'none',
  },
  creditCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  creditTitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  creditAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  creditDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditInfo: {
    fontSize: 14,
    marginLeft: 10,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  subscriptionCard: {
    borderRadius: 16,
    padding: 20,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  subscriptionPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  subscriptionBenefits: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
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
  subscribeButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  creditOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    display: 'none',
    flexWrap: 'wrap',
  },
  creditOption: {
    borderRadius: 12,
    padding: 15,
    width: '48%',
    marginBottom: 15,
    alignItems: 'center',
  },
  creditOptionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  creditOptionBonus: {
    fontSize: 12,
    marginTop: 5,
  },
  transactionList: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    marginBottom: 5,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
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
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    height: 50,
    marginTop: 25,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
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
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
    alignSelf: 'center',
    width: '100%',
  },
  viewReceiptText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
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
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
  },
});
