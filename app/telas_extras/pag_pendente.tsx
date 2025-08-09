import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  useColorScheme,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Share,
  Clipboard,
  Platform,
  StatusBar,
  BackHandler,
  AppState,
  AppStateStatus,
  Linking,
  PermissionsAndroid,
  Vibration,
  ToastAndroid,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { coffeeAlert } from '@/utils/coffeeAlert';
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '@/constants/Colors';

const { width, height } = Dimensions.get('window');

export default function PagPendenteScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isClearingPayments, setIsClearingPayments] = useState(false);
  const [showClearingModal, setShowClearingModal] = useState(false);
  const [clearingProgress, setClearingProgress] = useState<string>('');
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState<string>('default');
  const [colors, setColors] = useState(Colors['default']);
  const [followSystemTheme, setFollowSystemTheme] = useState<boolean>(false);
  const [valor, setValor] = useState(0);
  const [metodoPagamento, setMetodoPagamento] = useState<string>('PIX');
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);
  
  // Novos estados para informações do pagamento em tempo real
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [qrCode, setQrCode] = useState<string>('');
  const [qrCodeBase64, setQrCodeBase64] = useState<string>('');
  const [ticketUrl, setTicketUrl] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [transactionAmount, setTransactionAmount] = useState<number>(0);
  const [transactionStatus, setTransactionStatus] = useState<string>('');
  const [transactionStatusDetail, setTransactionStatusDetail] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<Date | null>(null);
  const [isPaymentIdentified, setIsPaymentIdentified] = useState<boolean>(false);
  const [pagamentoNovo, setPagamentoNovo] = useState<boolean>(false);

  // Função para buscar o último pagamento pendente do usuário
  const buscarUltimoPagamentoPendente = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) return;

      // Buscar pagamentos pendentes do usuário, ordenados por data de criação (mais recente primeiro)
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('status', '==', 'pending'),
        where('userId', '==', userToken)
        // Note: Firestore não suporta ordenação com where, então vamos ordenar no cliente
      );
      
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      if (!paymentsSnapshot.empty) {
        // Ordenar por data de criação (mais recente primeiro) e pegar o primeiro
        const sortedPayments = paymentsSnapshot.docs.sort((a, b) => {
          const aData = a.data();
          const bData = b.data();
          const aTime = aData.createdAt?.toDate ? aData.createdAt.toDate().getTime() : new Date(aData.createdAt || 0).getTime();
          const bTime = bData.createdAt?.toDate ? bData.createdAt.toDate().getTime() : new Date(bData.createdAt || 0).getTime();
          return bTime - aTime; // Ordem decrescente (mais recente primeiro)
        });
        
        const lastPayment = sortedPayments[0];
        const paymentData = lastPayment.data();
        
        // Atualizar o estado com os dados do pagamento
        setValor(paymentData.amount || 0);
        setMetodoPagamento(paymentData.paymentMethod === 'credit' ? 'Cartão de Crédito' : 'PIX');
        setLastPaymentId(lastPayment.id);
        
        // Atualizar informações detalhadas do pagamento
        setPaymentStatus(paymentData.status || 'pending');
        setQrCode(paymentData.qr_code || '');
        setQrCodeBase64(paymentData.qr_code_base64 || '');
        setTicketUrl(paymentData.ticket_url || '');
        setTransactionId(paymentData.transaction_id || '');
        setTransactionAmount(paymentData.transaction_amount || 0);
        setTransactionStatus(paymentData.transaction_status || '');
        setTransactionStatusDetail(paymentData.transaction_status_detail || '');
        setTransactionDate(paymentData.transaction_date ? 
          (paymentData.transaction_date.toDate ? paymentData.transaction_date.toDate() : new Date(paymentData.transaction_date)) : 
          null
        );
        
        // Verificar se o pagamento foi identificado pelo servidor
        setIsPaymentIdentified(!!(paymentData.qr_code || paymentData.transaction_id));
        
        // Calcular tempo decorrido desde a criação do pagamento
        if (paymentData.createdAt) {
          const createdAt = paymentData.createdAt.toDate ? paymentData.createdAt.toDate() : new Date(paymentData.createdAt);
          const now = new Date();
          const diffInSeconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000);
          setTempoDecorrido(Math.max(0, diffInSeconds));
        }
      } else {
        // Se não houver pagamentos pendentes, usar os parâmetros como fallback
        setValor(parseFloat(params.valor as string) || 0);
        setMetodoPagamento(params.metodo as string || 'PIX');
      }
    } catch (error) {
      console.error('Erro ao buscar último pagamento pendente:', error);
      // Fallback para os parâmetros em caso de erro
      setValor(parseFloat(params.valor as string) || 0);
      setMetodoPagamento(params.metodo as string || 'PIX');
    }
  };

  // Timer para mostrar o tempo decorrido
  useEffect(() => {
    const timer = setInterval(() => {
      setTempoDecorrido(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Buscar último pagamento pendente ao carregar a tela
  useEffect(() => {
    buscarUltimoPagamentoPendente();
  }, []);

  // Função para formatar o tempo
  const formatarTempo = (segundos: number) => {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  // Função para atualizar o tema com base nas configurações
  const updateTheme = useCallback(async () => {
    try {
      const followSystem = await AsyncStorage.getItem('followSystemTheme');
      const shouldFollowSystem = followSystem === 'true';
      setFollowSystemTheme(shouldFollowSystem);
      
      if (shouldFollowSystem) {
        const systemTheme = colorScheme === 'dark' ? 'dark' : 'light';
        setTheme(systemTheme);
        setColors(Colors[systemTheme]);
      } else {
        const savedTheme = await AsyncStorage.getItem('selectedTheme');
        if (savedTheme) {
          setTheme(savedTheme);
          setColors(Colors[savedTheme as keyof typeof Colors]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar tema:', error);
    }
  }, [colorScheme]);

  useEffect(() => {
    updateTheme();
  }, [updateTheme, colorScheme]);

  useEffect(() => {
    if (followSystemTheme) {
      const systemTheme = colorScheme === 'dark' ? 'dark' : 'light';
      setTheme(systemTheme);
      setColors(Colors[systemTheme]);
    }
  }, [followSystemTheme, colorScheme]);

  // Verificar autenticação ao carregar a tela
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        const userName = await AsyncStorage.getItem('userName');
        
        if (!userToken || !userName) {
          coffeeAlert('Você precisa estar logado para acessar esta funcionalidade','error');
          router.push('/acesso');
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        coffeeAlert('Erro ao verificar autenticação','error');
        router.push('/acesso');
      }
    };

    checkAuth();
  }, []);

  // Listener em tempo real para monitorar o status da assinatura
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribePayment: (() => void) | null = null;

    const setupSubscriptionListener = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        if (!userToken) return;

        const userDocRef = doc(db, 'users', userToken);
        unsubscribeUser = onSnapshot(userDocRef, async (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            const status = data.subscriptionStatus;
            
            // Atualizar o AsyncStorage
            await AsyncStorage.setItem('subscriptionStatus', status);
            
            // Se o status mudou para 'active', redirecionar para a tela principal
            if (status === 'active') {
              coffeeAlert('Pagamento aprovado! Sua assinatura está ativa.', 'success');
              router.push('/(tabs)');
            }
          }
        });

        // Listener em tempo real para monitorar mudanças no pagamento
        if (lastPaymentId) {
          const paymentDocRef = doc(db, 'payments', lastPaymentId);
          unsubscribePayment = onSnapshot(paymentDocRef, (doc) => {
            if (doc.exists()) {
              const paymentData = doc.data();
              
              // Atualizar informações detalhadas do pagamento em tempo real
              setPaymentStatus(paymentData.status || 'pending');
              setQrCode(paymentData.qr_code || '');
              setQrCodeBase64(paymentData.qr_code_base64 || '');
              setTicketUrl(paymentData.ticket_url || '');
              setTransactionId(paymentData.transaction_id || '');
              setTransactionAmount(paymentData.transaction_amount || 0);
              setTransactionStatus(paymentData.transaction_status || '');
              setTransactionStatusDetail(paymentData.transaction_status_detail || '');
              setTransactionDate(paymentData.transaction_date ? 
                (paymentData.transaction_date.toDate ? paymentData.transaction_date.toDate() : new Date(paymentData.transaction_date)) : 
                null
              );
              
              // Verificar se o pagamento foi identificado pelo servidor
              const wasIdentified = !!(paymentData.qr_code || paymentData.transaction_id);
              setIsPaymentIdentified(wasIdentified);
              
              // Se o pagamento foi identificado e não estava antes, mostrar alerta
              if (wasIdentified && !isPaymentIdentified) {
                coffeeAlert('Pagamento identificado pelo servidor! Aguarde a validação.', 'success');
              }
              
              // Se o status mudou para 'approved', redirecionar
              if (paymentData.status === 'approved') {
                coffeeAlert('Pagamento aprovado! Redirecionando...', 'success');
                setTimeout(() => {
                  router.push('/(tabs)');
                }, 2000);
              }
            }
          });
        }
      } catch (error) {
        console.error('Erro ao configurar listener de assinatura:', error);
      }
    };

    setupSubscriptionListener();

    return () => {
      if (unsubscribeUser) {
        unsubscribeUser();
      }
      if (unsubscribePayment) {
        unsubscribePayment();
      }
    };
  }, [lastPaymentId, isPaymentIdentified]);

  // Função para limpar pagamentos pendentes do usuário
  const limparPagamentosPendentes = async () => {
    try {
      setIsClearingPayments(true);
      setClearingProgress('Iniciando limpeza...');
      setShowClearingModal(true);
      
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        setClearingProgress('Usuário não autenticado');
        setTimeout(() => {
          setShowClearingModal(false);
          setClearingProgress('');
        }, 2000);
        return;
      }

      setClearingProgress('Buscando pagamentos pendentes...');
      
      // Buscar pagamentos pendentes APENAS do usuário atual
      const paymentsQuery = query(
        collection(db, 'payments'), 
        where('status', '==', 'pending'),
        where('userId', '==', userToken)
      );
      
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      if (paymentsSnapshot.empty) {
        setClearingProgress('Nenhum pagamento pendente encontrado');
        setTimeout(() => {
          setShowClearingModal(false);
          setClearingProgress('');
        }, 2000);
        return;
      }
      
      setClearingProgress(`Encontrados ${paymentsSnapshot.docs.length} pagamentos pendentes...`);
      
      // Deletar cada pagamento pendente do usuário
      setClearingProgress('Removendo pagamentos pendentes...');
      const deletePromises = paymentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      setClearingProgress('Atualizando status da assinatura...');
      
      // Atualizar o status da assinatura para 'inactive'
      const userRef = doc(db, 'users', userToken);
      await updateDoc(userRef, { 
        subscriptionStatus: 'inactive',
        lastPaymentId: null 
      });
      
      setClearingProgress('Atualizando armazenamento local...');
      
      // Atualizar o AsyncStorage
      await AsyncStorage.setItem('subscriptionStatus', 'inactive');
      await AsyncStorage.removeItem('lastPaymentId');
      
      // Limpar o estado local
      setLastPaymentId(null);
      setValor(0);
      setMetodoPagamento('PIX');
      setTempoDecorrido(0);
      
      setClearingProgress('Pagamentos pendentes limpos com sucesso!');
      setTimeout(() => {
        setShowClearingModal(false);
        setClearingProgress('');
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao limpar pagamentos pendentes:', error);
      setClearingProgress('Erro ao limpar pagamentos pendentes.');
      setTimeout(() => {
        setShowClearingModal(false);
        setClearingProgress('');
      }, 2000);
    } finally {
      setIsClearingPayments(false);
    }
  };
  // Função para voltar à tela de seleção de pagamento
  const voltarParaPagamento = async () => {
    setPagamentoNovo(true);
    try {
      // Mostrar alerta de confirmação
      coffeeAlert(
        'Atenção! Se você tentar pagar novamente, todos os seus pagamentos pendentes serão apagados. Deseja continuar?',
        'warning',
        [
          {
            text: 'Cancelar',
            onPress: () => {setPagamentoNovo(false)},
            style: 'cancel'
          },
          {
            text: 'Continuar',
            onPress: async () => {
              // Limpar pagamentos pendentes antes de redirecionar
              await limparPagamentosPendentes();
              
              // Redirecionar para a tela de seleção de pagamento
              router.push({
                pathname: '/telas_extras/payment_selection',
                params: {
                  valor: valor.toString()
                }
              });
            }
          }
        ]
      );
    } catch (error) {
      setPagamentoNovo(false);
      console.error('Erro ao voltar para pagamento:', error);
      coffeeAlert('Erro ao processar o pagamento', 'error');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.gradient}
      >
        {/* Botão Voltar */}
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.cardBackground }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.icon} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Ícone de Pagamento Pendente */}
          <View style={styles.iconContainer}>
            <Ionicons 
              name="time-outline" 
              size={80} 
              color={colors.warning} 
            />
          </View>

          {/* Título */}
          <Text style={[styles.title, { color: colors.textLight }]}>
            Pagamento Pendente
          </Text>

          {/* Informações do Pagamento */}
          <View style={[styles.paymentInfo, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.paymentLabel, { color: colors.textLight }]}>
              Valor:
            </Text>
            <Text style={[styles.paymentValue, { color: colors.primary }]}>
              R$ {valor.toFixed(2)}
            </Text>
            
            <Text style={[styles.paymentLabel, { color: colors.textLight }]}>
              Método:
            </Text>
            <Text style={[styles.paymentMethod, { color: colors.textLight }]}>
              {metodoPagamento}
            </Text>

            {/* Status do Pagamento */}
            <View style={styles.statusContainer}>
              <Text style={[styles.paymentLabel, { color: colors.textLight }]}>
                Status:
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
                <Text style={[styles.statusText, { color: colors.warning }]}>
                  {paymentStatus === 'pending' ? 'Aguardando Identificação' : paymentStatus}
                </Text>
              </View>
            </View>

            {/* Contador de Tempo */}
            <View style={styles.timeContainer}>
              <Text style={[styles.paymentLabel, { color: colors.textLight }]}>
                Tempo decorrido:
              </Text>
              <Text style={[styles.timeValue, { color: colors.accent }]}>
                {formatarTempo(tempoDecorrido)}
              </Text>
            </View>
          </View>

          {/* Informações do Servidor (quando disponível) */}
          {isPaymentIdentified && (
            <View style={styles.serverInfoContainer}>
              {/* Informações Gerais do Servidor */}
              <View style={[styles.serverInfo, { backgroundColor: colors.success + '20' }]}>
                <View style={styles.serverInfoHeader}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  <Text style={[styles.serverInfoTitle, { color: colors.success }]}>
                    Pagamento Identificado pelo Servidor
                  </Text>
                </View>
                
                {transactionId && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textLight }]}>
                      ID da Transação:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.textLight }]}>
                      {transactionId}
                    </Text>
                  </View>
                )}
                
                {transactionStatus && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textLight }]}>
                      Status da Transação:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.textLight }]}>
                      {transactionStatus}
                    </Text>
                  </View>
                )}
                
                {transactionDate && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textLight }]}>
                      Data da Transação:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.textLight }]}>
                      {transactionDate.toLocaleString('pt-BR')}
                    </Text>
                  </View>
                )}
                
                {/* QR Code PIX direto */}
                {(qrCode || qrCodeBase64) && (
                  <View style={[styles.qrCodeDirectContainer, { backgroundColor: colors.cardBackground }]}>
                    <Text style={[styles.qrCodeTitle, { color: colors.textLight }]}>
                      QR Code PIX para Pagamento
                    </Text>
                    <View style={styles.qrCodeDirectContent}>
                      {qrCode && (
                        <View style={styles.qrCodeWrapper}>
                          <QRCode
                            value={qrCode}
                            size={150}
                            backgroundColor="white"
                            color="black"
                          />
                          <Text style={[styles.qrCodeHint, { color: colors.text }]}>
                            Escaneie com seu app bancário
                          </Text>
                        </View>
                      )}
                      {qrCodeBase64 && !qrCode && (
                        <View style={styles.qrCodeWrapper}>
                          <QRCode
                            value={qrCodeBase64}
                            size={150}
                            backgroundColor="white"
                            color="black"
                          />
                          <Text style={[styles.qrCodeHint, { color: colors.text }]}>
                            Escaneie com seu app bancário
                          </Text>
                        </View>
                      )}
                      <View style={styles.qrCodeActions}>
                        <TouchableOpacity
                          style={[styles.copyButton, { backgroundColor: colors.primary }]}
                          onPress={() => {
                            const codeToCopy = qrCode || qrCodeBase64;
                            Clipboard.setString(codeToCopy);
                            coffeeAlert('Código PIX copiado para a área de transferência!', 'success');
                          }}
                        >
                          <Ionicons name="copy-outline" size={16} color={colors.textLight} />
                          <Text style={[styles.copyButtonText, { color: colors.textLight }]}>
                            Copiar Código
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Mensagem Informativa */}
          <View style={styles.infoContainer}>
            <Text style={[styles.infoTitle, { color: colors.textLight }]}>
              O que fazer agora?
            </Text>
            
            {!isPaymentIdentified ? (
              <>
                <View style={styles.infoItem}>
                  <Ionicons name="time-outline" size={20} color={colors.warning} />
                  <Text style={[styles.infoText, { color: colors.textLight }]}>
                    Aguardando o servidor identificar seu pagamento. Isso pode levar alguns segundos.
                  </Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Ionicons name="information-circle" size={20} color={colors.accent} />
                  <Text style={[styles.infoText, { color: colors.textLight }]}>
                    Mantenha esta tela aberta para acompanhar o status em tempo real.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.infoItem}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={[styles.infoText, { color: colors.textLight }]}>
                    Pagamento identificado! Aguarde de 1 a 5 minutos para a validação automática da sua assinatura.
                  </Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Ionicons name="information-circle" size={20} color={colors.accent} />
                  <Text style={[styles.infoText, { color: colors.textLight }]}>
                    A validação é feita automaticamente pelo sistema de pagamento.
                  </Text>
                </View>
              </>
            )}
            
            <View style={styles.infoItem}>
              <Ionicons name="warning" size={20} color={colors.warning} />
              <Text style={[styles.infoText, { color: colors.textLight }]}>
                Se você não conseguiu completar o pagamento ou perdeu o link, use o botão abaixo para tentar novamente.
              </Text>
            </View>
          </View>

          {/* Botões de Ação */}
          <View style={styles.buttonContainer}>
            {/* Botão para Novo Pagamento */}
            <TouchableOpacity
              style={[
                styles.actionButton, 
                { backgroundColor: colors.primary }
              ]}
              onPress={voltarParaPagamento}
              disabled={pagamentoNovo}
            >
              <Ionicons name="refresh" size={20} color={colors.textLight} />
              <Text style={[styles.actionButtonText, { color: colors.textLight }]}>
                Tentar Novo Pagamento
              </Text>
            </TouchableOpacity>
          </View>

          {/* Nota Importante */}
          <View style={[styles.noteContainer, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="bulb" size={16} color={colors.accent} />
            <Text style={[styles.noteText, { color: colors.textLight }]}>
              Dica: Mantenha esta tela aberta para acompanhar o status do seu pagamento
            </Text>
          </View>

          {/* Indicador de Monitoramento */}
          <View style={[styles.monitoringContainer, { backgroundColor: colors.success + '20' }]}>
            <View style={styles.monitoringIndicator}>
              <View style={[styles.monitoringDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.monitoringText, { color: colors.success }]}>
                {isPaymentIdentified 
                  ? `Monitorando pagamento em tempo real... (${paymentStatus})`
                  : 'Aguardando identificação do pagamento...'
                }
              </Text>
            </View>
            
            {/* Status detalhado */}
            {isPaymentIdentified && (
              <View style={styles.monitoringDetails}>
                <Text style={[styles.monitoringDetailText, { color: colors.textLight }]}>
                  Última atualização: {transactionDate ? transactionDate.toLocaleTimeString('pt-BR') : 'N/A'}
                </Text>
                {transactionStatusDetail && (
                  <Text style={[styles.monitoringDetailText, { color: colors.textLight }]}>
                    Detalhes: {transactionStatusDetail}
                  </Text>
                )}
                
              </View>
            )}
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Modal de Progresso de Limpeza */}
      {showClearingModal && (
        <Modal
          visible={showClearingModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowClearingModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.clearingModal, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.clearingIconContainer}>
                <Ionicons 
                  name="trash-outline" 
                  size={60} 
                  color={colors.error} 
                />
              </View>
              
              <Text style={[styles.clearingModalTitle, { color: colors.textLight }]}>
                Limpando Pagamentos Pendentes
              </Text>
              
              <ActivityIndicator 
                size="large" 
                color={colors.primary} 
                style={styles.clearingSpinner}
              />
              
              <Text style={[styles.clearingModalText, { color: colors.textLight }]}>
                {clearingProgress}
              </Text>
              
              <View style={styles.clearingProgressBar}>
                <View 
                  style={[
                    styles.clearingProgressFill, 
                    { 
                      backgroundColor: colors.primary,
                      width: clearingProgress.includes('sucesso') ? '100%' : 
                             clearingProgress.includes('erro') ? '100%' : '60%'
                    }
                  ]} 
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  backButton: {
    position: 'absolute',
    top: height * 0.05,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 50 : 50,
    alignItems: 'center',
    paddingBottom: 50,
  },
  iconContainer: {
    marginBottom: 30,
    padding: 20,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  paymentInfo: {
    width: '100%',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  paymentValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  paymentMethod: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusContainer: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeContainer: {
    marginTop: 15,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  serverInfo: {
    width: '100%',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  serverInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  serverInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  infoContainer: {
    width: '100%',
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  infoText: {
    fontSize: 16,
    lineHeight: 22,
    marginLeft: 10,
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
    marginBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  buttonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2.84,
    elevation: 3,
  },
  noteText: {
    fontSize: 14,
    marginLeft: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    flex: 1,
  },
  monitoringContainer: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2.84,
    elevation: 3,
  },
  monitoringIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monitoringDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  monitoringText: {
    fontSize: 14,
    fontWeight: '600',
  },
  monitoringDetails: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
  monitoringDetailText: {
    fontSize: 13,
    marginBottom: 3,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  clearingModal: {
    width: '80%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  clearingIconContainer: {
    marginBottom: 15,
  },
  clearingModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  clearingSpinner: {
    marginBottom: 15,
  },
  clearingModalText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  clearingProgressBar: {
    width: '100%',
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  clearingProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  serverInfoContainer: {
    width: '100%',
    marginBottom: 30,
  },
  qrCodeContainer: {
    width: '100%',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  qrCodeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  qrCodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: 10,
    borderRadius: 8,
  },
  qrCodeTextContainer: {
    flex: 1,
  },
  qrCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  qrCodeHint: {
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  qrCodeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  qrCodeImageContainer: {
    width: '100%',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  qrCodeImageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: 10,
    borderRadius: 8,
  },
  qrCodeImageWrapper: {
    alignItems: 'center',
  },
  qrCodeImageText: {
    fontSize: 30,
    marginBottom: 5,
  },
  qrCodeImageSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  qrCodeAvailableIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(46, 204, 113, 0.3)',
  },
  qrCodeAvailableText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  qrCodeDirectContainer: {
    width: '100%',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  qrCodeDirectContent: {
    alignItems: 'center',
  },
  qrCodeWrapper: {
    backgroundColor: 'rgb(255, 255, 255)',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 15,
    padding: 10,
  },
  qrCodeActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
}); 