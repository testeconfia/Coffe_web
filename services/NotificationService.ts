import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { db, auth } from '@/config/firebase';
import { collection, doc, getDocs, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurar o comportamento das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  console.log('Iniciando registro para notificações locais');
  
  if (Platform.OS === 'android') {
    console.log('Configurando canal de notificação para Android');
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    console.log('Solicitando permissões de notificação');
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Permissões de notificação não concedidas');
    return;
  }

  return 'local-notifications-enabled';
}

export async function sendLocalNotification(title: string, body: string, data = {}) {
  try {
    console.log('Enviando notificação local');
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // null significa que a notificação será mostrada imediatamente
    });
    
    console.log('Notificação local enviada com sucesso');
  } catch (error) {
    console.error('Erro ao enviar notificação local:', error);
    throw error;
  }
}

export async function sendNotificationToAllUsers(title: string, body: string, data = {}) {
  try {
    console.log('Enviando notificação para todos os usuários via Firestore');
    
    // Criar uma nova notificação no Firestore
    const notificationsRef = collection(db, 'notifications');
    const newNotification = {
      title,
      body,
      data,
      timestamp: serverTimestamp(),
      read: false,
      userId: null, // null significa que é uma notificação global
      delivered: false, // flag para controlar se a notificação já foi entregue
    };
    
    await addDoc(notificationsRef, newNotification);
    console.log('Notificação adicionada ao Firestore com sucesso');
    
    // Enviar notificação local para o usuário atual
    await sendLocalNotification(title, body, data);
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar notificação para todos os usuários:', error);
    throw error;
  }
}

export function setupNotificationListeners() {
  // Configurar listener para notificações recebidas quando o app está em primeiro plano
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received in foreground:', notification);
  });
  
  // Configurar listener para notificações que foram tocadas/abertas
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response received:', response);
    
    // Aqui você pode adicionar lógica para navegar para a tela de avisos quando a notificação for tocada
    const data = response.notification.request.content.data;
    if (data && data.screen === 'avisos') {
      // Navegar para a tela de avisos
      // Isso dependerá da sua configuração de navegação
    }
  });
  
  // Retornar funções para remover os listeners quando necessário
  return {
    removeForegroundSubscription: () => foregroundSubscription.remove(),
    removeResponseSubscription: () => responseSubscription.remove(),
  };
} 