import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
  Modal,
  Switch,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useColorScheme } from 'react-native';
import { useApp } from '@/contexts/AppContext';
import { auth, db } from '@/config/firebase';
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { Colors, ThemeType } from '@/constants/Colors';
import { coffeeAlert } from '@/utils/coffeeAlert';

const { width, height } = Dimensions.get('window');

export default function ProfileScreen() {
  const { userName, userCredit, subscriptionStatus, subscriptionEndDate, syncWithFirebase, notificationsCount } = useApp();
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    memberSince: '',
    totalCoffees: 0,
    favoriteCoffee: 'Expresso',
    profileImage: null as string | null,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('Português');
  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('default');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [helpInfoModalVisible, setHelpInfoModalVisible] = useState(false);
  const [helpInfoTitle, setHelpInfoTitle] = useState('');
  const [helpInfoContent, setHelpInfoContent] = useState('');

  useEffect(() => {
    loadUserData();
    checkAdminStatus();
    loadTheme();
  }, [systemColorScheme]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('selectedTheme');
      const followSystem = await AsyncStorage.getItem('followSystemTheme');
      const customThemeStr = await AsyncStorage.getItem('customTheme');

      if (followSystem === 'true') {
        setCurrentTheme(systemColorScheme as ThemeType || 'default');
      } else if (savedTheme === 'custom' && customThemeStr) {
        setCurrentTheme('custom');
      } else {
        setCurrentTheme(savedTheme as ThemeType || 'default');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      setCurrentTheme('default');
    }
  };

  // Adicionar um listener para mudanças no tema
  useEffect(() => {
    const checkThemeChanges = async () => {
      const savedTheme = await AsyncStorage.getItem('selectedTheme');
      const customThemeStr = await AsyncStorage.getItem('customTheme');
      
      if (savedTheme === 'custom' && customThemeStr) {
        setCurrentTheme('custom');
      } else if (savedTheme) {
        setCurrentTheme(savedTheme as ThemeType);
      }
    };

    // Verificar mudanças a cada 1 segundo
    const interval = setInterval(checkThemeChanges, 1000);
    return () => clearInterval(interval);
  }, []);

  // Atualizar o tema quando o sistema mudar
  useEffect(() => {
    const followSystem = async () => {
      const followSystemTheme = await AsyncStorage.getItem('followSystemTheme');
      if (followSystemTheme === 'true') {
        setCurrentTheme(systemColorScheme as ThemeType || 'default');
      }
    };
    followSystem();
  }, [systemColorScheme]);

  const loadUserData = async () => {
    try {
      const email = await AsyncStorage.getItem('userEmail');
      const memberSince = await AsyncStorage.getItem('memberSince') || new Date().toISOString();
      const profileImage = await AsyncStorage.getItem('profileImage');
      const notificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');
      const language = await AsyncStorage.getItem('language');
      setUserData({
        ...userData,
        name: userName,
        email: email || '',
        memberSince: new Date(memberSince).toLocaleDateString('pt-BR'),
        profileImage: profileImage || null,
      });
      
      setEditedName(userName);
      setEditedEmail(email || '');
      setIsNotificationsEnabled(notificationsEnabled === 'true');
      setSelectedLanguage(language || 'Português');
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const adminStatus = await AsyncStorage.getItem('isAdmin');
      console.log('Admin status:', adminStatus);
      setIsAdmin(adminStatus === 'true');
    } catch (error) {
      console.error('Erro ao verificar status de admin:', error);
    }
  };

  const handleLogout = async () => {
    coffeeAlert(
      'Tem certeza que deseja sair?',
      'warning',
      [
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              // Fazer logout do Firebase Auth
              await signOut(auth);
              
              // Limpar dados do AsyncStorage
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userName');
              await AsyncStorage.removeItem('isAdmin');
              await AsyncStorage.removeItem('userCredit');
              await AsyncStorage.removeItem('subscriptionStatus');
              await AsyncStorage.removeItem('subscriptionEndDate');
              await AsyncStorage.removeItem('userEmail');
              
              // Redirecionar para a tela de login
              router.replace('/acesso');
            } catch (error) {
              console.error('Erro ao fazer logout:', error);
              coffeeAlert('Ocorreu um erro ao fazer logout','error');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
        {
          text: 'Cancelar',
          onPress: () => {},
          style: 'cancel',
        },
      ],
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      coffeeAlert('Precisamos de acesso à sua galeria para selecionar uma foto de perfil.','warning');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const newProfileImage = result.assets[0].uri;
      setUserData({ ...userData, profileImage: newProfileImage });
      await AsyncStorage.setItem('profileImage', newProfileImage);
    }
  };

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        throw new Error('User token not found');
      }

      // Update in Firestore
      const userRef = doc(db, 'users', userToken);
      await updateDoc(userRef, {
        userName: editedName,
        email: editedEmail
      });

      // Update local storage
      await AsyncStorage.setItem('userName', editedName);
      await AsyncStorage.setItem('userEmail', editedEmail);
      
      // Sync with Firebase context
      await syncWithFirebase();
      
      setIsEditing(false);
      coffeeAlert('Perfil atualizado com sucesso!','success');
    } catch (error) {
      console.error('Error saving profile:', error);
      coffeeAlert('Não foi possível atualizar o perfil. Tente novamente.','error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(userData.name);
    setEditedEmail(userData.email);
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    setIsChangingPassword(true);
    try {
      if (newPassword !== confirmPassword) {
        coffeeAlert('As senhas não coincidem.','error');
        return;
      }

      if (newPassword.length < 6) {
        coffeeAlert('A senha deve ter pelo menos 6 caracteres.','error');
        return;
      }

      // Verificar senha atual no Firestore
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        throw new Error('User token not found');
      }

      const userRef = doc(db, 'users', userToken);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }

      const userData = userDoc.data();
      if (userData.password !== currentPassword) {
        coffeeAlert('Senha atual incorreta.','error');
        return;
      }

      // Atualizar no Firestore
      await updateDoc(userRef, {
        password: newPassword,
        lastPasswordUpdate: new Date().toISOString()
      });

      coffeeAlert('Senha alterada com sucesso!','success');
      setIsPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      coffeeAlert('Não foi possível alterar a senha. Tente novamente.','error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const toggleNotifications = async (value: boolean) => {
    setIsNotificationsEnabled(value);
    await AsyncStorage.setItem('notificationsEnabled', value.toString());
  };

  const handleLanguageChange = async (language: string) => {
    setSelectedLanguage(language);
    await AsyncStorage.setItem('language', language);
  };

  const navigateToAdmin = async () => {
    await AsyncStorage.setItem('isAdmin', 'true');
    router.push('/(tabs)/admin');
  };

  const showHelpInfo = (title: string, content: string) => {
    setHelpInfoTitle(title);
    setHelpInfoContent(content);
    setHelpInfoModalVisible(true);
  };

  const renderEditProfileModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isEditing}
      onRequestClose={() => setIsEditing(false)}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: Colors[currentTheme].background }]}>
            <Text style={[styles.modalTitle, { color: Colors[currentTheme].textLight }]}>Editar Perfil</Text>
          
          <Text style={[styles.inputLabel, { color: Colors[currentTheme].textLight }]}>Nome</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: Colors[currentTheme].cardBackground,
              color: Colors[currentTheme].textLight
            }]}
            value={editedName}
            onChangeText={setEditedName}
            placeholder="Seu nome"
            placeholderTextColor={Colors[currentTheme].textLight}
            />
          
          <Text style={[styles.inputLabel, { color: Colors[currentTheme].textLight }]}>Email</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: Colors[currentTheme].cardBackground,
              color: Colors[currentTheme].textLight
            }]}
            value={editedEmail}
            onChangeText={setEditedEmail}
            placeholder="Seu email"
            placeholderTextColor={Colors[currentTheme].textLight}
            keyboardType="email-address"
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton, { backgroundColor: Colors[currentTheme].cardBackground }]} 
              onPress={handleCancelEdit}
              disabled={isSavingProfile}
            >
              <Text style={[styles.modalButtonText, { color: Colors[currentTheme].textLight }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton, { backgroundColor: Colors[currentTheme].primary }]} 
              onPress={handleSaveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? (
                <ActivityIndicator color={Colors[currentTheme].textLight} />
              ) : (
                <Text style={[styles.modalButtonText, { color: Colors[currentTheme].textLight }]}>Salvar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPasswordModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isPasswordModalVisible}
      onRequestClose={() => setIsPasswordModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: Colors[currentTheme].background }]}>
          <Text style={[styles.modalTitle, { color: Colors[currentTheme].textLight }]}>Alterar Senha</Text>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: Colors[currentTheme].textLight }]}>Senha Atual</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: Colors[currentTheme].cardBackground,
                  color: Colors[currentTheme].textLight
                }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Digite sua senha atual"
                placeholderTextColor={Colors[currentTheme].textLight}
                secureTextEntry={!showCurrentPassword}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Ionicons 
                  name={showCurrentPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color={Colors[currentTheme].textLight} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: Colors[currentTheme].textLight }]}>Nova Senha</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: Colors[currentTheme].cardBackground,
                  color: Colors[currentTheme].textLight
                }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Digite a nova senha"
                placeholderTextColor={Colors[currentTheme].textLight}
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons 
                  name={showNewPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color={Colors[currentTheme].textLight} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: Colors[currentTheme].textLight }]}>Confirmar Nova Senha</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: Colors[currentTheme].cardBackground,
                  color: Colors[currentTheme].textLight
                }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirme a nova senha"
                placeholderTextColor={Colors[currentTheme].textLight}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color={Colors[currentTheme].textLight} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton, { backgroundColor: Colors[currentTheme].cardBackground }]} 
              onPress={() => setIsPasswordModalVisible(false)}
              disabled={isChangingPassword}
            >
              <Text style={[styles.modalButtonText, { color: Colors[currentTheme].textLight }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton, { backgroundColor: Colors[currentTheme].primary }]} 
              onPress={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <ActivityIndicator color={Colors[currentTheme].textLight} />
              ) : (
                <Text style={[styles.modalButtonText, { color: Colors[currentTheme].textLight }]}>Alterar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderLanguageModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={false}
      onRequestClose={() => {}}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: Colors[currentTheme].background }]}>
          <Text style={[styles.modalTitle, { color: Colors[currentTheme].textLight }]}>Selecionar Idioma</Text>
          
          <TouchableOpacity 
            style={[
              styles.languageOption, 
              { backgroundColor: Colors[currentTheme].cardBackground },
              selectedLanguage === 'Português' && [
                styles.selectedLanguage,
                { 
                  backgroundColor: Colors[currentTheme].activeSubscription,
                  borderColor: Colors[currentTheme].primary
                }
              ]
            ]}
            onPress={() => handleLanguageChange('Português')}
          >
            <Text style={[styles.languageText, { color: Colors[currentTheme].textLight }]}>Português</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.languageOption, 
              { backgroundColor: Colors[currentTheme].cardBackground },
              selectedLanguage === 'English' && [
                styles.selectedLanguage,
                { 
                  backgroundColor: Colors[currentTheme].activeSubscription,
                  borderColor: Colors[currentTheme].primary
                }
              ]
            ]}
            onPress={() => handleLanguageChange('English')}
          >
            <Text style={[styles.languageText, { color: Colors[currentTheme].textLight }]}>English</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.languageOption, 
              { backgroundColor: Colors[currentTheme].cardBackground },
              selectedLanguage === 'Español' && [
                styles.selectedLanguage,
                { 
                  backgroundColor: Colors[currentTheme].activeSubscription,
                  borderColor: Colors[currentTheme].primary
                }
              ]
            ]}
            onPress={() => handleLanguageChange('Español')}
          >
            <Text style={[styles.languageText, { color: Colors[currentTheme].textLight }]}>Español</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.modalButton, { backgroundColor: Colors[currentTheme].primary }]} 
            onPress={() => {}}
          >
            <Text style={[styles.modalButtonText, { color: Colors[currentTheme].textLight }]}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderHelpInfoModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={helpInfoModalVisible}
      onRequestClose={() => setHelpInfoModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: Colors[currentTheme].background }]}>
          <Text style={[styles.modalTitle, { color: Colors[currentTheme].textLight }]}>{helpInfoTitle}</Text>
          
          <View style={styles.helpInfoContent}>
            <Text style={[styles.helpInfoText, { color: Colors[currentTheme].textLight }]}>{helpInfoContent}</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.modalButton, { backgroundColor: Colors[currentTheme].primary }]} 
            onPress={() => setHelpInfoModalVisible(false)}
          >
            <Text style={[styles.modalButtonText, { color: Colors[currentTheme].textLight }]}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderHelpModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isHelpModalVisible}
      onRequestClose={() => setIsHelpModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: Colors[currentTheme].background }]}>
          <Text style={[styles.modalTitle, { color: Colors[currentTheme].textLight }]}>Ajuda</Text>
          
          <View style={styles.helpSection}>
            <Text style={[styles.helpTitle, { color: Colors[currentTheme].textLight }]}>Perguntas Frequentes</Text>
            <TouchableOpacity 
              style={[styles.helpItem, { backgroundColor: Colors[currentTheme].cardBackground }]}
              onPress={() => showHelpInfo(
                'Como alterar minha senha?',
                'Para alterar sua senha:\n\n1. Clique em "Alterar Senha" na seção Conta\n2. Digite sua senha atual\n3. Digite a nova senha\n4. Confirme a nova senha\n5. Clique em "Alterar"\n\nA senha deve ter pelo menos 6 caracteres.'
              )}
            >
              <Text style={[styles.helpItemText, { color: Colors[currentTheme].textLight }]}>Como alterar minha senha?</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors[currentTheme].primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.helpItem, { backgroundColor: Colors[currentTheme].cardBackground }]}
              onPress={() => showHelpInfo(
                'Como atualizar meu perfil?',
                'Para atualizar seu perfil:\n\n1. Clique em "Editar Perfil" na seção Conta\n2. Modifique seu nome ou email\n3. Clique em "Salvar"\n\nAs alterações serão aplicadas imediatamente.'
              )}
            >
              <Text style={[styles.helpItemText, { color: Colors[currentTheme].textLight }]}>Como atualizar meu perfil?</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors[currentTheme].primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.helpItem, { backgroundColor: Colors[currentTheme].cardBackground }]}
              onPress={() => showHelpInfo(
                'Como funciona os temas?',
                'O aplicativo oferece diferentes temas para personalizar sua experiência:\n\n1. Clique em "Tema" na seção Preferências\n2. Escolha entre os temas disponíveis\n3. Você pode optar por seguir o tema do sistema\n4. As alterações são aplicadas instantaneamente'
              )}
            >
              <Text style={[styles.helpItemText, { color: Colors[currentTheme].textLight }]}>Como funciona os temas?</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors[currentTheme].primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.helpSection}>
            <Text style={[styles.helpTitle, { color: Colors[currentTheme].textLight }]}>Contato</Text>
            <TouchableOpacity 
              style={[styles.helpItem, { backgroundColor: Colors[currentTheme].cardBackground }]}
              onPress={() => {
                const phoneNumber = '+5566999086599';
                const message = 'Olá, preciso de ajuda com o aplicativo Café.';
                const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                Linking.openURL(whatsappUrl).catch(err => {
                  coffeeAlert('Não foi possível abrir o WhatsApp','error');
                });
              }}
            >
              <Text style={[styles.helpItemText, { color: Colors[currentTheme].textLight }]}>Enviar mensagem para o monitor da maquina !</Text>
              <Ionicons name="logo-whatsapp" size={20} color={Colors[currentTheme].primary} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.modalButton, { backgroundColor: Colors[currentTheme].primary }]} 
            onPress={() => setIsHelpModalVisible(false)}
          >
            <Text style={[styles.modalButtonText, { color: Colors[currentTheme].textLight }]}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[currentTheme].background }]}>
      <LinearGradient
        colors={[Colors[currentTheme].gradientStart, Colors[currentTheme].gradientEnd]}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <View style={styles.profileImageContainer}>
              {userData.profileImage ? (
                <Image
                  source={{ uri: userData.profileImage }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <Image
                  source={require('@/assets/imgs/xicara.png')}
                  style={[styles.profileImage, { tintColor: Colors[currentTheme].textLight }]}
                  resizeMode="contain"
                />
              )}
            </View>
            <Text style={[styles.userName, { color: Colors[currentTheme].textLight }]}>{userData.name}</Text>
            <Text style={[styles.memberSince, { color: Colors[currentTheme].textLight }]}>Membro desde {userData.memberSince}</Text>
          </View>


          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors[currentTheme].textLight }]}>Preferências</Text>
            <View style={[styles.preferenceItem, { backgroundColor: Colors[currentTheme].cardBackground }]}>
              <Ionicons name="notifications" size={24} color={Colors[currentTheme].primary} />
              <Text style={[styles.preferenceText, { color: Colors[currentTheme].textLight }]}>Notificações</Text>
              <Switch
                trackColor={{ false: '#767577', true: Colors[currentTheme].primary }}
                thumbColor={isNotificationsEnabled ? Colors[currentTheme].textLight : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={toggleNotifications}
                value={isNotificationsEnabled}
                disabled={isLoading}
              />
            </View>
              <TouchableOpacity onPress={() => coffeeAlert('No momento não é possível alterar o idioma...\nVoce conhece o google translate ou sabe outro idioma?','warning')}>
            <View style={[styles.preferenceItem, { backgroundColor: Colors[currentTheme].cardBackground }]}>
              <Ionicons name="language" size={24} color={Colors[currentTheme].primary} />
              <Text style={[styles.preferenceText, { color: Colors[currentTheme].textLight }]}>Idioma</Text>
              <Text style={[styles.preferenceValue, { color: Colors[currentTheme].primary }]}>{selectedLanguage}</Text>
                <Ionicons name="chevron-forward" size={24} color={Colors[currentTheme].primary} />
            </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/telas_extras/tema')}>
            <View style={[styles.preferenceItem, { backgroundColor: Colors[currentTheme].cardBackground }]}>
              <Ionicons name="color-palette" size={24} color={Colors[currentTheme].primary} />
              <Text style={[styles.preferenceText, { color: Colors[currentTheme].textLight }]}>Tema</Text>
                <Ionicons name="chevron-forward" size={24} color={Colors[currentTheme].primary} />
            </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/jogos')}>
            <View style={[styles.preferenceItem, { backgroundColor: Colors[currentTheme].cardBackground }]}>
              <Ionicons name="game-controller" size={24} color={Colors[currentTheme].primary} />
              <Text style={[styles.preferenceText, { color: Colors[currentTheme].textLight }]}>Jogos</Text>
                <Ionicons name="chevron-forward" size={24} color={Colors[currentTheme].primary} />
            </View>
              </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors[currentTheme].textLight }]}>Conta</Text>
              <TouchableOpacity onPress={handleEditProfile} disabled={isLoading}>
            <View style={[styles.preferenceItem, { backgroundColor: Colors[currentTheme].cardBackground }]}>
              <Ionicons name="person" size={24} color={Colors[currentTheme].primary} />
              <Text style={[styles.preferenceText, { color: Colors[currentTheme].textLight }]}>Editar Perfil</Text>
                <Ionicons name="chevron-forward" size={24} color={Colors[currentTheme].primary} />
            </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsPasswordModalVisible(true)} disabled={isLoading}>
            <View style={[styles.preferenceItem, { backgroundColor: Colors[currentTheme].cardBackground }]}>
              <Ionicons name="lock-closed" size={24} color={Colors[currentTheme].primary} />
              <Text style={[styles.preferenceText, { color: Colors[currentTheme].textLight }]}>Alterar Senha</Text>
                <Ionicons name="chevron-forward" size={24} color={Colors[currentTheme].primary} />
            </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsHelpModalVisible(true)} disabled={isLoading}>
            <View style={[styles.preferenceItem, { backgroundColor: Colors[currentTheme].cardBackground }]}>
              <Ionicons name="help-circle" size={24} color={Colors[currentTheme].primary} />
              <Text style={[styles.preferenceText, { color: Colors[currentTheme].textLight }]}>Ajuda</Text>
                <Ionicons name="chevron-forward" size={24} color={Colors[currentTheme].primary} />
            </View>
              </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: Colors[currentTheme].cardBackground }]}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator color={Colors[currentTheme].error} />
            ) : (
              <Text style={[styles.logoutText, { color: Colors[currentTheme].error }]}>Sair</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
        
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: Colors[currentTheme].primary }]}
          onPress={() => router.push('/telas_extras/avisos')}
          disabled={isLoading}
        >
          <View style={styles.fabContent}>
            <Ionicons name="notifications" size={24} color={Colors[currentTheme].textLight} />
            {notificationsCount > 0 && (
              <View style={[styles.fabBadge, { backgroundColor: Colors[currentTheme].error }]}>
                <Text style={styles.fabBadgeText}>{notificationsCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </LinearGradient>
      
      {renderEditProfileModal()}
      {renderPasswordModal()}
      {renderLanguageModal()}
      {renderHelpModal()}
      {renderHelpInfoModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: height * 0.056,
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
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  profileImage: {
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: width * 0.2,
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 5,
  },
  memberSince: {
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    marginTop: 10,
  },
  statCard: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    width: width * 0.4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 14,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  preferenceText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 15,
  },
  preferenceValue: {
    fontSize: 16,
    marginRight: 10,
  },
  logoutButton: {
    margin: 20,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 16,
    marginBottom: 5,
    marginLeft: 5,
  },
  input: {
    width: '100%',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  modalButton: {
    padding: 15,
    borderRadius: 12,
    width: '48%',
    alignItems: 'center',
  },
  cancelButton: {
  },
  saveButton: {
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  languageOption: {
    width: '100%',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  selectedLanguage: {
    borderWidth: 1,
  },
  languageText: {
    fontSize: 16,
  },
  helpSection: {
    width: '100%',
    marginBottom: 20,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  helpItemText: {
    fontSize: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  optionIconContainer: {
    marginRight: 10,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionDescription: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: height * 0.04,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
  },
  fabContent: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  fabBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  helpInfoContent: {
    width: '100%',
    padding: 15,
    marginBottom: 20,
  },
  helpInfoText: {
    fontSize: 16,
    lineHeight: 24,
  },
});
