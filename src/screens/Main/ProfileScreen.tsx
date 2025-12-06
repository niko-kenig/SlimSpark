import { Ionicons } from '@expo/vector-icons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabaseClient';

type ProfileScreenProps = {
  userId: string | null;
  email?: string | null;
  name?: string | null;
  goal?: string | null;
  weight?: number | null;
  onBack?: () => void;
  onTabChange?: (tab: 'home' | 'courses' | 'diary' | 'progress' | 'profile') => void;
};

export const ProfileScreen = ({
  userId,
  email,
  name,
  goal,
  weight,
  onBack,
  onTabChange,
}: ProfileScreenProps) => {
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [sendDiaryEnabled, setSendDiaryEnabled] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleTabPress = (tab: 'home' | 'courses' | 'diary' | 'progress' | 'profile') => {
    onTabChange?.(tab);
  };

  const handlePickAvatar = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri || !userId) {
        setAvatarUri(asset.uri ?? null);
        return;
      }

      setUploading(true);
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const ext = blob.type === 'image/png' ? 'png' : 'jpg';
      const filePath = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType: blob.type });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUri(data.publicUrl);
    } catch (error) {
      Alert.alert(
        'Ошибка',
        error instanceof Error ? error.message : 'Не удалось загрузить фото профиля'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Настройки и Профиль</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="share-social-outline" size={20} color="#111" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAvatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <>
                <View style={styles.avatarPlaceholderCircle}>
                  <Ionicons name="person" size={36} color="#fff" />
                </View>
                <Text style={styles.avatarUploadText}>
                  {uploading ? 'Загрузка...' : 'Загрузить фото'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.profileName}>{name && name.length > 0 ? name : 'Имя Пользователя'}</Text>
          <Text style={styles.profileEmail}>{email && email.length > 0 ? email : 'user@example.com'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Напоминания</Text>
          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <Ionicons name="notifications-outline" size={18} color="#555" />
              <Text style={styles.rowLabel}>Время напоминаний</Text>
            </View>
            <Text style={styles.rowValue}>09:00</Text>
          </View>
          <View style={[styles.rowBetween, styles.rowTopMargin]}>
            <View style={styles.row}>
              <Ionicons name="refresh-outline" size={18} color="#555" />
              <Text style={styles.rowLabel}>Частота</Text>
            </View>
            <View style={styles.frequencyBox}>
              <Text style={styles.frequencyText}>Ежедневно</Text>
              <Ionicons name="chevron-down" size={16} color="#999" />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Интеграция с MessageSquareShare</Text>
          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <Ionicons name="link-outline" size={18} color="#555" />
              <Text style={styles.rowLabel}>Статус подключения</Text>
            </View>
            <Text style={styles.rowValue}>Подключено</Text>
          </View>
          <View style={[styles.rowBetween, styles.rowTopMargin]}>
            <Text style={styles.rowLabel}>Получать уведомления</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E4E4E4', true: '#6FF0FB' }}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.rowBetween, styles.rowTopMargin]}>
            <Text style={styles.rowLabel}>Отправлять дневник</Text>
            <Switch
              value={sendDiaryEnabled}
              onValueChange={setSendDiaryEnabled}
              trackColor={{ false: '#E4E4E4', true: '#6FF0FB' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ваш профиль</Text>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Имя</Text>
            <Text style={styles.profileValue}>{name && name.length > 0 ? name : '—'}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Цель</Text>
            <Text style={styles.profileValue}>
              {goal === 'weight_loss'
                ? 'Снижение веса'
                : goal === 'maintenance'
                ? 'Поддержание веса'
                : goal === 'gain'
                ? 'Набор массы'
                : '—'}
            </Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Вес</Text>
            <Text style={styles.profileValue}>
              {typeof weight === 'number' ? `${weight} кг` : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="settings-outline" size={18} color="#555" />
            <Text style={styles.rowLabel}>Настройки аккаунта</Text>
          </View>
          <View style={[styles.row, styles.rowTopMargin]}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#555" />
            <Text style={styles.rowLabel}>Политика конфиденциальности</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.9}>
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.tabBar}>
        {(['home', 'courses', 'diary', 'progress', 'profile'] as const).map((tab) => {
          const isActive = tab === 'profile';
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  headerIcon: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 120,
    gap: 16,
  },
  profileHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarPlaceholderCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarUploadText: {
    marginTop: 6,
    color: '#00B4C3',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  profileEmail: {
    color: '#777',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F2F2F2',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTopMargin: {
    marginTop: 10,
  },
  rowLabel: {
    fontSize: 14,
    color: '#555',
  },
  rowValue: {
    fontSize: 14,
    color: '#888',
  },
  frequencyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E4',
  },
  frequencyText: {
    marginRight: 4,
    color: '#555',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  profileLabel: {
    color: '#555',
  },
  profileValue: {
    color: '#111',
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 8,
    backgroundColor: '#FF5C5C',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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


