import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Image
} from 'react-native';
import ViewShot from "react-native-view-shot";
import { SvgXml } from 'react-native-svg';
import { Toast } from './Toast';
import { CreatorToolbar } from './CreatorToolbar';
import { CreatorOverlay } from './CreatorOverlay';
import { getMood } from '../lib/moods';
import { getVariant } from '../lib/variants';
import { ArrowLeft } from 'lucide-react-native';

interface CreatorViewProps {
  // Config & State
  moods: any;
  variants: any;
  text: string;
  setText: (t: string) => void;
  moodId: string;
  setMoodId: (id: string) => void;
  variantId: string;
  setVariantId: (id: string) => void;
  fontSizeScale: number;
  setFontSizeScale: (scale: number) => void;
  bgMode: 'procedural' | 'image';
  backgroundImage: string | null;
  toggleBgMode: () => void;
  loadingImage: boolean;
  handleFetchImage: (force?: boolean) => void;

  // UI State
  activeTool: 'none' | 'mood' | 'layout' | 'bg' | 'font' | 'apply';
  setActiveTool: (tool: 'none' | 'mood' | 'layout' | 'bg' | 'font' | 'apply') => void;
  toast: { visible: boolean; message: string; type: 'success' | 'error' };
  setToast: React.Dispatch<React.SetStateAction<{ visible: boolean; message: string; type: 'success' | 'error' }>>;

  // SVG / ViewShot
  svgXml: string;
  viewShotRef: React.RefObject<any>;

  // Navigation / Actions
  onBack: () => void;
  onSave: () => void;
  handleSetWallpaper: (type: 'screen' | 'lock' | 'both') => void;
}

export const CreatorView: React.FC<CreatorViewProps> = ({
  moods,
  variants,
  text,
  setText,
  moodId,
  setMoodId,
  variantId,
  setVariantId,
  fontSizeScale,
  setFontSizeScale,
  bgMode,
  backgroundImage,
  toggleBgMode,
  loadingImage,
  handleFetchImage,
  activeTool,
  setActiveTool,
  toast,
  setToast,
  svgXml,
  viewShotRef,
  onBack,
  onSave,
  handleSetWallpaper
}) => {
  const inputRef = useRef<TextInput>(null);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      inputRef.current && inputRef.current.blur && inputRef.current.blur()
    });
    return () => {
      hideSubscription.remove();
    };
  }, []);

  const getNativeFont = (moodId: string, isBold: boolean) => {
    switch (moodId) {
      case 'ambitious':
        return isBold ? 'Oswald-Bold' : 'Oswald-Regular';
      case 'grounded':
        return isBold ? 'PlayfairDisplay-Bold' : 'PlayfairDisplay-Regular';
      case 'focused':
        return isBold ? 'Raleway-Bold' : 'Raleway-Regular';
      case 'calm':
      default:
        return isBold ? 'OpenSans-Bold' : 'OpenSans-Regular';
    }
  };

  const currentVariant = getVariant(variantId);
  const isBoldVariant = currentVariant.fontWeight === 'bold';
  const currentFont = getNativeFont(moodId, isBoldVariant);

  const setWallpaper = (type: "screen" | "lock" | "both") => {
    inputRef.current && inputRef.current.blur && inputRef.current.blur()
    handleSetWallpaper(type)
  }

  return (
    <View style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />

      {/* Capture Container: Wraps both Background and Text Input */}
      <ViewShot
        ref={viewShotRef}
        options={{ format: "png", quality: 1.0 }}
        style={StyleSheet.absoluteFill}
      >
        {/* Background Layer (SVG) */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            if (activeTool !== 'none') {
              setActiveTool('none');
            }
            else if (inputRef.current && inputRef.current.isFocused && inputRef.current.isFocused()) {
              inputRef.current && inputRef.current.blur && inputRef.current.blur()
            }
            else {
              inputRef.current && inputRef.current.focus && inputRef.current.focus()
            }
          }}
          style={StyleSheet.absoluteFill}
        >
          <View style={{ position: 'absolute', width, height, backgroundColor: getMood(moodId).bgColor, alignItems: 'center', justifyContent: 'center' }}>
          </View>
          {backgroundImage && <Image source={{ uri: backgroundImage }} width={width} height={height} style={{ position: 'absolute', opacity: 0.4 }} />}
        </TouchableOpacity>

        {/* Floating Input Layer (Overlay) */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[
            styles.floatingInputContainer,
            {
              justifyContent: getVariant(variantId).verticalAlign === 'top' ? 'flex-start' :
                getVariant(variantId).verticalAlign === 'bottom' ? 'flex-end' : 'center',
              paddingTop: getVariant(variantId).verticalAlign === 'top' ? height * 0.15 : 0,
              paddingBottom: getVariant(variantId).verticalAlign === 'bottom' ? height * 0.15 : 0,
            }
          ]}
          pointerEvents="box-none"
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.floatingInput,
              {
                color: getMood(moodId).textColor,
                fontFamily: currentFont,
                textTransform: getMood(moodId).uppercase ? 'uppercase' : 'none',
                fontSize: 32 * fontSizeScale // Apply Scale
              }
            ]}
            value={text}
            onChangeText={setText}
            placeholder="Type your goal..."
            placeholderTextColor={getMood(moodId).textColor + '80'}
            maxLength={200}
            multiline
            textAlign="center"
            selectionColor={getMood(moodId).textColor}
            autoCorrect={false}
          />
        </KeyboardAvoidingView>
      </ViewShot>

      {/* Back Button (Top Left) */}
      <TouchableOpacity
        style={styles.floatingBackButton}
        onPress={onBack}
      >
        <ArrowLeft width={24} height={24} color="#fff" />
      </TouchableOpacity>

      <CreatorOverlay
        activeTool={activeTool}
        moods={moods}
        variants={variants}
        moodId={moodId}
        setMoodId={setMoodId}
        variantId={variantId}
        setVariantId={setVariantId}
        fontSizeScale={fontSizeScale}
        setFontSizeScale={setFontSizeScale}
        bgMode={bgMode}
        toggleBgMode={toggleBgMode}
        loadingImage={loadingImage}
        handleFetchImage={handleFetchImage}
        handleSetWallpaper={setWallpaper}
      />

      <CreatorToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        onSave={onSave}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  floatingInputContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 20,
    right: 20,
    zIndex: 10,
    alignItems: 'center'
  },
  floatingInput: {
    width: '100%',
    fontSize: 32,
    textAlign: 'center',
    backgroundColor: 'transparent',
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
});