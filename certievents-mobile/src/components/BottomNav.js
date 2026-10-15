import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const C = {
  navBg: '#0B0A12',
  primary: '#7C5FE6',
  textMuted: '#6B6B7B',
};

function GradientIcon({ name, size, active }) {
  if (!active) return <Ionicons name={name} size={size} color={C.textMuted} />;
  return (
    <MaskedView
      style={{ width: size, height: size }}
      maskElement={
        <View style={{ backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name={name} size={size} color="#000" />
        </View>
      }
    >
      <LinearGradient
        colors={['#8B5CF6', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size }}
      />
    </MaskedView>
  );
}

/**
 * Barra de navegação inferior compartilhada.
 * 
 * Props:
 *   - active: qual aba está ativa. Valores: 'home' | 'register' | 'manage'
 *   - isAdmin: boolean — exibe Registrar e Gestão apenas para admins
 */
export function BottomNav({ active = 'home', isAdmin = false }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.inner}>

        {/* Registrar */}
        <TouchableOpacity
          style={styles.item}
          activeOpacity={isAdmin ? 0.75 : 1}
          onPress={() => isAdmin && router.push('/(app)/create-event')}
          accessibilityLabel="Registrar evento"
        >
          <GradientIcon name="add-circle-outline" size={20} active={isAdmin && active === 'register'} />
          <Text style={[
            styles.label,
            isAdmin && active === 'register' && styles.labelActive,
            !isAdmin && styles.labelDisabled,
          ]}>
            Registrar
          </Text>
          {isAdmin && active === 'register' && <View style={styles.indicator} />}
        </TouchableOpacity>

        {/* Início */}
        <TouchableOpacity
          style={styles.item}
          activeOpacity={0.75}
          onPress={() => router.replace('/(app)')}
          accessibilityLabel="Início"
        >
          <View style={active === 'home' ? styles.activeGlow : undefined}>
            <GradientIcon name="home" size={22} active={active === 'home'} />
          </View>
          <Text style={active === 'home' ? styles.labelActive : styles.label}>Início</Text>
          {active === 'home' && <View style={styles.indicator} />}
        </TouchableOpacity>

        {/* Gestão */}
        <TouchableOpacity
          style={styles.item}
          activeOpacity={isAdmin ? 0.75 : 1}
          onPress={() => isAdmin && router.push('/(app)/admin/registrations')}
          accessibilityLabel="Gestão de participantes"
        >
          <GradientIcon name="people-outline" size={20} active={isAdmin && active === 'manage'} />
          <Text style={[
            styles.label,
            isAdmin && active === 'manage' && styles.labelActive,
            !isAdmin && styles.labelDisabled,
          ]}>
            Gestão
          </Text>
          {isAdmin && active === 'manage' && <View style={styles.indicator} />}
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: C.navBg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  inner: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
    position: 'relative',
  },
  label: {
    color: C.textMuted,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  labelActive: {
    color: C.primary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  labelDisabled: {
    color: 'rgba(107,107,123,0.4)',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  indicator: {
    position: 'absolute',
    bottom: -8,
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: C.primary,
  },
  activeGlow: {
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
});
