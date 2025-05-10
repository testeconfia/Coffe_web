import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Colors, ThemeType } from '@/constants/Colors';
import { coffeeAlert } from '@/utils/coffeeAlert';
interface CoffeeStats {
  today: number;
  total: number;
  lastCoffee: Date | null;
  averagePerDay: number;
  mostCommonTime: string;
  recentCoffees: Array<{
    date: Date;
    quantity: string;
  }>;
  weeklyData: Array<{
    date: string;
    count: number;
  }>;
  favoriteQuantity: string;
  totalQuantity: number;
}

interface CoffeeData {
  id: string;
  userId: string;
  quantity: string;
  createdAt: Date;
  status: string;
}

const { width,height } = Dimensions.get('window');

export default function StatisticsScreen() {
  const [stats, setStats] = useState<CoffeeStats>({
    today: 0,
    total: 0,
    lastCoffee: null,
    averagePerDay: 0,
    mostCommonTime: '',
    recentCoffees: [],
    weeklyData: [],
    favoriteQuantity: '',
    totalQuantity: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('default');
  const [isGeneralView, setIsGeneralView] = useState(false);
  const systemColorScheme = useColorScheme();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadStatistics();
    checkTheme();
  }, []);

  // Add effect to listen for system theme changes
  useEffect(() => {
    const checkSystemTheme = async () => {
      const followSystem = await AsyncStorage.getItem('followSystemTheme');
      if (followSystem === 'true') {
        setCurrentTheme(systemColorScheme as ThemeType || 'default');
      }
    };
    checkSystemTheme();
  }, [systemColorScheme]);

  const checkTheme = async () => {
    const theme = await AsyncStorage.getItem('selectedTheme');
    const followSystem = await AsyncStorage.getItem('followSystemTheme');
    if (followSystem === 'true') {
      setCurrentTheme(systemColorScheme as ThemeType || 'default');
    } else {
      setCurrentTheme(theme as ThemeType || 'default');
    }
  };

  const loadStatistics = async () => {
    const tokens = await AsyncStorage.getItem('userToken');
    if (!tokens) {
      coffeeAlert('Usuário não autenticado','error');
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Buscar todos os cafés
      const allCoffeesQuery = query(
        collection(db, 'coffees'),
        ...(isGeneralView ? [] : [where('userId', '==', tokens)])
      );

      const allCoffeesSnapshot = await getDocs(allCoffeesQuery);
      const allCoffees: CoffeeData[] = allCoffeesSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate()
      })) as CoffeeData[];

      if (allCoffees.length === 0) {
        setStats({
          today: 0,
          total: 0,
          lastCoffee: null,
          averagePerDay: 0,
          mostCommonTime: '',
          recentCoffees: [],
          weeklyData: [],
          favoriteQuantity: '0/4',
          totalQuantity: 0
        });
        return;
      }

      // Calcular estatísticas
      const totalCoffees = allCoffees.length;
      const todayCoffees = allCoffees.filter(coffee => 
        coffee.createdAt && coffee.createdAt >= today
      ).length;
      const lastCoffee = allCoffees[0]?.createdAt || null;

      // Calcular média por dia
      const firstCoffee = allCoffees[allCoffees.length - 1]?.createdAt;
      const daysDiff = firstCoffee ? Math.ceil((new Date().getTime() - firstCoffee.getTime()) / (1000 * 60 * 60 * 24)) : 1;
      const averagePerDay = totalCoffees / daysDiff;

      // Encontrar horário mais comum
      const timeCounts: { [key: string]: number } = {};
      allCoffees.forEach(coffee => {
        if (coffee.createdAt) {
          const hour = coffee.createdAt.getHours();
          timeCounts[hour] = (timeCounts[hour] || 0) + 1;
        }
      });
      const mostCommonHour = Object.entries(timeCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
      const mostCommonTime = `${mostCommonHour}:00`;

      // Processar cafés recentes
      const recentCoffees = allCoffees
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map(coffee => ({
          date: coffee.createdAt,
          quantity: coffee.quantity
        }));

      // Calcular dados semanais
      const weeklyData = calculateWeeklyData(allCoffees);

      // Calcular quantidade favorita e total
      const quantityStats = calculateQuantityStats(allCoffees);

      setStats({
        today: todayCoffees,
        total: totalCoffees,
        lastCoffee,
        averagePerDay,
        mostCommonTime,
        recentCoffees,
        weeklyData,
        favoriteQuantity: quantityStats.favorite,
        totalQuantity: quantityStats.total
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWeeklyData = (coffees: any[]) => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const daysInMonth = Array.from({ length: lastDayOfMonth.getDate() }, (_, i) => {
      const date = new Date(firstDayOfMonth);
      date.setDate(i + 1);
      return date.toISOString().split('T')[0];
    });

    const dailyCounts = daysInMonth.map(date => ({
      date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit' }) || 'N/A',
      count: coffees.filter(coffee => 
        coffee.createdAt && 
        coffee.createdAt.toISOString().split('T')[0] === date
      ).length || 0
    }));

    return dailyCounts;
  };

  const calculateQuantityStats = (coffees: any[]) => {
    if (!coffees || coffees.length === 0) {
      return {
        favorite: '0/4',
        total: 0,
        averagePerDay: 0
      };
    }

    const quantityCounts: { [key: string]: number } = {};
    let totalQuantity = 0;

    coffees.forEach(coffee => {
      const quantity = coffee.quantity;
      quantityCounts[quantity] = (quantityCounts[quantity] || 0) + 1;
      
      // Converter quantidade para número para calcular total
      const [numerator, denominator] = quantity.split('/').map(Number);
      const quantityNum = numerator / denominator;
      totalQuantity += quantityNum;
    });

    const favoriteQuantity = Object.entries(quantityCounts)
      .reduce((a, b) => a[1] > b[1] ? a : b, ['0/4', 0])[0];

    // Calcular média por dia
    const firstCoffee = coffees[coffees.length - 1]?.createdAt;
    const lastCoffee = coffees[0]?.createdAt;
    const daysDiff = firstCoffee && lastCoffee 
      ? Math.ceil((lastCoffee.getTime() - firstCoffee.getTime()) / (1000 * 60 * 60 * 24)) || 1
      : 1;

    return {
      favorite: favoriteQuantity,
      total: totalQuantity,
      averagePerDay: totalQuantity / daysDiff
    };
  };

  const centerCurrentDate = () => {
    if (stats.weeklyData.length > 0) {
      const today = new Date();
      const todayIndex = stats.weeklyData.findIndex(d => 
        new Date(d.date).getDate() === today.getDate()
      );
      
      if (todayIndex !== -1) {
        // Calcula a posição para centralizar
        const chartWidth = Math.max(width * 2, 600);
        const itemWidth = chartWidth / stats.weeklyData.length;
        const centerPosition = (todayIndex * itemWidth) - (width / 2) + (itemWidth / 2);
        
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            x: Math.max(0, centerPosition),
            animated: false
          });
        }, 1000);
      }
    }
  };

  useEffect(() => {
    if (!isLoading) {
      centerCurrentDate();
    }
  }, [isLoading, stats.weeklyData]);

  useEffect(() => {
    loadStatistics();
  }, [isGeneralView]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors[currentTheme].background }]}>
        <ActivityIndicator size="large" color={Colors[currentTheme].primary} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[Colors[currentTheme].gradientStart, Colors[currentTheme].gradientEnd]}
      style={styles.container}
    >
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: Colors[currentTheme].cardBackground }]} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors[currentTheme].textLight} />
          </TouchableOpacity>
          <View style={styles.header}>
            <Ionicons name="stats-chart" size={32} color={Colors[currentTheme].primary} />
            <Text style={[styles.title, { color: Colors[currentTheme].textLight }]}>Estatísticas</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.toggleButton, { backgroundColor: Colors[currentTheme].cardBackground }]} 
          onPress={() => setIsGeneralView(!isGeneralView)}
        >
          <Ionicons 
            name={isGeneralView ? "people" : "person"} 
            size={24} 
            color={Colors[currentTheme].textLight} 
          />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: Colors[currentTheme].cardBackground }]}>
            <Text style={[styles.statValue, { color: Colors[currentTheme].primary }]}>{stats.today}</Text>
            <Text style={[styles.statLabel, { color: Colors[currentTheme].textLight }]}>
              Cafés Hoje {isGeneralView ? '(Geral)' : ''}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors[currentTheme].cardBackground }]}>
            <Text style={[styles.statValue, { color: Colors[currentTheme].primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: Colors[currentTheme].textLight }]}>
              Total de Cafés {isGeneralView ? '(Geral)' : ''}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors[currentTheme].cardBackground }]}>
            <Text style={[styles.statValue, { color: Colors[currentTheme].primary }]}>{stats.averagePerDay.toFixed(1)}</Text>
            <Text style={[styles.statLabel, { color: Colors[currentTheme].textLight }]}>
              Média por Dia {isGeneralView ? '(Geral)' : ''}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors[currentTheme].cardBackground }]}>
            <Text style={[styles.statValue, { color: Colors[currentTheme].primary }]}>{stats.mostCommonTime}</Text>
            <Text style={[styles.statLabel, { color: Colors[currentTheme].textLight }]}>
              Horário Mais Comum {isGeneralView ? '(Geral)' : ''}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: Colors[currentTheme].cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: Colors[currentTheme].textLight }]}>Consumo Semanal</Text>
          <ScrollView 
            ref={scrollViewRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartScrollContainer}
            onLayout={centerCurrentDate}
          >
            <LineChart
              data={{
                labels: stats.weeklyData.map(d => d.date || 'N/A'),
                datasets: [{
                  data: stats.weeklyData.map(d => d.count || 0)
                }]
              }}
              width={Math.max(width * 2, 600)}
              height={200}
              chartConfig={{
                backgroundColor: Colors[currentTheme].background,
                backgroundGradientFrom: Colors[currentTheme].gradientStart,
                backgroundGradientTo: Colors[currentTheme].gradientEnd,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(${Colors[currentTheme].primary.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ')}, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForLabels: {
                  fontSize: 10,
                  fill: Colors[currentTheme].textLight
                }
              }}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              withDots={true}
              withShadow={false}
              withScrollableDot={false}
              withVerticalLines={false}
              withHorizontalLines={true}
              yAxisInterval={1}
              yAxisSuffix=""
              yAxisLabel=""
              segments={4}
              fromZero={true}
              formatYLabel={(value) => `${value}`}
            />
          </ScrollView>
        </View>

        <View style={[styles.section, { backgroundColor: Colors[currentTheme].cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: Colors[currentTheme].textLight }]}>Preferências</Text>
          <View style={styles.preferencesContainer}>
            <View style={[styles.preferenceItem, { backgroundColor: Colors[currentTheme].cardBackground }]}>
              <Ionicons name="cafe" size={24} color={Colors[currentTheme].primary} />
              <Text style={[styles.preferenceLabel, { color: Colors[currentTheme].textLight }]}>Quantidade Favorita</Text>
              <Text style={[styles.preferenceValue, { color: Colors[currentTheme].primary }]}>{stats.favoriteQuantity}</Text>
            </View>
            <View style={[styles.preferenceItem, { backgroundColor: Colors[currentTheme].cardBackground }]}>
              <Ionicons name="water" size={24} color={Colors[currentTheme].primary} />
              <Text style={[styles.preferenceLabel, { color: Colors[currentTheme].textLight }]}>Total de Café</Text>
              <Text style={[styles.preferenceValue, { color: Colors[currentTheme].primary }]}>{stats.totalQuantity.toFixed(1)} copos</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: Colors[currentTheme].cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: Colors[currentTheme].textLight }]}>Últimos Cafés</Text>
          {stats.recentCoffees.map((coffee, index) => (
            <View key={index} style={[styles.recentCoffeeItem, { borderBottomColor: Colors[currentTheme].divider }]}>
              <View style={styles.recentCoffeeInfo}>
                <Text style={[styles.recentCoffeeDate, { color: Colors[currentTheme].textLight }]}>
                  {coffee.date.toLocaleDateString('pt-BR')}
                </Text>
                <Text style={[styles.recentCoffeeTime, { color: Colors[currentTheme].textLight }]}>
                  {coffee.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={[styles.recentCoffeeQuantity, { color: Colors[currentTheme].primary }]}>{coffee.quantity}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: height * 0.04,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  backButton: {
    padding: 10,
    borderRadius: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    borderRadius: 12,
    padding: 15,
    width: '48%',
    marginBottom: 15,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    borderRadius: 12,
    padding: 15,
    marginBottom: height * 0.05,

  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  preferencesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  preferenceItem: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    width: '45%',
  },
  preferenceLabel: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  preferenceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  recentCoffeeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  recentCoffeeInfo: {
    flex: 1,
  },
  recentCoffeeDate: {
    fontSize: 16,
  },
  recentCoffeeTime: {
    fontSize: 14,
  },
  recentCoffeeQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartScrollContainer: {
    paddingHorizontal: 20,
  },
  noDataContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    textAlign: 'center',
  },
  toggleButton: {
    padding: 10,
    borderRadius: 30,
  },
}); 