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
  BackHandler
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { useFonts } from 'expo-font';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from "react-native-view-shot";
import { StatusBar } from 'expo-status-bar';
import * as WallpaperManager from 'expo-wallpaper-manager';
import { WebView } from 'react-native-webview';
import { Save, House, Lock, Palette, LayoutTemplate, Image as ImageIcon, X, Check, Home } from 'lucide-react-native';

// Local Fallbacks (used while loading or if offline)
import { MOODS as LOCAL_MOODS, getMood as getLocalMood } from './lib/moods';
import { VARIANTS as LOCAL_VARIANTS, getVariant as getLocalVariant } from './lib/variants';
import { fetchMoodImage } from './lib/images';
import { ActiveGoal, saveActiveGoal, getActiveGoal } from './lib/storage';
import { Toast } from './components/Toast';
import { generateSvg } from './lib/svg';

// const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL;
const WEB_APP_URL = 'https://quiet-goals.qurtesy.com';
// const WEB_APP_URL = 'http://192.168.0.193:3000';

export default function App() {
  const [fontsLoaded] = useFonts({
    'Oswald-Bold': require('./assets/fonts/Oswald-Bold.ttf'),
    'PlayfairDisplay-Regular': require('./assets/fonts/PlayfairDisplay-Regular.ttf'),
    'Roboto-Regular': require('./assets/fonts/Roboto-Regular.ttf'),
  });

  // App State
  const [view, setView] = useState<'home' | 'create'>('home');
  const [activeGoal, setActiveGoal] = useState<ActiveGoal | null>(null);
  const [isRemoteReady, setIsRemoteReady] = useState(false);
  const [activeTool, setActiveTool] = useState<'none' | 'mood' | 'layout' | 'bg'>('none');
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

  // Handle Android Hardware Back Button
  useEffect(() => {
    const backAction = () => {
      if (view === 'create' && activeGoal) {
        setView('home');
        return true; // Prevent default behavior (exit)
      }
      return false; // Default behavior (exit)
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [view, activeGoal]);

  const handleCardPress = () => {
    if (activeGoal) {
      setText(activeGoal.text);
      setMoodId(activeGoal.moodId);
      setVariantId(activeGoal.variantId);
      setBgMode(activeGoal.bgMode);
      setBackgroundImage(activeGoal.backgroundImage);
      setView('create');
    }
  };

  // Load active goal & fetch remote config on startup
  useEffect(() => {
    const init = async () => {
      // 1. Load Local Goal
      const goal = await getActiveGoal();
      if (goal) {
        setActiveGoal(goal);
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

    webViewRef.current.postMessage(JSON.stringify(payload));
  }, [text, moodId, variantId, bgMode, backgroundImage, width, height]);

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
      if (data.type === 'SVG_GENERATED' && data.payload && typeof data.payload === 'string') {
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

  // Local Generation Fallback (Only run if remote is NOT ready)
  const refreshSvg = useCallback(async () => {
    if (isRemoteReady) return; // Skip local if remote is active
    const xml = generateSvg({
      text: text || 'Quiet Goals',
      moodId,
      variantId,
      width,
      height,
      backgroundImage: bgMode === 'image' ? backgroundImage : null
    });
    setSvgXml(xml);
  }, [text, moodId, variantId, bgMode, backgroundImage, width, height, isRemoteReady]);

  // Trigger Local Generation
  useEffect(() => {
    if (fontsLoaded && !isRemoteReady) {
      refreshSvg();
    }
  }, [fontsLoaded, isRemoteReady, refreshSvg]);

  const handleFetchImage = async (force = false) => {
    if (loadingImage) return;

    // If we already have an image and aren't forcing a refresh, just switch mode
    if (!force && backgroundImage) {
      setBgMode('image');
      return;
    }

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
  const handleSetWallpaper = async (type: 'screen' | 'lock' | 'both' = 'both') => {
    try {
      if (viewShotRef.current && viewShotRef.current.capture) {
        const uri = await viewShotRef.current.capture();

        if (Platform.OS === 'ios') {
          Alert.alert('iOS Restriction', 'iOS does not allow apps to set wallpaper directly. Please "Save" to photos and set it manually.');
          return;
        }

        // expo-wallpaper-manager
        // Kotlin module expects: { uri: string, type: 'lock' | 'screen' | 'both' }
        const res = WallpaperManager.setWallpaper({ uri, type });

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

          const location = type === 'both' ? 'Homescreen & Lockscreen' : type === 'lock' ? 'Lockscreen' : 'Homescreen';
          showToast(`${location} updated!`, 'success');
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
          {/* Header & Intro */}
          <View style={styles.homeHeader}>
            <Text style={styles.appName}>Quiet Goals</Text>
            <Text style={styles.appTagline}>Turn your most important milestone into a calm, private wallpaper.</Text>
            <Text style={styles.appDescription}>
              No notifications. No performance tracking. Just a gentle reminder of what you’re working toward.
            </Text>
          </View>
          <Text style={styles.sectionTitle}>YOUR ACTIVE GOAL</Text>
          {activeGoal ? (
            <TouchableOpacity activeOpacity={0.95} onPress={handleCardPress}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
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
                <Text style={styles.cardHint}>Tap to edit or preview</Text>
              </View>
            </TouchableOpacity>
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
              {activeGoal ? 'Create New Goal' : 'Get Started'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.footerText}>Designed for focus. Built with silence.</Text>
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
            setIsRemoteReady(true);
          }}
          onError={(e) => console.warn('WebView Error', e.nativeEvent)}
        />
      </View>

      {/* Wallpaper Preview Area - fills screen */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          // Dismiss tool if open, otherwise focus input?
          if (activeTool !== 'none') setActiveTool('none');
        }}
        style={StyleSheet.absoluteFill}
      >
        <ViewShot
          ref={viewShotRef}
          options={{ format: "png", quality: 1.0 }}
          style={{ width, height }}
        >
          {/* Show loader until remote SVG is ready, unless we have an old one */}
          {svgXml && typeof svgXml === 'string' ? (
            <SvgXml xml={svgXml} width={width} height={height} />
          ) : (
            <View style={{ width, height, backgroundColor: getMood(moodId).bgColor, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={getMood(moodId).textColor} />
              <Text style={{ marginTop: 10, color: getMood(moodId).textColor, fontSize: 10 }}>Connecting to Neural Core...</Text>
            </View>
          )}
        </ViewShot>
      </TouchableOpacity>

      {/* Floating Input (Top) */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.floatingInputContainer}
      >
        <TextInput
          style={styles.floatingInput}
          value={text}
          onChangeText={setText}
          placeholder="Type your goal..."
          placeholderTextColor="rgba(255,255,255,0.5)"
          maxLength={40}
          textAlign="center"
          selectionColor="#fff"
        />
      </KeyboardAvoidingView>

      {/* Tool Overlay (Above Toolbar) */}
      {activeTool !== 'none' && (
        <View style={styles.toolOverlay}>
          {activeTool === 'mood' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolScroll}>
              {Object.values(moods).map((m: any) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setMoodId(m.id)}
                  style={[
                    styles.toolChip,
                    { backgroundColor: m.bgColor, borderColor: moodId === m.id ? '#fff' : 'transparent', borderWidth: 2 }
                  ]}
                >
                  <Text style={[styles.toolChipText, { color: m.textColor }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {activeTool === 'layout' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolScroll}>
              {Object.values(variants).map((v: any) => (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => setVariantId(v.id)}
                  style={[
                    styles.toolChip,
                    { backgroundColor: '#333', borderColor: variantId === v.id ? '#fff' : 'transparent', borderWidth: 2 }
                  ]}
                >
                  {/* React Native SVG rendering for variant icons if they exist */}
                  {/* {v.icon && typeof v.icon === 'string' && (
                    <SvgXml xml={v.icon} width={16} height={16} color={'#fff'} style={{ marginRight: 6 }} />
                  )} */}
                  <Text style={[styles.toolChipText, { color: '#fff' }]}>{v.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {activeTool === 'bg' && (
            <View style={styles.bgToolContainer}>
              <TouchableOpacity
                onPress={toggleBgMode}
                style={[styles.toolChip, { backgroundColor: '#333', width: 'auto', borderColor: '#fff', borderWidth: 2 }]}
              >
                <Text style={[styles.toolChipText, { color: '#fff' }]}>
                  {bgMode === 'image' ? 'Switch to Gradient' : 'Switch to Image'}
                </Text>
              </TouchableOpacity>

              {bgMode === 'image' && (
                <TouchableOpacity
                  onPress={() => handleFetchImage(true)}
                  style={[styles.toolChip, { backgroundColor: '#fff', borderColor: '#fff', width: 'auto' }]}
                >
                  {loadingImage ? <ActivityIndicator size="small" color="#000" /> : <Text style={[styles.toolChipText, { color: '#000' }]}>Shuffle Image ↺</Text>}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
      {/* Floating Toolbar (Bottom) */}
      <SafeAreaView style={styles.toolbarContainer}>
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => setActiveTool(activeTool === 'mood' ? 'none' : 'mood')} style={[styles.toolbarButton, activeTool === 'mood' && styles.toolbarButtonActive]}>
            <Text style={{ color: activeTool === 'mood' ? '#000' : '#fff' }}>M</Text>
            <Text style={[styles.toolbarLabel, activeTool === 'mood' && styles.toolbarLabelActive]}>Mood</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTool(activeTool === 'layout' ? 'none' : 'layout')} style={[styles.toolbarButton, activeTool === 'layout' && styles.toolbarButtonActive]}>
            <Text style={{ color: activeTool === 'layout' ? '#000' : '#fff' }}>L</Text>
            <Text style={[styles.toolbarLabel, activeTool === 'layout' && styles.toolbarLabelActive]}>Layout</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTool(activeTool === 'bg' ? 'none' : 'bg')} style={[styles.toolbarButton, activeTool === 'bg' && styles.toolbarButtonActive]}>
            <Text style={{ color: activeTool === 'bg' ? '#000' : '#fff' }}>B</Text>
            <Text style={[styles.toolbarLabel, activeTool === 'bg' && styles.toolbarLabelActive]}>Bg</Text>
          </TouchableOpacity>

          <View style={styles.toolbarDivider} />

          <TouchableOpacity onPress={handleSave} style={styles.toolbarButton}>
            <Save width={20} height={20} color='#fff' />
            <Text style={styles.toolbarLabel}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTool(activeTool === 'apply' ? 'none' : 'apply')} style={[styles.toolbarButton, styles.applyButton]}>
            <Text style={{ color: '#000' }}>Set</Text>
          </TouchableOpacity>
        </View>

        {/* Apply Options (Special Overlay) */}
        {activeTool === 'apply' && (
          <View style={styles.applyOverlay}>
            <TouchableOpacity onPress={() => handleSetWallpaper('screen')} style={styles.applyOption}>
              <Home width={20} height={20} color='#fff' />
              <Text style={styles.applyOptionText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSetWallpaper('lock')} style={styles.applyOption}>
              <Lock width={20} height={20} color='#fff' />
              <Text style={styles.applyOptionText}>Lock</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSetWallpaper('both')} style={styles.applyOption}>
              <Lock width={20} height={20} color='#fff' />
              <Text style={styles.applyOptionText}>Both</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
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
    backgroundColor: '#F9FAFB', // Slightly softer white/gray
    justifyContent: 'center',
    padding: 24,
  },
  homeContent: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  homeHeader: {
    marginBottom: 40,
    alignItems: 'center', // Center align header text
  },
  appName: {
    fontSize: 36, // Larger
    fontFamily: 'PlayfairDisplay-Regular',
    color: '#111',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  appDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#999',
    letterSpacing: 1.5,
    marginBottom: 16,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 6,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardValueMain: {
    fontSize: 32, // Larger goal text
    fontFamily: 'PlayfairDisplay-Regular',
    color: '#111',
    marginTop: 4,
    lineHeight: 40,
  },
  cardHint: {
    fontSize: 11,
    color: '#AAA',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
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
    paddingVertical: 20, // Taller button
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
  footerText: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 12,
    color: '#CCC',
    fontWeight: '500',
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
    fontWeight: '400',
    fontSize: 14,
  },
  // Immersive Creator Styles
  floatingInputContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 80,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  floatingInput: {
    width: '100%',
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Regular',
    color: '#fff',
    textAlign: 'center',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  floatingBackButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBackButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
    marginTop: -2,
  },

  // Toolbar
  toolbarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    marginHorizontal: 20,
    marginBottom: Platform.OS === 'ios' ? 0 : 10,
    borderRadius: 32,
    paddingVertical: 6,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toolbarButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 12,
    minWidth: 50,
  },
  toolbarButtonActive: {
    backgroundColor: '#fff',
  },
  toolbarLabel: {
    fontSize: 10,
    color: '#fff',
    marginTop: 4,
    fontWeight: '600',
  },
  toolbarLabelActive: {
    color: '#000',
  },
  toolbarDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 4,
  },
  applyButton: {
    backgroundColor: '#fff',
    borderRadius: 20, // Circular if icon only
    padding: 10,
  },

  // Tool Overlay (Moods/Layouts)
  toolOverlay: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 90, // Above toolbar
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toolScroll: {
    marginBottom: 10,
    paddingHorizontal: 20,
    gap: 8,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#333',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  toolChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  bgToolContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },

  // Apply Options Overlay
  applyOverlay: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 100,
    right: 20, // Align with apply button roughly
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 16,
    padding: 8,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  applyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 8,
    // borderBottomWidth: 1,
    // borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  applyOptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});