import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type GoalOption = {
  label: string;
  value: string;
};

const goalOptions: GoalOption[] = [
  { label: 'Похудеть', value: 'weight_loss' },
  { label: 'Поддерживать вес', value: 'maintenance' },
  { label: 'Набрать массу', value: 'gain' },
];

type CompleteProfileScreenProps = {
  onSubmit?: (data: { name: string; goal: string; weight: number; targetWeight: number }) => void;
  loading?: boolean;
};

export const CompleteProfileScreen = ({ onSubmit, loading }: CompleteProfileScreenProps) => {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<GoalOption | null>(null);
  const [weight, setWeight] = useState('0.0');
  const [targetWeight, setTargetWeight] = useState('0.0');
  const [pickerVisible, setPickerVisible] = useState(false);

  const goalLabel = useMemo(() => goal?.label ?? 'Выберите цель', [goal]);

  const handleContinue = () => {
    if (!goal) {
      setPickerVisible(true);
      return;
    }

    const startWeight = Number(weight) || 0;
    const endWeight = Number(targetWeight) || 0;

    if (startWeight <= 0) {
      // Можно добавить Alert, но для простоты просто выходим
      return;
    }

    // Валидация конечного веса в зависимости от цели
    if (goal.value === 'weight_loss') {
      if (endWeight <= 0) {
        // Можно добавить Alert: "Укажите конечный вес для похудения"
        return;
      }
      if (endWeight >= startWeight) {
        // Можно добавить Alert: "Конечный вес должен быть меньше стартового"
        return;
      }
    }
    
    if (goal.value === 'gain') {
      if (endWeight <= 0) {
        // Можно добавить Alert: "Укажите конечный вес для набора массы"
        return;
      }
      if (endWeight <= startWeight) {
        // Можно добавить Alert: "Конечный вес должен быть больше стартового"
        return;
      }
    }

    // Для поддержания веса, если не указан конечный вес, используем стартовый
    const finalTargetWeight = goal.value === 'maintenance' && endWeight <= 0 
      ? startWeight 
      : endWeight || startWeight;

    onSubmit?.({
      name: name.trim(),
      goal: goal.value,
      weight: startWeight,
      targetWeight: finalTargetWeight,
    });
  };

  const renderGoalOption = (option: GoalOption) => (
    <Pressable
      key={option.value}
      style={styles.goalOption}
      onPress={() => {
        setGoal(option);
        setPickerVisible(false);
      }}
    >
      <Text style={styles.goalOptionText}>{option.label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Завершите регистрацию</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Имя</Text>
          <TextInput
            placeholder="Введите ваше имя"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
          <Text style={styles.helper}>Как к вам обращаться в приложении.</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Ваша цель</Text>
          <Pressable style={styles.select} onPress={() => setPickerVisible(true)}>
            <Text style={[styles.selectText, !goal && styles.selectPlaceholder]}>{goalLabel}</Text>
            <Text style={styles.selectChevron}>⌄</Text>
          </Pressable>
          <Text style={styles.helper}>Это поможет нам персонализировать вашу программу.</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Стартовый вес</Text>
          <View style={styles.weightRow}>
            <TextInput
              placeholder="0.0"
              keyboardType="decimal-pad"
              style={[styles.input, styles.weightInput]}
              value={weight}
              onChangeText={setWeight}
            />
            <Text style={styles.weightUnit}>кг</Text>
          </View>
          <Text style={styles.helper}>Укажите ваш текущий вес.</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Конечный вес</Text>
          <View style={styles.weightRow}>
            <TextInput
              placeholder="0.0"
              keyboardType="decimal-pad"
              style={[styles.input, styles.weightInput]}
              value={targetWeight}
              onChangeText={setTargetWeight}
            />
            <Text style={styles.weightUnit}>кг</Text>
          </View>
          <Text style={styles.helper}>
            {goal?.value === 'weight_loss'
              ? 'Укажите желаемый вес для похудения.'
              : goal?.value === 'gain'
              ? 'Укажите желаемый вес для набора массы.'
              : 'Укажите желаемый вес для поддержания.'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.9}
        >
          <Text style={styles.ctaText}>{loading ? 'Сохранение...' : 'Продолжить'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal transparent visible={pickerVisible} animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)}>
          <View style={styles.modalContent}>
            {goalOptions.map(renderGoalOption)}
          </View>
        </Pressable>
      </Modal>
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
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 24,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111',
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  helper: {
    color: '#6C6C6C',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  select: {
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 16,
    color: '#111',
  },
  selectPlaceholder: {
    color: '#A1A1A1',
  },
  selectChevron: {
    fontSize: 18,
    color: '#A1A1A1',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weightInput: {
    flex: 1,
  },
  weightUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A1A1A1',
  },
  ctaButton: {
    backgroundColor: '#6FF0FB',
    borderRadius: 14,
    paddingVertical: 16,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 8,
  },
  goalOption: {
    paddingVertical: 12,
  },
  goalOptionText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#111',
  },
});


