import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import UpdateIndicator from '../components/UpdateIndicator';
import FirestoreUpdateIndicator from '../components/FirestoreUpdateIndicator';

export default function UpdateExampleScreen() {
  const router = useRouter();
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  
  const handleUpdate = () => {
    setLastUpdateTime(new Date());
    setUpdateCount(prev => prev + 1);
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exemplo de Indicadores de Atualização</Text>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicador Simulado</Text>
          <Text style={styles.description}>
            Este indicador pisca aleatoriamente a cada 30 segundos para simular atualizações.
            Clique nele para parar a animação.
          </Text>
          <UpdateIndicator onUpdatePress={handleUpdate} />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicador do Firestore</Text>
          <Text style={styles.description}>
            Este indicador monitora atualizações reais no Firestore (dados do usuário e notificações).
            Ele pisca quando detecta mudanças nos dados.
          </Text>
          <FirestoreUpdateIndicator onUpdatePress={handleUpdate} />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico de Atualizações</Text>
          <Text style={styles.description}>
            Total de atualizações detectadas: {updateCount}
          </Text>
          {lastUpdateTime && (
            <Text style={styles.description}>
              Última atualização: {lastUpdateTime.toLocaleString()}
            </Text>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Como Usar</Text>
          <Text style={styles.description}>
            Para usar estes indicadores em outras telas, importe-os e adicione ao seu componente:
          </Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>
              {'import UpdateIndicator from \'../components/UpdateIndicator\';'}
            </Text>
            <Text style={styles.codeText}>
              {'// Dentro do seu componente:'}
            </Text>
            <Text style={styles.codeText}>
              {'<UpdateIndicator onUpdatePress={handleUpdate} />'}
            </Text>
          </View>
        </View>
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.back()}
      >
        <Text style={styles.buttonText}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2C1810',
    padding: 16,
  },
  title: {
    fontSize: 24,
    color: '#fff',
    marginVertical: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  description: {
    color: '#fff',
    marginBottom: 8,
  },
  codeBlock: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  codeText: {
    color: '#D4A76A',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#8B4513',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 