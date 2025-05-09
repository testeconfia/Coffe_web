/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export type ThemeColors = {
  text: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  primary: string;
  secondary: string;
  accent: string;
  card: string;
  border: string;
  notification: string;
  gradientStart: string;
  gradientEnd: string;
  textLight: string;
  textDark: string;
  cardBackground: string;
  buttonPrimary: string;
  buttonSecondary: string;
  buttonText: string;
  success: string;
  warning: string;
  error: string;
  divider: string;
  shadow: string;
  creditCard: string;
  creditAmount: string;
  creditInfo: string;
  subscriptionCard: string;
  subscriptionPrice: string;
  subscriptionBenefits: string;
  activeSubscription: string;
  activeText: string;
  endDateText: string;
  subscribeButton: string;
  subscribeButtonText: string;
  creditOption: string;
  creditOptionAmount: string;
  creditOptionBonus: string;
  transactionList: string;
  transactionItem: string;
  transactionTitle: string;
  transactionDate: string;
  transactionAmount: string;
  evaluatingSubscription: string;
  evaluatingText: string;
  evaluatingDescription: string;
  emptyText: string;
  notificationItem: string;
  notificationUnread: string;
  notificationIconInfo: string;
  notificationIconWarning: string;
  notificationIconError: string;
  notificationIconSuccess: string;
  notificationIconDefault: string;
  notificationType: string;
  notificationMessage: string;
  notificationTime: string;
  notificationUnreadIndicator: string;
  notificationBadge: string;
  notificationBadgeText: string;
  notificationUpdateBanner: string;
  notificationUpdateBannerText: string;
  notificationUpdateButton: string;
  notificationUpdateButtonText: string;
  notificationUserInfoContainer: string;
  notificationUserInfoHeader: string;
  notificationUserInfoTitle: string;
  notificationUserInfoContent: string;
  notificationUserInfoLabel: string;
  notificationUserInfoValue: string;
  notificationFilterButton: string;
  notificationFilterButtonActive: string;
  notificationFilterButtonText: string;
  notificationFilterButtonTextActive: string;
  notificationAutoReloadContainer: string;
  notificationAutoReloadText: string;
  notificationMarkAllReadButton: string;
  notificationMarkAllReadText: string;
  notificationMarkAllReadTextDisabled: string;
  notificationEmptyContainer: string;
  notificationEmptyText: string;
  notificationEmptySubText: string;
  notificationBackButton: string;
  notificationBackButtonBackground: string;
  statsCard: string;
  statsValue: string;
  statsLabel: string;
  statsSection: string;
  statsSectionTitle: string;
  statsChartBackground: string;
  statsChartGradientFrom: string;
  statsChartGradientTo: string;
  statsChartColor: string;
  statsPreferenceItem: string;
  statsPreferenceLabel: string;
  statsPreferenceValue: string;
  statsRecentItem: string;
  statsRecentDate: string;
  statsRecentTime: string;
  statsRecentQuantity: string;
  statsBackButton: string;
  statsBackButtonBackground: string;
  loginGradientStart: string;
  loginGradientMiddle: string;
  loginGradientEnd: string;
  loginLogo: string;
  loginTitle: string;
  loginSubtitle: string;
  loginInputContainer: string;
  loginInputBorder: string;
  loginInputIcon: string;
  loginInputText: string;
  loginInputPlaceholder: string;
  loginButtonGradientStart: string;
  loginButtonGradientEnd: string;
  loginButtonText: string;
  loginButtonDisabled: string;
  loginButtonShadow: string;
  loginLoadingDot: string;
  loginRegisterText: string;
  loginRegisterTextBold: string;
  loginTextShadow: string;
  registerGradientStart: string;
  registerGradientMiddle: string;
  registerGradientEnd: string;
  registerLogo: string;
  registerTitle: string;
  registerSubtitle: string;
  registerInputContainer: string;
  registerInputBorder: string;
  registerInputIcon: string;
  registerInputText: string;
  registerInputPlaceholder: string;
  registerButtonGradientStart: string;
  registerButtonGradientEnd: string;
  registerButtonText: string;
  registerButtonDisabled: string;
  registerButtonShadow: string;
  registerLoadingDot: string;
  registerLoginText: string;
  registerLoginTextBold: string;
  registerTextShadow: string;
};

export type ThemeType = 'default' | 'dark' | 'light' | 'custom';

