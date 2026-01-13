import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions, 
  Platform, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  SafeAreaView
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useFonts } from 'expo-font';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from "react-native-view-shot";
import { StatusBar } from 'expo-status-bar';
import * as WallpaperManager from 'expo-wallpaper-manager';

import { MOODS, getMood } from './lib/moods';
import { VARIANTS, getVariant } from './lib/variants';
import { generateSvg } from './lib/svg';
import { fetchMoodImage } from './lib/images';
import { ActiveGoal, saveActiveGoal, getActiveGoal } from './lib/storage';

export default function App() {
  const [fontsLoaded] = useFonts({
    'Oswald-Bold': require('./assets/fonts/Oswald-Bold.ttf'),
    'PlayfairDisplay-Regular': require('./assets/fonts/PlayfairDisplay-Regular.ttf'),
    'Roboto-Regular': require('./assets/fonts/Roboto-Regular.ttf'),
  });

  // App State
  const [view, setView] = useState<'home' | 'create'>('create');
  const [activeGoal, setActiveGoal] = useState<ActiveGoal | null>(null);

  // Creator State
  const [text, setText] = useState('Quiet Goals');
  const [moodId, setMoodId] = useState('calm');
  const [variantId, setVariantId] = useState('center-soft');
  const [bgMode, setBgMode] = useState<'procedural' | 'image'>('procedural');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [svgXml, setSvgXml] = useState('');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [loadingImage, setLoadingImage] = useState(false);

  const viewShotRef = useRef<any>(null);
  const { width, height } = Dimensions.get('window');

  // Load active goal on startup
  useEffect(() => {
    const loadGoal = async () => {
      const goal = await getActiveGoal();
      if (goal) {
        setActiveGoal(goal);
        setView('home');
      }
    };
    loadGoal();
  }, []);

  const refreshSvg = useCallback(async () => {
    const xml = generateSvg({
      text: text || 'Quiet Goals',
      moodId,
      variantId,
      width,
      height,
      backgroundImage: bgMode === 'image' ? backgroundImage : null
    });
    setSvgXml(xml);
  }, [text, moodId, variantId, bgMode, backgroundImage, width, height]);

  useEffect(() => {
    if (fontsLoaded) {
      refreshSvg();
    }
  }, [fontsLoaded, refreshSvg]);

  // Fetch image when mood changes if in image mode
  useEffect(() => {
    if (bgMode === 'image') {
      handleFetchImage(true);
    }
  }, [moodId]);

  const handleFetchImage = async (force = false) => {
    if (loadingImage) return;
    if (!force && backgroundImage) return;

    setLoadingImage(true);
    try {
      const url = await fetchMoodImage(getMood(moodId));
      if (url) {
        setBackgroundImage(url);
        setBgMode('image');
      } else {
        setBgMode('procedural');
        Alert.alert('Image Fetch Failed', 'Could not fetch an image. Reverting to procedural background.');
      }
    } catch (e) {
      console.error(e);
      setBgMode('procedural');
    } finally {
      setLoadingImage(false);
    }
  };

  const toggleBgMode = () => {
    if (bgMode === 'procedural') {
      handleFetchImage();
    } else {
      setBgMode('procedural');
    }
  };

  const handleSave = async () => {
    try {
      // Request write-only permissions to avoid asking for Audio/Read permissions that might be missing in Manifest
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to save the wallpaper to your gallery.');
        return;
      }

      if (viewShotRef.current && viewShotRef.current.capture) {
        const uri = await viewShotRef.current.capture();
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('Saved!', 'Wallpaper saved to your Photos.');
      }
    } catch (e) {
      console.error('Save error:', e);
      Alert.alert('Error', 'Failed to save wallpaper.');
    }
  };

  const handleSetWallpaper = async () => {
    try {
      if (viewShotRef.current && viewShotRef.current.capture) {
        const uri = await viewShotRef.current.capture();
        
        if (Platform.OS === 'ios') {
            Alert.alert('iOS Restriction', 'iOS does not allow apps to set wallpaper directly. Please "Save" to photos and set it manually.');
            return;
        }

        // expo-wallpaper-manager
        // Kotlin module expects: { uri: string, type: 'lock' | 'screen' | 'both' }
        const res = WallpaperManager.setWallpaper({ uri, type: 'both' });
        
        if (res === 'success') {
             // Save to local storage
             const newGoal: ActiveGoal = {
               text,
               moodId,
               variantId,
               bgMode,
               backgroundImage,
               timestamp: Date.now()
             };
             await saveActiveGoal(newGoal);
             setActiveGoal(newGoal);
             
             Alert.alert('Success', 'Wallpaper updated!');
             // Ideally navigate back to home, but let user choose
        } else {
             Alert.alert('Error', 'Failed: ' + res);
        }
      }
    } catch (e) {
      console.error('Set Wallpaper error:', e);
      Alert.alert('Error', 'Failed to set wallpaper.');
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  // --- HOME VIEW ---
  if (view === 'home') {
    return (
      <View style={styles.homeContainer}>
        <StatusBar style="dark" />
        <View style={styles.homeContent}>
          <Text style={styles.homeTitle}>Active Goal</Text>
          
          {activeGoal ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardLabel}>MILESTONE</Text>
                <Text style={styles.cardValueMain}>{activeGoal.text}</Text>
              </View>
              
              <View style={styles.cardDivider} />
              
              <View style={styles.cardRow}>
                <View>
                  <Text style={styles.cardLabel}>MOOD</Text>
                  <View style={[styles.moodBadge, { backgroundColor: getMood(activeGoal.moodId).bgColor }]}>
                     <Text style={[styles.moodText, { color: getMood(activeGoal.moodId).textColor }]}>
                       {getMood(activeGoal.moodId).label}
                     </Text>
                  </View>
                </View>
                
                <View>
                   <Text style={styles.cardLabel}>LAYOUT</Text>
                   <Text style={styles.cardValue}>{getVariant(activeGoal.variantId).label}</Text>
                </View>
              </View>

               <View style={styles.cardRow}>
                 <View>
                    <Text style={styles.cardLabel}>BACKGROUND</Text>
                    <Text style={styles.cardValue}>{activeGoal.bgMode === 'image' ? 'Image' : 'Procedural'}</Text>
                 </View>
                 <View>
                     <Text style={styles.cardLabel}>SET ON</Text>
                     <Text style={styles.cardValue}>{new Date(activeGoal.timestamp).toLocaleDateString()}</Text>
                 </View>
               </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No active goal set.</Text>
            </View>
          )}

          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => setView('create')}
          >
            <Text style={styles.createButtonText}>
              {activeGoal ? 'Create New Wallpaper' : 'Create Your First Goal'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- CREATOR VIEW ---
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Wallpaper Preview Area - fills screen */}
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={() => setControlsVisible(!controlsVisible)}
        style={StyleSheet.absoluteFill}
      >
        <ViewShot 
          ref={viewShotRef} 
          options={{ format: "png", quality: 1.0 }} 
          style={{ width, height }}
        >
          {svgXml ? <SvgXml xml={svgXml} width={width} height={height} /> : <View style={{width, height, backgroundColor: '#F0F4F8'}} />}
        </ViewShot>
      </TouchableOpacity>

      {/* Back Button (only if we have a home to go back to) */}
      {activeGoal && controlsVisible && (
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setView('home')}
        >
          <Text style={styles.backButtonText}>← Home</Text>
        </TouchableOpacity>
      )}

      {/* Controls Overlay */}
      {controlsVisible && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.controlsContainer}
        >
          <ScrollView 
            style={styles.controls} 
            contentContainerStyle={styles.controlsContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Quiet Goals</Text>
              <TouchableOpacity onPress={() => setControlsVisible(false)}>
                <Text style={styles.closeButton}>Hide</Text>
              </TouchableOpacity>
            </View>

            {/* Input */}
            <View style={styles.section}>
              <Text style={styles.label}>GOAL</Text>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="What is your goal?"
                placeholderTextColor="#999"
                maxLength={40}
              />
            </View>

            {/* Moods */}
            <View style={styles.section}>
              <Text style={styles.label}>MOOD</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {Object.values(MOODS).map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setMoodId(m.id)}
                    style={[
                      styles.chip,
                      { backgroundColor: m.bgColor },
                      moodId === m.id && styles.activeChip
                    ]}
                  >
                    <Text style={[styles.chipText, { color: m.textColor }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Variants */}
            <View style={styles.section}>
              <Text style={styles.label}>LAYOUT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {Object.values(VARIANTS).map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => setVariantId(v.id)}
                    style={[
                      styles.chip,
                      styles.variantChip,
                      variantId === v.id && styles.activeVariantChip
                    ]}
                  >
                    <Text style={[styles.chipText, { color: variantId === v.id ? '#fff' : '#333' }]}>
                      {v.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Background Toggle */}
            <View style={styles.section}>
              <Text style={styles.label}>BACKGROUND</Text>
              <View style={styles.row}>
                <TouchableOpacity 
                  onPress={toggleBgMode}
                  style={[styles.button, bgMode === 'image' ? styles.activeButton : styles.outlineButton]}
                >
                  <Text style={bgMode === 'image' ? styles.buttonTextActive : styles.buttonText}>
                    {bgMode === 'image' ? 'Image Mode' : 'Procedural Mode'}
                  </Text>
                </TouchableOpacity>
                
                {bgMode === 'image' && (
                   <TouchableOpacity 
                    onPress={() => handleFetchImage(true)}
                    style={[styles.iconButton]}
                    disabled={loadingImage}
                  >
                    {loadingImage ? <ActivityIndicator size="small" color="#333" /> : <Text style={styles.iconText}>↺</Text>}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Save Button */}
            <View style={styles.footer}>
              <View style={{flexDirection: 'row', gap: 10}}>
                  <TouchableOpacity onPress={handleSave} style={[styles.saveButton, {flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd'}]}>
                    <Text style={[styles.saveButtonText, {color: '#333'}]}>Save to Photos</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleSetWallpaper} style={[styles.saveButton, {flex: 1}]}>
                    <Text style={styles.saveButtonText}>Set Wallpaper</Text>
                  </TouchableOpacity>
              </View>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F8'
  },
  // Home View Styles
  homeContainer: {
    flex: 1,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    padding: 24,
  },
  homeContent: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  homeTitle: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay-Regular',
    color: '#111',
    marginBottom: 32,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
    marginBottom: 32,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardValueMain: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay-Regular',
    color: '#111',
    marginTop: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 20,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  moodBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  moodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: 32,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  createButton: {
    backgroundColor: '#111',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Existing Creator Styles
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '60%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controls: {
    padding: 20,
  },
  controlsContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'PlayfairDisplay-Regular',
    color: '#333',
  },
  closeButton: {
    color: '#666',
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    marginBottom: 10,
    letterSpacing: 1,
  },
  input: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Regular',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 10,
    color: '#333',
  },
  horizontalScroll: {
    flexDirection: 'row',
    marginHorizontal: -5,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeChip: {
    borderColor: '#333',
    borderWidth: 1,
  },
  variantChip: {
    backgroundColor: '#fff',
    borderColor: '#eee',
    borderWidth: 1,
  },
  activeVariantChip: {
    backgroundColor: '#333',
    borderColor: '#333',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeButton: {
    backgroundColor: '#333',
  },
  buttonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  buttonTextActive: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  iconButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    width: 40,
    alignItems: 'center',
  },
  iconText: {
    fontSize: 16,
    color: '#333',
  },
  footer: {
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  }
});