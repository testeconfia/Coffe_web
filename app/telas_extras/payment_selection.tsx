import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  useColorScheme,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { coffeeAlert } from '@/utils/coffeeAlert';
import * as WebBrowser from 'expo-web-browser';
import { createPreference, createPixPayment, getPaymentStatus } from '@/config/mercadoPago';
import { db } from '@/config/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, onSnapshot, getDoc, deleteDoc } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

export default function PaymentSelectionScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'credit' | 'pix'>('pix');
  const router = useRouter();
  const params = useLocalSearchParams();
  const [valor, setValor] = useState(parseFloat(params.valor as string) || 0);
  const [valorReal, setValorReal] = useState(parseFloat(params.valor as string) || 0);
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState<string>('default');
  const [colors, setColors] = useState(Colors['default']);
  const [followSystemTheme, setFollowSystemTheme] = useState<boolean>(false);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [mercadoPago, setMercadoPago] = useState<boolean>(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isScreenMounted, setIsScreenMounted] = useState(true);
  const [isListenerActive, setIsListenerActive] = useState(false);
  const [isPixFlowActive, setIsPixFlowActive] = useState(false);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [qrCodeEMV, setQrCodeEMV] = useState<string | null>(null);
  const [mpPaymentId, setMpPaymentId] = useState<string | null>(null);
  const [paymentDocId, setPaymentDocId] = useState<string | null>(null);
  const pollingRef = useRef<any>(null);

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
    }
  }, [colorScheme]);

  useEffect(() => {
    updateTheme();

  if(selectedMethod === 'credit'){
    setValor(valor*0.1);
  }else{
    setValor(valor);
  }
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

        // Carregar e verificar webhook em sequência
        const savedSettings = await AsyncStorage.getItem('systemSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          const webhookUrl = parsedSettings.webhook_url;
          setValor(parsedSettings.subscriptionPrices.monthly || 30);
          setValorReal(parsedSettings.subscriptionPrices.monthly || 30);

          console.log('Webhook URL:', webhookUrl);
          if (webhookUrl) {
            try {
              const response = await fetch(webhookUrl);
              console.log('Webhook status:', response.status);
              setMercadoPago(response.status === 200);
              setWebhookUrl(webhookUrl);
              setServerUrl(webhookUrl);
            } catch (error: any) {
              setMercadoPago(false);
            }
          } else {
            console.log('Webhook URL não encontrada nas configurações');
            setMercadoPago(false);
          }
        } else {
          console.log('Configurações do sistema não encontradas');
          setMercadoPago(false);
        }
      } catch (error) {
        coffeeAlert('Ocorreu um erro ao verificar sua autenticação','error');
        router.push('/acesso');
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    let unsubscribeUser: (() => void) | undefined;

    const verifica_status_assinatura = async () => {
      // Se já existe um listener ativo, não criar outro
      if (isListenerActive) {
        console.log('Listener já está ativo, retornando...');
        return;
      }

      const userToken = await AsyncStorage.getItem('userToken');
      if(!userToken || !isScreenMounted){
        console.log('Sem userToken ou tela não montada, retornando...');
        return;
      }

      console.log('Criando novo listener...');
      const userDocRef = doc(db, 'users', userToken);
      
      // Usar um único listener com um flag para controlar atualizações
      let isUpdating = false;
      
      unsubscribeUser = onSnapshot(userDocRef, async (doc) => {
        if (!isScreenMounted) {
          console.log('Tela não montada, ignorando atualização...');
          return;
        }

        if (isUpdating) {
          console.log('Atualização em andamento, ignorando...');
          return;
        }

        if (doc.exists()) {
          isUpdating = true;
          try {
            const data = doc.data();
            const status = data.subscriptionStatus;
            console.log('Status atual:', status);
            
            await AsyncStorage.setItem('subscriptionStatus', status);
            
            if(status === 'avaliando' && isScreenMounted && !isPixFlowActive){
              console.log('Redirecionando para tela de pagamento pendente...');
              // Redirecionar para a tela de pagamento pendente com os parâmetros necessários
              router.push({
                pathname: '/telas_extras/pag_pendente',
                params: {
                  valor: valor.toString(),
                  metodo: selectedMethod === 'credit' ? 'Cartão de Crédito' : 'PIX'
                }
              });
            }else if(status === 'active'){
              console.log('Status ativo, fechando modal...');
              router.push('/(tabs)');
            }else if(isScreenMounted){
              console.log('Outro status, fechando modal...');
              setIsModalVisible(false);
            }
          } finally {
            isUpdating = false;
          }
        }
      });

      setIsListenerActive(true);
      console.log('Listener configurado com sucesso');
    };

    verifica_status_assinatura();

    return () => {
      console.log('Limpando listener...');
      if (unsubscribeUser) {
        unsubscribeUser();
        setIsListenerActive(false);
      }
    };
  }, []); // Removida a dependência de isScreenMounted para evitar recriações

  // Efeito separado para controlar o estado de montagem da tela
  useEffect(() => {
    setIsScreenMounted(true);
    return () => {
      console.log('Tela desmontada, limpando estados...');
      setIsScreenMounted(false);
      setIsListenerActive(false);
    };
  }, []);

  const mudaformadepagamento = (metodo: 'credit' | 'pix') => {
    if(metodo === 'credit'){
      setValor(valorReal + valorReal*0.1);
      setSelectedMethod('credit');
    }else{
      setValor(valorReal);
      setSelectedMethod('pix');
      // limpar possíveis QR anteriores
      setQrCodeBase64(null);
      setQrCodeEMV(null);
      setMpPaymentId(null);
      setPaymentDocId(null);
      setIsPixFlowActive(false);
    }
  }
  const startPixPolling = (paymentId: string, docId: string, userId: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    pollingRef.current = setInterval(async () => {
      try {
        const data = await getPaymentStatus(paymentId);
        const status = data?.status;
        console.log('Polling status:', status, 'paymentId:', paymentId);
        if (status === 'approved') {
          // Atualiza pagamento e usuário
          await updateDoc(doc(db, 'payments', docId), {
            status: 'approved',
            payment_status_detail: data.status_detail || null,
            date_approved: data.date_approved || null,
            updatedAt: serverTimestamp(),
          });
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            subscriptionStatus: 'active',
            updatedAt: serverTimestamp(),
            lastPaymentId: docId,
          });
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setIsPixFlowActive(false);
          coffeeAlert('Pagamento aprovado! Sua assinatura foi ativada.', 'success');
          router.push('/(tabs)');
        } else if (status === 'expired' || status === 'cancelled' || status === 'rejected') {
          await updateDoc(doc(db, 'payments', docId), {
            status: status,
            payment_status_detail: data.status_detail || null,
            updatedAt: serverTimestamp(),
          });
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setIsPixFlowActive(false);
          coffeeAlert('Pagamento expirado ou cancelado. Gere um novo QR para tentar novamente.', 'warning');
        }
      } catch (e) {
        console.log('Erro no polling do pagamento:', e);
      }
    }, 2000);
  };

  const handleMercadoPagoPayment = async () => {
    setIsLoading(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const userName = await AsyncStorage.getItem('userName');
      const email = await AsyncStorage.getItem('userEmail');
      
      if (!userToken || !userName) {
        coffeeAlert('Usuário não autenticado','error');
        router.push('/acesso');
        return;
      }
      // Fluxo PIX direto via API
      if (selectedMethod === 'pix') {
        const paymentRecord = {
          userId: userToken,
          userName: userName,
          amount: Number(valor),
          method: 'mercadopago',
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const paymentRef = await addDoc(collection(db, 'payments'), paymentRecord);
        setPaymentDocId(paymentRef.id);
        setIsPixFlowActive(true);

        const expirationISO = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        // Preferir backend quando disponível (inclui Web)
        let mpData: any;
        if (serverUrl) {
          const resp = await fetch(`${serverUrl.replace(/\/$/, '')}/api/payments/pix`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: Number(valor),
              description: 'Assinatura Café Computação',
              external_reference: paymentRef.id,
              notification_url: `${webhookUrl}/webhook`,
              payerEmail: email || 'cliente@example.com',
              metadata: {
                Id_banco: paymentRef.id,
                userId: userToken,
                userName: userName,
                email: email || '',
                app: 'cafe-computacao',
                tipo: 'assinatura',
              },
              expirationMinutes: 15,
            }),
          });
          const ct = resp.headers.get('content-type') || '';
          const payload = ct.includes('application/json') ? await resp.json() : await resp.text();
          if (!resp.ok) throw new Error(typeof payload === 'string' ? payload : JSON.stringify(payload));
          if (!ct.includes('application/json')) throw new Error('Resposta não JSON do backend: ' + String(payload));
          mpData = {
            id: payload.id,
            point_of_interaction: { transaction_data: { qr_code_base64: payload.qr_code_base64, qr_code: payload.qr_code } },
            date_of_expiration: payload.date_of_expiration,
          };
        } else {
          // Apps nativos podem chamar a API MP direta
          mpData = await createPixPayment({
            transaction_amount: Number(valor),
            description: 'Assinatura Café Computação',
            external_reference: paymentRef.id,
            notification_url: `${webhookUrl}/webhook`,
            date_of_expiration: expirationISO,
            payer: { email: email || 'cliente@example.com' },
            metadata: {
              Id_banco: paymentRef.id,
              userId: userToken,
              userName: userName,
              email: email || '',
              app: 'cafe-computacao',
              tipo: 'assinatura',
            },
          });
        }

        const tx = mpData?.point_of_interaction?.transaction_data || {};
        const qrB64 = tx.qr_code_base64 || null;
        const qrEmv = tx.qr_code || null;

        await updateDoc(doc(db, 'payments', paymentRef.id), {
          mp_payment_id: String(mpData.id),
          qr_code: qrEmv,
          qr_code_base64: qrB64,
          date_of_expiration: mpData.date_of_expiration || expirationISO,
          status: 'pending',
          updatedAt: serverTimestamp(),
        });

        setQrCodeBase64(qrB64);
        setQrCodeEMV(qrEmv);
        setMpPaymentId(String(mpData.id));

        const userRef = doc(db, 'users', userToken);
        await updateDoc(userRef, {
          subscriptionStatus: 'avaliando',
          updatedAt: serverTimestamp(),
          lastPaymentId: paymentRef.id,
        });
        await AsyncStorage.setItem('lastPaymentId', paymentRef.id);
        await AsyncStorage.setItem('subscriptionStatus', 'avaliando');

        // iniciar polling via backend no Web; direto na API em apps nativos
        if (serverUrl && Platform.OS === 'web') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = setInterval(async () => {
            try {
              const resp = await fetch(`${serverUrl.replace(/\/$/, '')}/api/payments/${String(mpData.id)}`);
              const ct = resp.headers.get('content-type') || '';
              const jsonOrText = ct.includes('application/json') ? await resp.json() : await resp.text();
              if (!resp.ok) throw new Error(typeof jsonOrText === 'string' ? jsonOrText : JSON.stringify(jsonOrText));
              if (!ct.includes('application/json')) throw new Error('Resposta não JSON do backend: ' + String(jsonOrText));
              const json = jsonOrText as any;
              const status = json?.status;
              console.log('Polling via backend:', status);
              if (status === 'approved') {
                await updateDoc(doc(db, 'payments', paymentRef.id), {
                  status: 'approved',
                  payment_status_detail: json.status_detail || null,
                  date_approved: json.date_approved || null,
                  updatedAt: serverTimestamp(),
                });
                const userRef = doc(db, 'users', userToken);
                await updateDoc(userRef, {
                  subscriptionStatus: 'active',
                  updatedAt: serverTimestamp(),
                  lastPaymentId: paymentRef.id,
                });
                clearInterval(pollingRef.current);
                pollingRef.current = null;
                setIsPixFlowActive(false);
                coffeeAlert('Pagamento aprovado! Sua assinatura foi ativada.', 'success');
                router.push('/(tabs)');
              } else if (status === 'expired' || status === 'cancelled' || status === 'rejected') {
                await updateDoc(doc(db, 'payments', paymentRef.id), {
                  status: status,
                  payment_status_detail: json.status_detail || null,
                  updatedAt: serverTimestamp(),
                });
                clearInterval(pollingRef.current);
                pollingRef.current = null;
                setIsPixFlowActive(false);
                coffeeAlert('Pagamento expirado ou cancelado. Gere um novo QR para tentar novamente.', 'warning');
              }
            } catch (e) {
              console.log('Erro polling via backend:', e);
            }
          }, 2000);
        } else {
          startPixPolling(String(mpData.id), paymentRef.id, userToken);
        }
        console.log('PIX criado. paymentId:', mpData.id, 'docId:', paymentRef.id);
      } else {
        // Fluxo Cartão via Checkout Pro (mantido)
        const paymentRecord = {
          userId: userToken,
          userName: userName,
          amount: valor,
          method: 'mercadopago',
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        const paymentRef = await addDoc(collection(db, 'payments'), paymentRecord);

        const preferenceData = {
          items: [
            { title: 'Assinatura Café Computação', quantity: 1, currency_id: 'BRL', unit_price: valor },
          ],
          payer: { name: userName, email: email },
          back_urls: {
            success: `${webhookUrl}/success`,
            failure: `${webhookUrl}/failure`,
            pending: `${webhookUrl}/pending`,
          },
          auto_return: 'approved',
          // Mantém external_reference simples (string) no cartão também
          external_reference: paymentRef.id,
          webhook_url: `${webhookUrl}/webhook`,
          payment_methods: {
            excluded_payment_types: [ { id: 'pix' }, { id: 'atm' } ],
            installments: 1,
            default_installments: 1,
          },
        } as any;

        const preference = await createPreference(preferenceData);
        await WebBrowser.openBrowserAsync(preference.init_point);

        const userRef = doc(db, 'users', userToken);
        await updateDoc(userRef, {
          subscriptionStatus: 'avaliando',
          updatedAt: serverTimestamp(),
          lastPaymentId: paymentRef.id,
        });
        await AsyncStorage.setItem('lastPaymentId', paymentRef.id);
        await AsyncStorage.setItem('subscriptionStatus', 'avaliando');
      }
      
    } catch (error) {
      coffeeAlert('Ocorreu um erro ao processar seu pagamento. Por favor, tente novamente.','error');
    } finally {
      setIsLoading(false);
    }
  };
