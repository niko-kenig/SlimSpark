import { Ionicons } from '@expo/vector-icons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabaseClient';

type DiaryEntryScreenProps = {
  userId: string | null;
  onBack?: () => void;
  onTabChange?: (tab: 'home' | 'courses' | 'diary' | 'progress' | 'profile') => void;
};

export const DiaryEntryScreen = ({ userId, onBack, onTabChange }: DiaryEntryScreenProps) => {
  const [note, setNote] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleTabPress = (tab: 'home' | 'courses' | 'diary' | 'progress' | 'profile') => {
    onTabChange?.(tab);
  };

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (asset.uri) {
        setPhotoUri(asset.uri);
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось выбрать фото');
    }
  };

  const handleSave = async () => {
    if (!userId) {
      Alert.alert('Ошибка', 'Нет активного пользователя. Войдите заново.');
      return;
    }

    try {
      setSaving(true);

      let photoUrl: string | null = null;

      if (photoUri) {
        const response = await fetch(photoUri);
        const blob = await response.blob();
        const ext = blob.type === 'image/png' ? 'png' : 'jpg';
        const filePath = `${userId}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('diary-photos')
          .upload(filePath, blob, { contentType: blob.type });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage.from('diary-photos').getPublicUrl(filePath);
        photoUrl = data.publicUrl;
      }

      const rawTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const baseTags = ['Обед', 'Углеводы'];
      const tags = Array.from(new Set([...baseTags, ...rawTags]));

      const { error: insertError } = await supabase.from('diary_entries').insert({
        user_id: userId,
        note,
        tags,
        photo_url: photoUrl,
      });

      if (insertError) {
        throw insertError;
      }

      Alert.alert('Готово', 'Запись дневника сохранена');
      setNote('');
      setTagsInput('');
      setPhotoUri(null);
      onBack?.();
    } catch (error) {
      Alert.alert(
        'Ошибка',
        error instanceof Error ? error.message : 'Не удалось сохранить запись дневника'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Добавить запись</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="share-social-outline" size={20} color="#111" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.photoCard} activeOpacity={0.9} onPress={handlePickImage}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={42} color="#A1A1A1" />
              <Text style={styles.photoTitle}>Добавить фото</Text>
              <Text style={styles.photoSubtitle}>Нажмите, чтобы загрузить</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.label}>Заметка</Text>
          <TextInput
            multiline
            style={styles.noteInput}
            placeholder="Опишите ваш прием пищи, ощущения или любые детали..."
            textAlignVertical="top"
            value={note}
            onChangeText={setNote}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Теги</Text>
          <View style={styles.tagsInputRow}>
            <TextInput
              style={styles.tagsInput}
              placeholder="Добавьте теги (например, завтрак, б +)"
              value={tagsInput}
              onChangeText={setTagsInput}
            />
            <Text style={styles.tagsPlus}>+</Text>
          </View>
          <View style={styles.selectedTagsRow}>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>Обед</Text>
              <Text style={styles.tagClose}>×</Text>
            </View>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>Углеводы</Text>
              <Text style={styles.tagClose}>×</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          activeOpacity={0.9}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#111" /> : <Text style={styles.saveButtonText}>Сохранить</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.telegramButton} activeOpacity={0.9}>
          <Text style={styles.telegramButtonText}>Отправить в Telegram</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.tabBar}>
        {(['home', 'courses', 'diary', 'progress', 'profile'] as const).map((tab) => {
          const isActive = tab === 'diary';
          const label =
            tab === 'home'
              ? 'Домой'
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
              <Ionicons name={iconName as any} size={18} color={isActive ? '#00C9D9' : '#999'} />
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
  photoCard: {
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 18,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    gap: 6,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  photoSubtitle: {
    fontSize: 14,
    color: '#9B9B9B',
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  noteInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    fontSize: 15,
  },
  tagsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
  },
  tagsInput: {
    flex: 1,
    fontSize: 15,
  },
  tagsPlus: {
    fontSize: 20,
    color: '#A1A1A1',
    marginLeft: 8,
  },
  selectedTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#6FF0FB',
    borderRadius: 999,
    gap: 4,
  },
  tagText: {
    fontSize: 14,
    color: '#111',
  },
  tagClose: {
    fontSize: 14,
    color: '#555',
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#6FF0FB',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  telegramButton: {
    marginTop: 8,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#6FF0FB',
  },
  telegramButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00B4C3',
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


