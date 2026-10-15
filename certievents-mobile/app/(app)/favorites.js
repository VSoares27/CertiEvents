import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useAuth } from '../../src/contexts/AuthContext';
import { API_BASE_URL } from '../../src/constants/api';
import { AppLogo } from '../../src/components/AppLogo';

const C = {
  bg: '#08070D',
  surface: '#0F0E17',
  card: '#13111F',
  cardBorder: '#1F1D2E',
  primary: '#7C5FE6',
  gradientStart: '#8B5CF6',
  gradientEnd: '#6366F1',
  text: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textMuted: '#6B6B7B',
};

const FALLBACK = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getImageUri(imageUrl) {
  if (!imageUrl) return FALLBACK;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  return `${API_BASE_URL}/uploads/${imageUrl}`;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/events/me/favorites`, {
        headers: {
          'Content-Type': 'application/json',
          'bypass-tunnel-reminder': 'true',
          'Authorization': 'Bearer ' + token,
        },
      });
      if (!res.ok) throw new Error('Erro ao carregar favoritos.');
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useFocusEffect(
    useCallback(() => { loadFavorites(); }, [loadFavorites])
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/(app)/event/${item._id}`)}
    >
      <ImageBackground
        source={{ uri: getImageUri(item.imageUrl) }}
        style={styles.cardImage}
        imageStyle={{ borderRadius: 14 }}
      >
        <LinearGradient
          colors={['rgba(8,7,13,0.05)', 'rgba(8,7,13,0.85)']}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
        />
        <View style={styles.cardContent}>
          <View style={styles.cardMeta}>
            <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
          {item.location ? (
            <View style={styles.cardMeta}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={styles.cardLocation} numberOfLines={1}>{item.location}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.heartBadge}>
          <Ionicons name="heart" size={14} color="#EF4444" />
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header igual à tela inicial */}
      <View style={styles.header}>
        <AppLogo size={30} textSize={16} tagline="PLATAFORMA DE EVENTOS" />
      </View>

      <Text style={styles.screenTitle}>Favoritos</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: 80 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadFavorites(true)}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="heart-outline" size={56} color={C.textMuted} />
              <Text style={styles.emptyTitle}>Nenhum favorito ainda</Text>
              <Text style={styles.emptySubtitle}>
                Toque no coração nos eventos para salvá-los aqui.
              </Text>
            </View>
          }
        />
      )}

      {/* ── Bottom Nav — só Início ── */}
      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.75}
          onPress={() => router.replace('/(app)')}
          accessibilityLabel="Início"
        >
          <MaskedView
            style={{ width: 22, height: 22 }}
            maskElement={
              <View style={{ backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="home" size={22} color="#000" />
              </View>
            }
          >
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 22, height: 22 }}
            />
          </MaskedView>
          <Text style={styles.navLabel}>Início</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },

  screenTitle: {
    color: C.text, fontSize: 22, fontWeight: '800',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },

  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 14 },

  card: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  cardImage: { height: 160, justifyContent: 'flex-end' },
  cardContent: { padding: 14, gap: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardDate: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
  cardTitle: { color: C.text, fontSize: 17, fontWeight: '800', lineHeight: 22 },
  cardLocation: { color: 'rgba(255,255,255,0.65)', fontSize: 11, flex: 1 },
  heartBadge: {
    position: 'absolute', top: 12, right: 12,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: '800' },
  emptySubtitle: { color: C.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // ── Bottom Nav ──
  bottomNav: {
    backgroundColor: '#0B0A12',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 12,
    paddingTop: 8, alignItems: 'center',
  },
  navItem: { alignItems: 'center', gap: 3, paddingVertical: 4 },
  navLabel: { color: C.primary, fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
});
