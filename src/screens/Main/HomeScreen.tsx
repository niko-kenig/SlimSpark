import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { useUserStore } from '../../store/userStore';
import { getQuoteOfTheDay } from '../../services/quoteService';
import { TabBar } from '../../components/TabBar';
import { SkeletonCard } from '../../components/SkeletonLoader';

type HomeScreenProps = {
  userId?: string | null;
  initialWeight?: number | null;
  targetWeight?: number | null;
  goal?: string | null;
  currentScreen?: 'home' | 'courses' | 'diary' | 'progress' | 'profile';
  onOpenDiary?: () => void;
  onOpenMenu?: () => void;
  onTabChange?: (tab: 'home' | 'courses' | 'diary' | 'progress' | 'profile') => void;
};

// Дефолтная цитата (будет заменена на реальную из API)

export const HomeScreen = ({
  userId: userIdProp,
  initialWeight: initialWeightProp,
  targetWeight: targetWeightProp,
  goal: goalProp,
  currentScreen = 'home',
  onOpenDiary,
  onOpenMenu,
  onTabChange,
}: HomeScreenProps) => {
  // Используем store, если пропсы не переданы
  const { userId: userIdFromStore, profile } = useUserStore();
  const userId = userIdProp || userIdFromStore;
  const initialWeight = initialWeightProp ?? profile?.initialWeight ?? null;
  const targetWeight = targetWeightProp ?? profile?.targetWeight ?? null;
  const goal = goalProp || profile?.goal || null;
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ percent: 0, remaining: 0 });
  const [hasDiaryEntryToday, setHasDiaryEntryToday] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<{
    title: string;
    description: string;
    progress: number;
  } | null>(null);
  const [loadingDiary, setLoadingDiary] = useState(true);
  const [loadingLesson, setLoadingLesson] = useState(true);
  const [motivationQuote, setMotivationQuote] = useState({
    text: 'Здоровый образ жизни - это не цель, а путь, который стоит пройти.',
    author: 'Неизвестно',
  });
  const [loadingQuote, setLoadingQuote] = useState(true);

  useEffect(() => {
    if (userId) {
      loadCurrentWeight();
      checkDiaryEntryToday();
      loadCurrentLesson();
    }
    loadMotivationQuote();
  }, [userId]);

  const loadCurrentWeight = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Получаем последнее измерение веса
      const { data, error } = await supabase
        .from('body_measurements')
        .select('value')
        .eq('user_id', userId)
        .eq('measurement_type', 'weight')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading weight:', error);
      }

      if (data) {
        setCurrentWeight(Number(data.value));
      } else if (initialWeight) {
        // Если нет измерений, используем начальный вес
        setCurrentWeight(initialWeight);
      }
    } catch (error) {
      console.error('Error loading current weight:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateProgress();
  }, [currentWeight, initialWeight, targetWeight, goal]);

  // Проверка дневника на сегодня
  const checkDiaryEntryToday = async () => {
    if (!userId) {
      setLoadingDiary(false);
      return;
    }

    try {
      setLoadingDiary(true);
      
      // Получаем начало и конец сегодняшнего дня
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('diary_entries')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking diary entry:', error);
      }

      setHasDiaryEntryToday(!!data);
    } catch (error) {
      console.error('Error checking diary entry:', error);
      setHasDiaryEntryToday(false);
    } finally {
      setLoadingDiary(false);
    }
  };

  // Загрузка текущего урока из course_progress
  const loadCurrentLesson = async () => {
    if (!userId) {
      setLoadingLesson(false);
      return;
    }

    try {
      setLoadingLesson(true);

      // Получаем последний урок в прогрессе (не завершенный)
      const { data: progressData, error: progressError } = await supabase
        .from('course_progress')
        .select(`
          lesson_id,
          progress_percent,
          lessons (
            id,
            title,
            content,
            module_id,
            course_modules (
              course_id,
              courses (
                title
              )
            )
          )
        `)
        .eq('user_id', userId)
        .eq('completed', false)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (progressError && progressError.code !== 'PGRST116') {
        console.error('Error loading current lesson:', progressError);
      }

      if (progressData && progressData.lessons) {
        const lesson = progressData.lessons as any;
        const module = lesson.course_modules as any;
        const course = module?.courses as any;
        
        setCurrentLesson({
          title: lesson.title || 'Урок',
          description: lesson.content 
            ? (lesson.content.substring(0, 100) + (lesson.content.length > 100 ? '...' : ''))
            : 'Продолжайте изучение курса',
          progress: progressData.progress_percent || 0,
        });
      } else {
        // Если нет урока в прогрессе, пытаемся найти первый незавершенный урок
        const { data: firstLesson, error: firstLessonError } = await supabase
          .from('lessons')
          .select(`
            id,
            title,
            content,
            course_modules (
              courses (
                title
              )
            )
          `)
          .order('order_index', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!firstLessonError && firstLesson) {
          setCurrentLesson({
            title: firstLesson.title || 'Начните обучение',
            description: firstLesson.content 
              ? (firstLesson.content.substring(0, 100) + (firstLesson.content.length > 100 ? '...' : ''))
              : 'Начните изучение курса',
            progress: 0,
          });
        } else {
          setCurrentLesson(null);
        }
      }
    } catch (error) {
      console.error('Error loading current lesson:', error);
      setCurrentLesson(null);
    } finally {
      setLoadingLesson(false);
    }
  };

  // Загрузка мотивационной цитаты дня
  const loadMotivationQuote = async () => {
    try {
      setLoadingQuote(true);
      const quote = await getQuoteOfTheDay('ru');
      setMotivationQuote(quote);
    } catch (error) {
      console.error('Error loading quote:', error);
      // Оставляем дефолтную цитату при ошибке
    } finally {
      setLoadingQuote(false);
    }
  };

  const calculateProgress = () => {
    if (!initialWeight || !currentWeight || !targetWeight) {
      // Если нет данных, показываем 0%
      setProgress({ percent: 0, remaining: 0 });
      return;
    }

    const finalTargetWeight = targetWeight;
    let remaining = 0;
    let percent = 0;

    if (goal === 'weight_loss') {
      // Для похудения: прогресс от стартового до конечного веса
      const totalToLose = initialWeight - finalTargetWeight; // Общая цель
      const lost = initialWeight - currentWeight; // Уже потеряно
      remaining = Math.max(0, currentWeight - finalTargetWeight); // Осталось до цели
      
      if (totalToLose > 0) {
        percent = Math.min(100, Math.max(0, (lost / totalToLose) * 100));
      } else {
        percent = 0;
      }
    } else if (goal === 'gain') {
      // Для набора массы: прогресс от стартового до конечного веса
      const totalToGain = finalTargetWeight - initialWeight; // Общая цель
      const gained = currentWeight - initialWeight; // Уже набрано
      remaining = Math.max(0, finalTargetWeight - currentWeight); // Осталось до цели
      
      if (totalToGain > 0) {
        percent = Math.min(100, Math.max(0, (gained / totalToGain) * 100));
      } else {
        percent = 0;
      }
    } else {
      // Для поддержания веса: показываем прогресс относительно целевого веса
      remaining = Math.abs(currentWeight - finalTargetWeight);
      const diff = remaining;
      
      if (diff <= 0.5) {
        percent = 100;
        remaining = 0;
      } else {
        const maxDeviation = Math.max(Math.abs(initialWeight - finalTargetWeight), 5);
        percent = Math.max(0, 100 - (diff / maxDeviation) * 100);
      }
    }

    setProgress({
      percent: Math.round(percent),
      remaining: Math.abs(remaining),
    });
  };
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
          {loading ? (
            <SkeletonCard />
          ) : (
            <>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, Math.max(0, progress.percent))}%` },
                  ]}
                />
              </View>
              <View style={styles.progressLegend}>
                <Text style={styles.progressText}>
                  {loading || !targetWeight
                    ? 'Загрузка...'
                    : `Осталось: ${progress.remaining.toFixed(1)} кг`}
                </Text>
              </View>
            </>
          )}
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

        {loadingDiary ? (
          <SkeletonCard />
        ) : hasDiaryEntryToday ? (
          <View style={[styles.card, styles.successCard]}>
            <View style={styles.alertHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.successTitle}>Дневник отправлен</Text>
            </View>
            <Text style={styles.successText}>Отлично! Вы уже отправили дневник сегодня.</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={onOpenDiary}>
              <Text style={styles.secondaryButtonText}>Посмотреть дневник</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
        )}

        {loadingLesson ? (
          <SkeletonCard />
        ) : currentLesson ? (
          <View style={[styles.card, styles.lessonCard]}>
            <Text style={styles.lessonLabel}>Текущий урок</Text>
            <Text style={styles.lessonTitle}>{currentLesson.title}</Text>
            <Text style={styles.lessonDescription}>{currentLesson.description}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${currentLesson.progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{currentLesson.progress}% завершено</Text>
          </View>
        ) : (
          <View style={[styles.card, styles.lessonCard]}>
            <Text style={styles.lessonLabel}>Текущий урок</Text>
            <Text style={styles.lessonTitle}>Нет активных уроков</Text>
            <Text style={styles.lessonDescription}>Начните изучение курса, чтобы увидеть прогресс</Text>
            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={() => onTabChange?.('courses')}
            >
              <Text style={styles.secondaryButtonText}>Перейти к курсам</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.motivationBlock}>
          <Text style={styles.motivationLabel}>Мотивация дня</Text>
          {loadingQuote ? (
            <View style={styles.quoteLoading}>
              <ActivityIndicator size="small" color="#6C6C6C" />
            </View>
          ) : (
            <>
              <Text style={styles.motivationQuote}>"{motivationQuote.text}"</Text>
              <Text style={styles.motivationAuthor}>— {motivationQuote.author}</Text>
            </>
          )}
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

      <TabBar currentScreen={currentScreen} onTabChange={handleTabPress} />
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
    // @ts-ignore - boxShadow для веб, shadow* для нативных платформ
    boxShadow: '0px 4px 10px 0px rgba(0, 0, 0, 0.05)',
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
  successCard: {
    backgroundColor: '#f0fdf4',
  },
  successTitle: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  successText: {
    marginTop: 4,
    color: '#4CAF50',
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
  quoteLoading: {
    marginTop: 8,
    paddingVertical: 20,
    alignItems: 'center',
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
});

