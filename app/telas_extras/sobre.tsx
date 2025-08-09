import { View, Text, StyleSheet, ScrollView, Image, Linking, TouchableOpacity, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { FontAwesome } from '@expo/vector-icons';
import { coffeeAlert } from '@/utils/coffeeAlert';
export default function SobreScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleDownload = async () => {
    try {
      coffeeAlert('Redirecionando para o download...\nAguarde alguns instantes.', 'info');
      const apkUrl = 'https://dowloadappco.netlify.app/Cafezao_da_Computacao.apk';
      await Linking.openURL(apkUrl);
      coffeeAlert('Download iniciado!', 'success');
    } catch (error) {
      console.error('Erro ao baixar:', error);
      coffeeAlert('Erro ao baixar o APK. Tente novamente.\n' + error, 'error');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colorScheme === 'dark' ? '#2C1810' : '#F5F5DC' }]}>
      <Stack.Screen 
        options={{
          title: 'Cafézão da Computação',
          headerStyle: {
            backgroundColor: colorScheme === 'dark' ? '#2C1810' : '#F5F5DC',
          },
          headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#2C1810',
        }} 
      />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <FontAwesome name="coffee" size={60} color="#D4AF37" />
            <Text style={[styles.title, { color: colorScheme === 'dark' ? '#FFFFFF' : '#2C1810' }]}>
              Cafézão da Computação
            </Text>
          </View>

          <Text style={[styles.description, { color: colorScheme === 'dark' ? '#FFFFFF' : '#5D4037' }]}>
            O Cafézão da Computação é um aplicativo criado pelos estudantes de Engenharia de Computação, 
            para voce poder pedir seu cafézinho — tudo com o aroma de um bom café e a energia da tecnologia!
          </Text>

          <View style={styles.downloadSection}>
            <View style={styles.downloadContent}>
              <View style={styles.androidHeader}>
                <Image 
                  source={require('@/assets/imgs/android.png')}
                  style={[styles.osIcon, { tintColor: colorScheme === 'dark' ? '#FFFFFF' : '#2C1810' }]}
                />
                <Text style={[styles.sectionTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : '#2C1810' }]}>
                  Versão Android
                </Text>
              </View>

              <View style={styles.appInfo}>
                <View style={styles.appDetails}>
                  <View style={styles.detailItem}>
                    <FontAwesome name="code" size={20} color="#8B4513" />
                    <Text style={[styles.detailText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#5D4037' }]}>
                      Versão 1.0.1
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <FontAwesome name="download" size={20} color="#8B4513" />
                    <Text style={[styles.detailText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#5D4037' }]}>
                      99MB
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <FontAwesome name="mobile" size={20} color="#8B4513" />
                    <Text style={[styles.detailText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#5D4037' }]}>
                      Android 5.0+
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
                <FontAwesome name="download" size={24} color="#FFFFFF" />
                <Text style={styles.downloadButtonText}>Baixar APK</Text>
              </TouchableOpacity>

              <View style={styles.installationSteps}>
                <Text style={[styles.installationTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : '#2C1810' }]}>
                  Como instalar:
                </Text>
                <Text style={[styles.installationText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#5D4037' }]}>
                  1. Toque no botão acima para baixar.{'\n'}
                  2. Ao finalizar o download, toque no arquivo.{'\n'}
                  3. Caso apareça um aviso de segurança, permita a instalação de fontes desconhecidas.{'\n'}
                  4. Instale ou atualize o aplicativo.{'\n'}
                  5. Pronto! Agora é só aproveitar o Cafézão da Computação.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  description: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
  },
  downloadSection: {
    marginVertical: 20,
  },
  downloadContent: {
    backgroundColor: 'rgba(90, 66, 66, 0.8)',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  androidHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  osIcon: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  appInfo: {
    marginVertical: 20,
  },
  appDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 16,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B4513',
    padding: 15,
    borderRadius: 25,
    marginVertical: 20,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  installationSteps: {
    backgroundColor: 'rgba(94, 78, 78, 0.9)',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
  },
  installationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  installationText: {
    fontSize: 16,
    lineHeight: 24,
  },
}); 