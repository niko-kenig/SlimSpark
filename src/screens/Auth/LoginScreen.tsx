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

  const handleLogin = () => {
    onLogin?.(username.trim(), password);
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
          <Text style={styles.label}>Username</Text>
          <TextInput
            placeholder="Введите имя пользователя"
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.label, styles.passwordLabel]}>Password</Text>
          <TextInput
            placeholder="Введите пароль"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          activeOpacity={0.9}
          disabled={loading}
        >
          <Text style={styles.loginText}>{loading ? 'Logging in...' : 'Log in'}</Text>
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

