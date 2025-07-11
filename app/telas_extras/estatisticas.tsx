import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, useColorScheme, Animated, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, getDocs, orderBy, limit, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Colors, ThemeType } from '@/constants/Colors';
import { coffeeAlert } from '@/utils/coffeeAlert';
import { MotiView } from 'moti';

// Constants
const windowDimensions = Dimensions.get('window');
const SCREEN_WIDTH = windowDimensions.width;
const SCREEN_HEIGHT = windowDimensions.height;
const CHART_WIDTH = 800;
const CHART_HEIGHT = 220;
const PIE_CHART_WIDTH = 300;
const PIE_CHART_HEIGHT = 200;

interface CoffeeStats {
  today: number;
  total: number;
  lastCoffee: Date | null;
  averagePerDay: number;
  mostCommonTime: string;
  recentCoffees: Array<{
    date: Date;
    quantity: string;
    userId: string;
    userName?: string;
  }>;
  weeklyData: Array<{
    date: string;
    count: number;
  }>;
  favoriteQuantity: string;
  totalQuantity: number;
  streak: number;
  monthlyTotal: number;
  timeDistribution: Array<{
    period: string;
    count: number;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    unlocked: boolean;
  }>;
  userRanking: Array<{
    userId: string;
    userName: string;
    totalCoffees: number;
    lastCoffee: Date;
  }>;
  suspiciousActivities: Array<{
    userId: string;
    userName: string;
    date: Date;
    quantity: string;
    reason: string;
  }>;
}

interface CoffeeData {
  id: string;
  userId: string;
  quantity: string;
  createdAt: Date;
  status: string;
  userName?: string;
}

type TimeFilter = 'today' | 'week' | 'month' | 'year' | 'all';

