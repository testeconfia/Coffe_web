import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, ThemeType } from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { useApp } from '@/contexts/AppContext';
import NovoAvisoModal from '@/components/NovoAvisoModal';
import { router } from 'expo-router';
import { db } from '@/config/firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { sendNotificationToAllUsers, registerForPushNotificationsAsync } from '@/services/NotificationService';
import * as Notifications from 'expo-notifications';
import { coffeeAlert } from '@/utils/coffeeAlert';
const { width, height } = Dimensions.get('window');

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: number;
  read: boolean;
}

export default function NotificationsScreen() {
  const { isAdmin } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const systemColorScheme = useColorScheme();
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('default');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const itemAnimations = useRef<{[key: string]: {fade: Animated.Value, scale: Animated.Value}}>({}).current;
  const categoryAnimations = useRef<{[key: string]: {scale: Animated.Value, opacity: Animated.Value}}>({}).current;

  useEffect(() => {
    loadTheme();
    setupNotificationsListener();
    startAnimation();
  }, [systemColorScheme]);

  const setupNotificationsListener = () => {
    const notificationsRef = collection(db, 'avisos');
    const q = query(notificationsRef, orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData: Notification[] = [];
      snapshot.forEach((doc) => {
        notificationsData.push({
          id: doc.id,
          ...doc.data()
        } as Notification);
      });
      setNotifications(notificationsData);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Error fetching notifications:', error);
      setLoading(false);
      setRefreshing(false);
    });
    
    return () => unsubscribe();
  };

  const startAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadTheme = async () => {
    const theme = await AsyncStorage.getItem('selectedTheme');
    const followSystem = await AsyncStorage.getItem('followSystemTheme');
    if (followSystem === 'true') {
      setCurrentTheme(systemColorScheme as ThemeType || 'default');
    } else {
      setCurrentTheme(theme as ThemeType || 'default');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setupNotificationsListener();
  };

  const markAsRead = async (id: string) => {
    try {
      const notificationRef = doc(db, 'avisos', id);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getFilteredNotifications = () => {
    if (selectedCategory === 'all') return notifications;
    if (selectedCategory === 'unread') return notifications.filter(n => !n.read);
    return notifications.filter(n => n.type === selectedCategory);
  };

  const renderNotification = ({ item, index }: { item: Notification; index: number }) => {
    // Inicializar animações para este item se ainda não existirem
    if (!itemAnimations[item.id]) {
      itemAnimations[item.id] = {
        fade: new Animated.Value(0),
        scale: new Animated.Value(0.95)
      };
      
      // Iniciar animação imediatamente
      Animated.parallel([
        Animated.timing(itemAnimations[item.id].fade, {
          toValue: 1,
          duration: 300,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.spring(itemAnimations[item.id].scale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          delay: index * 100,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return (
      <Animated.View
        style={[
          styles.notificationItem,
          {
            opacity: itemAnimations[item.id].fade,
            transform: [{ scale: itemAnimations[item.id].scale }],
            backgroundColor: Colors[currentTheme].cardBackground,
            borderLeftColor: Colors[currentTheme][item.type as keyof typeof Colors[typeof currentTheme]],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.notificationContent}
          onPress={() => markAsRead(item.id)}
        >
          <View style={styles.notificationHeader}>
            <View style={styles.notificationType}>
              <Ionicons
                name={
                  item.type === 'info'
                    ? 'information-circle'
                    : item.type === 'warning'
                    ? 'warning'
                    : item.type === 'success'
                    ? 'checkmark-circle'
                    : 'alert-circle'
                }
                size={24}
                color={Colors[currentTheme][item.type as keyof typeof Colors[typeof currentTheme]]}
              />
              <Text
                style={[
                  styles.notificationTypeText,
                  { color: Colors[currentTheme][item.type as keyof typeof Colors[typeof currentTheme]] },
                ]}
              >
                {item.type === 'info'
                  ? 'Informação'
                  : item.type === 'warning'
                  ? 'Aviso'
                  : item.type === 'success'
                  ? 'Sucesso'
                  : 'Erro'}
              </Text>
            </View>
            <Text style={[styles.notificationDate, { color: Colors[currentTheme].textLight }]}>
              {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Data não disponível'}
            </Text>
          </View>
          <Text style={[styles.notificationTitle, { color: Colors[currentTheme].text }]}>
            {item.title}
          </Text>
          <Text style={[styles.notificationMessage, { color: Colors[currentTheme].textLight }]}>
            {item.message}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const CategoryButton = ({ category, label, icon }: { category: string; label: string; icon: string }) => {
    const isSelected = selectedCategory === category;
    
    if (!categoryAnimations[category]) {
      categoryAnimations[category] = {
        scale: new Animated.Value(1),
        opacity: new Animated.Value(0.7)
      };
    }
    
    const buttonScale = categoryAnimations[category].scale;
    const buttonOpacity = categoryAnimations[category].opacity;

    const handlePress = () => {
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScale, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
      
      Animated.timing(buttonOpacity, {
        toValue: isSelected ? 0.7 : 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      setSelectedCategory(category);
    };

    return (
      <Animated.View 
        style={{ 
          transform: [{ scale: buttonScale }],
          opacity: buttonOpacity,
        }}
      >
        <TouchableOpacity
          style={[
            styles.categoryButton,
            { backgroundColor: Colors[currentTheme].cardBackground },
            isSelected && {
              backgroundColor: Colors[currentTheme].primary,
            },
          ]}
          onPress={handlePress}
        >
          <Ionicons
            name={icon as any}
            size={20}
            color={isSelected ? Colors[currentTheme].textLight : Colors[currentTheme].text}
          />
          <Text
            style={[
              styles.categoryButtonText,
              { color: isSelected ? Colors[currentTheme].textLight : Colors[currentTheme].text },
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const handleTestNotification = async () => {
    try {
        coffeeAlert(
        'Enviando notificação de teste...',
        'info'
      );
      
      // Verificar permissões de notificação
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        coffeeAlert(
          'Permissão Necessária\n\nPor favor, permita o envio de notificações para testar esta funcionalidade.',
          'info'
        );
        return;
      }
      
      // Enviar notificação para todos os usuários
      await sendNotificationToAllUsers(
        'Teste de Notificação',
        'Esta é uma notificação de teste do sistema.',
        { type: 'info', screen: 'avisos' }
      );
      
      coffeeAlert(
        'Notificação de teste enviada com sucesso!',
        'success'
      );
    } catch (error) {
      console.error('Erro ao enviar notificação de teste:', error);
      
      coffeeAlert(
        'Não foi possível enviar a notificação de teste. Verifique os logs para mais detalhes.',
        'error'
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[currentTheme].background }]}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: Colors[currentTheme].cardBackground }]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={Colors[currentTheme].text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: Colors[currentTheme].text }]}>Avisos</Text>
          </View>
          <View style={styles.headerRight}>
            {isAdmin && (
              <>
                <TouchableOpacity
                  style={[styles.testButton, { backgroundColor: Colors[currentTheme].cardBackground }]}
                  onPress={handleTestNotification}
                >
                  <Ionicons name="notifications" size={24} color={Colors[currentTheme].text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.newButton, { backgroundColor: Colors[currentTheme].cardBackground }]}
                  onPress={() => setModalVisible(true)}
                >
                  <Ionicons name="add" size={24} color={Colors[currentTheme].text} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          <CategoryButton category="all" label="Todos" icon="list" />
          <CategoryButton category="unread" label="Não Lidos" icon="mail-unread" />
          <CategoryButton category="info" label="Informação" icon="information-circle" />
          <CategoryButton category="warning" label="Aviso" icon="warning" />
          <CategoryButton category="success" label="Sucesso" icon="checkmark-circle" />
          <CategoryButton category="error" label="Erro" icon="alert-circle" />
        </ScrollView>

        <FlatList
          data={getFilteredNotifications()}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.notificationsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="notifications-off"
                size={48}
                color={Colors[currentTheme].textLight}
              />
              <Text style={[styles.emptyText, { color: Colors[currentTheme].textLight }]}>
                Nenhum aviso encontrado
              </Text>
            </View>
          }
        />
      </Animated.View>

      <NovoAvisoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {
          setupNotificationsListener();
          setModalVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    paddingTop: height * 0.02,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  newButton: {
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  testButton: {
    padding: 8,
    borderRadius: 12,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesContent: {
    paddingRight: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  categoryButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  notificationsList: {
    paddingBottom: 16,
  },
  notificationItem: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    borderLeftWidth: 4,
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTypeText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  notificationDate: {
    fontSize: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});