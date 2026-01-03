import { Ionicons } from '@expo/vector-icons';
import { Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type OnboardingScreenProps = {
  onContinue: () => void;
};

export const OnboardingScreen = ({ onContinue }: OnboardingScreenProps) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Ionicons name="scale-outline" size={32} color="#fff" />
        </View>

        <Image
          source={{ uri: 'https://i.imgur.com/N8h7pYx.png' }}
          style={styles.hero}
          resizeMode="contain"
        />

        <Text style={styles.title}>Начните свой путь к здоровью и сбалансированному образу жизни</Text>
      </View>

      <TouchableOpacity style={styles.ctaButton} onPress={onContinue} activeOpacity={0.9}>
        <Text style={styles.ctaText}>Продолжить</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  hero: {
    width: '100%',
    height: 250,
    marginBottom: 32,
  },
  title: {
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  ctaButton: {
    backgroundColor: '#6FF0FB',
    paddingVertical: 16,
    borderRadius: 12,
  },
  ctaText: {
    textAlign: 'center',
    color: '#0D0D0D',
    fontSize: 18,
    fontWeight: '600',
  },
});