// Inicializa o tema custom com o tema padrão
let customTheme = {
  text: '#11181C',
  background: '#4A2C2A',
  tint: '#8B4513',
  icon: '#E0E0E0',
  tabIconDefault: '#E0E0E0',
  tabIconSelected: '#8B4513',
  primary: '#8B4513',
  secondary: '#2C1810',
  accent: '#A0522D',
  card: '#FFFFFF',
  border: '#E1E3E5',
  notification: '#FF6B6B',
  gradientStart: '#4A2C2A',
  gradientEnd: '#2C1810',
  textLight: '#FFFFFF',
  textDark: '#11181C',
  cardBackground: 'rgba(255, 255, 255, 0.1)',
  buttonPrimary: '#8B4513',
  buttonSecondary: 'rgba(255, 255, 255, 0.1)',
  buttonText: '#FFFFFF',
  success: '#4CAF50',
  warning: '#FFA500',
  error: '#FF6B6B',
  divider: 'rgba(139, 69, 19, 0.2)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  creditCard: 'rgba(255, 255, 255, 0.1)',
  creditAmount: '#FFFFFF',
  creditInfo: '#FFFFFF',
  subscriptionCard: 'rgba(255, 255, 255, 0.1)',
  subscriptionPrice: '#8B4513',
  subscriptionBenefits: '#E0E0E0',
  activeSubscription: 'rgba(139, 69, 19, 0.2)',
  activeText: '#8B4513',
  endDateText: '#E0E0E0',
  subscribeButton: '#8B4513',
  subscribeButtonText: '#FFFFFF',
  creditOption: 'rgba(255, 255, 255, 0.1)',
  creditOptionAmount: '#FFFFFF',
  creditOptionBonus: '#8B4513',
  transactionList: 'rgba(255, 255, 255, 0.1)',
  transactionItem: 'rgba(255, 255, 255, 0.1)',
  transactionTitle: '#FFFFFF',
  transactionDate: '#A0A0A0',
  transactionAmount: '#8B4513',
  evaluatingSubscription: 'rgba(255, 165, 0, 0.2)',
  evaluatingText: '#FFA500',
  evaluatingDescription: '#E0E0E0',
  emptyText: '#A0A0A0',
  notificationItem: 'rgba(255, 255, 255, 0.1)',
  notificationUnread: 'rgba(255, 255, 255, 0.15)',
  notificationIconInfo: '#3498db',
  notificationIconWarning: '#f39c12',
  notificationIconError: '#e74c3c',
  notificationIconSuccess: '#2ecc71',
  notificationIconDefault: '#8B4513',
  notificationType: '#FFFFFF',
  notificationMessage: '#FFFFFF',
  notificationTime: '#E0E0E0',
  notificationUnreadIndicator: '#e74c3c',
  notificationBadge: '#e74c3c',
  notificationBadgeText: '#FFFFFF',
  notificationUpdateBanner: '#8B4513',
  notificationUpdateBannerText: '#FFFFFF',
  notificationUpdateButton: '#8B4513',
  notificationUpdateButtonText: '#FFFFFF',
  notificationUserInfoContainer: 'rgba(255, 255, 255, 0.1)',
  notificationUserInfoHeader: '#FFFFFF',
  notificationUserInfoTitle: '#FFFFFF',
  notificationUserInfoContent: 'rgba(0, 0, 0, 0.2)',
  notificationUserInfoLabel: '#E0E0E0',
  notificationUserInfoValue: '#FFFFFF',
  notificationFilterButton: 'rgba(255, 255, 255, 0.1)',
  notificationFilterButtonActive: '#8B4513',
  notificationFilterButtonText: '#E0E0E0',
  notificationFilterButtonTextActive: '#FFFFFF',
  notificationAutoReloadContainer: 'rgba(255, 255, 255, 0.05)',
  notificationAutoReloadText: '#E0E0E0',
  notificationMarkAllReadButton: '#8B4513',
  notificationMarkAllReadText: '#8B4513',
  notificationMarkAllReadTextDisabled: '#999',
  notificationEmptyContainer: '#FFFFFF',
  notificationEmptyText: '#FFFFFF',
  notificationEmptySubText: '#E0E0E0',
  notificationBackButton: '#FFFFFF',
  notificationBackButtonBackground: 'rgba(255, 255, 255, 0.1)',
  statsCard: 'rgba(255, 255, 255, 0.1)',
  statsValue: '#8B4513',
  statsLabel: '#E0E0E0',
  statsSection: 'rgba(255, 255, 255, 0.1)',
  statsSectionTitle: '#FFFFFF',
  statsChartBackground: '#2C1810',
  statsChartGradientFrom: '#4A2C2A',
  statsChartGradientTo: '#2C1810',
  statsChartColor: 'rgba(139, 69, 19, 1)',
  statsPreferenceItem: 'rgba(255, 255, 255, 0.05)',
  statsPreferenceLabel: '#E0E0E0',
  statsPreferenceValue: '#8B4513',
  statsRecentItem: 'rgba(255, 255, 255, 0.1)',
  statsRecentDate: '#FFFFFF',
  statsRecentTime: '#E0E0E0',
  statsRecentQuantity: '#8B4513',
  statsBackButton: '#FFFFFF',
  statsBackButtonBackground: 'rgba(255, 255, 255, 0.1)',
  loginGradientStart: '#2C1810',
  loginGradientMiddle: '#4A2C2A',
  loginGradientEnd: '#2C1810',
  loginLogo: '#FFFFFF',
  loginTitle: '#FFFFFF',
  loginSubtitle: '#E0E0E0',
  loginInputContainer: 'rgba(255, 255, 255, 0.1)',
  loginInputBorder: 'rgba(255, 255, 255, 0.2)',
  loginInputIcon: '#A0A0A0',
  loginInputText: '#FFFFFF',
  loginInputPlaceholder: '#A0A0A0',
  loginButtonGradientStart: '#8B4513',
  loginButtonGradientEnd: '#8B4513',
  loginButtonText: '#FFFFFF',
  loginButtonDisabled: 'rgba(139, 69, 19, 0.5)',
  loginButtonShadow: 'rgba(0, 0, 0, 0.3)',
  loginLoadingDot: '#FFFFFF',
  loginRegisterText: '#E0E0E0',
  loginRegisterTextBold: '#FFFFFF',
  loginTextShadow: 'rgba(0, 0, 0, 0.3)',
  registerGradientStart: '#2C1810',
  registerGradientMiddle: '#4A2C2A',
  registerGradientEnd: '#2C1810',
  registerLogo: '#FFFFFF',
  registerTitle: '#FFFFFF',
  registerSubtitle: '#E0E0E0',
  registerInputContainer: 'rgba(255, 255, 255, 0.1)',
  registerInputBorder: 'rgba(255, 255, 255, 0.2)',
  registerInputIcon: '#A0A0A0',
  registerInputText: '#FFFFFF',
  registerInputPlaceholder: '#A0A0A0',
  registerButtonGradientStart: '#8B4513',
  registerButtonGradientEnd: '#8B4513',
  registerButtonText: '#FFFFFF',
  registerButtonDisabled: 'rgba(139, 69, 19, 0.5)',
  registerButtonShadow: 'rgba(0, 0, 0, 0.3)',
  registerLoadingDot: '#FFFFFF',
  registerLoginText: '#E0E0E0',
  registerLoginTextBold: '#FFFFFF',
  registerTextShadow: 'rgba(0, 0, 0, 0.3)',
};

