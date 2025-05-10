import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';
import { Image } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { AppProvider } from '@/contexts/AppContext';
import { CoffeeModal } from '@/components/CoffeeModal';
import { useCoffeeAlertProvider } from '@/utils/coffeeAlert';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { visible, message, type, buttons, hideModal } = useCoffeeAlertProvider();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        if (!userToken) {
          router.replace('/acesso');
        } else {
          //router.replace('/(tabs)');
          router.replace('/telas_extras/sobre');
        }
      } catch (error) {
        console.error('Erro ao verificar o status de login:', error);
        router.replace('/acesso');
      }
    };

    if (loaded) {
      SplashScreen.hideAsync();
      checkLoginStatus();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="acesso/index" options={{ headerShown: false }} />
          <Stack.Screen name="acesso/register" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false, }}/>
          <Stack.Screen name="telas_extras/pagamento" options={{ headerShown: false }} />
          <Stack.Screen name="telas_extras/notifications" options={{ headerShown: false }} />
          <Stack.Screen name="telas_extras/estatisticas" options={{ headerShown: false }} />
          <Stack.Screen name="telas_extras/super_admin" options={{ headerShown: false }} />
          <Stack.Screen name="telas_extras/tema" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)/admin" options={{ headerShown: false }} />
          <Stack.Screen name="telas_extras/avisos" options={{ headerShown: false }} />
          <Stack.Screen name="telas_extras/financeiro" options={{ headerShown: false }} />
          <Stack.Screen name="telas_extras/sobre" options={{ headerShown: false }} />
          <Stack.Screen name="jogos" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <CoffeeModal
          visible={visible}
          message={message}
          type={type}
          buttons={buttons}
          onClose={hideModal}
        />
      </ThemeProvider>
    </AppProvider>
  );
}
