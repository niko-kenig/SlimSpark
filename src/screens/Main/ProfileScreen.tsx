import { Ionicons } from '@expo/vector-icons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabaseClient';
import { useUserStore } from '../../store/userStore';
import { NotificationService } from '../../services/notificationService';
import { TabBar } from '../../components/TabBar';
import { SkeletonCard } from '../../components/SkeletonLoader';

type ProfileScreenProps = {
  userId?: string | null;
  email?: string | null;
  name?: string | null;
  goal?: string | null;
  weight?: number | null;
  currentScreen?: 'home' | 'courses' | 'diary' | 'progress' | 'profile';
  onBack?: () => void;
  onTabChange?: (tab: 'home' | 'courses' | 'diary' | 'progress' | 'profile') => void;
};

export const ProfileScreen = ({
  userId: userIdProp,
  email: emailProp,
  name: nameProp,
  goal: goalProp,
  weight: weightProp,
  currentScreen = 'profile',
  onBack,
  onTabChange,
}: ProfileScreenProps) => {
  // Используем store вместо пропсов
  const { userId, userEmail, profile, loadProfile, clearUser, updateProfile } = useUserStore();
  
  // Используем данные из store, если они есть, иначе из пропсов (для обратной совместимости)
  const currentUserId = userId || userIdProp;
  const currentEmail = userEmail || emailProp;
  const currentName = profile?.name || nameProp;
  const currentGoal = profile?.goal || goalProp;
  const currentWeight = profile?.initialWeight || weightProp;
  const currentTargetWeight = profile?.targetWeight || null;
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [sendDiaryEnabled, setSendDiaryEnabled] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Настройки уведомлений
  const [reminderTime, setReminderTime] = useState<Date>(new Date());
  const [reminderFrequency, setReminderFrequency] = useState<'daily' | 'weekly'>('daily');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  
  // Редактирование профиля
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGoal, setEditGoal] = useState<'weight_loss' | 'maintenance' | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editTargetWeight, setEditTargetWeight] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Загружаем профиль из store при открытии экрана
  useEffect(() => {
    if (userId && !profile) {
      loadProfile();
    }
  }, [userId, profile, loadProfile]);

  // Загружаем настройки уведомлений при открытии экрана
  useEffect(() => {
    if (currentUserId) {
      loadNotificationSettings();
    }
  }, [currentUserId]);

  const loadNotificationSettings = async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', currentUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading notification settings:', error);
        return;
      }

      if (data) {
        // Устанавливаем время напоминания
        if (data.reminder_time) {
          const [hours, minutes] = data.reminder_time.split(':');
          const time = new Date();
          time.setHours(parseInt(hours, 10));
          time.setMinutes(parseInt(minutes, 10));
          setReminderTime(time);
        }

        // Устанавливаем частоту
        if (data.reminder_frequency) {
          setReminderFrequency(data.reminder_frequency as 'daily' | 'weekly');
        }

        // Устанавливаем переключатели
        setNotificationsEnabled(data.notifications_enabled ?? true);
        setSendDiaryEnabled(data.send_diary_enabled ?? false);

        // Планируем уведомления после загрузки настроек
        if (data.notifications_enabled && data.reminder_time) {
          await NotificationService.loadAndScheduleNotifications(currentUserId);
        }
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveNotificationSettings = async () => {
    if (!currentUserId) return;

    try {
      setLoadingSettings(true);

      const timeString = `${reminderTime.getHours().toString().padStart(2, '0')}:${reminderTime.getMinutes().toString().padStart(2, '0')}:00`;

      const settingsData = {
        user_id: currentUserId,
        reminder_time: timeString,
        reminder_frequency: reminderFrequency,
        notifications_enabled: notificationsEnabled,
        send_diary_enabled: sendDiaryEnabled,
      };

      // Проверяем, существует ли запись
      const { data: existing } = await supabase
        .from('notification_settings')
        .select('id')
        .eq('user_id', currentUserId)
        .single();

      let error;
      if (existing) {
        // Обновляем существующую запись
        const { error: updateError } = await supabase
          .from('notification_settings')
          .update(settingsData)
          .eq('user_id', currentUserId);
        error = updateError;
      } else {
        // Создаем новую запись
        const { error: insertError } = await supabase
          .from('notification_settings')
          .insert(settingsData);
        error = insertError;
      }

      if (error) {
        console.error('Error saving notification settings:', error);
        Alert.alert('Ошибка', 'Не удалось сохранить настройки уведомлений');
      } else {
        console.log('Notification settings saved successfully');
        // Планируем уведомления после сохранения настроек
        if (currentUserId) {
          await NotificationService.loadAndScheduleNotifications(currentUserId);
        }
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить настройки уведомлений');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (selectedTime) {
      setReminderTime(selectedTime);
      // Автоматически сохраняем при изменении времени
      setTimeout(() => {
        saveNotificationSettings();
      }, 100);
    }
  };

  const handleFrequencyChange = (frequency: 'daily' | 'weekly') => {
    setReminderFrequency(frequency);
    setShowFrequencyPicker(false);
    // Автоматически сохраняем при изменении частоты
    setTimeout(() => {
      saveNotificationSettings();
    }, 100);
  };

  const handleNotificationsToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    // Автоматически сохраняем при изменении
    setTimeout(() => {
      saveNotificationSettings();
    }, 100);
  };

  const handleSendDiaryToggle = (value: boolean) => {
    setSendDiaryEnabled(value);
    // Автоматически сохраняем при изменении
    setTimeout(() => {
      saveNotificationSettings();
    }, 100);
  };

  const handleEditProfile = () => {
    // Заполняем форму текущими значениями
    setEditName(currentName || '');
    // Убираем 'gain' из возможных значений цели
    const goal = currentGoal === 'gain' ? null : (currentGoal || null);
    setEditGoal(goal);
    setEditWeight(currentWeight ? currentWeight.toString() : '');
    setEditTargetWeight(currentTargetWeight ? currentTargetWeight.toString() : '');
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!profile) {
      Alert.alert('Ошибка', 'Профиль не загружен');
      return;
    }

    try {
      setSavingProfile(true);

      // Валидация
      if (!editName.trim()) {
        Alert.alert('Ошибка', 'Введите имя');
        setSavingProfile(false);
        return;
      }

      const weightValue = editWeight.trim() ? parseFloat(editWeight) : null;
      if (editWeight.trim() && (isNaN(weightValue!) || weightValue! <= 0)) {
        Alert.alert('Ошибка', 'Введите корректный вес');
        setSavingProfile(false);
        return;
      }

      const targetWeightValue = editTargetWeight.trim() ? parseFloat(editTargetWeight) : null;
      if (editTargetWeight.trim() && (isNaN(targetWeightValue!) || targetWeightValue! <= 0)) {
        Alert.alert('Ошибка', 'Введите корректный желаемый вес');
        setSavingProfile(false);
        return;
      }

      // Сохраняем через store
      await updateProfile({
        name: editName.trim(),
        goal: editGoal,
        initialWeight: weightValue,
        targetWeight: targetWeightValue,
      });

      setIsEditingProfile(false);
      Alert.alert('Успешно', 'Профиль обновлен');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить профиль');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditName('');
    setEditGoal(null);
    setEditWeight('');
    setEditTargetWeight('');
  };

  // Загружаем существующий аватар при открытии профиля
  useEffect(() => {
    const loadAvatar = async () => {
      if (!currentUserId) return;

      try {
        // Пробуем загрузить аватар с разными расширениями
        const extensions = ['jpg', 'jpeg', 'png'];
        for (const ext of extensions) {
          const filePath = `${currentUserId}/avatar.${ext}`;
          const { data } = supabase.storage.from('avatar').getPublicUrl(filePath);
          
          // Проверяем, существует ли файл (простая проверка через fetch)
          try {
            const response = await fetch(data.publicUrl, { method: 'HEAD' });
            // 200-299 - файл существует, 400/404 - файла нет (это нормально)
            if (response.ok && response.status >= 200 && response.status < 300) {
              setAvatarUri(data.publicUrl);
              return;
            }
            // Игнорируем ошибки 400/404 - это нормально, если файла нет
          } catch (fetchError: any) {
            // Игнорируем ошибки сети или 400/404 - это нормально, если файла нет
            if (fetchError?.status !== 400 && fetchError?.status !== 404) {
              // Логируем только неожиданные ошибки
              console.debug('Avatar check error (ignored):', fetchError);
            }
            // Продолжаем поиск
          }
        }
      } catch (error) {
        // Не логируем ошибки загрузки аватара - это не критично
        console.debug('Avatar loading skipped:', error);
      }
    };

    loadAvatar();
  }, [currentUserId]);

  const handleTabPress = (tab: 'home' | 'courses' | 'diary' | 'progress' | 'profile') => {
    onTabChange?.(tab);
  };

  const handleLogout = () => {
    console.log('handleLogout called - showing confirmation, Platform.OS:', Platform.OS);
    
    // Для веб используем window.confirm, для нативных - Alert
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      const confirmed = window.confirm('Вы уверены, что хотите выйти?');
      if (confirmed) {
        console.log('Logout confirmed (web), performing logout...');
        performLogout();
      } else {
        console.log('Logout cancelled (web)');
      }
      return;
    }
    
    // Для нативных платформ используем Alert
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { 
          text: 'Отмена', 
          style: 'cancel',
          onPress: () => console.log('Logout cancelled')
        },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            console.log('Logout confirmed, performing logout...');
            await performLogout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const performLogout = async () => {
    try {
      console.log('Performing logout...');
      
      // Выходим из Supabase
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.error('Error signing out:', signOutError);
        Alert.alert('Ошибка', 'Не удалось выйти из системы');
        return;
      }
      
      console.log('Signed out from Supabase, clearing store...');
      
      // Очищаем store
      clearUser();
      
      console.log('Store cleared, waiting for onAuthStateChange to handle navigation...');
      
      // НЕ вызываем onBack() - перенаправление будет обработано автоматически
      // через onAuthStateChange в App.tsx, который установит screen в 'login'
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Ошибка', 'Не удалось выйти из системы');
    }
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
      if (!asset.uri || !currentUserId) {
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
        const filePath = `${currentUserId}/avatar.${fileExtension}`;

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
          <Text style={styles.profileName}>{currentName && currentName.length > 0 ? currentName : 'Имя Пользователя'}</Text>
          <Text style={styles.profileEmail}>{currentEmail && currentEmail.length > 0 ? currentEmail : 'user@example.com'}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Напоминания</Text>
            <TouchableOpacity
              onPress={async () => {
                try {
                  await NotificationService.sendTestNotification();
                  Alert.alert('Успешно', 'Тестовое уведомление будет отправлено через 2 секунды');
                } catch (error) {
                  Alert.alert('Ошибка', 'Не удалось отправить тестовое уведомление. Проверьте разрешения.');
                }
              }}
              style={styles.testButton}
            >
              <Text style={styles.testButtonText}>Тест</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.rowBetween}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.row}>
              <Ionicons name="notifications-outline" size={18} color="#555" />
              <Text style={styles.rowLabel}>Время напоминаний</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowValue}>
                {reminderTime.toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#999" style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rowBetween, styles.rowTopMargin]}
            onPress={() => setShowFrequencyPicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.row}>
              <Ionicons name="refresh-outline" size={18} color="#555" />
              <Text style={styles.rowLabel}>Частота</Text>
            </View>
            <View style={styles.frequencyBox}>
              <Text style={styles.frequencyText}>
                {reminderFrequency === 'daily' ? 'Ежедневно' : 'Еженедельно'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#999" />
            </View>
          </TouchableOpacity>
        </View>

        {/* TimePicker для Android и iOS */}
        {showTimePicker && (
          <>
            {Platform.OS === 'ios' && (
              <Modal
                visible={showTimePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowTimePicker(false)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowTimePicker(false)}
                >
                  <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                    <View style={styles.timePickerHeader}>
                      <TouchableOpacity
                        onPress={() => setShowTimePicker(false)}
                        style={styles.timePickerCancel}
                      >
                        <Text style={styles.modalCancelText}>Отмена</Text>
                      </TouchableOpacity>
                      <Text style={styles.modalTitle}>Выберите время</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setShowTimePicker(false);
                          saveNotificationSettings();
                        }}
                        style={styles.timePickerDone}
                      >
                        <Text style={styles.timePickerDoneText}>Готово</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={reminderTime}
                      mode="time"
                      is24Hour={true}
                      display="spinner"
                      onChange={(event, selectedTime) => {
                        if (selectedTime) {
                          setReminderTime(selectedTime);
                        }
                      }}
                      style={styles.timePickerIOS}
                    />
                  </View>
                </TouchableOpacity>
              </Modal>
            )}
            {Platform.OS === 'android' && (
              <DateTimePicker
                value={reminderTime}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={handleTimeChange}
              />
            )}
          </>
        )}

        {/* Модальное окно для выбора частоты */}
        <Modal
          visible={showFrequencyPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowFrequencyPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowFrequencyPicker(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Выберите частоту</Text>
              <TouchableOpacity
                style={[
                  styles.frequencyOption,
                  reminderFrequency === 'daily' && styles.frequencyOptionActive,
                ]}
                onPress={() => handleFrequencyChange('daily')}
              >
                <Text
                  style={[
                    styles.frequencyOptionText,
                    reminderFrequency === 'daily' && styles.frequencyOptionTextActive,
                  ]}
                >
                  Ежедневно
                </Text>
                {reminderFrequency === 'daily' && (
                  <Ionicons name="checkmark" size={20} color="#00C9D9" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.frequencyOption,
                  reminderFrequency === 'weekly' && styles.frequencyOptionActive,
                ]}
                onPress={() => handleFrequencyChange('weekly')}
              >
                <Text
                  style={[
                    styles.frequencyOptionText,
                    reminderFrequency === 'weekly' && styles.frequencyOptionTextActive,
                  ]}
                >
                  Еженедельно
                </Text>
                {reminderFrequency === 'weekly' && (
                  <Ionicons name="checkmark" size={20} color="#00C9D9" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowFrequencyPicker(false)}
              >
                <Text style={styles.modalCancelText}>Отмена</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

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
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: '#E4E4E4', true: '#6FF0FB' }}
              thumbColor="#fff"
              disabled={loadingSettings}
            />
          </View>
          <View style={[styles.rowBetween, styles.rowTopMargin]}>
            <Text style={styles.rowLabel}>Отправлять дневник</Text>
            <Switch
              value={sendDiaryEnabled}
              onValueChange={handleSendDiaryToggle}
              trackColor={{ false: '#E4E4E4', true: '#6FF0FB' }}
              thumbColor="#fff"
              disabled={loadingSettings}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Ваш профиль</Text>
            {!isEditingProfile && (
              <TouchableOpacity
                onPress={handleEditProfile}
                style={styles.editButton}
              >
                <Ionicons name="create-outline" size={18} color="#00C9D9" />
                <Text style={styles.editButtonText}>Редактировать</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {!isEditingProfile ? (
            // Режим просмотра
            <>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Имя</Text>
                <Text style={styles.profileValue}>{currentName && currentName.length > 0 ? currentName : '—'}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Цель</Text>
                <Text style={styles.profileValue}>
                  {currentGoal === 'weight_loss'
                    ? 'Снижение веса'
                    : currentGoal === 'maintenance'
                    ? 'Поддержание веса'
                    : '—'}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Вес</Text>
                <Text style={styles.profileValue}>
                  {typeof currentWeight === 'number' ? `${currentWeight} кг` : '—'}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Желаемый вес</Text>
                <Text style={styles.profileValue}>
                  {typeof currentTargetWeight === 'number' ? `${currentTargetWeight} кг` : '—'}
                </Text>
              </View>
            </>
          ) : (
            // Режим редактирования
            <View style={styles.editForm}>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Имя *</Text>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Введите имя"
                  autoCapitalize="words"
                />
              </View>
              
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Цель</Text>
                <View style={styles.goalButtons}>
                  <TouchableOpacity
                    style={[
                      styles.goalButton,
                      editGoal === 'weight_loss' && styles.goalButtonActive,
                    ]}
                    onPress={() => setEditGoal('weight_loss')}
                  >
                    <Text
                      style={[
                        styles.goalButtonText,
                        editGoal === 'weight_loss' && styles.goalButtonTextActive,
                      ]}
                    >
                      Снижение веса
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.goalButton,
                      editGoal === 'maintenance' && styles.goalButtonActive,
                    ]}
                    onPress={() => setEditGoal('maintenance')}
                  >
                    <Text
                      style={[
                        styles.goalButtonText,
                        editGoal === 'maintenance' && styles.goalButtonTextActive,
                      ]}
                    >
                      Поддержание
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Вес (кг)</Text>
                <TextInput
                  style={styles.editInput}
                  value={editWeight}
                  onChangeText={setEditWeight}
                  placeholder="Введите вес"
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Желаемый вес (кг)</Text>
                <TextInput
                  style={styles.editInput}
                  value={editTargetWeight}
                  onChangeText={setEditTargetWeight}
                  placeholder="Введите желаемый вес"
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.editActionButton, styles.cancelButton]}
                  onPress={handleCancelEdit}
                  disabled={savingProfile}
                >
                  <Text style={styles.cancelButtonText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editActionButton, styles.saveButton]}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Сохранить</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
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

        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.9} onPress={handleLogout}>
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>
      </ScrollView>

      <TabBar currentScreen={currentScreen} onTabChange={handleTabPress} />
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
  timePickerIOS: {
    backgroundColor: '#fff',
    height: 200,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  timePickerCancel: {
    padding: 8,
  },
  timePickerDone: {
    padding: 8,
  },
  timePickerDoneText: {
    fontSize: 16,
    color: '#00C9D9',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
    textAlign: 'center',
  },
  frequencyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  frequencyOptionActive: {
    backgroundColor: '#E9FBFF',
    borderWidth: 1,
    borderColor: '#00C9D9',
  },
  frequencyOptionText: {
    fontSize: 16,
    color: '#555',
  },
  frequencyOptionTextActive: {
    color: '#00C9D9',
    fontWeight: '600',
  },
  modalCancelButton: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#999',
  },
  testButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E9FBFF',
    borderRadius: 12,
  },
  testButtonText: {
    fontSize: 12,
    color: '#00C9D9',
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E9FBFF',
    borderRadius: 12,
  },
  editButtonText: {
    fontSize: 12,
    color: '#00C9D9',
    fontWeight: '600',
  },
  editForm: {
    gap: 16,
    marginTop: 8,
  },
  editField: {
    gap: 8,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    fontSize: 16,
    color: '#111',
  },
  goalButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  goalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    backgroundColor: '#FAFAFA',
  },
  goalButtonActive: {
    backgroundColor: '#E9FBFF',
    borderColor: '#00C9D9',
  },
  goalButtonText: {
    fontSize: 14,
    color: '#555',
  },
  goalButtonTextActive: {
    color: '#00C9D9',
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  saveButton: {
    backgroundColor: '#00C9D9',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});


