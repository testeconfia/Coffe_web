import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Animated,
  Dimensions,
  Image,
  useColorScheme,
  Switch,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ThemeColors, ThemeType } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { coffeeAlert } from '@/utils/coffeeAlert';

const { width, height } = Dimensions.get('window');

// Paleta de cores predefinidas
const colorPalettes: Record<string, ThemeColors> = {
  coffee: {
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
    notificationUpdateButton: '#D4A76A',
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
    loginButtonGradientEnd: '#A0522D',
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
    registerButtonGradientEnd: '#A0522D',
    registerButtonText: '#FFFFFF',
    registerButtonDisabled: 'rgba(139, 69, 19, 0.5)',
    registerButtonShadow: 'rgba(0, 0, 0, 0.3)',
    registerLoadingDot: '#FFFFFF',
    registerLoginText: '#E0E0E0',
    registerLoginTextBold: '#FFFFFF',
    registerTextShadow: 'rgba(0, 0, 0, 0.3)',
  },
  ocean: {
    text: '#11181C',
    background: '#1E3D59',
    tint: '#17C3B2',
    icon: '#E0E0E0',
    tabIconDefault: '#E0E0E0',
    tabIconSelected: '#17C3B2',
    primary: '#17C3B2',
    secondary: '#227C9D',
    accent: '#FFB703',
    card: '#FFFFFF',
    border: '#E1E3E5',
    notification: '#FF6B6B',
    gradientStart: '#1E3D59',
    gradientEnd: '#227C9D',
    textLight: '#FFFFFF',
    textDark: '#11181C',
    cardBackground: 'rgba(255, 255, 255, 0.1)',
    buttonPrimary: '#17C3B2',
    buttonSecondary: 'rgba(255, 255, 255, 0.1)',
    buttonText: '#FFFFFF',
    success: '#4CAF50',
    warning: '#FFA500',
    error: '#FF6B6B',
    divider: 'rgba(23, 195, 178, 0.2)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    creditCard: 'rgba(255, 255, 255, 0.1)',
    creditAmount: '#FFFFFF',
    creditInfo: '#FFFFFF',
    subscriptionCard: 'rgba(255, 255, 255, 0.1)',
    subscriptionPrice: '#17C3B2',
    subscriptionBenefits: '#E0E0E0',
    activeSubscription: 'rgba(23, 195, 178, 0.2)',
    activeText: '#17C3B2',
    endDateText: '#E0E0E0',
    subscribeButton: '#17C3B2',
    subscribeButtonText: '#FFFFFF',
    creditOption: 'rgba(255, 255, 255, 0.1)',
    creditOptionAmount: '#FFFFFF',
    creditOptionBonus: '#17C3B2',
    transactionList: 'rgba(255, 255, 255, 0.1)',
    transactionItem: 'rgba(255, 255, 255, 0.1)',
    transactionTitle: '#FFFFFF',
    transactionDate: '#A0A0A0',
    transactionAmount: '#17C3B2',
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
    notificationIconDefault: '#17C3B2',
    notificationType: '#FFFFFF',
    notificationMessage: '#FFFFFF',
    notificationTime: '#E0E0E0',
    notificationUnreadIndicator: '#e74c3c',
    notificationBadge: '#e74c3c',
    notificationBadgeText: '#FFFFFF',
    notificationUpdateBanner: '#17C3B2',
    notificationUpdateBannerText: '#FFFFFF',
    notificationUpdateButton: '#17C3B2',
    notificationUpdateButtonText: '#FFFFFF',
    notificationUserInfoContainer: 'rgba(255, 255, 255, 0.1)',
    notificationUserInfoHeader: '#FFFFFF',
    notificationUserInfoTitle: '#FFFFFF',
    notificationUserInfoContent: 'rgba(0, 0, 0, 0.2)',
    notificationUserInfoLabel: '#E0E0E0',
    notificationUserInfoValue: '#FFFFFF',
    notificationFilterButton: 'rgba(255, 255, 255, 0.1)',
    notificationFilterButtonActive: '#17C3B2',
    notificationFilterButtonText: '#E0E0E0',
    notificationFilterButtonTextActive: '#FFFFFF',
    notificationAutoReloadContainer: 'rgba(255, 255, 255, 0.05)',
    notificationAutoReloadText: '#E0E0E0',
    notificationMarkAllReadButton: '#17C3B2',
    notificationMarkAllReadText: '#17C3B2',
    notificationMarkAllReadTextDisabled: '#999',
    notificationEmptyContainer: '#FFFFFF',
    notificationEmptyText: '#FFFFFF',
    notificationEmptySubText: '#E0E0E0',
    notificationBackButton: '#FFFFFF',
    notificationBackButtonBackground: 'rgba(255, 255, 255, 0.1)',
    statsCard: 'rgba(255, 255, 255, 0.1)',
    statsValue: '#17C3B2',
    statsLabel: '#E0E0E0',
    statsSection: 'rgba(255, 255, 255, 0.1)',
    statsSectionTitle: '#FFFFFF',
    statsChartBackground: '#227C9D',
    statsChartGradientFrom: '#1E3D59',
    statsChartGradientTo: '#227C9D',
    statsChartColor: 'rgba(23, 195, 178, 1)',
    statsPreferenceItem: 'rgba(255, 255, 255, 0.05)',
    statsPreferenceLabel: '#E0E0E0',
    statsPreferenceValue: '#17C3B2',
    statsRecentItem: 'rgba(255, 255, 255, 0.1)',
    statsRecentDate: '#FFFFFF',
    statsRecentTime: '#E0E0E0',
    statsRecentQuantity: '#17C3B2',
    statsBackButton: '#FFFFFF',
    statsBackButtonBackground: 'rgba(255, 255, 255, 0.1)',
    loginGradientStart: '#227C9D',
    loginGradientMiddle: '#1E3D59',
    loginGradientEnd: '#227C9D',
    loginLogo: '#FFFFFF',
    loginTitle: '#FFFFFF',
    loginSubtitle: '#E0E0E0',
    loginInputContainer: 'rgba(255, 255, 255, 0.1)',
    loginInputBorder: 'rgba(255, 255, 255, 0.2)',
    loginInputIcon: '#A0A0A0',
    loginInputText: '#FFFFFF',
    loginInputPlaceholder: '#A0A0A0',
    loginButtonGradientStart: '#17C3B2',
    loginButtonGradientEnd: '#17C3B2',
    loginButtonText: '#FFFFFF',
    loginButtonDisabled: 'rgba(23, 195, 178, 0.5)',
    loginButtonShadow: 'rgba(0, 0, 0, 0.3)',
    loginLoadingDot: '#FFFFFF',
    loginRegisterText: '#E0E0E0',
    loginRegisterTextBold: '#FFFFFF',
    loginTextShadow: 'rgba(0, 0, 0, 0.3)',
    registerGradientStart: '#227C9D',
    registerGradientMiddle: '#1E3D59',
    registerGradientEnd: '#227C9D',
    registerLogo: '#FFFFFF',
    registerTitle: '#FFFFFF',
    registerSubtitle: '#E0E0E0',
    registerInputContainer: 'rgba(255, 255, 255, 0.1)',
    registerInputBorder: 'rgba(255, 255, 255, 0.2)',
    registerInputIcon: '#A0A0A0',
    registerInputText: '#FFFFFF',
    registerInputPlaceholder: '#A0A0A0',
    registerButtonGradientStart: '#17C3B2',
    registerButtonGradientEnd: '#17C3B2',
    registerButtonText: '#FFFFFF',
    registerButtonDisabled: 'rgba(23, 195, 178, 0.5)',
    registerButtonShadow: 'rgba(0, 0, 0, 0.3)',
    registerLoadingDot: '#FFFFFF',
    registerLoginText: '#E0E0E0',
    registerLoginTextBold: '#FFFFFF',
    registerTextShadow: 'rgba(0, 0, 0, 0.3)',
  },
  forest: {
    text: '#11181C',
    background: '#2D5A27',
    tint: '#8FBC8F',
    icon: '#E0E0E0',
    tabIconDefault: '#E0E0E0',
    tabIconSelected: '#8FBC8F',
    primary: '#8FBC8F',
    secondary: '#1B4332',
    accent: '#D4A76A',
    card: '#FFFFFF',
    border: '#E1E3E5',
    notification: '#FF6B6B',
    gradientStart: '#2D5A27',
    gradientEnd: '#1B4332',
    textLight: '#FFFFFF',
    textDark: '#11181C',
    cardBackground: 'rgba(255, 255, 255, 0.1)',
    buttonPrimary: '#8FBC8F',
    buttonSecondary: 'rgba(255, 255, 255, 0.1)',
    buttonText: '#FFFFFF',
    success: '#4CAF50',
    warning: '#FFA500',
    error: '#FF6B6B',
    divider: 'rgba(143, 188, 143, 0.2)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    creditCard: 'rgba(255, 255, 255, 0.1)',
    creditAmount: '#FFFFFF',
    creditInfo: '#FFFFFF',
    subscriptionCard: 'rgba(255, 255, 255, 0.1)',
    subscriptionPrice: '#8FBC8F',
    subscriptionBenefits: '#E0E0E0',
    activeSubscription: 'rgba(143, 188, 143, 0.2)',
    activeText: '#8FBC8F',
    endDateText: '#E0E0E0',
    subscribeButton: '#8FBC8F',
    subscribeButtonText: '#FFFFFF',
    creditOption: 'rgba(255, 255, 255, 0.1)',
    creditOptionAmount: '#FFFFFF',
    creditOptionBonus: '#8FBC8F',
    transactionList: 'rgba(255, 255, 255, 0.1)',
    transactionItem: 'rgba(255, 255, 255, 0.1)',
    transactionTitle: '#FFFFFF',
    transactionDate: '#A0A0A0',
    transactionAmount: '#8FBC8F',
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
    notificationIconDefault: '#8FBC8F',
    notificationType: '#FFFFFF',
    notificationMessage: '#FFFFFF',
    notificationTime: '#E0E0E0',
    notificationUnreadIndicator: '#e74c3c',
    notificationBadge: '#e74c3c',
    notificationBadgeText: '#FFFFFF',
    notificationUpdateBanner: '#8FBC8F',
    notificationUpdateBannerText: '#FFFFFF',
    notificationUpdateButton: '#8FBC8F',
    notificationUpdateButtonText: '#FFFFFF',
    notificationUserInfoContainer: 'rgba(255, 255, 255, 0.1)',
    notificationUserInfoHeader: '#FFFFFF',
    notificationUserInfoTitle: '#FFFFFF',
    notificationUserInfoContent: 'rgba(0, 0, 0, 0.2)',
    notificationUserInfoLabel: '#E0E0E0',
    notificationUserInfoValue: '#FFFFFF',
    notificationFilterButton: 'rgba(255, 255, 255, 0.1)',
    notificationFilterButtonActive: '#8FBC8F',
    notificationFilterButtonText: '#E0E0E0',
    notificationFilterButtonTextActive: '#FFFFFF',
    notificationAutoReloadContainer: 'rgba(255, 255, 255, 0.05)',
    notificationAutoReloadText: '#E0E0E0',
    notificationMarkAllReadButton: '#8FBC8F',
    notificationMarkAllReadText: '#8FBC8F',
    notificationMarkAllReadTextDisabled: '#999',
    notificationEmptyContainer: '#FFFFFF',
    notificationEmptyText: '#FFFFFF',
    notificationEmptySubText: '#E0E0E0',
    notificationBackButton: '#FFFFFF',
    notificationBackButtonBackground: 'rgba(255, 255, 255, 0.1)',
    statsCard: 'rgba(255, 255, 255, 0.1)',
    statsValue: '#8FBC8F',
    statsLabel: '#E0E0E0',
    statsSection: 'rgba(255, 255, 255, 0.1)',
    statsSectionTitle: '#FFFFFF',
    statsChartBackground: '#1B4332',
    statsChartGradientFrom: '#2D5A27',
    statsChartGradientTo: '#1B4332',
    statsChartColor: 'rgba(143, 188, 143, 1)',
    statsPreferenceItem: 'rgba(255, 255, 255, 0.05)',
    statsPreferenceLabel: '#E0E0E0',
    statsPreferenceValue: '#8FBC8F',
    statsRecentItem: 'rgba(255, 255, 255, 0.1)',
    statsRecentDate: '#FFFFFF',
    statsRecentTime: '#E0E0E0',
    statsRecentQuantity: '#8FBC8F',
    statsBackButton: '#FFFFFF',
    statsBackButtonBackground: 'rgba(255, 255, 255, 0.1)',
    loginGradientStart: '#1B4332',
    loginGradientMiddle: '#2D5A27',
    loginGradientEnd: '#1B4332',
    loginLogo: '#FFFFFF',
    loginTitle: '#FFFFFF',
    loginSubtitle: '#E0E0E0',
    loginInputContainer: 'rgba(255, 255, 255, 0.1)',
    loginInputBorder: 'rgba(255, 255, 255, 0.2)',
    loginInputIcon: '#A0A0A0',
    loginInputText: '#FFFFFF',
    loginInputPlaceholder: '#A0A0A0',
    loginButtonGradientStart: '#8FBC8F',
    loginButtonGradientEnd: '#8FBC8F',
    loginButtonText: '#FFFFFF',
    loginButtonDisabled: 'rgba(143, 188, 143, 0.5)',
    loginButtonShadow: 'rgba(0, 0, 0, 0.3)',
    loginLoadingDot: '#FFFFFF',
    loginRegisterText: '#E0E0E0',
    loginRegisterTextBold: '#FFFFFF',
    loginTextShadow: 'rgba(0, 0, 0, 0.3)',
    registerGradientStart: '#1B4332',
    registerGradientMiddle: '#2D5A27',
    registerGradientEnd: '#1B4332',
    registerLogo: '#FFFFFF',
    registerTitle: '#FFFFFF',
    registerSubtitle: '#E0E0E0',
    registerInputContainer: 'rgba(255, 255, 255, 0.1)',
    registerInputBorder: 'rgba(255, 255, 255, 0.2)',
    registerInputIcon: '#A0A0A0',
    registerInputText: '#FFFFFF',
    registerInputPlaceholder: '#A0A0A0',
    registerButtonGradientStart: '#8FBC8F',
    registerButtonGradientEnd: '#8FBC8F',
    registerButtonText: '#FFFFFF',
    registerButtonDisabled: 'rgba(143, 188, 143, 0.5)',
    registerButtonShadow: 'rgba(0, 0, 0, 0.3)',
    registerLoadingDot: '#FFFFFF',
    registerLoginText: '#E0E0E0',
    registerLoginTextBold: '#FFFFFF',
    registerTextShadow: 'rgba(0, 0, 0, 0.3)',
  },
  sunset: {
    text: '#11181C',
    background: '#FF6B6B',
    tint: '#FFE66D',
    icon: '#E0E0E0',
    tabIconDefault: '#E0E0E0',
    tabIconSelected: '#FFE66D',
    primary: '#FFE66D',
    secondary: '#FF6B6B',
    accent: '#4ECDC4',
    card: '#FFFFFF',
    border: '#E1E3E5',
    notification: '#FF6B6B',
    gradientStart: '#FF6B6B',
    gradientEnd: '#FFE66D',
    textLight: '#FFFFFF',
    textDark: '#11181C',
    cardBackground: 'rgba(255, 255, 255, 0.1)',
    buttonPrimary: '#FFE66D',
    buttonSecondary: 'rgba(255, 255, 255, 0.1)',
    buttonText: '#FFFFFF',
    success: '#4CAF50',
    warning: '#FFA500',
    error: '#FF6B6B',
    divider: 'rgba(255, 230, 109, 0.2)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    creditCard: 'rgba(255, 255, 255, 0.1)',
    creditAmount: '#FFFFFF',
    creditInfo: '#FFFFFF',
    subscriptionCard: 'rgba(255, 255, 255, 0.1)',
    subscriptionPrice: '#FFE66D',
    subscriptionBenefits: '#E0E0E0',
    activeSubscription: 'rgba(255, 230, 109, 0.2)',
    activeText: '#FFE66D',
    endDateText: '#E0E0E0',
    subscribeButton: '#FFE66D',
    subscribeButtonText: '#FFFFFF',
    creditOption: 'rgba(255, 255, 255, 0.1)',
    creditOptionAmount: '#FFFFFF',
    creditOptionBonus: '#FFE66D',
    transactionList: 'rgba(255, 255, 255, 0.1)',
    transactionItem: 'rgba(255, 255, 255, 0.1)',
    transactionTitle: '#FFFFFF',
    transactionDate: '#A0A0A0',
    transactionAmount: '#FFE66D',
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
    notificationIconDefault: '#FFE66D',
    notificationType: '#FFFFFF',
    notificationMessage: '#FFFFFF',
    notificationTime: '#E0E0E0',
    notificationUnreadIndicator: '#e74c3c',
    notificationBadge: '#e74c3c',
    notificationBadgeText: '#FFFFFF',
    notificationUpdateBanner: '#FFE66D',
    notificationUpdateBannerText: '#FFFFFF',
    notificationUpdateButton: '#FFE66D',
    notificationUpdateButtonText: '#FFFFFF',
    notificationUserInfoContainer: 'rgba(255, 255, 255, 0.1)',
    notificationUserInfoHeader: '#FFFFFF',
    notificationUserInfoTitle: '#FFFFFF',
    notificationUserInfoContent: 'rgba(0, 0, 0, 0.2)',
    notificationUserInfoLabel: '#E0E0E0',
    notificationUserInfoValue: '#FFFFFF',
    notificationFilterButton: 'rgba(255, 255, 255, 0.1)',
    notificationFilterButtonActive: '#FFE66D',
    notificationFilterButtonText: '#E0E0E0',
    notificationFilterButtonTextActive: '#FFFFFF',
    notificationAutoReloadContainer: 'rgba(255, 255, 255, 0.05)',
    notificationAutoReloadText: '#E0E0E0',
    notificationMarkAllReadButton: '#FFE66D',
    notificationMarkAllReadText: '#FFE66D',
    notificationMarkAllReadTextDisabled: '#999',
    notificationEmptyContainer: '#FFFFFF',
    notificationEmptyText: '#FFFFFF',
    notificationEmptySubText: '#E0E0E0',
    notificationBackButton: '#FFFFFF',
    notificationBackButtonBackground: 'rgba(255, 255, 255, 0.1)',
    statsCard: 'rgba(255, 255, 255, 0.1)',
    statsValue: '#FFE66D',
    statsLabel: '#E0E0E0',
    statsSection: 'rgba(255, 255, 255, 0.1)',
    statsSectionTitle: '#FFFFFF',
    statsChartBackground: '#FF6B6B',
    statsChartGradientFrom: '#FF6B6B',
    statsChartGradientTo: '#FFE66D',
    statsChartColor: 'rgba(255, 230, 109, 1)',
    statsPreferenceItem: 'rgba(255, 255, 255, 0.05)',
    statsPreferenceLabel: '#E0E0E0',
    statsPreferenceValue: '#FFE66D',
    statsRecentItem: 'rgba(255, 255, 255, 0.1)',
    statsRecentDate: '#FFFFFF',
    statsRecentTime: '#E0E0E0',
    statsRecentQuantity: '#FFE66D',
    statsBackButton: '#FFFFFF',
    statsBackButtonBackground: 'rgba(255, 255, 255, 0.1)',
    loginGradientStart: '#FF6B6B',
    loginGradientMiddle: '#FF6B6B',
    loginGradientEnd: '#FFE66D',
    loginLogo: '#FFFFFF',
    loginTitle: '#FFFFFF',
    loginSubtitle: '#E0E0E0',
    loginInputContainer: 'rgba(255, 255, 255, 0.1)',
    loginInputBorder: 'rgba(255, 255, 255, 0.2)',
    loginInputIcon: '#A0A0A0',
    loginInputText: '#FFFFFF',
    loginInputPlaceholder: '#A0A0A0',
    loginButtonGradientStart: '#FFE66D',
    loginButtonGradientEnd: '#FFE66D',
    loginButtonText: '#FFFFFF',
    loginButtonDisabled: 'rgba(255, 230, 109, 0.5)',
    loginButtonShadow: 'rgba(0, 0, 0, 0.3)',
    loginLoadingDot: '#FFFFFF',
    loginRegisterText: '#E0E0E0',
    loginRegisterTextBold: '#FFFFFF',
    loginTextShadow: 'rgba(0, 0, 0, 0.3)',
    registerGradientStart: '#FF6B6B',
    registerGradientMiddle: '#FF6B6B',
    registerGradientEnd: '#FFE66D',
    registerLogo: '#FFFFFF',
    registerTitle: '#FFFFFF',
    registerSubtitle: '#E0E0E0',
    registerInputContainer: 'rgba(255, 255, 255, 0.1)',
    registerInputBorder: 'rgba(255, 255, 255, 0.2)',
    registerInputIcon: '#A0A0A0',
    registerInputText: '#FFFFFF',
    registerInputPlaceholder: '#A0A0A0',
    registerButtonGradientStart: '#FFE66D',
    registerButtonGradientEnd: '#FFE66D',
    registerButtonText: '#FFFFFF',
    registerButtonDisabled: 'rgba(255, 230, 109, 0.5)',
    registerButtonShadow: 'rgba(0, 0, 0, 0.3)',
    registerLoadingDot: '#FFFFFF',
    registerLoginText: '#E0E0E0',
    registerLoginTextBold: '#FFFFFF',
    registerTextShadow: 'rgba(0, 0, 0, 0.3)',
  },
  midnight: {
    text: '#11181C',
    background: '#2C3E50',
    tint: '#3498DB',
    icon: '#E0E0E0',
    tabIconDefault: '#E0E0E0',
    tabIconSelected: '#3498DB',
    primary: '#3498DB',
    secondary: '#2C3E50',
    accent: '#E74C3C',
    card: '#FFFFFF',
    border: '#E1E3E5',
    notification: '#FF6B6B',
    gradientStart: '#2C3E50',
    gradientEnd: '#3498DB',
    textLight: '#FFFFFF',
    textDark: '#11181C',
    cardBackground: 'rgba(255, 255, 255, 0.1)',
    buttonPrimary: '#3498DB',
    buttonSecondary: 'rgba(255, 255, 255, 0.1)',
    buttonText: '#FFFFFF',
    success: '#4CAF50',
    warning: '#FFA500',
    error: '#FF6B6B',
    divider: 'rgba(52, 152, 219, 0.2)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    creditCard: 'rgba(255, 255, 255, 0.1)',
    creditAmount: '#FFFFFF',
    creditInfo: '#FFFFFF',
    subscriptionCard: 'rgba(255, 255, 255, 0.1)',
    subscriptionPrice: '#3498DB',
    subscriptionBenefits: '#E0E0E0',
    activeSubscription: 'rgba(52, 152, 219, 0.2)',
    activeText: '#3498DB',
    endDateText: '#E0E0E0',
    subscribeButton: '#3498DB',
    subscribeButtonText: '#FFFFFF',
    creditOption: 'rgba(255, 255, 255, 0.1)',
    creditOptionAmount: '#FFFFFF',
    creditOptionBonus: '#3498DB',
    transactionList: 'rgba(255, 255, 255, 0.1)',
    transactionItem: 'rgba(255, 255, 255, 0.1)',
    transactionTitle: '#FFFFFF',
    transactionDate: '#A0A0A0',
    transactionAmount: '#3498DB',
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
    notificationIconDefault: '#3498DB',
    notificationType: '#FFFFFF',
    notificationMessage: '#FFFFFF',
    notificationTime: '#E0E0E0',
    notificationUnreadIndicator: '#e74c3c',
    notificationBadge: '#e74c3c',
    notificationBadgeText: '#FFFFFF',
    notificationUpdateBanner: '#3498DB',
    notificationUpdateBannerText: '#FFFFFF',
    notificationUpdateButton: '#3498DB',
    notificationUpdateButtonText: '#FFFFFF',
    notificationUserInfoContainer: 'rgba(255, 255, 255, 0.1)',
    notificationUserInfoHeader: '#FFFFFF',
    notificationUserInfoTitle: '#FFFFFF',
    notificationUserInfoContent: 'rgba(0, 0, 0, 0.2)',
    notificationUserInfoLabel: '#E0E0E0',
    notificationUserInfoValue: '#FFFFFF',
    notificationFilterButton: 'rgba(255, 255, 255, 0.1)',
    notificationFilterButtonActive: '#3498DB',
    notificationFilterButtonText: '#E0E0E0',
    notificationFilterButtonTextActive: '#FFFFFF',
    notificationAutoReloadContainer: 'rgba(255, 255, 255, 0.05)',
    notificationAutoReloadText: '#E0E0E0',
    notificationMarkAllReadButton: '#3498DB',
    notificationMarkAllReadText: '#3498DB',
    notificationMarkAllReadTextDisabled: '#999',
    notificationEmptyContainer: '#FFFFFF',
    notificationEmptyText: '#FFFFFF',
    notificationEmptySubText: '#E0E0E0',
    notificationBackButton: '#FFFFFF',
    notificationBackButtonBackground: 'rgba(255, 255, 255, 0.1)',
    statsCard: 'rgba(255, 255, 255, 0.1)',
    statsValue: '#3498DB',
    statsLabel: '#E0E0E0',
    statsSection: 'rgba(255, 255, 255, 0.1)',
    statsSectionTitle: '#FFFFFF',
    statsChartBackground: '#2C3E50',
    statsChartGradientFrom: '#2C3E50',
    statsChartGradientTo: '#3498DB',
    statsChartColor: 'rgba(52, 152, 219, 1)',
    statsPreferenceItem: 'rgba(255, 255, 255, 0.05)',
    statsPreferenceLabel: '#E0E0E0',
    statsPreferenceValue: '#3498DB',
    statsRecentItem: 'rgba(255, 255, 255, 0.1)',
    statsRecentDate: '#FFFFFF',
    statsRecentTime: '#E0E0E0',
    statsRecentQuantity: '#3498DB',
    statsBackButton: '#FFFFFF',
    statsBackButtonBackground: 'rgba(255, 255, 255, 0.1)',
    loginGradientStart: '#2C3E50',
    loginGradientMiddle: '#2C3E50',
    loginGradientEnd: '#3498DB',
    loginLogo: '#FFFFFF',
    loginTitle: '#FFFFFF',
    loginSubtitle: '#E0E0E0',
    loginInputContainer: 'rgba(255, 255, 255, 0.1)',
    loginInputBorder: 'rgba(255, 255, 255, 0.2)',
    loginInputIcon: '#A0A0A0',
    loginInputText: '#FFFFFF',
    loginInputPlaceholder: '#A0A0A0',
    loginButtonGradientStart: '#3498DB',
    loginButtonGradientEnd: '#3498DB',
    loginButtonText: '#FFFFFF',
    loginButtonDisabled: 'rgba(52, 152, 219, 0.5)',
    loginButtonShadow: 'rgba(0, 0, 0, 0.3)',
    loginLoadingDot: '#FFFFFF',
    loginRegisterText: '#E0E0E0',
    loginRegisterTextBold: '#FFFFFF',
    loginTextShadow: 'rgba(0, 0, 0, 0.3)',
    registerGradientStart: '#2C3E50',
    registerGradientMiddle: '#2C3E50',
    registerGradientEnd: '#3498DB',
    registerLogo: '#FFFFFF',
    registerTitle: '#FFFFFF',
    registerSubtitle: '#E0E0E0',
    registerInputContainer: 'rgba(255, 255, 255, 0.1)',
    registerInputBorder: 'rgba(255, 255, 255, 0.2)',
    registerInputIcon: '#A0A0A0',
    registerInputText: '#FFFFFF',
    registerInputPlaceholder: '#A0A0A0',
    registerButtonGradientStart: '#3498DB',
    registerButtonGradientEnd: '#3498DB',
    registerButtonText: '#FFFFFF',
    registerButtonDisabled: 'rgba(52, 152, 219, 0.5)',
    registerButtonShadow: 'rgba(0, 0, 0, 0.3)',
    registerLoadingDot: '#FFFFFF',
    registerLoginText: '#E0E0E0',
    registerLoginTextBold: '#FFFFFF',
    registerTextShadow: 'rgba(0, 0, 0, 0.3)',
  },
};

