import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { CompleteProfileScreen } from './src/screens/Auth/CompleteProfileScreen';
import { LoginScreen } from './src/screens/Auth/LoginScreen';
import { RegistrationLoadingScreen } from './src/screens/Auth/RegistrationLoadingScreen';
import { DiaryEntryScreen } from './src/screens/Main/DiaryEntryScreen';
import { HomeScreen } from './src/screens/Main/HomeScreen';
import { ProfileScreen } from './src/screens/Main/ProfileScreen';
import { OnboardingScreen } from './src/screens/Main/OnboardingScreen';
import { supabase } from './src/lib/supabaseClient';

export default function App() {
  const [screen, setScreen] = useState<
    'onboarding' | 'login' | 'completeProfile' | 'registrationLoading' | 'home' | 'diaryEntry' | 'profile'
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
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setScreen('home');
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось сохранить профиль');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {screen === 'onboarding' ? (
        <OnboardingScreen onContinue={() => setScreen('login')} />
      ) : screen === 'login' ? (
        <LoginScreen onLogin={handleLogin} loading={authLoading} errorMessage={authError} />
      ) : screen === 'completeProfile' ? (
        <CompleteProfileScreen onSubmit={handleCompleteProfile} />
      ) : screen === 'registrationLoading' ? (
        <RegistrationLoadingScreen />
      ) : screen === 'home' ? (
        <HomeScreen
          onOpenDiary={() => setScreen('diaryEntry')}
          onTabChange={(tab) => {
            if (tab === 'profile') setScreen('profile');
          }}
        />
      ) : screen === 'diaryEntry' ? (
        <DiaryEntryScreen
          userId={userId}
          onBack={() => setScreen('home')}
          onTabChange={(tab) => {
            if (tab === 'home') setScreen('home');
            if (tab === 'diary') setScreen('diaryEntry');
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
            if (tab === 'profile') setScreen('profile');
          }}
        />
      )}
      <StatusBar style="dark" />
    </View>
  );
}
