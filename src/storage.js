import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'medialert.medicines';

/** Reads the saved medicines. Returns an empty list when nothing is saved. */
export async function loadMedicines() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

/** Writes the list of medicines to the device storage. */
export async function saveMedicines(medicines) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
  } catch (error) {
    // Saving can fail when storage is full. The app keeps working in memory.
  }
}
