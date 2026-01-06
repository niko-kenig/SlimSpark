import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { CompleteProfileScreen } from './src/screens/Auth/CompleteProfileScreen';
import { LoginScreen } from './src/screens/Auth/LoginScreen';
import { RegistrationLoadingScreen } from './src/screens/Auth/RegistrationLoadingScreen';
import { CourseModulesScreen } from './src/screens/Main/CourseModulesScreen';
import { DailyMenuScreen } from './src/screens/Main/DailyMenuScreen';
import { DiaryEntryScreen } from './src/screens/Main/DiaryEntryScreen';
import { DiaryHistoryScreen } from './src/screens/Main/DiaryHistoryScreen';
import { BodyMeasurementsScreen } from './src/screens/Main/BodyMeasurementsScreen';
import { HomeScreen } from './src/screens/Main/HomeScreen';
import { MeasurementGraphScreen } from './src/screens/Main/MeasurementGraphScreen';
import { MySeriesScreen } from './src/screens/Main/MySeriesScreen';
import { ProfileScreen } from './src/screens/Main/ProfileScreen';
import { ProgressScreen } from './src/screens/Main/ProgressScreen';
import { RewardsScreen } from './src/screens/Main/RewardsScreen';
import { OnboardingScreen } from './src/screens/Main/OnboardingScreen';
import { supabase } from './src/lib/supabaseClient';
import { useUserStore } from './src/store/userStore';

