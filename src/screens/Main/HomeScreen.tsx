import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type HomeScreenProps = {
  onOpenDiary?: () => void;
  onOpenMenu?: () => void;
  onTabChange?: (tab: 'home' | 'courses' | 'diary' | 'progress' | 'profile') => void;
};

const motivationQuote = '"Здоровый образ жизни - это не цель, а путь, который стоит пройти."';

export const HomeScreen = ({ onOpenDiary, onOpenMenu, onTabChange }: HomeScreenProps) => {
  const handleTabPress = (tab: 'home' | 'courses' | 'diary' | 'progress' | 'profile') => {
    if (tab === 'diary') {
      onOpenDiary?.();
    } else {
      onTabChange?.(tab);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Ionicons name="scale-outline" size={20} color="#fff" />
          </View>
          <View style={styles.headerIcons}>
            <Ionicons name="notifications-outline" size={24} color="#111" />
            <Ionicons name="person-circle-outline" size={28} color="#111" />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ежедневный прогресс</Text>
          <Text style={styles.cardSubtitle}>Отслеживайте свои успехи каждый день.</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '75%' }]} />
          </View>
          <View style={styles.progressLegend}>
            <Text style={styles.progressText}>1.5 кг из 2 кг</Text>
            <Text style={styles.progressText}>Осталось: 0.5 кг</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.card, styles.menuCard]}
          onPress={onOpenMenu}
          activeOpacity={0.9}
        >
          <View style={styles.menuCardHeader}>
            <Ionicons name="restaurant-outline" size={24} color="#00C9D9" />
            <Text style={styles.cardTitle}>Меню дня</Text>
          </View>
          <Text style={styles.cardSubtitle}>Персонализированный план питания на сегодня</Text>
          <View style={styles.menuCardFooter}>
            <Text style={styles.menuCardArrow}>→</Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.card, styles.alertCard]}>
          <View style={styles.alertHeader}>
            <Ionicons name="book-outline" size={20} color="#D64550" />
            <Text style={styles.alertTitle}>Дневник не отправлен</Text>
          </View>
          <Text style={styles.alertText}>Отправьте его сейчас!</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={onOpenDiary}>
            <Text style={styles.primaryButtonText}>+ Отправить дневник</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, styles.lessonCard]}>
          <Text style={styles.lessonLabel}>Текущий урок</Text>
          <Text style={styles.lessonTitle}>Основы питания: Урок 3</Text>
          <Text style={styles.lessonDescription}>
            Узнайте о макронутриентах, их функциях и важности для вашего организма.
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '60%' }]} />
          </View>
          <Text style={styles.progressText}>60% завершено</Text>
        </View>

        <View style={styles.motivationBlock}>
          <Text style={styles.motivationLabel}>Мотивация дня</Text>
          <Text style={styles.motivationQuote}>{motivationQuote}</Text>
          <Text style={styles.motivationAuthor}>— Неизвестно</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Перейти к урокам</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => onTabChange?.('courses')}
          >
            <Text style={styles.secondaryButtonText}>Модули курса</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.tabBar}>
        {(['home', 'courses', 'diary', 'progress', 'profile'] as const).map((tab) => {
          const isActive = tab === 'home';
          const label =
            tab === 'home'
              ? 'Главная'
              : tab === 'courses'
              ? 'Курсы'
              : tab === 'diary'
              ? 'Дневник'
              : tab === 'progress'
              ? 'Прогресс'
              : 'Профиль';

          const iconName =
            tab === 'home'
              ? 'home'
              : tab === 'courses'
              ? 'book'
              : tab === 'diary'
              ? 'scale'
              : tab === 'progress'
              ? 'stats-chart'
              : 'person';

          return (
            <TouchableOpacity
              key={tab}
              style={styles.tabItem}
              activeOpacity={0.8}
              onPress={() => handleTabPress(tab)}
            >
              <Ionicons
                name={iconName as any}
                size={18}
                color={isActive ? '#00C9D9' : '#999'}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fefefe',
  },
  container: {
    padding: 24,
    paddingBottom: 120,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  cardSubtitle: {
    marginTop: 4,
    color: '#6C6C6C',
  },
  progressTrack: {
    marginTop: 12,
    height: 10,
    borderRadius: 6,
    backgroundColor: '#DDF9FD',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#6FF0FB',
  },
  progressLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressText: {
    color: '#6C6C6C',
    fontSize: 14,
  },
  menuCard: {
    backgroundColor: '#E9FBFF',
  },
  menuCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  menuCardFooter: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  menuCardArrow: {
    fontSize: 20,
    color: '#00C9D9',
    fontWeight: '600',
  },
  alertCard: {
    backgroundColor: '#fff5f5',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertTitle: {
    color: '#D64550',
    fontWeight: '700',
  },
  alertText: {
    marginTop: 4,
    color: '#D64550',
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: '#6FF0FB',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontWeight: '600',
    color: '#111',
  },
  lessonCard: {
    backgroundColor: '#E9FBFF',
  },
  lessonLabel: {
    fontSize: 14,
    color: '#17828A',
  },
  lessonTitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  lessonDescription: {
    marginTop: 4,
    color: '#17828A',
  },
  motivationBlock: {
    paddingVertical: 12,
  },
  motivationLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  motivationQuote: {
    marginTop: 8,
    fontStyle: 'italic',
    color: '#6C6C6C',
  },
  motivationAuthor: {
    marginTop: 4,
    color: '#A1A1A1',
  },
  actionButtons: {
    gap: 12,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderColor: '#F0F0F0',
  },
  tabItem: {
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: '#999',
  },
  tabLabelActive: {
    color: '#00C9D9',
    fontWeight: '600',
  },
});

