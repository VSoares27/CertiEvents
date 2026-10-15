import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Logo oficial do CertiEvent — usado em todas as telas (header de admin,
 * tela inicial, login/cadastro, favoritos, etc).
 * Um badge com ticket (ingresso de evento) representa o core do produto:
 * eventos + certificados.
 */
export function LogoBadge({ size = 28 }) {
  return (
    <LinearGradient
      colors={['#8B5CF6', '#6366F1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size * 0.28 },
      ]}
    >
      <Ionicons name="ticket" size={size * 0.58} color="#FFF" />
    </LinearGradient>
  );
}

/**
 * Logo completo: badge + wordmark "CERTIEVENT".
 * variant="stacked" adiciona uma linha de tagline/subtítulo abaixo (usado nos headers admin).
 */
export function AppLogo({ size = 28, textSize = 16, tagline, style }) {
  return (
    <View style={[styles.row, style]}>
      <LogoBadge size={size} />
      <View>
        <Text style={[styles.wordmark, { fontSize: textSize }]}>CERTIEVENT</Text>
        {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C5FE6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  wordmark: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  tagline: {
    color: '#6B6B7B',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 1,
  },
});