// Função para carregar o tema custom do AsyncStorage
const loadCustomTheme = async () => {
  try {
    const customThemeStr = await AsyncStorage.getItem('customTheme');
    if (customThemeStr) {
      return JSON.parse(customThemeStr);
    }
    return customTheme; // Retorna o tema padrão se não houver tema custom salvo
  } catch (error) {
    console.error('Error loading custom theme:', error);
    return customTheme; // Em caso de erro, retorna o tema padrão
  }
};

// Carrega o tema custom do AsyncStorage
loadCustomTheme().then(theme => {
  customTheme = theme;
});

export const Colors: Record<ThemeType, ThemeColors> = {
  default: {
    text: '#11181C',
    background: '#4A2C2A',
    tint: '#8B4513',
    icon: '#E0E0E0',
    tabIconDefault: '#E0E0E0',
    tabIconSelected: '#8B4513',
    primary: '#8B4513',
    secondary: '#2C1810',
    accent: '#A0522D',
    card: '#FFFFFF',
    border: '#E1E3E5',
    notification: '#FF6B6B',
    gradientStart: '#4A2C2A',
    gradientEnd: '#2C1810',
    textLight: '#FFFFFF',
    textDark: '#11181C',
    cardBackground: 'rgba(255, 255, 255, 0.14)',
    buttonPrimary: '#8B4513',
    buttonSecondary: 'rgba(255, 255, 255, 0.1)',
    buttonText: '#FFFFFF',
    success: '#4CAF50',
    warning: '#FFA500',
    error: '#FF6B6B',
    divider: 'rgba(139, 69, 19, 0.2)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    creditCard: 'rgba(255, 255, 255, 0.1)',
    creditAmount: '#FFFFFF',
    creditInfo: '#FFFFFF',
    subscriptionCard: 'rgba(255, 255, 255, 0.1)',
    subscriptionPrice: '#8B4513',
    subscriptionBenefits: '#E0E0E0',
    activeSubscription: 'rgba(139, 69, 19, 0.2)',
    activeText: '#8B4513',
    endDateText: '#E0E0E0',
    subscribeButton: '#8B4513',
    subscribeButtonText: '#FFFFFF',
    creditOption: 'rgba(255, 255, 255, 0.1)',
    creditOptionAmount: '#FFFFFF',
    creditOptionBonus: '#8B4513',
    transactionList: 'rgba(255, 255, 255, 0.1)',
    transactionItem: 'rgba(255, 255, 255, 0.1)',
    transactionTitle: '#FFFFFF',
    transactionDate: '#A0A0A0',
    transactionAmount: '#8B4513',
    evaluatingSubscription: 'rgba(255, 165, 0, 0.2)',
    evaluatingText: '#FFA500',
    evaluatingDescription: '#E0E0E0',
    emptyText: '#A0A0A0',
    notificationItem: 'rgba(255, 255, 255, 0.1)',
    notificationUnread: 'rgba(255, 255, 255, 0.15)',
    notificationIconInfo: '#3498db',
    notificationIconWarning: '#f39c12',
    notificationIconError: '#e74c3c',
    notificationIconSuccess: '#2ecc71',
    notificationIconDefault: '#8B4513',
    notificationType: '#FFFFFF',
    notificationMessage: '#FFFFFF',
    notificationTime: '#E0E0E0',
    notificationUnreadIndicator: '#e74c3c',
    notificationBadge: '#e74c3c',
    notificationBadgeText: '#FFFFFF',
    notificationUpdateBanner: '#8B4513',
    notificationUpdateBannerText: '#FFFFFF',
    notificationUpdateButton: '#8B4513',
    notificationUpdateButtonText: '#FFFFFF',
    notificationUserInfoContainer: 'rgba(255, 255, 255, 0.1)',
    notificationUserInfoHeader: '#FFFFFF',
    notificationUserInfoTitle: '#FFFFFF',
    notificationUserInfoContent: 'rgba(0, 0, 0, 0.2)',
    notificationUserInfoLabel: '#E0E0E0',
    notificationUserInfoValue: '#FFFFFF',
    notificationFilterButton: 'rgba(255, 255, 255, 0.1)',
    notificationFilterButtonActive: '#8B4513',
    notificationFilterButtonText: '#E0E0E0',
    notificationFilterButtonTextActive: '#FFFFFF',
    notificationAutoReloadContainer: 'rgba(255, 255, 255, 0.05)',
    notificationAutoReloadText: '#E0E0E0',
    notificationMarkAllReadButton: '#8B4513',
    notificationMarkAllReadText: '#8B4513',
    notificationMarkAllReadTextDisabled: '#999',
    notificationEmptyContainer: '#FFFFFF',
    notificationEmptyText: '#FFFFFF',
    notificationEmptySubText: '#E0E0E0',
    notificationBackButton: '#FFFFFF',
    notificationBackButtonBackground: 'rgba(255, 255, 255, 0.1)',
    statsCard: 'rgba(255, 255, 255, 0.1)',
    statsValue: '#8B4513',
    statsLabel: '#E0E0E0',
    statsSection: 'rgba(255, 255, 255, 0.1)',
    statsSectionTitle: '#FFFFFF',
    statsChartBackground: '#2C1810',
    statsChartGradientFrom: '#4A2C2A',
    statsChartGradientTo: '#2C1810',
    statsChartColor: 'rgba(139, 69, 19, 1)',
    statsPreferenceItem: 'rgba(255, 255, 255, 0.05)',
    statsPreferenceLabel: '#E0E0E0',
    statsPreferenceValue: '#8B4513',
    statsRecentItem: 'rgba(255, 255, 255, 0.1)',
    statsRecentDate: '#FFFFFF',
    statsRecentTime: '#E0E0E0',
    statsRecentQuantity: '#8B4513',
    statsBackButton: '#FFFFFF',
    statsBackButtonBackground: 'rgba(255, 255, 255, 0.1)',
    loginGradientStart: '#2C1810',
    loginGradientMiddle: '#4A2C2A',
    loginGradientEnd: '#2C1810',
    loginLogo: '#FFFFFF',
    loginTitle: '#FFFFFF',
    loginSubtitle: '#E0E0E0',
    loginInputContainer: 'rgba(255, 255, 255, 0.1)',
    loginInputBorder: 'rgba(255, 255, 255, 0.2)',
    loginInputIcon: '#A0A0A0',
    loginInputText: '#FFFFFF',
    loginInputPlaceholder: '#A0A0A0',
    loginButtonGradientStart: '#8B4513',
    loginButtonGradientEnd: '#8B4513',
    loginButtonText: '#FFFFFF',
    loginButtonDisabled: 'rgba(139, 69, 19, 0.5)',
    loginButtonShadow: 'rgba(0, 0, 0, 0.3)',
    loginLoadingDot: '#FFFFFF',
    loginRegisterText: '#E0E0E0',
    loginRegisterTextBold: '#FFFFFF',
    loginTextShadow: 'rgba(0, 0, 0, 0.3)',
    registerGradientStart: '#2C1810',
    registerGradientMiddle: '#4A2C2A',
    registerGradientEnd: '#2C1810',
    registerLogo: '#FFFFFF',
    registerTitle: '#FFFFFF',
    registerSubtitle: '#E0E0E0',
    registerInputContainer: 'rgba(255, 255, 255, 0.1)',
    registerInputBorder: 'rgba(255, 255, 255, 0.2)',
    registerInputIcon: '#A0A0A0',
    registerInputText: '#FFFFFF',
    registerInputPlaceholder: '#A0A0A0',
    registerButtonGradientStart: '#8B4513',
    registerButtonGradientEnd: '#8B4513',
    registerButtonText: '#FFFFFF',
    registerButtonDisabled: 'rgba(139, 69, 19, 0.5)',
    registerButtonShadow: 'rgba(0, 0, 0, 0.3)',
    registerLoadingDot: '#FFFFFF',
    registerLoginText: '#E0E0E0',
    registerLoginTextBold: '#FFFFFF',
    registerTextShadow: 'rgba(0, 0, 0, 0.3)',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
    primary: '#1a1a1a',
    secondary: '#2d2d2d',
    accent: '#fff',
    card: '#1a1a1a',
    border: '#2d2d2d',
    notification: '#FF6B6B',
    gradientStart: '#151718',
    gradientEnd: '#2d2d2d',
    textLight: '#FFFFFF',
    textDark: '#ECEDEE',
    cardBackground: 'rgba(255, 255, 255, 0.1)',
    buttonPrimary: '#fff',
    buttonSecondary: 'rgba(255, 255, 255, 0.1)',
    buttonText: '#151718',
    success: '#4CAF50',
    warning: '#FFA500',
    error: '#FF6B6B',
    divider: 'rgba(255, 255, 255, 0.2)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    creditCard: 'rgba(255, 255, 255, 0.1)',
    creditAmount: '#FFFFFF',
    creditInfo: '#FFFFFF',
    subscriptionCard: 'rgba(255, 255, 255, 0.1)',
    subscriptionPrice: '#fff',
    subscriptionBenefits: '#E0E0E0',
    activeSubscription: 'rgba(255, 255, 255, 0.2)',
    activeText: '#fff',
    endDateText: '#E0E0E0',
    subscribeButton: '#fff',
    subscribeButtonText: '#151718',
    creditOption: 'rgba(255, 255, 255, 0.1)',
    creditOptionAmount: '#FFFFFF',
    creditOptionBonus: '#fff',
    transactionList: 'rgba(255, 255, 255, 0.1)',
    transactionItem: 'rgba(255, 255, 255, 0.1)',
    transactionTitle: '#FFFFFF',
    transactionDate: '#A0A0A0',
    transactionAmount: '#fff',
    evaluatingSubscription: 'rgba(255, 165, 0, 0.2)',
    evaluatingText: '#FFA500',
    evaluatingDescription: '#E0E0E0',
    emptyText: '#A0A0A0',
    notificationItem: 'rgba(255, 255, 255, 0.1)',
    notificationUnread: 'rgba(255, 255, 255, 0.15)',
    notificationIconInfo: '#3498db',
    notificationIconWarning: '#f39c12',
    notificationIconError: '#e74c3c',
    notificationIconSuccess: '#2ecc71',
    notificationIconDefault: '#fff',
    notificationType: '#FFFFFF',
    notificationMessage: '#FFFFFF',
    notificationTime: '#E0E0E0',
    notificationUnreadIndicator: '#e74c3c',
    notificationBadge: '#e74c3c',
    notificationBadgeText: '#FFFFFF',
    notificationUpdateBanner: '#fff',
    notificationUpdateBannerText: '#151718',
    notificationUpdateButton: '#fff',
    notificationUpdateButtonText: '#151718',
    notificationUserInfoContainer: 'rgba(255, 255, 255, 0.1)',
    notificationUserInfoHeader: '#FFFFFF',
    notificationUserInfoTitle: '#FFFFFF',
    notificationUserInfoContent: 'rgba(0, 0, 0, 0.2)',
    notificationUserInfoLabel: '#E0E0E0',
    notificationUserInfoValue: '#FFFFFF',
    notificationFilterButton: 'rgba(255, 255, 255, 0.1)',
    notificationFilterButtonActive: '#fff',
    notificationFilterButtonText: '#E0E0E0',
    notificationFilterButtonTextActive: '#151718',
    notificationAutoReloadContainer: 'rgba(255, 255, 255, 0.05)',
    notificationAutoReloadText: '#E0E0E0',
    notificationMarkAllReadButton: '#fff',
    notificationMarkAllReadText: '#fff',
    notificationMarkAllReadTextDisabled: '#999',
    notificationEmptyContainer: '#FFFFFF',
    notificationEmptyText: '#FFFFFF',
    notificationEmptySubText: '#E0E0E0',
    notificationBackButton: '#FFFFFF',
    notificationBackButtonBackground: 'rgba(255, 255, 255, 0.1)',
    statsCard: 'rgba(255, 255, 255, 0.1)',
    statsValue: '#fff',
    statsLabel: '#E0E0E0',
    statsSection: 'rgba(255, 255, 255, 0.1)',
    statsSectionTitle: '#FFFFFF',
    statsChartBackground: '#2d2d2d',
    statsChartGradientFrom: '#151718',
    statsChartGradientTo: '#2d2d2d',
    statsChartColor: 'rgba(255, 255, 255, 1)',
    statsPreferenceItem: 'rgba(255, 255, 255, 0.05)',
    statsPreferenceLabel: '#E0E0E0',
    statsPreferenceValue: '#fff',
    statsRecentItem: 'rgba(255, 255, 255, 0.1)',
    statsRecentDate: '#FFFFFF',
    statsRecentTime: '#E0E0E0',
    statsRecentQuantity: '#fff',
    statsBackButton: '#FFFFFF',
    statsBackButtonBackground: 'rgba(255, 255, 255, 0.1)',
    loginGradientStart: '#2d2d2d',
    loginGradientMiddle: '#151718',
    loginGradientEnd: '#2d2d2d',
    loginLogo: '#FFFFFF',
    loginTitle: '#FFFFFF',
    loginSubtitle: '#E0E0E0',
    loginInputContainer: 'rgba(255, 255, 255, 0.1)',
    loginInputBorder: 'rgba(255, 255, 255, 0.2)',
    loginInputIcon: '#A0A0A0',
    loginInputText: '#FFFFFF',
    loginInputPlaceholder: '#A0A0A0',
    loginButtonGradientStart: '#fff',
    loginButtonGradientEnd: '#fff',
    loginButtonText: '#151718',
    loginButtonDisabled: 'rgba(255, 255, 255, 0.5)',
    loginButtonShadow: 'rgba(0, 0, 0, 0.3)',
    loginLoadingDot: '#FFFFFF',
    loginRegisterText: '#E0E0E0',
    loginRegisterTextBold: '#FFFFFF',
    loginTextShadow: 'rgba(0, 0, 0, 0.3)',
    registerGradientStart: '#2d2d2d',
    registerGradientMiddle: '#151718',
    registerGradientEnd: '#2d2d2d',
    registerLogo: '#FFFFFF',
    registerTitle: '#FFFFFF',
    registerSubtitle: '#E0E0E0',
    registerInputContainer: 'rgba(255, 255, 255, 0.1)',
    registerInputBorder: 'rgba(255, 255, 255, 0.2)',
    registerInputIcon: '#A0A0A0',
    registerInputText: '#FFFFFF',
    registerInputPlaceholder: '#A0A0A0',
    registerButtonGradientStart: '#fff',
    registerButtonGradientEnd: '#fff',
    registerButtonText: '#151718',
    registerButtonDisabled: 'rgba(255, 255, 255, 0.5)',
    registerButtonShadow: 'rgba(0, 0, 0, 0.3)',
    registerLoadingDot: '#FFFFFF',
    registerLoginText: '#E0E0E0',
    registerLoginTextBold: '#FFFFFF',
    registerTextShadow: 'rgba(0, 0, 0, 0.3)',
  },
  light: {
    text: '#11181C',
    background: '#F0F0F0',
    tint: '#0A7EA4',
    icon: '#E0E0E0',
    tabIconDefault: '#E0E0E0',
    tabIconSelected: '#0A7EA4',
    primary: '#0A7EA4',
    secondary: '#F0F0F0',
    accent: '#0A7EA4',
    card: '#FFFFFF',
    border: '#E1E3E5',
    notification: '#FF6B6B',
    gradientStart: '#0A7EA4',
    gradientEnd: '#F0F0F0',
    textLight: '#FFFFFF',
    textDark: '#11181C',
    cardBackground: 'rgba(255, 255, 255, 0.1)',
    buttonPrimary: '#0A7EA4',
    buttonSecondary: 'rgba(255, 255, 255, 0.1)',
    buttonText: '#FFFFFF',
    success: '#4CAF50',
    warning: '#FFA500',
    error: '#FF6B6B',
    divider: 'rgba(10, 126, 164, 0.2)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    creditCard: 'rgba(255, 255, 255, 0.1)',
    creditAmount: '#FFFFFF',
    creditInfo: '#FFFFFF',
    subscriptionCard: 'rgba(255, 255, 255, 0.1)',
    subscriptionPrice: '#0A7EA4',
    subscriptionBenefits: '#E0E0E0',
    activeSubscription: 'rgba(10, 126, 164, 0.2)',
    activeText: '#0A7EA4',
    endDateText: '#E0E0E0',
    subscribeButton: '#0A7EA4',
    subscribeButtonText: '#FFFFFF',
    creditOption: 'rgba(255, 255, 255, 0.1)',
    creditOptionAmount: '#FFFFFF',
    creditOptionBonus: '#0A7EA4',
    transactionList: 'rgba(255, 255, 255, 0.1)',
    transactionItem: 'rgba(255, 255, 255, 0.1)',
    transactionTitle: '#FFFFFF',
    transactionDate: '#A0A0A0',
    transactionAmount: '#0A7EA4',
    evaluatingSubscription: 'rgba(255, 165, 0, 0.2)',
    evaluatingText: '#FFA500',
    evaluatingDescription: '#E0E0E0',
    emptyText: '#A0A0A0',
    notificationItem: 'rgba(255, 255, 255, 0.1)',
    notificationUnread: 'rgba(255, 255, 255, 0.15)',
    notificationIconInfo: '#3498db',
    notificationIconWarning: '#f39c12',
    notificationIconError: '#e74c3c',
    notificationIconSuccess: '#2ecc71',
    notificationIconDefault: '#0A7EA4',
    notificationType: '#FFFFFF',
    notificationMessage: '#FFFFFF',
    notificationTime: '#E0E0E0',
    notificationUnreadIndicator: '#e74c3c',
    notificationBadge: '#e74c3c',
    notificationBadgeText: '#FFFFFF',
    notificationUpdateBanner: '#0A7EA4',
    notificationUpdateBannerText: '#FFFFFF',
    notificationUpdateButton: '#0A7EA4',
    notificationUpdateButtonText: '#FFFFFF',
    notificationUserInfoContainer: 'rgba(255, 255, 255, 0.1)',
    notificationUserInfoHeader: '#FFFFFF',
    notificationUserInfoTitle: '#FFFFFF',
    notificationUserInfoContent: 'rgba(0, 0, 0, 0.2)',
    notificationUserInfoLabel: '#E0E0E0',
    notificationUserInfoValue: '#FFFFFF',
    notificationFilterButton: 'rgba(255, 255, 255, 0.1)',
    notificationFilterButtonActive: '#0A7EA4',
    notificationFilterButtonText: '#E0E0E0',
    notificationFilterButtonTextActive: '#FFFFFF',
    notificationAutoReloadContainer: 'rgba(255, 255, 255, 0.05)',
    notificationAutoReloadText: '#E0E0E0',
    notificationMarkAllReadButton: '#0A7EA4',
    notificationMarkAllReadText: '#0A7EA4',
    notificationMarkAllReadTextDisabled: '#999',
    notificationEmptyContainer: '#FFFFFF',
    notificationEmptyText: '#FFFFFF',
    notificationEmptySubText: '#E0E0E0',
    notificationBackButton: '#FFFFFF',
    notificationBackButtonBackground: 'rgba(255, 255, 255, 0.1)',
    statsCard: 'rgba(255, 255, 255, 0.1)',
    statsValue: '#0A7EA4',
    statsLabel: '#E0E0E0',
    statsSection: 'rgba(255, 255, 255, 0.1)',
    statsSectionTitle: '#FFFFFF',
    statsChartBackground: '#F0F0F0',
    statsChartGradientFrom: '#0A7EA4',
    statsChartGradientTo: '#F0F0F0',
    statsChartColor: 'rgba(10, 126, 164, 1)',
    statsPreferenceItem: 'rgba(255, 255, 255, 0.05)',
    statsPreferenceLabel: '#E0E0E0',
    statsPreferenceValue: '#0A7EA4',
    statsRecentItem: 'rgba(255, 255, 255, 0.1)',
    statsRecentDate: '#FFFFFF',
    statsRecentTime: '#E0E0E0',
    statsRecentQuantity: '#0A7EA4',
    statsBackButton: '#FFFFFF',
    statsBackButtonBackground: 'rgba(255, 255, 255, 0.1)',
    loginGradientStart: '#F0F0F0',
    loginGradientMiddle: '#0A7EA4',
    loginGradientEnd: '#F0F0F0',
    loginLogo: '#FFFFFF',
    loginTitle: '#FFFFFF',
    loginSubtitle: '#E0E0E0',
    loginInputContainer: 'rgba(255, 255, 255, 0.1)',
    loginInputBorder: 'rgba(255, 255, 255, 0.2)',
    loginInputIcon: '#A0A0A0',
    loginInputText: '#FFFFFF',
    loginInputPlaceholder: '#A0A0A0',
    loginButtonGradientStart: '#0A7EA4',
    loginButtonGradientEnd: '#0A7EA4',
    loginButtonText: '#FFFFFF',
    loginButtonDisabled: 'rgba(10, 126, 164, 0.5)',
    loginButtonShadow: 'rgba(0, 0, 0, 0.3)',
    loginLoadingDot: '#FFFFFF',
    loginRegisterText: '#E0E0E0',
    loginRegisterTextBold: '#FFFFFF',
    loginTextShadow: 'rgba(0, 0, 0, 0.3)',
    registerGradientStart: '#F0F0F0',
    registerGradientMiddle: '#0A7EA4',
    registerGradientEnd: '#F0F0F0',
    registerLogo: '#FFFFFF',
    registerTitle: '#FFFFFF',
    registerSubtitle: '#E0E0E0',
    registerInputContainer: 'rgba(255, 255, 255, 0.1)',
    registerInputBorder: 'rgba(255, 255, 255, 0.2)',
    registerInputIcon: '#A0A0A0',
    registerInputText: '#FFFFFF',
    registerInputPlaceholder: '#A0A0A0',
    registerButtonGradientStart: '#0A7EA4',
    registerButtonGradientEnd: '#0A7EA4',
    registerButtonText: '#FFFFFF',
    registerButtonDisabled: 'rgba(10, 126, 164, 0.5)',
    registerButtonShadow: 'rgba(0, 0, 0, 0.3)',
    registerLoadingDot: '#FFFFFF',
    registerLoginText: '#E0E0E0',
    registerLoginTextBold: '#FFFFFF',
    registerTextShadow: 'rgba(0, 0, 0, 0.3)',
  },
  custom: customTheme, // Usa o tema carregado do AsyncStorage
};

// Função para atualizar o tema custom
export const updateCustomTheme = async (newTheme: ThemeColors) => {
  try {
    await AsyncStorage.setItem('customTheme', JSON.stringify(newTheme));
    Colors.custom = newTheme;
  } catch (error) {
    console.error('Error updating custom theme:', error);
  }
};
