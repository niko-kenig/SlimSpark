import { Ionicons } from '@expo/vector-icons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

  // Загружаем существующий аватар при открытии профиля
  useEffect(() => {
    const loadAvatar = async () => {
      if (!userId) return;

      try {
        // Пробуем загрузить аватар с разными расширениями
        const extensions = ['jpg', 'jpeg', 'png'];
        for (const ext of extensions) {
          const filePath = `${userId}/avatar.${ext}`;
          const { data } = supabase.storage.from('avatar').getPublicUrl(filePath);
          
          // Проверяем, существует ли файл (простая проверка через fetch)
          try {
            const response = await fetch(data.publicUrl, { method: 'HEAD' });
            if (response.ok) {
              setAvatarUri(data.publicUrl);
              return;
            }
          } catch {
            // Продолжаем поиск
          }
        }
      } catch (error) {
        console.error('Error loading avatar:', error);
        // Не показываем ошибку пользователю, просто не загружаем аватар
      }
    };

    loadAvatar();
  }, [userId]);

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
        if (asset.uri) {
          setAvatarUri(asset.uri);
        }
        return;
      }

      // Сначала показываем локальное фото для мгновенной обратной связи
      setAvatarUri(asset.uri);
      setUploading(true);
      
      try {
        let blob: Blob;
        let fileExtension: string;
        
        // Проверяем, является ли URI data URI
        if (asset.uri.startsWith('data:')) {
          // Обрабатываем data URI
          const base64Data = asset.uri.split(',')[1];
          const mimeType = asset.uri.split(';')[0].split(':')[1] || 'image/jpeg';
          
          // Определяем расширение из MIME type
          if (mimeType.includes('png')) {
            fileExtension = 'png';
          } else if (mimeType.includes('gif')) {
            fileExtension = 'gif';
          } else if (mimeType.includes('webp')) {
            fileExtension = 'webp';
          } else {
            fileExtension = 'jpg'; // По умолчанию jpg
          }
          
          // Конвертируем base64 в blob
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          blob = new Blob([byteArray], { type: mimeType });
        } else {
          // Обычный файловый URI
          const response = await fetch(asset.uri);
          if (!response.ok) {
            throw new Error('Не удалось загрузить изображение');
          }
          
          blob = await response.blob();
          
          // Определяем расширение из MIME type blob или из asset.type
          const mimeType = blob.type || asset.type || 'image/jpeg';
          if (mimeType.includes('png')) {
            fileExtension = 'png';
          } else if (mimeType.includes('gif')) {
            fileExtension = 'gif';
          } else if (mimeType.includes('webp')) {
            fileExtension = 'webp';
          } else {
            // Пробуем определить из URI
            const uriParts = asset.uri.split('.');
            fileExtension = uriParts.length > 1 
              ? uriParts[uriParts.length - 1].toLowerCase().split('?')[0].replace(/[^a-z0-9]/g, '') || 'jpg'
              : 'jpg';
          }
        }
        
        // Формируем правильное имя файла с использованием userId
        const filePath = `${userId}/avatar.${fileExtension}`;

        console.log('Uploading to:', filePath, 'Content type:', blob.type, 'Extension:', fileExtension);

        // Загружаем в bucket "avatar"
        const contentType = blob.type || `image/${fileExtension === 'png' ? 'png' : fileExtension === 'gif' ? 'gif' : 'jpeg'}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatar')
          .upload(filePath, blob, { 
            upsert: true, 
            contentType: contentType,
            cacheControl: '3600',
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(uploadError.message || 'Ошибка загрузки файла в Supabase');
        }

        console.log('Upload successful:', uploadData);

        // Пробуем получить публичный URL
        const { data: urlData, error: urlError } = supabase.storage
          .from('avatar')
          .getPublicUrl(filePath);
        
        if (urlError) {
          console.error('URL error:', urlError);
          // Если публичный URL не работает, пробуем signed URL
          const { data: signedData, error: signedError } = await supabase.storage
            .from('avatar')
            .createSignedUrl(filePath, 3600);
          
          if (signedError) {
            console.error('Signed URL error:', signedError);
            throw new Error('Не удалось получить URL файла');
          }
          
          if (signedData?.signedUrl) {
            setAvatarUri(signedData.signedUrl);
          } else {
            throw new Error('Не удалось получить подписанный URL');
          }
        } else if (urlData?.publicUrl) {
          // Добавляем timestamp к URL для обновления кеша
          const urlWithTimestamp = `${urlData.publicUrl}?t=${Date.now()}`;
          console.log('Using public URL:', urlWithTimestamp);
          setAvatarUri(urlWithTimestamp);
        } else {
          throw new Error('Не удалось получить URL загруженного файла');
        }
      } catch (uploadError) {
        console.error('Upload process error:', uploadError);
        // Оставляем локальное фото, если загрузка не удалась
        Alert.alert(
          'Ошибка загрузки',
          uploadError instanceof Error 
            ? uploadError.message 
            : 'Не удалось загрузить фото профиля в Supabase. Локальное фото будет сохранено.'
        );
        // Локальное фото уже установлено выше
      } finally {
        setUploading(false);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert(
        'Ошибка',
        error instanceof Error ? error.message : 'Не удалось выбрать фото'
      );
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
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handlePickAvatar}
            disabled={uploading}
            activeOpacity={uploading ? 1 : 0.7}
          >
            {avatarUri ? (
              <View style={styles.avatarImageContainer}>
                <Image 
                  source={{ uri: avatarUri }} 
                  style={styles.avatarImage}
                  onError={(error) => {
                    console.error('Image load error:', error);
                    // Если изображение не загружается, показываем placeholder
                  }}
                />
                {uploading && (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
              </View>
            ) : (
              <>
                <View style={styles.avatarPlaceholderCircle}>
                  {uploading ? (
                    <ActivityIndicator size="large" color="#fff" />
                  ) : (
                    <Ionicons name="person" size={36} color="#fff" />
                  )}
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
  avatarImageContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
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