export default function App() {
  // Zustand store для пользователя
  const {
    userId,
    userEmail,
    isAuthenticated,
    isLoading: authLoading,
    authError,
    profile,
    setUser,
    clearUser,
    setAuthError,
    setLoading,
    loadProfile,
    createProfile,
    updateProfile,
    setProfile,
  } = useUserStore();

  // Локальное состояние для навигации
  const [screen, setScreen] = useState<
    'onboarding' | 'login' | 'completeProfile' | 'registrationLoading' | 'home' | 'diaryEntry' | 'diaryHistory' | 'profile' | 'courses' | 'dailyMenu' | 'progress' | 'rewards' | 'mySeries' | 'bodyMeasurements' | 'measurementGraph'
  >('onboarding');
  const [editingDiaryEntryId, setEditingDiaryEntryId] = useState<string | null>(null);
  const [selectedMeasurementType, setSelectedMeasurementType] = useState<string>('weight');
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Проверка сессии при старте приложения
  const checkSession = useCallback(async () => {
    try {
      setIsCheckingSession(true);
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error checking session:', error);
        clearUser();
        setScreen('onboarding');
        setIsCheckingSession(false);
        return;
      }

      if (session) {
        // Пользователь авторизован - устанавливаем в store
        setUser(session.user.id, session.user.email || '');
        
        // Загружаем профиль
        await loadProfile();
        
        // Проверяем профиль после загрузки
        const currentProfile = useUserStore.getState().profile;
        if (currentProfile && currentProfile.name) {
          setScreen('home');
        } else {
          setScreen('completeProfile');
        }
      } else {
        // Нет сессии - очищаем store и показываем onboarding
        clearUser();
        setScreen('onboarding');
      }
    } catch (error) {
      console.error('Error in checkSession:', error);
      clearUser();
      setScreen('onboarding');
    } finally {
      setIsCheckingSession(false);
    }
  }, [setUser, loadProfile, clearUser]);

  // Проверка сессии при старте приложения
  useEffect(() => {
    let isMounted = true;
    let isCheckingInitialSession = true;
    
    // Сначала проверяем сессию при старте
    checkSession().then(() => {
      isCheckingInitialSession = false;
    }).catch((error) => {
      console.error('Error in initial checkSession:', error);
      if (isMounted) {
        clearUser();
        setScreen('onboarding');
        setIsCheckingSession(false);
        isCheckingInitialSession = false;
      }
    });

    // Подписываемся на изменения состояния авторизации
    // Игнорируем события во время начальной проверки сессии
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('onAuthStateChange event:', event, 'isMounted:', isMounted, 'isCheckingInitialSession:', isCheckingInitialSession);
      
      if (!isMounted) {
        console.log('Component not mounted, ignoring event');
        return;
      }
      
      // Игнорируем события во время начальной проверки
      if (isCheckingInitialSession && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
        console.log('Ignoring initial session event');
        return;
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('SIGNED_OUT event received, clearing user and redirecting to login');
        clearUser();
        setScreen('login');
        console.log('Screen set to login');
      } else if (event === 'SIGNED_IN' && session) {
        console.log('SIGNED_IN event received, setting user and loading profile');
        setUser(session.user.id, session.user.email || '');
        await loadProfile();
        const currentProfile = useUserStore.getState().profile;
        if (isMounted) {
          if (currentProfile && currentProfile.name) {
            setScreen('home');
          } else {
            setScreen('completeProfile');
          }
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [checkSession, clearUser, setUser, loadProfile]);

  const handleLogin = async (username: string, password: string) => {
    try {
      setAuthError(null);
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password,
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      if (data.session) {
        // Устанавливаем пользователя в store
        setUser(data.session.user.id, data.session.user.email ?? username);
        
        // Загружаем профиль
        await loadProfile();
        
        // Проверяем профиль после загрузки
        const currentProfile = useUserStore.getState().profile;
        if (currentProfile && currentProfile.name) {
          setScreen('home');
        } else {
          setScreen('completeProfile');
        }
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Неизвестная ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (payload: { name: string; goal: string; weight: number; targetWeight: number }) => {
    try {
      if (!userId) {
        Alert.alert('Ошибка', 'Пользователь не авторизован');
        return;
      }

      // Сохраняем профиль в БД через store
      try {
        // Проверяем, существует ли профиль
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (existingProfile) {
          // Обновляем существующий профиль
          await updateProfile({
            name: payload.name || null,
            goal: payload.goal as 'weight_loss' | 'maintenance' | 'gain' | null,
            initialWeight: payload.weight || null,
            targetWeight: payload.targetWeight || null,
          });
        } else {
          // Создаем новый профиль через store
          await createProfile({
            name: payload.name,
            goal: payload.goal as 'weight_loss' | 'maintenance' | 'gain',
            initialWeight: payload.weight,
            targetWeight: payload.targetWeight,
          });
        }

        // Сохраняем стартовый вес как первое измерение в Supabase
        if (payload.weight > 0) {
          try {
            const { error: measurementError } = await supabase
              .from('body_measurements')
              .insert({
                user_id: userId,
                measurement_type: 'weight',
                value: payload.weight,
                unit: 'кг',
              });

            if (measurementError) {
              console.error('Error saving initial weight measurement:', measurementError);
              // Не блокируем регистрацию, если не удалось сохранить измерение
            }
          } catch (measurementErr) {
            console.error('Error saving initial weight:', measurementErr);
            // Не блокируем регистрацию, если не удалось сохранить измерение
          }
        }

        setScreen('registrationLoading');
        
        // Резервный таймер на случай, если callback не сработает
        setTimeout(() => {
          setScreen((currentScreen) => {
            return currentScreen === 'registrationLoading' ? 'home' : currentScreen;
          });
        }, 2500);
      } catch (error) {
        console.error('Error saving profile:', error);
        Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось сохранить профиль');
      }
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось сохранить профиль');
      setScreen('home');
    }
  };

  const handleRegistrationComplete = useCallback(() => {
    // Переход на главный экран после завершения анимации
    setScreen('home');
  }, []);

  const handleBackFromMeasurementGraph = useCallback(() => {
    // Прямой синхронный вызов для немедленного переключения экрана
    setScreen('bodyMeasurements');
  }, []);

  // Показываем загрузку при проверке сессии
  if (isCheckingSession) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text>Загрузка...</Text>
      </View>
    );
  }

  // Fallback на главный экран, если screen не определен
  const currentScreen = screen || 'home';

  return (
    <View style={{ flex: 1 }}>
      {currentScreen === 'onboarding' ? (
        <OnboardingScreen onContinue={() => setScreen('login')} />
      ) : currentScreen === 'login' ? (
        <LoginScreen onLogin={handleLogin} loading={authLoading} errorMessage={authError} />
      ) : currentScreen === 'completeProfile' ? (
        <CompleteProfileScreen onSubmit={handleCompleteProfile} />
      ) : currentScreen === 'registrationLoading' ? (
        <RegistrationLoadingScreen onComplete={handleRegistrationComplete} />
      ) : currentScreen === 'home' ? (
        <HomeScreen
          userId={userId}
          initialWeight={profile?.initialWeight || null}
          targetWeight={profile?.targetWeight || null}
          goal={profile?.goal || null}
          onOpenDiary={() => setScreen('diaryHistory')}
          onOpenMenu={() => setScreen('dailyMenu')}
          onTabChange={(tab) => {
            if (tab === 'courses') setScreen('courses');
            if (tab === 'progress') setScreen('progress');
            if (tab === 'profile') setScreen('profile');
          }}
        />
      ) : currentScreen === 'dailyMenu' ? (
        <DailyMenuScreen onBack={() => setScreen('home')} />
      ) : currentScreen === 'progress' ? (
        <ProgressScreen
          userId={userId}
          currentScreen="progress"
          onOpenRewards={() => setScreen('rewards')}
          onOpenMySeries={() => setScreen('mySeries')}
          onOpenBodyMeasurements={() => setScreen('bodyMeasurements')}
          onOpenGraph={(measurementType) => {
            setSelectedMeasurementType(measurementType);
            setScreen('measurementGraph');
          }}
          onBack={() => setScreen('home')}
          onTabChange={(tab) => {
            if (tab === 'home') setScreen('home');
            if (tab === 'courses') setScreen('courses');
            if (tab === 'diary') setScreen('diaryEntry');
            if (tab === 'progress') setScreen('progress');
            if (tab === 'profile') setScreen('profile');
          }}
        />
      ) : currentScreen === 'bodyMeasurements' ? (
        <BodyMeasurementsScreen
          userId={userId}
          onBack={() => setScreen('progress')}
          onOpenGraph={(measurementType) => {
            setSelectedMeasurementType(measurementType);
            setScreen('measurementGraph');
          }}
          onTabChange={(tab) => {
            if (tab === 'home') setScreen('home');
            if (tab === 'courses') setScreen('courses');
            if (tab === 'diary') setScreen('diaryEntry');
            if (tab === 'progress') setScreen('progress');
            if (tab === 'profile') setScreen('profile');
          }}
        />
      ) : currentScreen === 'measurementGraph' ? (
        <MeasurementGraphScreen
          userId={userId}
          measurementType={selectedMeasurementType as any}
          currentScreen="progress"
          onBack={handleBackFromMeasurementGraph}
          onOpenBodyMeasurements={() => setScreen('bodyMeasurements')}
          onTabChange={(tab) => {
            if (tab === 'home') setScreen('home');
            if (tab === 'courses') setScreen('courses');
            if (tab === 'diary') setScreen('diaryHistory');
            if (tab === 'progress') setScreen('progress');
            if (tab === 'profile') setScreen('profile');
          }}
        />
      ) : currentScreen === 'mySeries' ? (
        <MySeriesScreen
          currentScreen="progress"
          onBack={() => setScreen('progress')}
          onTabChange={(tab) => {
            if (tab === 'home') setScreen('home');
            if (tab === 'courses') setScreen('courses');
            if (tab === 'diary') setScreen('diaryEntry');
            if (tab === 'progress') setScreen('progress');
            if (tab === 'profile') setScreen('profile');
          }}
        />
      ) : currentScreen === 'rewards' ? (
        <RewardsScreen
          currentScreen="progress"
          onBack={() => setScreen('progress')}
          onTabChange={(tab) => {
            if (tab === 'home') setScreen('home');
            if (tab === 'courses') setScreen('courses');
            if (tab === 'diary') setScreen('diaryEntry');
            if (tab === 'progress') setScreen('progress');
            if (tab === 'profile') setScreen('profile');
          }}
        />
      ) : currentScreen === 'courses' ? (
        <CourseModulesScreen
          currentScreen="courses"
          onBack={() => setScreen('home')}
          onTabChange={(tab) => {
            if (tab === 'home') setScreen('home');
            if (tab === 'courses') setScreen('courses');
            if (tab === 'diary') setScreen('diaryEntry');
            if (tab === 'progress') setScreen('progress');
            if (tab === 'profile') setScreen('profile');
          }}
        />
      ) : currentScreen === 'diaryHistory' ? (
        <DiaryHistoryScreen
          userId={userId}
          currentScreen="diary"
          onBack={() => setScreen('home')}
          onEditEntry={(entryId) => {
            setEditingDiaryEntryId(entryId);
            setScreen('diaryEntry');
          }}
          onAddEntry={() => {
            setEditingDiaryEntryId(null);
            setScreen('diaryEntry');
          }}
          onTabChange={(tab) => {
            if (tab === 'home') setScreen('home');
            if (tab === 'courses') setScreen('courses');
            if (tab === 'diary') setScreen('diaryHistory');
            if (tab === 'progress') setScreen('progress');
            if (tab === 'profile') setScreen('profile');
          }}
        />
      ) : currentScreen === 'diaryEntry' ? (
        <DiaryEntryScreen
          userId={userId}
          entryId={editingDiaryEntryId}
          currentScreen="diary"
          onBack={() => {
            setEditingDiaryEntryId(null);
            setScreen('home');
          }}
          onOpenHistory={() => {
            setEditingDiaryEntryId(null);
            setScreen('diaryHistory');
          }}
          onTabChange={(tab) => {
            if (tab === 'home') setScreen('home');
            if (tab === 'courses') setScreen('courses');
            if (tab === 'diary') setScreen('diaryHistory');
            if (tab === 'progress') setScreen('progress');
            if (tab === 'profile') setScreen('profile');
          }}
        />
      ) : (
        <ProfileScreen
          userId={userId}
          email={userEmail}
          name={profile?.name || null}
          goal={profile?.goal || null}
          weight={profile?.initialWeight || null}
          currentScreen="profile"
          onBack={() => setScreen('home')}
          onTabChange={(tab) => {
            if (tab === 'home') setScreen('home');
            if (tab === 'courses') setScreen('courses');
            if (tab === 'diary') setScreen('diaryEntry');
            if (tab === 'progress') setScreen('progress');
            if (tab === 'profile') setScreen('profile');
          }}
        />
      )}
      <StatusBar style="dark" />
    </View>
  );
}
