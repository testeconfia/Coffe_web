import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, ThemeType } from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { firestore } from '@/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { sendNotificationToAllUsers } from '@/services/NotificationService';

interface NovoAvisoModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NovoAvisoModal({ visible, onClose, onSuccess }: NovoAvisoModalProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'success' | 'error'>('info');
  const [loading, setLoading] = useState(false);
  const systemColorScheme = useColorScheme();
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('default');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isMessageFocused, setIsMessageFocused] = useState(false);
  const typeButtonAnimations = useRef<{[key: string]: {scale: Animated.Value, opacity: Animated.Value}}>({}).current;

  useEffect(() => {
    loadTheme();
    if (visible) {
      startAnimation();
    } else {
      resetAnimation();
    }
  }, [visible, systemColorScheme]);

  const loadTheme = async () => {
    const theme = await AsyncStorage.getItem('selectedTheme');
    const followSystem = await AsyncStorage.getItem('followSystemTheme');
    if (followSystem === 'true') {
      setCurrentTheme(systemColorScheme as ThemeType || 'default');
    } else {
      setCurrentTheme(theme as ThemeType || 'default');
    }
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

  const resetAnimation = () => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.95);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      return;
    }

    setLoading(true);
    try {
      const avisosRef = collection(firestore, 'avisos');
      
      const newNotification = {
        title: title.trim(),
        message: message.trim(),
        type,
        timestamp: serverTimestamp(),
        read: false,
      };

      const docRef = await addDoc(avisosRef, newNotification);
      
      // Enviar notificação para todos os usuários
      try {
        await sendNotificationToAllUsers(
          title.trim(),
          message.trim(),
          {
            screen: 'avisos',
            notificationId: docRef.id,
            type: type
          }
        );
      } catch (notificationError) {
        console.error('Error sending notification to all users:', notificationError);
        // Continuar mesmo se a notificação falhar
      }
      
      setTitle('');
      setMessage('');
      setType('info');
      onSuccess();
    } catch (error) {
      console.error('Error saving notification:', error);
    } finally {
      setLoading(false);
    }
  };

  const TypeButton = ({ type: buttonType, label, icon }: { type: 'info' | 'warning' | 'success' | 'error'; label: string; icon: string }) => {
    const isSelected = type === buttonType;
    
    if (!typeButtonAnimations[buttonType]) {
      typeButtonAnimations[buttonType] = {
        scale: new Animated.Value(1),
        opacity: new Animated.Value(0.7)
      };
    }
    
    const buttonScale = typeButtonAnimations[buttonType].scale;
    const buttonOpacity = typeButtonAnimations[buttonType].opacity;

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
      
      setType(buttonType);
    };

    return (
      <Animated.View 
        style={{ 
          transform: [{ scale: buttonScale }],
        }}
      >
        <TouchableOpacity
          style={[
            styles.typeButton,
            { backgroundColor: 'transparent' },
            isSelected && {
              backgroundColor: Colors[currentTheme][buttonType as keyof typeof Colors[typeof currentTheme]  ],
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
              styles.typeButtonText,
              { color: isSelected ? Colors[currentTheme].textLight : Colors[currentTheme].text },
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <Animated.View
          style={[
            styles.modalContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              backgroundColor: Colors[currentTheme].background,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: Colors[currentTheme].text }]}>Novo Aviso</Text>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: Colors[currentTheme].cardBackground }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={Colors[currentTheme].text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            <View style={styles.typeContainer}>
              <TypeButton type="info" label="Informação" icon="information-circle" />
              <TypeButton type="warning" label="Aviso" icon="warning" />
              <TypeButton type="success" label="Sucesso" icon="checkmark-circle" />
              <TypeButton type="error" label="Erro" icon="alert-circle" />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: Colors[currentTheme].text }]}>Título</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[currentTheme].cardBackground,
                    color: Colors[currentTheme].textLight,
                    borderColor: isTitleFocused ? Colors[currentTheme][type as keyof typeof Colors[typeof currentTheme]] : Colors[currentTheme].border,
                  },
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder="Digite o título do aviso"
                placeholderTextColor={Colors[currentTheme].textLight}
                onFocus={() => setIsTitleFocused(true)}
                onBlur={() => setIsTitleFocused(false)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: Colors[currentTheme].text }]}>Mensagem</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.messageInput,
                  {
                    backgroundColor: Colors[currentTheme].cardBackground,
                    color: Colors[currentTheme].textLight,
                    borderColor: isMessageFocused ? Colors[currentTheme][type as keyof typeof Colors[typeof currentTheme]] : Colors[currentTheme].border,
                  },
                ]}
                value={message}
                onChangeText={setMessage}
                placeholder="Digite a mensagem do aviso"
                placeholderTextColor={Colors[currentTheme].textLight}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => setIsMessageFocused(true)}
                onBlur={() => setIsMessageFocused(false)}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: Colors[currentTheme].cardBackground }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: Colors[currentTheme].text }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: Colors[currentTheme].primary,
                  opacity: loading || !title.trim() || !message.trim() ? 0.5 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={loading || !title.trim() || !message.trim()}
            >
              <Text style={[styles.submitButtonText, { color: Colors[currentTheme].textLight }]}>
                {loading ? 'Enviando...' : 'Enviar'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  form: {
    padding: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  typeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageInput: {
    height: 150,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 