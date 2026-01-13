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
import { WebView } from 'react-native-webview';

// Local Fallbacks (used while loading or if offline)
import { MOODS as LOCAL_MOODS, getMood as getLocalMood } from './lib/moods';
import { VARIANTS as LOCAL_VARIANTS, getVariant as getLocalVariant } from './lib/variants';
import { fetchMoodImage } from './lib/images';
import { ActiveGoal, saveActiveGoal, getActiveGoal } from './lib/storage';
import { Toast } from './components/Toast';

// UPDATE THIS URL TO YOUR DEPLOYED NEXT.JS APP URL
// For Android Emulator, use 'http://10.0.2.2:3000' if running locally
// For Physical Device, use your computer's local IP 'http://192.168.x.x:3000'
// const WEB_APP_URL = 'https://quiet-goals.qurtesy.com';
const WEB_APP_URL = 'http://192.168.0.185:3000';

export default function App() {
  const [fontsLoaded] = useFonts({
    'Oswald-Bold': require('./assets/fonts/Oswald-Bold.ttf'),
    'PlayfairDisplay-Regular': require('./assets/fonts/PlayfairDisplay-Regular.ttf'),
    'Roboto-Regular': require('./assets/fonts/Roboto-Regular.ttf'),
  });

  // App State
  const [view, setView] = useState<'home' | 'create'>('create');
  const [activeGoal, setActiveGoal] = useState<ActiveGoal | null>(null);
  const [isRemoteReady, setIsRemoteReady] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>(
    {
      visible: false,
      message: '',
      type: 'success',
    }
  );

  // Configuration (Remote with Local Fallback)
  const [moods, setMoods] = useState<any>(LOCAL_MOODS);
  const [variants, setVariants] = useState<any>(LOCAL_VARIANTS);

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
  const webViewRef = useRef<WebView>(null);
  const { width, height } = Dimensions.get('window');

  // Helpers to get current config object safely
  const getMood = (id: string) => moods[id] || moods['calm'] || LOCAL_MOODS['calm'];
  const getVariant = (id: string) => variants[id] || variants['center-soft'] || LOCAL_VARIANTS['center-soft'];

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  // Load active goal & fetch remote config on startup
  useEffect(() => {
    const init = async () => {
      // 1. Load Local Goal
      const goal = await getActiveGoal();
      if (goal) {
        setActiveGoal(goal);
        setView('home');
      }

      // 2. Fetch Remote Config (Moods/Variants)
      try {
        const res = await fetch(`${WEB_APP_URL}/api/config`);
        if (res.ok) {
          const data = await res.json();
          if (data.moods) setMoods(data.moods);
          if (data.variants) setVariants(data.variants);
        }
      } catch (e) {
        console.warn('Failed to load remote config, using fallback:', e);
      }
    };
    init();
  }, []);

  // Request SVG generation from WebView
  const requestSvgGeneration = useCallback(() => {
    if (!webViewRef.current) return;

    const payload = {
      type: 'GENERATE_SVG',
      payload: {
        text: text || 'Quiet Goals',
                moodId,
                variantId,
                width,
                height,
                backgroundImage: bgMode === 'image' ? backgroundImage : null,
                isNative: true
              }
            };
            
            webViewRef.current.postMessage(JSON.stringify(payload));  }, [text, moodId, variantId, bgMode, backgroundImage, width, height]);

  // Trigger generation when inputs change
  useEffect(() => {
    if (fontsLoaded && isRemoteReady) {
      // Debounce slightly
      const t = setTimeout(requestSvgGeneration, 100);
      return () => clearTimeout(t);
    }
  }, [fontsLoaded, isRemoteReady, requestSvgGeneration]);

  // Handle messages from WebView (Generated SVG)
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SVG_GENERATED') {
        setSvgXml(data.payload);
      }
    } catch (e) {
      console.error('WebView message parse error', e);
    }
  };

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
      const permission = await MediaLibrary.requestPermissionsAsync(true);

      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to save the wallpaper to your gallery.');
        return;
      }

      if (viewShotRef.current && viewShotRef.current.capture) {
        const uri = await viewShotRef.current.capture();
        await MediaLibrary.saveToLibraryAsync(uri);
        showToast('Wallpaper saved to Photos', 'success');
      }
    } catch (e) {
      console.error('Save error:', e);
      showToast('Failed to save wallpaper', 'error');
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

          showToast('Wallpaper updated!', 'success');
        } else {
          showToast('Failed to update wallpaper', 'error');
        }
      }
    } catch (e) {
      console.error('Set Wallpaper error:', e);
      showToast('Error setting wallpaper', 'error');
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
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(prev => ({ ...prev, visible: false }))}
        />
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
      <Toast 
        visible={toast.visible} 
        message={toast.message} 
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))} 
      />
      
      {/* Hidden WebView for Logic */}
      <View style={{ height: 0, width: 0, opacity: 0, position: 'absolute' }}>
        <WebView
            ref={webViewRef}
            source={{ uri: `${WEB_APP_URL}/headless` }}
            onMessage={handleWebViewMessage}
            onLoad={() => {
                console.log('Headless Generator Loaded');
                setIsRemoteReady(true);
            }}
            onError={(e) => console.warn('WebView Error', e.nativeEvent)}
        />
      </View>

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
          {/* Show loader until remote SVG is ready, unless we have an old one */}
          {svgXml ? (
              <SvgXml xml={svgXml} width={width} height={height} />
          ) : (
              <View style={{width, height, backgroundColor: getMood(moodId).bgColor, alignItems: 'center', justifyContent: 'center'}}>
                 <ActivityIndicator color={getMood(moodId).textColor} />
                 <Text style={{marginTop: 10, color: getMood(moodId).textColor, fontSize: 10}}>Connecting to Neural Core...</Text>
              </View>
          )}
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
                {Object.values(moods).map((m: any) => (
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
                {Object.values(variants).map((v: any) => (
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