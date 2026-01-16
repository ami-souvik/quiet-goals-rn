import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Toast } from './Toast';
import { ActiveGoal } from '../lib/storage';
import { getMood } from '../lib/moods';
import { VARIANTS, getVariant } from '../lib/variants';

interface HomeViewProps {
  activeGoal: ActiveGoal | null;
  onCreatePress: () => void;
  onCardPress: () => void;
  toast: { visible: boolean; message: string; type: 'success' | 'error' };
  setToast: React.Dispatch<React.SetStateAction<{ visible: boolean; message: string; type: 'success' | 'error' }>>;
}

export const HomeView: React.FC<HomeViewProps> = ({
  activeGoal,
  onCreatePress,
  onCardPress,
  toast,
  setToast
}) => {
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
          <TouchableOpacity activeOpacity={0.95} onPress={onCardPress}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text numberOfLines={3} style={styles.cardValueMain}>{activeGoal.text}</Text>
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
          onPress={onCreatePress}
        >
          <Text style={styles.createButtonText}>
            {activeGoal ? 'Create New Wallpaper' : 'Get Started'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>Designed for focus. Built with silence.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    alignItems: 'center',
  },
  appName: {
    fontSize: 36,
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
    fontSize: 32,
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
    paddingVertical: 20,
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
});
