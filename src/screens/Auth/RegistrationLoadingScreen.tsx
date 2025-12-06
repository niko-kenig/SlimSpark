import { useEffect, useRef } from 'react';
import { Animated, SafeAreaView, StyleSheet, Text, View } from 'react-native';

type RegistrationLoadingScreenProps = {
  onComplete?: () => void;
};

export const RegistrationLoadingScreen = ({ onComplete }: RegistrationLoadingScreenProps) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  // Обновляем ref при изменении callback
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Предотвращаем множественные вызовы
    if (hasCompletedRef.current) return;

    const animation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    });

    // Запускаем анимацию
    animation.start();

    // Гарантированно вызываем callback после завершения анимации
    const handleComplete = () => {
      if (!hasCompletedRef.current && onCompleteRef.current) {
        hasCompletedRef.current = true;
        // Небольшая задержка для завершения анимации, затем вызываем callback
        setTimeout(() => {
          onCompleteRef.current?.();
        }, 100);
      }
    };

    // Таймер - вызываем после завершения анимации (2000ms + небольшая задержка)
    const timer = setTimeout(() => {
      handleComplete();
    }, 2100);

    return () => {
      animation.stop();
      clearTimeout(timer);
    };
  }, [progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Завершение регистрации…</Text>
        <Text style={styles.subtitle}>Готовим ваш персонализированный путь к цели.</Text>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6C6C6C',
    textAlign: 'center',
  },
  progressTrack: {
    width: '80%',
    height: 10,
    borderRadius: 6,
    backgroundColor: '#DDF9FD',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6FF0FB',
    borderRadius: 6,
  },
});

