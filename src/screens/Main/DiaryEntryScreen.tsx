import { Ionicons } from '@expo/vector-icons';
import { launchImageLibrary } from 'react-native-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
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
import { TabBar } from '../../components/TabBar';

type DiaryEntryScreenProps = {
  userId: string | null;
  entryId?: string | null; // Для редактирования существующей записи
  currentScreen?: 'home' | 'courses' | 'diary' | 'progress' | 'profile';
  onBack?: () => void;
  onOpenHistory?: () => void;
  onTabChange?: (tab: 'home' | 'courses' | 'diary' | 'progress' | 'profile') => void;
};

export const DiaryEntryScreen = ({
  userId,
  entryId = null,
  currentScreen = 'diary',
  onBack,
  onOpenHistory,
  onTabChange,
}: DiaryEntryScreenProps) => {
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Загрузка существующей записи для редактирования
  useEffect(() => {
    if (entryId && userId) {
      loadEntry();
    }
  }, [entryId, userId]);

  const loadEntry = async () => {
    if (!entryId || !userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('id', entryId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setNote(data.note || '');
        setTags(data.tags || []);
        setExistingPhotoUrl(data.photo_url);
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error loading entry:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить запись');
    } finally {
      setLoading(false);
    }
  };

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
        // Компрессия изображения перед загрузкой
        try {
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 800 } }], // Максимальная ширина 800px
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );
          setPhotoUri(manipulatedImage.uri);
          setExistingPhotoUrl(null); // Очищаем старую фотографию при выборе новой
        } catch (error) {
          console.error('Error compressing image:', error);
          // Если компрессия не удалась, используем оригинал
          setPhotoUri(asset.uri);
        }
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось выбрать фото');
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagsInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagsInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputSubmit = () => {
    handleAddTag();
  };

  const validateEntry = (): boolean => {
    if (!note.trim() && tags.length === 0 && !photoUri && !existingPhotoUrl) {
      Alert.alert('Внимание', 'Добавьте хотя бы заметку, тег или фото');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!userId) {
      Alert.alert('Ошибка', 'Нет активного пользователя. Войдите заново.');
      return;
    }

    // Валидация перед сохранением
    if (!validateEntry()) {
      return;
    }

    try {
      setSaving(true);

      let photoUrl: string | null = existingPhotoUrl;

      // Загружаем новое фото, если оно было выбрано
      if (photoUri) {
        try {
          const response = await fetch(photoUri);
          if (!response.ok) {
            throw new Error('Не удалось загрузить изображение');
          }
          
          const blob = await response.blob();
          
          // Определяем расширение файла
          const mimeType = blob.type || 'image/jpeg';
          let ext = 'jpg';
          if (mimeType.includes('png')) {
            ext = 'png';
          } else if (mimeType.includes('gif')) {
            ext = 'gif';
          } else if (mimeType.includes('webp')) {
            ext = 'webp';
          }
          
          const filePath = `${userId}/${Date.now()}.${ext}`;

          // Удаляем старое фото, если редактируем запись
          if (isEditing && existingPhotoUrl) {
            try {
              // Извлекаем путь к файлу из URL
              const urlParts = existingPhotoUrl.split('/');
              const fileName = urlParts[urlParts.length - 1];
              if (fileName) {
                await supabase.storage.from('diary-photos').remove([`${userId}/${fileName}`]);
              }
            } catch (removeError) {
              console.warn('Error removing old photo:', removeError);
              // Продолжаем, даже если не удалось удалить старое фото
            }
          }

          // Определяем правильный content type
          const contentType = mimeType || `image/${ext === 'png' ? 'png' : ext === 'gif' ? 'gif' : 'jpeg'}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('diary-photos')
            .upload(filePath, blob, { 
              contentType: contentType, 
              upsert: true,
              cacheControl: '3600',
            });

          if (uploadError) {
            console.error('Upload error details:', uploadError);
            
            // Более понятное сообщение об ошибке
            if (uploadError.message?.includes('Bucket not found') || uploadError.statusCode === 400) {
              throw new Error(
                'Bucket "diary-photos" не найден. Пожалуйста, создайте bucket в Supabase Dashboard → Storage. ' +
                'См. инструкцию: docs/DIARY_PHOTOS_STORAGE_SETUP.md'
              );
            }
            
            throw new Error(uploadError.message || 'Ошибка загрузки фото');
          }

          const { data: urlData } = supabase.storage.from('diary-photos').getPublicUrl(filePath);
          photoUrl = urlData.publicUrl;
        } catch (photoError) {
          console.error('Error processing photo:', photoError);
          throw photoError;
        }
      }

      if (isEditing && entryId) {
        // Обновляем существующую запись
        const { error: updateError } = await supabase
          .from('diary_entries')
          .update({
            note: note.trim() || null,
            tags,
            photo_url: photoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', entryId)
          .eq('user_id', userId);

        if (updateError) {
          throw updateError;
        }

        Alert.alert('Готово', 'Запись дневника обновлена');
      } else {
        // Создаем новую запись
        const { error: insertError } = await supabase.from('diary_entries').insert({
          user_id: userId,
          note: note.trim() || null,
          tags,
          photo_url: photoUrl,
        });

        if (insertError) {
          throw insertError;
        }

        Alert.alert('Готово', 'Запись дневника сохранена');
      }

      // Очищаем форму
      setNote('');
      setTags([]);
      setTagsInput('');
      setPhotoUri(null);
      setExistingPhotoUrl(null);
      setIsEditing(false);
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
        <Text style={styles.headerTitle}>{isEditing ? 'Редактировать запись' : 'Добавить запись'}</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={onOpenHistory} hitSlop={8}>
          <Ionicons name="time-outline" size={20} color="#111" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00C9D9" />
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.photoCard} activeOpacity={0.9} onPress={handlePickImage}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
              ) : existingPhotoUrl ? (
                <Image source={{ uri: existingPhotoUrl }} style={styles.photoPreview} resizeMode="cover" />
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
                  placeholder="Добавьте тег и нажмите Enter"
                  value={tagsInput}
                  onChangeText={setTagsInput}
                  onSubmitEditing={handleTagInputSubmit}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={handleAddTag} style={styles.addTagButton}>
                  <Ionicons name="add-circle" size={24} color="#00C9D9" />
                </TouchableOpacity>
              </View>
              {tags.length > 0 && (
                <View style={styles.selectedTagsRow}>
                  {tags.map((tag, index) => (
                    <View key={index} style={styles.tagChip}>
                      <Text style={styles.tagText}>{tag}</Text>
                      <TouchableOpacity onPress={() => handleRemoveTag(tag)} hitSlop={8}>
                        <Text style={styles.tagClose}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

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
  loadingContainer: {
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagButton: {
    padding: 4,
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
});


