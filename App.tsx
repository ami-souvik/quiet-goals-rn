import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dimensions,
  Platform,
  Alert,
  BackHandler,
  Linking
} from 'react-native';
import { useFonts } from 'expo-font';
import * as MediaLibrary from 'expo-media-library';
import * as WallpaperManager from 'expo-wallpaper-manager';

// Local Fallbacks & Libs
import { MOODS as LOCAL_MOODS, getMood as getLocalMood } from './lib/moods';
import { VARIANTS as LOCAL_VARIANTS, getVariant as getLocalVariant } from './lib/variants';
import { fetchMoodImage } from './lib/images';
import { ActiveGoal, saveActiveGoal, getActiveGoal } from './lib/storage';
import { generateSvg } from './lib/svg';

// Components
import { HomeView } from './components/HomeView';
import { CreatorView } from './components/CreatorView';

export default function App() {
  const [fontsLoaded] = useFonts({
    'Oswald-Regular': require('./assets/fonts/Oswald-Regular.ttf'),
    'Oswald-Bold': require('./assets/fonts/Oswald-Bold.ttf'),
    'PlayfairDisplay-Regular': require('./assets/fonts/PlayfairDisplay-Regular.ttf'),
    'PlayfairDisplay-Bold': require('./assets/fonts/PlayfairDisplay-Bold.ttf'),
    'OpenSans-Regular': require('./assets/fonts/OpenSans-Regular.ttf'),
    'OpenSans-Bold': require('./assets/fonts/OpenSans-Bold.ttf'),
    'Raleway-Regular': require('./assets/fonts/Raleway-Regular.ttf'),
    'Raleway-Bold': require('./assets/fonts/Raleway-Bold.ttf'),
  });

  // App State
  const [view, setView] = useState<'home' | 'create'>('home');
  const [activeGoal, setActiveGoal] = useState<ActiveGoal | null>(null);
  const [activeTool, setActiveTool] = useState<'none' | 'mood' | 'layout' | 'bg' | 'apply'>('none');
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
  const [fontSizeScale, setFontSizeScale] = useState(1.0);
  const [bgMode, setBgMode] = useState<'procedural' | 'image'>('procedural');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [svgXml, setSvgXml] = useState('');
  const [loadingImage, setLoadingImage] = useState(false);

  const viewShotRef = useRef<any>(null);
  const { width, height } = Dimensions.get('window');

  // Helpers to get current config object safely
  const getMood = (id: string) => moods[id] || moods['calm'] || LOCAL_MOODS['calm'];
  // const getVariant = (id: string) => variants[id] || variants['center-soft'] || LOCAL_VARIANTS['center-soft'];

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
      setFontSizeScale(activeGoal.fontSizeScale || 1.0);
      setBgMode(activeGoal.bgMode);
      setBackgroundImage(activeGoal.backgroundImage);
      setView('create');
    }
  };

  // Load active goal on startup
  useEffect(() => {
    const init = async () => {
      // 1. Load Local Goal
      const goal = await getActiveGoal();
      if (goal) {
        setActiveGoal(goal);
      }
    };
    init();
  }, []);

  // Fetch image when mood changes if in image mode
  useEffect(() => {
    if (bgMode === 'image') {
      handleFetchImage();
    }
  }, [moodId]);

  // Local Generation
  const refreshSvg = useCallback(async () => {
    const xml = generateSvg({
      text: '', // Hide text in SVG, render via TextInput overlay
      moodId,
      variantId,
      width,
      height,
      backgroundImage: bgMode === 'image' ? backgroundImage : null,
      fontSizeScale
    });
    setSvgXml(xml);
  }, [text, moodId, variantId, bgMode, backgroundImage, width, height, fontSizeScale]);

  // Trigger Local Generation
  useEffect(() => {
    if (fontsLoaded) {
      refreshSvg();
    }
  }, [fontsLoaded, refreshSvg]);

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
        Alert.alert(
          'Permission Needed',
          'Quiet Goals needs access to your Photos to save the wallpaper. Please enable it in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
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
            fontSizeScale,
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
    return null; // Or a splash screen
  }

  // --- HOME VIEW ---
  if (view === 'home') {
    return (
      <HomeView
        activeGoal={activeGoal}
        onCreatePress={() => setView('create')}
        onCardPress={handleCardPress}
        toast={toast}
        setToast={setToast}
      />
    );
  }

  // --- CREATOR VIEW ---
  return (
    <CreatorView
      moods={moods}
      variants={variants}
      text={text}
      setText={setText}
      moodId={moodId}
      setMoodId={setMoodId}
      variantId={variantId}
      setVariantId={setVariantId}
      fontSizeScale={fontSizeScale}
      setFontSizeScale={setFontSizeScale}
      bgMode={bgMode}
      backgroundImage={backgroundImage}
      toggleBgMode={toggleBgMode}
      loadingImage={loadingImage}
      handleFetchImage={handleFetchImage}
      activeTool={activeTool}
      setActiveTool={setActiveTool}
      toast={toast}
      setToast={setToast}
      svgXml={svgXml}
      viewShotRef={viewShotRef}
      onBack={() => setView('home')}
      onSave={handleSave}
      handleSetWallpaper={handleSetWallpaper}
    />);
}
