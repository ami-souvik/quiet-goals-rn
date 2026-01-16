import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { House, Lock, RotateCw, Smartphone } from 'lucide-react-native';

interface CreatorOverlayProps {
  activeTool: 'none' | 'mood' | 'layout' | 'bg' | 'font' | 'apply';
  moods: any;
  variants: any;
  moodId: string;
  setMoodId: (id: string) => void;
  variantId: string;
  setVariantId: (id: string) => void;
  fontSizeScale: number;
  setFontSizeScale: (scale: number) => void;
  bgMode: 'procedural' | 'image';
  toggleBgMode: () => void;
  loadingImage: boolean;
  handleFetchImage: (force?: boolean) => void;
  handleSetWallpaper: (type: 'screen' | 'lock' | 'both') => void;
}

export const CreatorOverlay: React.FC<CreatorOverlayProps> = ({
  activeTool,
  moods,
  variants,
  moodId,
  setMoodId,
  variantId,
  setVariantId,
  fontSizeScale,
  setFontSizeScale,
  bgMode,
  toggleBgMode,
  loadingImage,
  handleFetchImage,
  handleSetWallpaper
}) => {
  if (activeTool === 'none') return null;

  return (
    <>
      {/* Tool Overlay (Above Toolbar) */}
      {activeTool !== 'apply' && (
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
                  {v.icon && typeof v.icon === 'string' && (
                    <SvgXml xml={v.icon} width={16} height={16} color={'#fff'} style={{ marginRight: 6 }} />
                  )}
                  <Text style={[styles.toolChipText, { color: '#fff' }]}>{v.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {activeTool === 'font' && (
            <View style={styles.bgToolContainer}>
              {[
                { label: 'Small', scale: 1 },
                { label: 'Medium', scale: 1.3 },
                { label: 'Large', scale: 1.6 }
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.label}
                  onPress={() => setFontSizeScale(opt.scale)}
                  style={[
                    styles.toolChip,
                    {
                      backgroundColor: '#333',
                      borderColor: Math.abs(fontSizeScale - opt.scale) < 0.01 ? '#fff' : 'transparent',
                      borderWidth: 2,
                      width: 'auto'
                    }
                  ]}
                >
                  <Text style={[styles.toolChipText, { color: '#fff' }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
                  {
                    loadingImage ? <View style={{ flexDirection: 'row', justifyContent: 'center', width: 82 }}>
                      <ActivityIndicator color="#000" style={{ width: 24, height: 24 }} />
                    </View>
                      : <View style={{ flexDirection: 'row', alignItems: 'center', width: 82 }}>
                        <Text style={[styles.toolChipText, { color: '#000', paddingRight: 4 }]}>Shuffle Image</Text>
                        <RotateCw width={12} />
                      </View>
                  }
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Apply Options (Special Overlay) */}
      {activeTool === 'apply' && (
        <View style={styles.applyOverlay}>
          <TouchableOpacity onPress={() => handleSetWallpaper('screen')} style={styles.applyOption}>
            <House color="#fff" size={20} />
            <Text style={styles.applyOptionText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSetWallpaper('lock')} style={styles.applyOption}>
            <Lock color="#fff" size={20} />
            <Text style={styles.applyOptionText}>Lock</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSetWallpaper('both')} style={styles.applyOption}>
            <Smartphone color="#fff" size={20} />
            <Text style={styles.applyOptionText}>Both</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  toolOverlay: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 90,
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
  applyOverlay: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 100,
    right: 20,
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
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 8,
  },
  applyOptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