export default function StatisticsScreen() {
  const [stats, setStats] = useState<CoffeeStats>({
    today: 0,
    total: 0,
    lastCoffee: null,
    averagePerDay: 0,
    mostCommonTime: '',
    recentCoffees: [],
    weeklyData: [],
    favoriteQuantity: '0/4',
    totalQuantity: 0,
    streak: 0,
    monthlyTotal: 0,
    timeDistribution: [],
    achievements: [],
    userRanking: [],
    suspiciousActivities: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('default');
  const [isGeneralView, setIsGeneralView] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [showFilters, setShowFilters] = useState(false);
  const [isSuspiciousExpanded, setIsSuspiciousExpanded] = useState(false);
  const systemColorScheme = useColorScheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [dimensions, setDimensions] = useState({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT
  });

  useEffect(() => {
    loadStatistics();
    checkTheme();
  }, []);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({
        width: window.width,
        height: window.height
      });
    });

    return () => subscription?.remove();
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

      // Calculate date range based on filter
      const startDate = new Date();
      switch (timeFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(today.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(today.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(today.getFullYear() - 1);
          break;
        case 'all':
          startDate.setFullYear(2000); // Far past date
          break;
      }

      // Buscar todos os cafés
      const allCoffeesQuery = query(
        collection(db, 'coffees'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        ...(isGeneralView ? [] : [where('userId', '==', tokens)]),
        orderBy('createdAt', 'desc')
      );

      const allCoffeesSnapshot = await getDocs(allCoffeesQuery);
      const allCoffees: CoffeeData[] = allCoffeesSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate()
      })) as CoffeeData[];

      console.log('Total de cafés encontrados:', allCoffees.length);
      console.log('Primeiro café:', allCoffees[0]?.createdAt);
      console.log('Último café:', allCoffees[allCoffees.length - 1]?.createdAt);

      // Se não houver cafés, retornar estatísticas vazias
      if (!allCoffees || allCoffees.length === 0) {
        const emptyStats = {
          today: 0,
          total: 0,
          lastCoffee: null,
          averagePerDay: 0,
          mostCommonTime: 'N/A',
          recentCoffees: [],
          weeklyData: [],
          favoriteQuantity: '0/4',
          totalQuantity: 0,
          streak: 0,
          monthlyTotal: 0,
          timeDistribution: [],
          achievements: [],
          userRanking: [],
          suspiciousActivities: []
        };
        setStats(emptyStats);
        setIsLoading(false);
        return;
      }

      // Buscar informações dos usuários
      const userIds = [...new Set(allCoffees.map(coffee => coffee.userId))];
      let users: any[] = [];
     
      if (userIds.length > 0) {
        const userDocs = await Promise.all(
          userIds.map(async (id) => {
            const docRef = doc(db, 'users', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              return {
                id: docSnap.id,
                ...docSnap.data()
              };
            }
            return null;
          })
        );
        users = userDocs.filter((user) => user !== null);
      }

      const coffeesWithUsers = allCoffees.map(coffee => {
        const user = users.find(user => user.id === coffee.userId);
        return {
          ...coffee,
          userName: user?.name || user?.userName || 'Usuário Desconhecido'
        };
      });

      // Calcular estatísticas
      const totalCoffees = coffeesWithUsers.length;
      console.log('Total de cafés após processamento:', totalCoffees);
      
      // Calcular cafés de hoje
      console.log('Data de hoje (zerada):', today);

      const todayCoffees = coffeesWithUsers.filter(coffee => {
        if (!coffee.createdAt) return false;
        const coffeeDate = new Date(coffee.createdAt);
        coffeeDate.setHours(0, 0, 0, 0);
        const isToday = coffeeDate.getTime() === today.getTime();
        console.log('Data do café:', coffeeDate, 'É hoje?', isToday);
        return isToday;
      }).length;

      console.log('Cafés de hoje:', todayCoffees);

      // Calcular total do mês
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      console.log('Primeiro dia do mês:', firstDayOfMonth);

      const monthlyTotal = coffeesWithUsers.filter(coffee => {
        if (!coffee.createdAt) return false;
        const coffeeDate = new Date(coffee.createdAt);
        const isThisMonth = coffeeDate >= firstDayOfMonth;
        console.log('Data do café:', coffeeDate, 'É deste mês?', isThisMonth);
        return isThisMonth;
      }).length;

      console.log('Total do mês:', monthlyTotal);

      // Calcular streak
      console.log('CoffeesWithUsers:', coffeesWithUsers);
      console.log('CoffeesWithUsers:', coffeesWithUsers.length);
      const streak = calculateStreak(coffeesWithUsers);
      console.log('Streak:', streak);

      const lastCoffee = coffeesWithUsers[0]?.createdAt || null;
      console.log('Último café:', lastCoffee);

      // Calcular média por dia
      const firstCoffee = coffeesWithUsers[coffeesWithUsers.length - 1]?.createdAt;
      const daysDiff = firstCoffee ? Math.ceil((new Date().getTime() - firstCoffee.getTime()) / (1000 * 60 * 60 * 24)) : 1;
      const averagePerDay = totalCoffees / daysDiff;
      console.log('Média por dia:', averagePerDay);

      // Encontrar horário médio
      let totalMinutes = 0;
      let coffeeCount = 0;
      
      coffeesWithUsers.forEach(coffee => {
        if (coffee.createdAt) {
          const hours = coffee.createdAt.getHours();
          const minutes = coffee.createdAt.getMinutes();
          totalMinutes += (hours * 60) + minutes;
          coffeeCount++;
        }
      });

      const averageMinutes = coffeeCount > 0 ? Math.round(totalMinutes / coffeeCount) : 0;
      const averageHours = Math.floor(averageMinutes / 60);
      const remainingMinutes = averageMinutes % 60;
      const mostCommonTime = coffeeCount > 0 
        ? `${averageHours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`
        : 'N/A';
      console.log('Horário médio:', mostCommonTime);

      // Calcular dados semanais
      const weeklyData = calculateWeeklyData(coffeesWithUsers);
      console.log('Dados semanais:', weeklyData);

      // Calcular quantidade favorita e total
      const quantityStats = calculateQuantityStats(coffeesWithUsers);
      console.log('Estatísticas de quantidade:', quantityStats);

      // Calculate time distribution
      const timeDistribution = calculateTimeDistribution(coffeesWithUsers);
      console.log('Distribuição por período:', timeDistribution);

      // Calculate achievements
      const achievements = calculateAchievements(coffeesWithUsers);
      console.log('Conquistas:', achievements);

      // Calcular ranking de usuários
      const userRanking = calculateUserRanking(coffeesWithUsers);
      console.log('Ranking de usuários:', userRanking);

      // Detectar atividades suspeitas
      const suspiciousActivities = detectSuspiciousActivities(coffeesWithUsers);
      console.log('Atividades suspeitas:', suspiciousActivities);

      const todosstats = {
        today: todayCoffees,
        total: totalCoffees,
        lastCoffee,
        averagePerDay,
        mostCommonTime,
        recentCoffees: coffeesWithUsers.slice(0, 5).map(coffee => ({
          date: coffee.createdAt,
          quantity: coffee.quantity,
          userId: coffee.userId,
          userName: coffee.userName
        })),
        weeklyData,
        favoriteQuantity: quantityStats.favorite,
        totalQuantity: quantityStats.total,
        streak,
        monthlyTotal,
        timeDistribution,
        achievements,
        userRanking,
        suspiciousActivities
      };
      //console.log('Todas as estatísticas:', todosstats);
      setStats(todosstats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      coffeeAlert('Erro ao carregar estatísticas', 'error');
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

    const dailyCounts = daysInMonth.map(date => {
      const count = coffees.filter(coffee => 
        coffee.createdAt && 
        coffee.createdAt.toISOString().split('T')[0] === date
      ).length || 0;

      // Formatar a data para exibição
      const displayDate = new Date(date).toLocaleDateString('pt-BR', { 
        day: '2-digit',
        month: '2-digit'
      });

      return {
        date: displayDate,
        count: count
      };
    });

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
  const calculateStreak = (coffees: CoffeeData[]): number => {
    if (!coffees.length) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Ordenar cafés por data (mais recente primeiro)
    const sortedCoffees = [...coffees].sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );

    // Agrupar cafés por data
    const coffeesByDate = sortedCoffees.reduce((acc, coffee) => {
      const date = new Date(coffee.createdAt);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString();
      acc[dateStr] = true;
      return acc;
    }, {} as Record<string, boolean>);

    let streak = 0;
    let currentDate = new Date(sortedCoffees[0].createdAt);
    currentDate.setHours(0, 0, 0, 0);

    // Verificar dias consecutivos até encontrar um dia sem café
    while (true) {
      const dateStr = currentDate.toISOString();
      
      if (!coffeesByDate[dateStr]) {
        break;
      }

      streak++;
      currentDate = new Date(currentDate.getTime() - 86400000); // -1 dia
    }

    return streak;
  };

  const calculateTimeDistribution = (coffees: CoffeeData[]) => {
    const periods = [
      { name: 'Manhã', start: 6, end: 11 },
      { name: 'Tarde', start: 12, end: 17 },
      { name: 'Noite', start: 18, end: 23 },
      { name: 'Madrugada', start: 0, end: 5 }
    ];

    return periods.map(period => ({
      period: period.name,
      count: coffees.filter(coffee => {
        const hour = coffee.createdAt.getHours();
        return hour >= period.start && hour <= period.end;
      }).length
    }));
  };

  const calculateAchievements = (coffees: CoffeeData[]) => {
    const achievements = [
      {
        id: 'first_coffee',
        title: 'Primeiro Café',
        description: 'Registrou seu primeiro café',
        unlocked: coffees.length > 0
      },
      {
        id: 'coffee_master',
        title: 'Mestre do Café',
        description: 'Registrou mais de 100 cafés',
        unlocked: coffees.length >= 100
      },
      {
        id: 'streak_king',
        title: 'Rei da Sequência',
        description: 'Manteve uma sequência de 7 dias',
        unlocked: calculateStreak(coffees) >= 7
      }
    ];

    return achievements;
  };

  const calculateUserRanking = (coffees: CoffeeData[]) => {
    const userStats = coffees.reduce((acc, coffee) => {
      if (!acc[coffee.userId]) {
        acc[coffee.userId] = {
          userId: coffee.userId,
          userName: coffee.userName || 'Usuário Desconhecido',
          totalCoffees: 0,
          lastCoffee: coffee.createdAt
        };
      }
      acc[coffee.userId].totalCoffees++;
      if (coffee.createdAt > acc[coffee.userId].lastCoffee) {
        acc[coffee.userId].lastCoffee = coffee.createdAt;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(userStats)
      .sort((a, b) => b.totalCoffees - a.totalCoffees)
      .slice(0, 10);
  };

  const detectSuspiciousActivities = (coffees: CoffeeData[]) => {
    const suspicious: Array<{
      userId: string;
      userName: string;
      date: Date;
      quantity: string;
      reason: string;
    }> = [];

    // Agrupar cafés por usuário
    const userCoffees = coffees.reduce((acc, coffee) => {
      if (!acc[coffee.userId]) {
        acc[coffee.userId] = [];
      }
      acc[coffee.userId].push(coffee);
      return acc;
    }, {} as Record<string, CoffeeData[]>);

    // Verificar atividades suspeitas
    Object.entries(userCoffees).forEach(([userId, userCoffees]) => {
      // Ordenar por data
      const sortedCoffees = [...userCoffees].sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      );

      // Verificar múltiplos cafés em curto período
      for (let i = 1; i < sortedCoffees.length; i++) {
        const timeDiff = sortedCoffees[i].createdAt.getTime() - sortedCoffees[i-1].createdAt.getTime();
        if (timeDiff < 5 * 60 * 1000) { // 5 minutos
          suspicious.push({
            userId,
            userName: sortedCoffees[i].userName || 'Usuário Desconhecido',
            date: sortedCoffees[i].createdAt,
            quantity: sortedCoffees[i].quantity,
            reason: 'Múltiplos cafés em menos de 5 minutos'
          });
        }
      }

      // Verificar quantidade total diária
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCoffees = sortedCoffees.filter(coffee => 
        coffee.createdAt >= today
      );
      if (todayCoffees.length > 10) {
        suspicious.push({
          userId,
          userName: todayCoffees[0].userName || 'Usuário Desconhecido',
          date: todayCoffees[0].createdAt,
          quantity: todayCoffees[0].quantity,
          reason: 'Mais de 10 cafés em um dia'
        });
      }
    });

    return suspicious;
  };

  const centerCurrentDate = () => {
    if (stats.weeklyData.length > 0) {
      const today = new Date();
      const todayIndex = stats.weeklyData.findIndex(d => 
        new Date(d.date).getDate() === today.getDate()
      );
      
      if (todayIndex !== -1) {
        const itemWidth = CHART_WIDTH / stats.weeklyData.length;
        const centerPosition = (todayIndex * itemWidth) - (CHART_WIDTH / 4);
        
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
  }, [timeFilter, isGeneralView]);

  const renderChart = () => {
    if (!stats.weeklyData || stats.weeklyData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={[styles.noDataText, { color: Colors[currentTheme].textLight }]}>
            Nenhum dado disponível para o período selecionado
          </Text>
        </View>
      );
    }

    return (
      <LineChart
        data={{
          labels: stats.weeklyData.map(d => d.date || 'N/A'),
          datasets: [{
            data: stats.weeklyData.map(d => d.count || 0)
          }]
        }}
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
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
            fontSize: 12,
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
        withShadow={true}
        withScrollableDot={false}
        withVerticalLines={false}
        withHorizontalLines={true}
        yAxisInterval={1}
        yAxisSuffix=""
        yAxisLabel=""
        segments={4}
        fromZero={true}
        formatYLabel={(yValue: string) => `${Math.round(parseFloat(yValue))}`}
        getDotColor={(dataPoint, dataPointIndex) => Colors[currentTheme].primary}
        renderDotContent={({ x, y, index, indexData }) => null}
        onDataPointClick={({ value, getColor }) => {}}
        decorator={() => null}
      />
    );
  };

  const renderPieChart = () => {
    if (!stats.timeDistribution || stats.timeDistribution.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={[styles.noDataText, { color: Colors[currentTheme].textLight }]}>
            Nenhum dado disponível para o período selecionado
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.pieChartWrapper}>
        <View style={styles.pieChartContainer}>
          <PieChart
            data={stats.timeDistribution.map((item, index) => ({
              name: item.period,
              count: item.count,
              color: `rgba(${Colors[currentTheme].primary.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ')}, ${0.8 - (index * 0.2)})`,
              legendFontColor: Colors[currentTheme].textLight,
              legendFontSize: 12
            }))}
            width={PIE_CHART_WIDTH * 0.8}
            height={PIE_CHART_HEIGHT * 0.8}
            chartConfig={{
              color: (opacity = 1) => `rgba(${Colors[currentTheme].primary.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ')}, ${opacity})`,
            }}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="0"
            absolute
            hasLegend={false}
            center={[PIE_CHART_WIDTH * 0.4, PIE_CHART_HEIGHT * 0.4]}
            avoidFalseZero={true}
          />
        </View>
        <View style={styles.legendContainer}>
          {stats.timeDistribution.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[
                styles.legendColor, 
                { 
                  backgroundColor: `rgba(${Colors[currentTheme].primary.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ')}, ${0.8 - (index * 0.2)})`
                }
              ]} />
              <Text style={[styles.legendText, { color: Colors[currentTheme].textLight }]}>
                {item.period}: {item.count}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

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
      style={[styles.container, { paddingTop: dimensions.height * 0.04 }]}
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
        <View style={styles.headerRight}>
          {/*<TouchableOpacity 
            style={[styles.filterButton, { backgroundColor: Colors[currentTheme].cardBackground }]} 
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="filter" size={24} color={Colors[currentTheme].textLight} />
          </TouchableOpacity>*/}
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
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* Filtros */}
        <View style={[styles.filterContainer, { backgroundColor: Colors[currentTheme].cardBackground }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['today', 'week', 'month', 'year', 'all'] as TimeFilter[]).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  timeFilter === filter && { backgroundColor: Colors[currentTheme].primary }
                ]}
                onPress={() => setTimeFilter(filter)}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: timeFilter === filter ? Colors[currentTheme].textLight : Colors[currentTheme].textLight }
                ]}>
                  {filter === 'today' ? 'Hoje' :
                   filter === 'week' ? 'Semana' :
                   filter === 'month' ? 'Mês' :
                   filter === 'year' ? 'Ano' : 'Todo'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Ranking de Usuários */}
        <View style={[styles.section, { backgroundColor: Colors[currentTheme].cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: Colors[currentTheme].textLight }]}>Ranking de Usuários</Text>
          <View style={styles.rankingContainer}>
            {stats.userRanking.map((user, index) => (
              <View key={user.userId} style={styles.rankingItem}>
                <View style={styles.rankingPosition}>
                  <Text style={[styles.rankingNumber, { color: Colors[currentTheme].primary }]}>
                    #{index + 1}
                  </Text>
                </View>
                <View style={styles.rankingInfo}>
                  <Text style={[styles.rankingName, { color: Colors[currentTheme].textLight }]}>
                    {user.userName}
                  </Text>
                  <Text style={[styles.rankingStats, { color: Colors[currentTheme].textLight }]}>
                    {user.totalCoffees} cafés
                  </Text>
                </View>
                <Text style={[styles.rankingLastCoffee, { color: Colors[currentTheme].textLight }]}>
                  {user.lastCoffee.toLocaleDateString('pt-BR')}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Atividades Suspeitas */}
        {stats.suspiciousActivities.length > 0 && (
          <View style={[styles.section, { backgroundColor: Colors[currentTheme].cardBackground }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: Colors[currentTheme].textLight }]}>
                Atividades Suspeitas
              </Text>
              <TouchableOpacity 
                onPress={() => setIsSuspiciousExpanded(!isSuspiciousExpanded)}
                style={styles.expandButton}
              >
                <Ionicons 
                  name={isSuspiciousExpanded ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color={Colors[currentTheme].textLight} 
                />
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={{ 
                maxHeight: isSuspiciousExpanded ? 'auto' : 500,
                height: 'auto'
              }}
              showsVerticalScrollIndicator={true}
              indicatorStyle={currentTheme === 'dark' ? 'white' : 'black'}
            >
              {stats.suspiciousActivities.map((activity, index) => (
                <View key={index} style={styles.suspiciousItem}>
                  <Ionicons name="warning" size={24} color={Colors[currentTheme].primary} />
                  <View style={styles.suspiciousInfo}>
                    <Text style={[styles.suspiciousUser, { color: Colors[currentTheme].textLight }]}>
                      {activity.userName}
                    </Text>
                    <Text style={[styles.suspiciousReason, { color: Colors[currentTheme].textLight }]}>
                      {activity.reason}
                    </Text>
                    <Text style={[styles.suspiciousTime, { color: Colors[currentTheme].textLight }]}>
                      {activity.date.toLocaleString('pt-BR')}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 1000 }}
        >
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: Colors[currentTheme].cardBackground }]}>
              <Ionicons name="cafe" size={24} color={Colors[currentTheme].primary} />
              <Text style={[styles.statValue, { color: Colors[currentTheme].primary }]}>{stats.today}</Text>
              <Text style={[styles.statLabel, { color: Colors[currentTheme].textLight }]}>
                Cafés Hoje {isGeneralView ? '(Geral)' : ''}
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: Colors[currentTheme].cardBackground }]}>
              <Ionicons name="flame" size={24} color={Colors[currentTheme].primary} />
              <Text style={[styles.statValue, { color: Colors[currentTheme].primary }]}>{stats.streak}</Text>
              <Text style={[styles.statLabel, { color: Colors[currentTheme].textLight }]}>
                Dias Consecutivos
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: Colors[currentTheme].cardBackground }]}>
              <Ionicons name="calendar" size={24} color={Colors[currentTheme].primary} />
              <Text style={[styles.statValue, { color: Colors[currentTheme].primary }]}>{stats.total}</Text>
              <Text style={[styles.statLabel, { color: Colors[currentTheme].textLight }]}>
                Cafés no Total
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: Colors[currentTheme].cardBackground }]}>
              <Ionicons name="time" size={24} color={Colors[currentTheme].primary} />
              <Text style={[styles.statValue, { color: Colors[currentTheme].primary }]}>{stats.mostCommonTime}</Text>
              <Text style={[styles.statLabel, { color: Colors[currentTheme].textLight }]}>
                Horário Médio
              </Text>
            </View>
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 1000, delay: 200 }}
        >
          <View style={[styles.section, { backgroundColor: Colors[currentTheme].cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: Colors[currentTheme].textLight }]}>Consumo Semanal</Text>
            <ScrollView 
              ref={scrollViewRef}
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chartScrollContainer}
              onLayout={centerCurrentDate}
            >
              {renderChart()}
            </ScrollView>
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 1000, delay: 400 }}
        >
          <View style={[styles.section, { backgroundColor: Colors[currentTheme].cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: Colors[currentTheme].textLight }]}>Distribuição por Período</Text>
            <View style={styles.pieChartContainer}>
              {renderPieChart()}
            </View>
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 1000, delay: 600 }}
        >
          <View style={[styles.section, { backgroundColor: Colors[currentTheme].cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: Colors[currentTheme].textLight }]}>Conquistas</Text>
            <View style={styles.achievementsContainer}>
              {stats.achievements.map((achievement, index) => (
                <View 
                  key={achievement.id} 
                  style={[
                    styles.achievementCard,
                    { 
                      backgroundColor: achievement.unlocked 
                        ? Colors[currentTheme].primary 
                        : Colors[currentTheme].cardBackground,
                      opacity: achievement.unlocked ? 1 : 0.5
                    }
                  ]}
                >
                  <Ionicons 
                    name={achievement.unlocked ? "trophy" : "trophy-outline"} 
                    size={24} 
                    color={achievement.unlocked ? Colors[currentTheme].textLight : Colors[currentTheme].textLight} 
                  />
                  <Text style={[styles.achievementTitle, { color: Colors[currentTheme].textLight }]}>
                    {achievement.title}
                  </Text>
                  <Text style={[styles.achievementDescription, { color: Colors[currentTheme].textLight }]}>
                    {achievement.description}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 1000, delay: 800 }}
        >
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
        </MotiView>
      </ScrollView>

      {/* Modal de Filtros */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors[currentTheme].cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Colors[currentTheme].textLight }]}>
                Filtros
              </Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={Colors[currentTheme].textLight} />
              </TouchableOpacity>
            </View>
            {/* Adicione mais opções de filtro aqui */}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    paddingHorizontal: 10,
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
  pieChartWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginTop: -20,
  },
  pieChartContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom:'10%',
    marginRight: '10%',
  },
  legendContainer: {
    flex: 1,
    paddingLeft: 20,
    justifyContent: 'center',
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
  },
  achievementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementCard: {
    width: '48%',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  achievementDescription: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    padding: 10,
    borderRadius: 30,
    marginRight: 10,
  },
  filterContainer: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipText: {
    fontSize: 14,
  },
  rankingContainer: {
    marginTop: 10,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  rankingPosition: {
    width: 40,
    alignItems: 'center',
  },
  rankingNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rankingInfo: {
    flex: 1,
    marginLeft: 10,
  },
  rankingName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rankingStats: {
    fontSize: 14,
  },
  rankingLastCoffee: {
    fontSize: 12,
  },
  suspiciousItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  suspiciousInfo: {
    marginLeft: 10,
    flex: 1,
  },
  suspiciousUser: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  suspiciousReason: {
    fontSize: 14,
    marginTop: 2,
  },
  suspiciousTime: {
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  expandButton: {
    padding: 5,
  },
}); 