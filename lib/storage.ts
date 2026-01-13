import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ActiveGoal {
  text: string;
  moodId: string;
  variantId: string;
  bgMode: 'procedural' | 'image';
  backgroundImage: string | null;
  timestamp: number;
}

const STORAGE_KEY = '@quiet_goals_active';

export const saveActiveGoal = async (goal: ActiveGoal) => {
  try {
    const jsonValue = JSON.stringify(goal);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error('Failed to save active goal', e);
  }
};

export const getActiveGoal = async (): Promise<ActiveGoal | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error('Failed to fetch active goal', e);
    return null;
  }
};