export default function ThemeScreen() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('default');
  const [customColors, setCustomColors] = useState<ThemeColors>(Colors.custom);
  const [isEditing, setIsEditing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [followSystem, setFollowSystem] = useState(false);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [selectedColorKey, setSelectedColorKey] = useState<keyof ThemeColors | null>(null);
  const [showPaletteModal, setShowPaletteModal] = useState(false);
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  
  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadTheme();
    // Iniciar animações
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Efeito para aplicar o tema do sistema quando followSystem é true
  useEffect(() => {
    if (followSystem) {
      const systemTheme = systemColorScheme === 'dark' ? 'dark' : 'light';
      setSelectedTheme(systemTheme);
    }
  }, [followSystem, systemColorScheme]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('selectedTheme');
      const systemTheme = await AsyncStorage.getItem('followSystemTheme');
      const customThemeStr = await AsyncStorage.getItem('customTheme');

      if (systemTheme === 'true') {
        setFollowSystem(true);
        setSelectedTheme('default');
      } else if (savedTheme) {
        setSelectedTheme(savedTheme as ThemeType);
        setFollowSystem(false);
      }

      // Carregar tema custom do AsyncStorage
      if (customThemeStr) {
        const parsedCustomTheme = JSON.parse(customThemeStr);
        Colors.custom = parsedCustomTheme;
        
        // Se o tema salvo for custom, atualizar as cores personalizadas
        if (savedTheme === 'custom') {
          setCustomColors(parsedCustomTheme);
        }
      } else {
        // Se não existir tema custom salvo, usar o tema padrão
        Colors.custom = Colors.default;
        await AsyncStorage.setItem('customTheme', JSON.stringify(Colors.default));
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      Colors.custom = Colors.default;
    }
  };

  const handleThemeSelect = async (theme: ThemeType) => {
    
    if (theme === 'custom') {
      setIsEditing(true);
      return;
    }

    try {
      await AsyncStorage.setItem('selectedTheme', theme);
      await AsyncStorage.setItem('followSystemTheme', 'false');
      setSelectedTheme(theme);
      setFollowSystem(false);
      setIsEditing(false);
    } catch (error) {
      console.error('Error selecting theme:', error);
    }
  };

  const toggleFollowSystem = async () => {
    
    const newValue = !followSystem;
    setFollowSystem(newValue);
    await AsyncStorage.setItem('followSystemTheme', newValue.toString());
    
    if (newValue) {
      const systemTheme = systemColorScheme === 'dark' ? 'dark' : 'light';
      setSelectedTheme(systemTheme);
      
      // Mostrar mensagem de sucesso
      coffeeAlert(
        'O tema do sistema foi ativado. As telas serão recarregadas.',
        'info',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(tabs)');
            }
          }
        ]
      );
    }
  };

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setCustomColors(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const openColorPicker = (key: keyof ThemeColors) => {
    setSelectedColorKey(key);
    setColorPickerVisible(true);
  };

  const closeColorPicker = () => {
    setColorPickerVisible(false);
    setSelectedColorKey(null);
  };

  const copyThemeFromPalette = (paletteName: string) => {
    const palette = colorPalettes[paletteName as keyof typeof colorPalettes];
    setCustomColors(palette);
    coffeeAlert('Tema aplicado com sucesso!','success');
    setShowPaletteModal(false);
  };

  const handleSaveTheme = async () => {
    try {
      // Atualiza o tema custom no AsyncStorage
      await AsyncStorage.setItem('customTheme', JSON.stringify(customColors));
      
      // Atualiza o tema custom no objeto Colors
      Colors.custom = customColors;
      
      // Salva o tema selecionado como custom
      await AsyncStorage.setItem('selectedTheme', 'custom');
      setSelectedTheme('custom');
      setFollowSystem(false);
      
      // Fecha o modo de edição
      setIsEditing(false);
      
      // Feedback visual
    } catch (error) {
      console.error('Error saving custom theme:', error);
    }
  };

  const renderColorInput = (key: keyof ThemeColors, label: string) => (
    <View style={styles.colorInputContainer}>
      <Text style={[styles.colorLabel, { color: Colors[selectedTheme].text }]}>{label}</Text>
      <View style={styles.colorInputRow}>
        <TouchableOpacity 
          style={[styles.colorPreview, { backgroundColor: customColors[key] }]}
          onPress={() => openColorPicker(key)}
        />
        <TextInput
          style={[
            styles.colorInput, 
            { 
              color: Colors[selectedTheme].text,
              borderColor: Colors[selectedTheme].border,
              backgroundColor: Colors[selectedTheme].card
            }
          ]}
          value={customColors[key]}
          onChangeText={(value) => handleColorChange(key, value)}
          placeholder="Digite o código da cor (ex: #FFFFFF)"
          placeholderTextColor={Colors[selectedTheme].text + '80'}
        />
      </View>
    </View>
  );

  const renderColorPicker = () => {
    if (!selectedColorKey) return null;

    const colorName = {
      primary: 'Primária',
      secondary: 'Secundária',
      accent: 'Destaque',
      text: 'Texto',
      background: 'Fundo',
      card: 'Cards',
      border: 'Bordas',
      notification: 'Notificações',
      tint: 'Tint',
      icon: 'Ícone',
      tabIconDefault: 'Ícone Tab Padrão',
      tabIconSelected: 'Ícone Tab Selecionado',
      gradientStart: 'Gradiente Início',
      gradientEnd: 'Gradiente Fim',
      textLight: 'Texto Claro',
      textDark: 'Texto Escuro',
      cardBackground: 'Fundo do Card',
      buttonPrimary: 'Botão Primário',
      buttonSecondary: 'Botão Secundário',
      buttonText: 'Texto do Botão',
      success: 'Sucesso',
      warning: 'Aviso',
      error: 'Erro',
      divider: 'Divisor',
      shadow: 'Sombra',
      creditCard: 'Cartão de Crédito',
      creditAmount: 'Valor do Crédito',
      creditInfo: 'Informação do Crédito',
      subscriptionCard: 'Cartão de Assinatura',
      subscriptionPrice: 'Preço da Assinatura',
      subscriptionBenefits: 'Benefícios da Assinatura',
      activeSubscription: 'Assinatura Ativa',
      activeText: 'Texto Ativo',
      endDateText: 'Texto de Data Final',
      subscribeButton: 'Botão de Assinatura',
      subscribeButtonText: 'Texto do Botão de Assinatura',
      creditOption: 'Opção de Crédito',
      creditOptionAmount: 'Valor da Opção de Crédito',
      creditOptionBonus: 'Bônus da Opção de Crédito',
      transactionList: 'Lista de Transações',
      transactionItem: 'Item de Transação',
      transactionTitle: 'Título da Transação',
      transactionDate: 'Data da Transação',
      transactionAmount: 'Valor da Transação',
      evaluatingSubscription: 'Avaliação de Assinatura',
      evaluatingText: 'Texto de Avaliação',
      evaluatingDescription: 'Descrição da Avaliação',
      emptyText: 'Texto Vazio',
      notificationItem: 'Item de Notificação',
      notificationUnread: 'Notificação Não Lida',
      notificationIconInfo: 'Ícone de Informação',
      notificationIconWarning: 'Ícone de Aviso',
      notificationIconError: 'Ícone de Erro',
      notificationIconSuccess: 'Ícone de Sucesso',
      notificationIconDefault: 'Ícone Padrão',
      notificationType: 'Tipo de Notificação',
      notificationMessage: 'Mensagem da Notificação',
      notificationTime: 'Tempo da Notificação',
      notificationUnreadIndicator: 'Indicador de Não Lido',
      notificationBadge: 'Badge da Notificação',
      notificationBadgeText: 'Texto do Badge',
      notificationUpdateBanner: 'Banner de Atualização',
      notificationUpdateBannerText: 'Texto do Banner',
      notificationUpdateButton: 'Botão de Atualização',
      notificationUpdateButtonText: 'Texto do Botão de Atualização',
      notificationUserInfoContainer: 'Container de Informações do Usuário',
      notificationUserInfoHeader: 'Cabeçalho de Informações',
      notificationUserInfoTitle: 'Título das Informações',
      notificationUserInfoContent: 'Conteúdo das Informações',
      notificationUserInfoLabel: 'Rótulo das Informações',
      notificationUserInfoValue: 'Valor das Informações',
      notificationFilterButton: 'Botão de Filtro',
      notificationFilterButtonActive: 'Botão de Filtro Ativo',
      notificationFilterButtonText: 'Texto do Botão de Filtro',
      notificationFilterButtonTextActive: 'Texto do Botão de Filtro Ativo',
      notificationAutoReloadContainer: 'Container de Recarregamento',
      notificationAutoReloadText: 'Texto de Recarregamento',
      notificationMarkAllReadButton: 'Botão de Marcar como Lido',
      notificationMarkAllReadText: 'Texto de Marcar como Lido',
      notificationMarkAllReadTextDisabled: 'Texto de Marcar como Lido Desativado',
      notificationEmptyContainer: 'Container Vazio',
      notificationEmptyText: 'Texto de Vazio',
      notificationEmptySubText: 'Subtexto de Vazio',
      notificationBackButton: 'Botão Voltar',
      notificationBackButtonBackground: 'Fundo do Botão Voltar',
      statsCard: 'Card de Estatísticas',
      statsValue: 'Valor da Estatística',
      statsLabel: 'Rótulo da Estatística',
      statsSection: 'Seção de Estatísticas',
      statsSectionTitle: 'Título da Seção',
      statsChartBackground: 'Fundo do Gráfico',
      statsChartGradientFrom: 'Gradiente do Gráfico (Início)',
      statsChartGradientTo: 'Gradiente do Gráfico (Fim)',
      statsChartColor: 'Cor do Gráfico',
      statsPreferenceItem: 'Item de Preferência',
      statsPreferenceLabel: 'Rótulo de Preferência',
      statsPreferenceValue: 'Valor de Preferência',
      statsRecentItem: 'Item Recente',
      statsRecentDate: 'Data Recente',
      statsRecentTime: 'Tempo Recente',
      statsRecentQuantity: 'Quantidade Recente',
      statsBackButton: 'Botão Voltar',
      statsBackButtonBackground: 'Fundo do Botão Voltar',
      loginGradientStart: 'Gradiente do Login (Início)',
      loginGradientMiddle: 'Gradiente do Login (Meio)',
      loginGradientEnd: 'Gradiente do Login (Fim)',
      loginLogo: 'Logo do Login',
      loginTitle: 'Título do Login',
      loginSubtitle: 'Subtítulo do Login',
      loginInputContainer: 'Container do Input',
      loginInputBorder: 'Borda do Input',
      loginInputIcon: 'Ícone do Input',
      loginInputText: 'Texto do Input',
      loginInputPlaceholder: 'Placeholder do Input',
      loginButtonGradientStart: 'Gradiente do Botão (Início)',
      loginButtonGradientEnd: 'Gradiente do Botão (Fim)',
      loginButtonText: 'Texto do Botão',
      loginButtonDisabled: 'Botão Desativado',
      loginButtonShadow: 'Sombra do Botão',
      loginLoadingDot: 'Ponto de Carregamento',
      loginRegisterText: 'Texto de Registro',
      loginRegisterTextBold: 'Texto de Registro em Negrito',
      loginTextShadow: 'Sombra do Texto',
      registerGradientStart: 'Gradiente do Registro (Início)',
      registerGradientMiddle: 'Gradiente do Registro (Meio)',
      registerGradientEnd: 'Gradiente do Registro (Fim)',
      registerLogo: 'Logo do Registro',
      registerTitle: 'Título do Registro',
      registerSubtitle: 'Subtítulo do Registro',
      registerInputContainer: 'Container do Input',
      registerInputBorder: 'Borda do Input',
      registerInputIcon: 'Ícone do Input',
      registerInputText: 'Texto do Input',
      registerInputPlaceholder: 'Placeholder do Input',
      registerButtonGradientStart: 'Gradiente do Botão (Início)',
      registerButtonGradientEnd: 'Gradiente do Botão (Fim)',
      registerButtonText: 'Texto do Botão',
      registerButtonDisabled: 'Botão Desativado',
      registerButtonShadow: 'Sombra do Botão',
      registerLoadingDot: 'Ponto de Carregamento',
      registerLoginText: 'Texto de Login',
      registerLoginTextBold: 'Texto de Login em Negrito',
      registerTextShadow: 'Sombra do Texto'
    }[selectedColorKey];

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={colorPickerVisible}
        onRequestClose={closeColorPicker}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: Colors[selectedTheme].card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Colors[selectedTheme].text }]}>
                Escolher Cor {colorName}
              </Text>
              <TouchableOpacity onPress={closeColorPicker}>
                <Ionicons name="close" size={24} color={Colors[selectedTheme].text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.colorPaletteContainer}>
              <View style={styles.colorPaletteSection}>
                <Text style={[styles.paletteSectionTitle, { color: Colors[selectedTheme].text }]}>
                  Cores Básicas
                </Text>
                <View style={styles.colorPalette}>
                  {['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorOption, { backgroundColor: color }]}
                      onPress={() => {
                        handleColorChange(selectedColorKey, color);
                        closeColorPicker();
                      }}
                    />
                  ))}
                </View>
              </View>
              
              <View style={styles.colorPaletteSection}>
                <Text style={[styles.paletteSectionTitle, { color: Colors[selectedTheme].text }]}>
                  Tons de Marrom
                </Text>
                <View style={styles.colorPalette}>
                  {['#8B4513', '#A0522D', '#6B4423', '#8B7355', '#D2691E', '#CD853F', '#DEB887', '#D2B48C'].map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorOption, { backgroundColor: color }]}
                      onPress={() => {
                        handleColorChange(selectedColorKey, color);
                        closeColorPicker();
                      }}
                    />
                  ))}
                </View>
              </View>
              
              <View style={styles.colorPaletteSection}>
                <Text style={[styles.paletteSectionTitle, { color: Colors[selectedTheme].text }]}>
                  Tons de Azul
                </Text>
                <View style={styles.colorPalette}>
                  {['#0A7EA4', '#1E90FF', '#4169E1', '#000080', '#0000CD', '#00008B', '#191970', '#4B0082'].map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorOption, { backgroundColor: color }]}
                      onPress={() => {
                        handleColorChange(selectedColorKey, color);
                        closeColorPicker();
                      }}
                    />
                  ))}
                </View>
              </View>
              
              <View style={styles.colorPaletteSection}>
                <Text style={[styles.paletteSectionTitle, { color: Colors[selectedTheme].text }]}>
                  Tons de Verde
                </Text>
                <View style={styles.colorPalette}>
                  {['#2E5A27', '#4CAF50', '#8BC34A', '#009688', '#00BCD4', '#03A9F4', '#2196F3', '#3F51B5'].map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorOption, { backgroundColor: color }]}
                      onPress={() => {
                        handleColorChange(selectedColorKey, color);
                        closeColorPicker();
                      }}
                    />
                  ))}
                </View>
              </View>
              
              <View style={styles.colorPaletteSection}>
                <Text style={[styles.paletteSectionTitle, { color: Colors[selectedTheme].text }]}>
                  Tons de Vermelho
                </Text>
                <View style={styles.colorPalette}>
                  {['#FF7043', '#FF5722', '#FF9800', '#FFC107', '#FFEB3B', '#CDDC39', '#8BC34A', '#4CAF50'].map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorOption, { backgroundColor: color }]}
                      onPress={() => {
                        handleColorChange(selectedColorKey, color);
                        closeColorPicker();
                      }}
                    />
                  ))}
                </View>
              </View>
              
              <View style={styles.colorPaletteSection}>
                <Text style={[styles.paletteSectionTitle, { color: Colors[selectedTheme].text }]}>
                  Tons de Cinza
                </Text>
                <View style={styles.colorPalette}>
                  {['#F5F5F5', '#E0E0E0', '#BDBDBD', '#9E9E9E', '#757575', '#616161', '#424242', '#212121'].map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorOption, { backgroundColor: color }]}
                      onPress={() => {
                        handleColorChange(selectedColorKey, color);
                        closeColorPicker();
                      }}
                    />
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderPaletteModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPaletteModal}
        onRequestClose={() => setShowPaletteModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: Colors[selectedTheme].card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Colors[selectedTheme].text }]}>
                Temas Predefinidos
              </Text>
              <TouchableOpacity onPress={() => setShowPaletteModal(false)}>
                <Ionicons name="close" size={24} color={Colors[selectedTheme].text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.paletteListContainer}>
              {Object.entries(colorPalettes).map(([name, palette]) => (
                <TouchableOpacity
                  key={name}
                  style={[styles.paletteItem, { borderColor: Colors[selectedTheme].border }]}
                  onPress={() => copyThemeFromPalette(name)}
                >
                  <Text style={[styles.paletteName, { color: Colors[selectedTheme].text }]}>
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </Text>
                  <View style={styles.paletteColors}>
                    <View style={[styles.paletteColor, { backgroundColor: palette.primary }]} />
                    <View style={[styles.paletteColor, { backgroundColor: palette.secondary }]} />
                    <View style={[styles.paletteColor, { backgroundColor: palette.accent }]} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderThemePreview = () => {
    if (!previewMode) return null;
    
    return (
      <Animated.View 
        style={[
          styles.previewContainer,
          { 
            backgroundColor: Colors[selectedTheme].background,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.previewHeader}>
          <Text style={[styles.previewTitle, { color: Colors[selectedTheme].text }]}>
            Prévia do Tema
          </Text>
          <TouchableOpacity onPress={() => setPreviewMode(false)}>
            <Ionicons name="close" size={24} color={Colors[selectedTheme].text} />
          </TouchableOpacity>
        </View>
        
        <View style={[styles.previewContent, { backgroundColor: Colors[selectedTheme].card }]}>
          <View style={styles.previewItem}>
            <Text style={[styles.previewItemText, { color: Colors[selectedTheme].text }]}>
              Texto Principal
            </Text>
            <Text style={[styles.previewItemText, { color: Colors[selectedTheme].text + '80' }]}>
              Texto Secundário
            </Text>
          </View>
          
          <View style={[styles.previewButton, { backgroundColor: Colors[selectedTheme].primary }]}>
            <Text style={styles.previewButtonText}>Botão Primário</Text>
          </View>
          
          <View style={[styles.previewButton, { backgroundColor: Colors[selectedTheme].accent }]}>
            <Text style={styles.previewButtonText}>Botão de Destaque</Text>
          </View>
          
          <View style={[styles.previewCard, { backgroundColor: Colors[selectedTheme].card, borderColor: Colors[selectedTheme].border }]}>
            <Text style={[styles.previewCardTitle, { color: Colors[selectedTheme].text }]}>
              Card de Exemplo
            </Text>
            <Text style={[styles.previewCardText, { color: Colors[selectedTheme].text + '80' }]}>
              Este é um exemplo de como os cards ficarão com este tema.
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[selectedTheme].background }]}>
      <LinearGradient
        colors={[Colors[selectedTheme].primary, Colors[selectedTheme].secondary]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              router.back();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={Colors[selectedTheme].text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: Colors[selectedTheme].text }]}>
            Personalizar Tema
          </Text>
          <TouchableOpacity 
            style={styles.previewButton}
            onPress={() => {
              setPreviewMode(true);
            }}
          >
            <Ionicons name="eye" size={24} color={Colors[selectedTheme].text} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.themeOptions,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={[styles.sectionTitle, { color: Colors[selectedTheme].text }]}>
              Temas Disponíveis
            </Text>
            
            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: Colors[selectedTheme].card },
                followSystem && styles.selectedTheme,
              ]}
              onPress={toggleFollowSystem}
            >
              <View style={styles.themeOptionHeader}>
                <Ionicons name="settings" size={24} color={Colors[selectedTheme].accent} />
                <Text style={[styles.themeText, { color: Colors[selectedTheme].text }]}>
                  Seguir Tema do Sistema
                </Text>
              </View>
              <Text style={[styles.themeDescription, { color: Colors[selectedTheme].text + '80' }]}>
                O aplicativo seguirá automaticamente o tema do seu dispositivo
              </Text>
              <View style={styles.switchContainer}>
                <Switch
                  trackColor={{ false: '#767577', true: Colors[selectedTheme].accent }}
                  thumbColor={followSystem ? '#FFFFFF' : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                  onValueChange={toggleFollowSystem}
                  value={followSystem}
                />
              </View>
              {followSystem && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors[selectedTheme].accent} />
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: Colors[selectedTheme].card },
                selectedTheme === 'default' && !followSystem && styles.selectedTheme,
              ]}
              onPress={() => handleThemeSelect('default')}
              disabled={followSystem}
            >
              <View style={styles.themeOptionHeader}>
                <MaterialCommunityIcons name="coffee" size={24} color={Colors.default.accent} />
                <Text style={[styles.themeText, { color: Colors[selectedTheme].text }]}>
                  Tema Padrão
                </Text>
              </View>
              <View style={styles.colorPreviewRow}>
                <View style={[styles.colorDot, { backgroundColor: Colors.default.primary }]} />
                <View style={[styles.colorDot, { backgroundColor: Colors.default.secondary }]} />
                <View style={[styles.colorDot, { backgroundColor: Colors.default.accent }]} />
              </View>
              {selectedTheme === 'default' && !followSystem && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.default.accent} />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: Colors[selectedTheme].card },
                selectedTheme === 'light' && !followSystem && styles.selectedTheme,
              ]}
              onPress={() => handleThemeSelect('light')}
              disabled={followSystem}
            >
              <View style={styles.themeOptionHeader}>
                <Ionicons name="sunny" size={24} color={Colors.light.accent} />
                <Text style={[styles.themeText, { color: Colors[selectedTheme].text }]}>
                  Tema Claro
                </Text>
              </View>
              <View style={styles.colorPreviewRow}>
                <View style={[styles.colorDot, { backgroundColor: Colors.light.primary }]} />
                <View style={[styles.colorDot, { backgroundColor: Colors.light.secondary }]} />
                <View style={[styles.colorDot, { backgroundColor: Colors.light.accent }]} />
              </View>
              {selectedTheme === 'light' && !followSystem && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.light.accent} />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: Colors[selectedTheme].card },
                selectedTheme === 'dark' && !followSystem && styles.selectedTheme,
              ]}
              onPress={() => handleThemeSelect('dark')}
              disabled={followSystem}
            >
              <View style={styles.themeOptionHeader}>
                <Ionicons name="moon" size={24} color={Colors.dark.accent} />
                <Text style={[styles.themeText, { color: Colors[selectedTheme].text }]}>
                  Tema Escuro
                </Text>
              </View>
              <View style={styles.colorPreviewRow}>
                <View style={[styles.colorDot, { backgroundColor: Colors.dark.primary }]} />
                <View style={[styles.colorDot, { backgroundColor: Colors.dark.secondary }]} />
                <View style={[styles.colorDot, { backgroundColor: Colors.dark.accent }]} />
              </View>
              {selectedTheme === 'dark' && !followSystem && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.dark.accent} />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: Colors[selectedTheme].card },
                selectedTheme === 'custom' && !followSystem && styles.selectedTheme,
              ]}
              onPress={() => {
                handleThemeSelect('custom');
                setIsEditing(true);
              }}
              disabled={followSystem}
            >
              <View style={styles.themeOptionHeader}>
                <FontAwesome5 name="palette" size={24} color={Colors.custom.accent} />
                <Text style={[styles.themeText, { color: Colors[selectedTheme].text }]}>
                  Tema Personalizado
                </Text>
              </View>
              <View style={styles.colorPreviewRow}>
                <View style={[styles.colorDot, { backgroundColor: customColors.primary }]} />
                <View style={[styles.colorDot, { backgroundColor: customColors.secondary }]} />
                <View style={[styles.colorDot, { backgroundColor: customColors.accent }]} />
              </View>
              {selectedTheme === 'custom' && !followSystem && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.custom.accent} />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          {isEditing && (
            <Animated.View 
              style={[
                styles.customThemeEditor, 
                { 
                  backgroundColor: Colors[selectedTheme].card,
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <View style={styles.editorHeader}>
                <Text style={[styles.sectionTitle, { color: Colors[selectedTheme].text }]}>
                  Editar Cores
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    setIsEditing(false);
                  }}
                >
                  <Ionicons name="close" size={24} color={Colors[selectedTheme].text} />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={[styles.copyThemeButton, { backgroundColor: Colors[selectedTheme].primary }]}
                onPress={() => {
                  setShowPaletteModal(true);
                }}
              >
                <Ionicons name="color-palette" size={20} color="#FFFFFF" />
                <Text style={styles.copyThemeText}>Copiar Tema Predefinido</Text>
              </TouchableOpacity>
              
              {/* Cores Básicas */}
              {renderColorInput('primary', 'Cor Primária')}
              {renderColorInput('secondary', 'Cor Secundária')}
              {renderColorInput('accent', 'Cor de Destaque')}
              {renderColorInput('text', 'Cor do Texto')}
              {renderColorInput('background', 'Cor de Fundo')}
              {renderColorInput('card', 'Cor dos Cards')}
              {renderColorInput('border', 'Cor das Bordas')}
              {renderColorInput('notification', 'Cor das Notificações')}
              {renderColorInput('tint', 'Cor de Tint')}
              {renderColorInput('icon', 'Cor do Ícone')}
              {renderColorInput('tabIconDefault', 'Cor do Ícone da Tab Padrão')}
              {renderColorInput('tabIconSelected', 'Cor do Ícone da Tab Selecionada')}
              
              {/* Cores de Gradiente */}
              {renderColorInput('gradientStart', 'Cor Inicial do Gradiente')}
              {renderColorInput('gradientEnd', 'Cor Final do Gradiente')}
              
              {/* Cores de Texto */}
              {renderColorInput('textLight', 'Cor do Texto Claro')}
              {renderColorInput('textDark', 'Cor do Texto Escuro')}
              
              {/* Cores de Cards e Botões */}
              {renderColorInput('cardBackground', 'Cor de Fundo do Card')}
              {renderColorInput('buttonPrimary', 'Cor do Botão Primário')}
              {renderColorInput('buttonSecondary', 'Cor do Botão Secundário')}
              {renderColorInput('buttonText', 'Cor do Texto do Botão')}
              
              {/* Cores de Status */}
              {renderColorInput('success', 'Cor de Sucesso')}
              {renderColorInput('warning', 'Cor de Aviso')}
              {renderColorInput('error', 'Cor de Erro')}
              
              {/* Cores de Elementos UI */}
              {renderColorInput('divider', 'Cor do Divisor')}
              {renderColorInput('shadow', 'Cor da Sombra')}
              
              {/* Cores de Crédito */}
              {renderColorInput('creditCard', 'Cor do Cartão de Crédito')}
              {renderColorInput('creditAmount', 'Cor do Valor do Crédito')}
              {renderColorInput('creditInfo', 'Cor da Informação do Crédito')}
              
              {/* Cores de Assinatura */}
              {renderColorInput('subscriptionCard', 'Cor do Cartão de Assinatura')}
              {renderColorInput('subscriptionPrice', 'Cor do Preço da Assinatura')}
              {renderColorInput('subscriptionBenefits', 'Cor dos Benefícios da Assinatura')}
              {renderColorInput('activeSubscription', 'Cor da Assinatura Ativa')}
              {renderColorInput('activeText', 'Cor do Texto Ativo')}
              {renderColorInput('endDateText', 'Cor do Texto de Data Final')}
              {renderColorInput('subscribeButton', 'Cor do Botão de Assinatura')}
              {renderColorInput('subscribeButtonText', 'Cor do Texto do Botão de Assinatura')}
              
              {/* Cores de Opções de Crédito */}
              {renderColorInput('creditOption', 'Cor da Opção de Crédito')}
              {renderColorInput('creditOptionAmount', 'Cor do Valor da Opção de Crédito')}
              {renderColorInput('creditOptionBonus', 'Cor do Bônus da Opção de Crédito')}
              
              {/* Cores de Transações */}
              {renderColorInput('transactionList', 'Cor da Lista de Transações')}
              {renderColorInput('transactionItem', 'Cor do Item de Transação')}
              {renderColorInput('transactionTitle', 'Cor do Título da Transação')}
              {renderColorInput('transactionDate', 'Cor da Data da Transação')}
              {renderColorInput('transactionAmount', 'Cor do Valor da Transação')}
              
              {/* Cores de Avaliação */}
              {renderColorInput('evaluatingSubscription', 'Cor da Avaliação de Assinatura')}
              {renderColorInput('evaluatingText', 'Cor do Texto de Avaliação')}
              {renderColorInput('evaluatingDescription', 'Cor da Descrição da Avaliação')}
              {renderColorInput('emptyText', 'Cor do Texto Vazio')}
              
              {/* Cores de Notificações */}
              {renderColorInput('notificationItem', 'Cor do Item de Notificação')}
              {renderColorInput('notificationUnread', 'Cor da Notificação Não Lida')}
              {renderColorInput('notificationIconInfo', 'Cor do Ícone de Informação')}
              {renderColorInput('notificationIconWarning', 'Cor do Ícone de Aviso')}
              {renderColorInput('notificationIconError', 'Cor do Ícone de Erro')}
              {renderColorInput('notificationIconSuccess', 'Cor do Ícone de Sucesso')}
              {renderColorInput('notificationIconDefault', 'Cor do Ícone Padrão')}
              {renderColorInput('notificationType', 'Cor do Tipo de Notificação')}
              {renderColorInput('notificationMessage', 'Cor da Mensagem da Notificação')}
              {renderColorInput('notificationTime', 'Cor do Tempo da Notificação')}
              {renderColorInput('notificationUnreadIndicator', 'Cor do Indicador de Não Lido')}
              {renderColorInput('notificationBadge', 'Cor do Badge da Notificação')}
              {renderColorInput('notificationBadgeText', 'Cor do Texto do Badge')}
              {renderColorInput('notificationUpdateBanner', 'Cor do Banner de Atualização')}
              {renderColorInput('notificationUpdateBannerText', 'Cor do Texto do Banner')}
              {renderColorInput('notificationUpdateButton', 'Cor do Botão de Atualização')}
              {renderColorInput('notificationUpdateButtonText', 'Cor do Texto do Botão de Atualização')}
              
              {/* Cores de Informações do Usuário */}
              {renderColorInput('notificationUserInfoContainer', 'Cor do Container de Informações')}
              {renderColorInput('notificationUserInfoHeader', 'Cor do Cabeçalho de Informações')}
              {renderColorInput('notificationUserInfoTitle', 'Cor do Título das Informações')}
              {renderColorInput('notificationUserInfoContent', 'Cor do Conteúdo das Informações')}
              {renderColorInput('notificationUserInfoLabel', 'Cor do Rótulo das Informações')}
              {renderColorInput('notificationUserInfoValue', 'Cor do Valor das Informações')}
              
              {/* Cores de Filtros */}
              {renderColorInput('notificationFilterButton', 'Cor do Botão de Filtro')}
              {renderColorInput('notificationFilterButtonActive', 'Cor do Botão de Filtro Ativo')}
              {renderColorInput('notificationFilterButtonText', 'Cor do Texto do Botão de Filtro')}
              {renderColorInput('notificationFilterButtonTextActive', 'Cor do Texto do Botão de Filtro Ativo')}
              
              {/* Cores de Recarregamento */}
              {renderColorInput('notificationAutoReloadContainer', 'Cor do Container de Recarregamento')}
              {renderColorInput('notificationAutoReloadText', 'Cor do Texto de Recarregamento')}
              
              {/* Cores de Marcar como Lido */}
              {renderColorInput('notificationMarkAllReadButton', 'Cor do Botão de Marcar como Lido')}
              {renderColorInput('notificationMarkAllReadText', 'Cor do Texto de Marcar como Lido')}
              {renderColorInput('notificationMarkAllReadTextDisabled', 'Cor do Texto de Marcar como Lido Desativado')}
              
              {/* Cores de Estado Vazio */}
              {renderColorInput('notificationEmptyContainer', 'Cor do Container Vazio')}
              {renderColorInput('notificationEmptyText', 'Cor do Texto Vazio')}
              {renderColorInput('notificationEmptySubText', 'Cor do Subtexto Vazio')}
              
              {/* Cores de Navegação */}
              {renderColorInput('notificationBackButton', 'Cor do Botão Voltar')}
              {renderColorInput('notificationBackButtonBackground', 'Cor do Fundo do Botão Voltar')}
              
              {/* Cores de Estatísticas */}
              {renderColorInput('statsCard', 'Cor do Card de Estatísticas')}
              {renderColorInput('statsValue', 'Cor do Valor da Estatística')}
              {renderColorInput('statsLabel', 'Cor do Rótulo da Estatística')}
              {renderColorInput('statsSection', 'Cor da Seção de Estatísticas')}
              {renderColorInput('statsSectionTitle', 'Cor do Título da Seção')}
              {renderColorInput('statsChartBackground', 'Cor do Fundo do Gráfico')}
              {renderColorInput('statsChartGradientFrom', 'Cor Inicial do Gradiente do Gráfico')}
              {renderColorInput('statsChartGradientTo', 'Cor Final do Gradiente do Gráfico')}
              {renderColorInput('statsChartColor', 'Cor do Gráfico')}
              {renderColorInput('statsPreferenceItem', 'Cor do Item de Preferência')}
              {renderColorInput('statsPreferenceLabel', 'Cor do Rótulo de Preferência')}
              {renderColorInput('statsPreferenceValue', 'Cor do Valor de Preferência')}
              {renderColorInput('statsRecentItem', 'Cor do Item Recente')}
              {renderColorInput('statsRecentDate', 'Cor da Data Recente')}
              {renderColorInput('statsRecentTime', 'Cor do Tempo Recente')}
              {renderColorInput('statsRecentQuantity', 'Cor da Quantidade Recente')}
              {renderColorInput('statsBackButton', 'Cor do Botão Voltar')}
              {renderColorInput('statsBackButtonBackground', 'Cor do Fundo do Botão Voltar')}
              
              {/* Cores de Login */}
              {renderColorInput('loginGradientStart', 'Cor Inicial do Gradiente do Login')}
              {renderColorInput('loginGradientMiddle', 'Cor do Meio do Gradiente do Login')}
              {renderColorInput('loginGradientEnd', 'Cor Final do Gradiente do Login')}
              {renderColorInput('loginLogo', 'Cor do Logo do Login')}
              {renderColorInput('loginTitle', 'Cor do Título do Login')}
              {renderColorInput('loginSubtitle', 'Cor do Subtítulo do Login')}
              {renderColorInput('loginInputContainer', 'Cor do Container do Input')}
              {renderColorInput('loginInputBorder', 'Cor da Borda do Input')}
              {renderColorInput('loginInputIcon', 'Cor do Ícone do Input')}
              {renderColorInput('loginInputText', 'Cor do Texto do Input')}
              {renderColorInput('loginInputPlaceholder', 'Cor do Placeholder do Input')}
              {renderColorInput('loginButtonGradientStart', 'Cor Inicial do Gradiente do Botão')}
              {renderColorInput('loginButtonGradientEnd', 'Cor Final do Gradiente do Botão')}
              {renderColorInput('loginButtonText', 'Cor do Texto do Botão')}
              {renderColorInput('loginButtonDisabled', 'Cor do Botão Desativado')}
              {renderColorInput('loginButtonShadow', 'Cor da Sombra do Botão')}
              {renderColorInput('loginLoadingDot', 'Cor do Ponto de Carregamento')}
              {renderColorInput('loginRegisterText', 'Cor do Texto de Registro')}
              {renderColorInput('loginRegisterTextBold', 'Cor do Texto de Registro em Negrito')}
              {renderColorInput('loginTextShadow', 'Cor da Sombra do Texto')}
              
              {/* Cores de Registro */}
              {renderColorInput('registerGradientStart', 'Cor Inicial do Gradiente do Registro')}
              {renderColorInput('registerGradientMiddle', 'Cor do Meio do Gradiente do Registro')}
              {renderColorInput('registerGradientEnd', 'Cor Final do Gradiente do Registro')}
              {renderColorInput('registerLogo', 'Cor do Logo do Registro')}
              {renderColorInput('registerTitle', 'Cor do Título do Registro')}
              {renderColorInput('registerSubtitle', 'Cor do Subtítulo do Registro')}
              {renderColorInput('registerInputContainer', 'Cor do Container do Input')}
              {renderColorInput('registerInputBorder', 'Cor da Borda do Input')}
              {renderColorInput('registerInputIcon', 'Cor do Ícone do Input')}
              {renderColorInput('registerInputText', 'Cor do Texto do Input')}
              {renderColorInput('registerInputPlaceholder', 'Cor do Placeholder do Input')}
              {renderColorInput('registerButtonGradientStart', 'Cor Inicial do Gradiente do Botão')}
              {renderColorInput('registerButtonGradientEnd', 'Cor Final do Gradiente do Botão')}
              {renderColorInput('registerButtonText', 'Cor do Texto do Botão')}
              {renderColorInput('registerButtonDisabled', 'Cor do Botão Desativado')}
              {renderColorInput('registerButtonShadow', 'Cor da Sombra do Botão')}
              {renderColorInput('registerLoadingDot', 'Cor do Ponto de Carregamento')}
              {renderColorInput('registerLoginText', 'Cor do Texto de Login')}
              {renderColorInput('registerLoginTextBold', 'Cor do Texto de Login em Negrito')}
              {renderColorInput('registerTextShadow', 'Cor da Sombra do Texto')}
              
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setIsEditing(false);
                  }}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSaveTheme}
                >
                  <Text style={styles.buttonText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </LinearGradient>
      
      {renderThemePreview()}
      {renderColorPicker()}
      {renderPaletteModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: height * 0.03,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  themeOptions: {
    marginBottom: 20,
  },
  themeOption: {
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  selectedTheme: {
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  themeOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  themeText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  colorPreviewRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  customThemeEditor: {
    padding: 20,
    borderRadius: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  colorInputContainer: {
    marginBottom: 15,
  },
  colorLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  colorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  colorInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
  },
  saveButton: {
    backgroundColor: '#8B4513',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    padding: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: height * 0.03,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  previewContent: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  previewItem: {
    marginBottom: 20,
  },
  previewItemText: {
    fontSize: 16,
    marginBottom: 5,
  },
  previewButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewCard: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  previewCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  previewCardText: {
    fontSize: 14,
  },
  themeDescription: {
    fontSize: 14,
    marginTop: 5,
    marginBottom: 10,
  },
  switchContainer: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
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
  },
  colorPaletteContainer: {
    maxHeight: 400,
  },
  colorPaletteSection: {
    marginBottom: 20,
  },
  paletteSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  copyThemeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  copyThemeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  paletteListContainer: {
    maxHeight: 400,
  },
  paletteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  paletteName: {
    fontSize: 16,
    fontWeight: '600',
  },
  paletteColors: {
    flexDirection: 'row',
  },
  paletteColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
}); 