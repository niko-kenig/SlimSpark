import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { CompleteProfileScreen } from './src/screens/Auth/CompleteProfileScreen';
import { LoginScreen } from './src/screens/Auth/LoginScreen';
import { RegistrationLoadingScreen } from './src/screens/Auth/RegistrationLoadingScreen';
import { CourseModulesScreen } from './src/screens/Main/CourseModulesScreen';
import { DailyMenuScreen } from './src/screens/Main/DailyMenuScreen';
import { DiaryEntryScreen } from './src/screens/Main/DiaryEntryScreen';
import { HomeScreen } from './src/screens/Main/HomeScreen';
import { ProfileScreen } from './src/screens/Main/ProfileScreen';
import { OnboardingScreen } from './src/screens/Main/OnboardingScreen';
import { supabase } from './src/lib/supabaseClient';

export default function App() {
  const [screen, setScreen] = useState<
    'onboarding' | 'login' | 'completeProfile' | 'registrationLoading' | 'home' | 'diaryEntry' | 'profile' | 'courses' | 'dailyMenu'
  >('onboarding');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileGoal, setProfileGoal] = useState<string | null>(null);
  const [profileWeight, setProfileWeight] = useState<number | null>(null);

  const handleLogin = async (username: string, password: string) => {
    try {
      setAuthError(null);
      setAuthLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password,
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      if (data.session) {
        setUserId(data.session.user.id);
        setUserEmail(data.session.user.email ?? username);
        setScreen('completeProfile');
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Неизвестная ошибка входа');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCompleteProfile = async (payload: { name: string; goal: string; weight: number }) => {
    try {
      setProfileName(payload.name || null);
      setProfileGoal(payload.goal || null);
      setProfileWeight(payload.weight || null);
      setScreen('registrationLoading');
      
      // Резервный таймер на случай, если callback не сработает
      // Этот таймер гарантирует переход через 2.5 секунды
      setTimeout(() => {
        setScreen((currentScreen) => {
          // Переходим на home только если мы все еще на registrationLoading
          return currentScreen === 'registrationLoading' ? 'home' : currentScreen;
        });
      }, 2500);
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось сохранить профиль');
      setScreen('home');
    }
  };

  const handleRegistrationComplete = useCallback(() => {
    // Переход на главный экран после завершения анимации
    setScreen('home');
  }, []);

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
          onOpenDiary={() => setScreen('diaryEntry')}
          onOpenMenu={() => setScreen('dailyMenu')}
          onTabChange={(tab) => {
            if (tab === 'courses') setScreen('courses');
            if (tab === 'profile') setScreen('profile');
          }}
        />
      ) : currentScreen === 'dailyMenu' ? (
        <DailyMenuScreen onBack={() => setScreen('home')} />
      ) : currentScreen === 'courses' ? (
        <CourseModulesScreen
          onBack={() => setScreen('home')}
          onTabChange={(tab) => {
            if (tab === 'home') setScreen('home');
            if (tab === 'courses') setScreen('courses');
            if (tab === 'diary') setScreen('diaryEntry');
            if (tab === 'profile') setScreen('profile');
          }}
        />
      ) : currentScreen === 'diaryEntry' ? (
        <DiaryEntryScreen
          userId={userId}
          onBack={() => setScreen('home')}
          onTabChange={(tab) => {
            if (tab === 'home') setScreen('home');
            if (tab === 'courses') setScreen('courses');
            if (tab === 'diary') setScreen('diaryEntry');
            if (tab === 'profile') setScreen('profile');
          }}
        />
      ) : (
        <ProfileScreen
          userId={userId}
          email={userEmail}
          name={profileName}
          goal={profileGoal}
          weight={profileWeight}
          onBack={() => setScreen('home')}
          onTabChange={(tab) => {
            if (tab === 'home') setScreen('home');
            if (tab === 'courses') setScreen('courses');
            if (tab === 'diary') setScreen('diaryEntry');
            if (tab === 'profile') setScreen('profile');
          }}
        />
      )}
      <StatusBar style="dark" />
    </View>
  );
}