const novo_pagamento = async () => {
  try {
    setIsModalVisible(false);
    const userToken = await AsyncStorage.getItem('userToken');
    if(!userToken){
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', userToken));
    if(!userDoc.exists()){
      return;
    }

    const userData = userDoc.data();
    const lastPaymentId = userData.lastPaymentId;
    
    if(lastPaymentId){
      try {
        await deleteDoc(doc(db, 'payments', lastPaymentId));
        console.log('Pagamento deletado com sucesso');
      } catch (error) {
      }
    }

    const userRef = doc(db, 'users', userToken);
    await updateDoc(userRef, { 
      subscriptionStatus: 'inactive',
      lastPaymentId: null 
    });
    
    await AsyncStorage.setItem('subscriptionStatus', 'inactive');
  } catch (error) {
    coffeeAlert('Ocorreu um erro ao processar sua solicitação. Tente novamente.', 'error');
  }
};
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.gradient}
      >
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.cardBackground }]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textLight} />
        </TouchableOpacity>
        <Modal
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
          transparent={true}
          style={styles.modalStyle}
        >
          <View style={[styles.modalBackground, { backgroundColor: 'rgba(0,0,0,0.7)' }]}> 
            <View style={[styles.modalContent, { backgroundColor: colors.backgroundModal }]}> 
              <Text style={[styles.modalTitle, { color: colors.textLight }]}> 
                Pagamento em Análise
              </Text>
              <Text style={[styles.modalText, { color: colors.textLight }]}> 
                Você já possui um pagamento sendo avaliado. Deseja aguardar a verificação ou realizar um novo pagamento?
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.primary }]} 
                  onPress={() => {
                    setIsModalVisible(false);
                    router.push('/(tabs)');
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: colors.textLight }]}> 
                    Aguardar Verificação
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.error }]}
                  onPress={() => {
                    novo_pagamento();
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: colors.textLight }]}> 
                    Realizar Novo Pagamento
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {mercadoPago? (
          <View style={styles.content}>
            <View style={[styles.paymentMethods, {flexDirection: 'column'}]}> 
              <Text style={[styles.title, { color: colors.textLight , fontSize: 30 , fontWeight: 'bold' , marginBottom: 20 , textAlign: 'center'}]}> 
                Assinatura Mensal
              </Text>
              <Text style={[styles.choro, { color: colors.textLight , fontSize: 16 , fontWeight: 'bold' , marginBottom: 20 , textAlign: 'center'}]}> 
                Paga no pix aii, ganha um descontinho.
              </Text>
            </View>
          <Text style={[styles.title, { color: colors.textLight }]}> 
            Formas de Pagamento
          </Text>
          
          <Text style={[styles.value, { color: colors.textLight }]}> 
            R$ {valor.toFixed(2)}
          </Text>

          <View style={styles.paymentMethods}> 
            <TouchableOpacity
              style={[
                styles.methodButton,
                { backgroundColor: colors.cardBackground },
                selectedMethod === 'credit' && styles.selectedMethod,
                selectedMethod === 'credit' && { borderColor: colors.primary },
              ]}
              onPress={() => mudaformadepagamento('credit')}
            >
              <Ionicons
                name="card"
                size={24}
                color={selectedMethod === 'credit' ? colors.primary : colors.icon}
              />
              <Text
                style={[
                  styles.methodText,
                  { color: selectedMethod === 'credit' ? colors.primary : colors.icon },
                ]}
              >
                Cartão de Crédito
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodButton,
                { backgroundColor: colors.cardBackground },
                selectedMethod === 'pix' && styles.selectedMethod,
                selectedMethod === 'pix' && { borderColor: colors.primary },
              ]}
              onPress={() => mudaformadepagamento('pix')}
            >
              <Ionicons
                name="qr-code"
                size={24}
                color={selectedMethod === 'pix' ? colors.primary : colors.icon}
              />
              <Text
                style={[
                  styles.methodText,
                  { color: selectedMethod === 'pix' ? colors.primary : colors.icon },
                ]}
              >
                PIX
              </Text>
            </TouchableOpacity>
          </View>
          {selectedMethod === 'pix' && qrCodeBase64 ? (
            <View style={{ alignItems: 'center', width: '100%' }}> 
              <Text style={{ color: colors.textLight, fontWeight: 'bold' }}>Escaneie o QR para pagar</Text>
              <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }}> 
                <Image
                  source={{ uri: `data:image/png;base64,${qrCodeBase64}` }}
                  style={{ width: 220, height: 220, borderRadius: 12 }}
                  resizeMode="contain"
                />
              </View>
              <Text style={{ color: colors.textLight, opacity: 0.8, fontSize: 12 }}>Pagamento PIX expira em ~15 minutos</Text>
              {isLoading && <ActivityIndicator color={colors.textLight} />}
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.payButton, 
                { backgroundColor: colors.primary },
                isLoading && styles.disabledButton
              ]}
              onPress={handleMercadoPagoPayment}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.textLight} />
              ) : (
                <Text style={[styles.payButtonText, { color: colors.textLight }]}> 
                  {selectedMethod === 'credit' ? 'Pagar com Cartão' : 'Pagar com PIX'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        ) : (
          <View style={styles.content}> 
            <Text style={[styles.title, { color: colors.textLight }]}> 
              Forma de Pagamento
            </Text>
              <Text style={[styles.subtitle, { color: colors.textLight }]}> 
                O pagamento com verificação automática não está funcionando no momento. 
                Para garantir uma melhor experiência, estamos processando seu pagamento manualmente. 
                Você será redirecionado para a tela de pagamento PIX, onde poderá efetuar o pagamento de forma segura.
              </Text>
              <TouchableOpacity
               style={[styles.payButton, { backgroundColor: colors.primary }]}
               onPress={() => router.push({pathname: '/telas_extras/pagamento', params: {valor: valor}})}
              >
                <Text style={[styles.payButtonText, { color: colors.textLight }]}> 
                  Continuar com Pagamento PIX
                </Text>
              </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalStyle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  modalButtons: {
    width: '100%',
    gap: 10,
  },
  modalButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  choro: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 40,
  },
  methodButton: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 10,
  },
  selectedMethod: {
    borderWidth: 2,
  },
  methodText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: 'bold',
  },
  payButton: {
    padding: 20,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    top: height * 0.05,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  disabledButton: {
    opacity: 0.7,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
}); 