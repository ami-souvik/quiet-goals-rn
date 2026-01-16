import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette, LayoutTemplate, Image as ImageIcon, Save, Check, ALargeSmall } from 'lucide-react-native';

interface CreatorToolbarProps {
  activeTool: 'none' | 'mood' | 'layout' | 'bg' | 'font' | 'apply';
  setActiveTool: (tool: 'none' | 'mood' | 'layout' | 'bg' | 'font' | 'apply') => void;
  onSave: () => void;
}

export const CreatorToolbar: React.FC<CreatorToolbarProps> = ({ activeTool, setActiveTool, onSave }) => {
  return (
    <SafeAreaView style={styles.toolbarContainer}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => setActiveTool(activeTool === 'mood' ? 'none' : 'mood')} style={[styles.toolbarButton, activeTool === 'mood' && styles.toolbarButtonActive]}>
          <Palette color={activeTool === 'mood' ? '#000' : '#fff'} size={24} />
          <Text style={[styles.toolbarLabel, activeTool === 'mood' && styles.toolbarLabelActive]}>Mood</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTool(activeTool === 'layout' ? 'none' : 'layout')} style={[styles.toolbarButton, activeTool === 'layout' && styles.toolbarButtonActive]}>
          <LayoutTemplate color={activeTool === 'layout' ? '#000' : '#fff'} size={24} />
          <Text style={[styles.toolbarLabel, activeTool === 'layout' && styles.toolbarLabelActive]}>Layout</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTool(activeTool === 'font' ? 'none' : 'font')} style={[styles.toolbarButton, activeTool === 'font' && styles.toolbarButtonActive]}>
          <ALargeSmall color={activeTool === 'font' ? '#000' : '#fff'} size={24} />
          <Text style={[styles.toolbarLabel, activeTool === 'font' && styles.toolbarLabelActive]}>Size</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTool(activeTool === 'bg' ? 'none' : 'bg')} style={[styles.toolbarButton, activeTool === 'bg' && styles.toolbarButtonActive]}>
          <ImageIcon color={activeTool === 'bg' ? '#000' : '#fff'} size={24} />
          <Text style={[styles.toolbarLabel, activeTool === 'bg' && styles.toolbarLabelActive]}>Bg</Text>
        </TouchableOpacity>

        <View style={styles.toolbarDivider} />

        <TouchableOpacity onPress={onSave} style={styles.toolbarButton}>
          <Save color="#fff" size={24} />
          <Text style={styles.toolbarLabel}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTool(activeTool === 'apply' ? 'none' : 'apply')} style={[styles.toolbarButton, styles.applyButton]}>
          <Check color="#000" size={24} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  toolbarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    marginHorizontal: 10,
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
    minWidth: 50
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
    borderRadius: 20,
    padding: 10,
  },
});
