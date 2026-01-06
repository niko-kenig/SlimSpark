import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type LoginScreenProps = {
  onLogin?: (username: string, password: string) => Promise<void> | void;
  loading?: boolean;
  errorMessage?: string | null;
};

export const LoginScreen = ({ onLogin, loading, errorMessage }: LoginScreenProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = () => {
    // Очищаем предыдущие ошибки
    setLocalError(null);
    
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    // Валидация
    if (!trimmedUsername) {
      setLocalError('Введите email');
      return;
    }

    if (!validateEmail(trimmedUsername)) {
      setLocalError('Введите корректный email адрес');
      return;
    }

    if (!trimmedPassword) {
      setLocalError('Введите пароль');
      return;
    }

    if (trimmedPassword.length < 4) {
      setLocalError('Пароль должен содержать минимум 4 символа');
      return;
    }

    // Вызываем onLogin только если валидация прошла
    onLogin?.(trimmedUsername, trimmedPassword);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Добро пожаловать обратно</Text>
          <Text style={styles.subtitle}>Введите данные для входа</Text>
        </View>

        <View style={styles.inputs}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="Введите email"
            style={[styles.input, (errorMessage || localError) && styles.inputError]}
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              // Очищаем ошибку при вводе
              if (localError) setLocalError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <Text style={[styles.label, styles.passwordLabel]}>Password</Text>
          <TextInput
            placeholder="Введите пароль"
            secureTextEntry
            style={[styles.input, (errorMessage || localError) && styles.inputError]}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              // Очищаем ошибку при вводе
              if (localError) setLocalError(null);
            }}
            textContentType="password"
          />
        </View>

        {(errorMessage || localError) ? (
          <Text style={styles.error}>{errorMessage || localError}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.loginButton, (loading || !username.trim() || !password.trim()) && styles.loginButtonDisabled]}
          onPress={handleLogin}
          activeOpacity={0.9}
          disabled={loading || !username.trim() || !password.trim()}
        >
          <Text style={styles.loginText}>
            {loading ? 'Вход...' : 'Войти'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0d0d0d',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#4a4a4a',
  },
  inputs: {
    flexGrow: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a4a4a',
  },
  passwordLabel: {
    marginTop: 24,
  },
  input: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    backgroundColor: '#fafafa',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#D64550',
    backgroundColor: '#fff5f5',
  },
  loginButton: {
    backgroundColor: '#111111',
    paddingVertical: 16,
    borderRadius: 12,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  error: {
    color: '#D64550',
    marginBottom: 16,
    textAlign: 'center',
  },
});

