import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useAuth } from '../../../src/contexts/AuthContext';
import { API_BASE_URL } from '../../../src/constants/api';
import { AppLogo } from '../../../src/components/AppLogo';

const C = {
  bg: '#08070D',
  navBg: '#0B0A12',
  surface: '#0F0E17',
  card: '#13111F',
  cardBorder: '#1F1D2E',
  primary: '#7C5FE6',
  accent: '#A78BFA',
  gradientStart: '#8B5CF6',
  gradientEnd: '#6366F1',
  text: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textMuted: '#6B6B7B',
  rejected: '#EF4444',
};

function computeEventStatus(event) {
  const now = new Date();
  const start = event.date ? new Date(event.date) : null;
  if (!start) return event.status || 'upcoming';
  const end = event.endDate
    ? new Date(event.endDate)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  if (now >= start && now <= end) return 'ongoing';
  if (now > end) return 'finished';
  return 'upcoming';
}

function formatEventDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const hour = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()} · ${hour}:${min}`;
}

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
        colors={[C.gradientStart, C.gradientEnd]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ width: size, height: size }}
      />
    </MaskedView>
  );
}

export default function EndedEventsScreen() {
  const router = useRouter();
  const { getToken, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadEvents = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/events`, {
        headers: {
          'bypass-tunnel-reminder': 'true',
          Authorization: 'Bearer ' + token,
        },
      });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.events ?? [];
      setEvents(list.filter((e) => computeEventStatus(e) === 'finished'));
      setError(null);
    } catch (err) {
      setError(err.message || 'Erro ao carregar eventos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleRefresh = () => { setRefreshing(true); loadEvents(); };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Header igual à home ── */}
      <View style={styles.header}>
        <AppLogo size={30} textSize={16} tagline="EVENTOS ENCERRADOS" />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={C.rejected} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); loadEvents(); }}>
            <LinearGradient colors={[C.gradientStart, C.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.retryGradient}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: 80 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} colors={[C.primary]} />
          }
        >
          {events.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="time-outline" size={40} color={C.textMuted} />
              <Text style={styles.emptyText}>Nenhum evento encerrado.</Text>
            </View>
          ) : (
            events.map((event) => (
              <TouchableOpacity
                key={event._id}
                activeOpacity={0.8}
                onPress={() => router.push('/(app)/event/' + event._id)}
                accessibilityLabel={`Ver detalhes de ${event.name}`}
              >
                {/* Borda gradiente */}
                <LinearGradient
                  colors={[C.gradientStart, C.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardBorderGradient}
                >
                  <View style={styles.card}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{event.name}</Text>
                    <View style={styles.cardMeta}>
                      <Ionicons name="calendar-outline" size={13} color={C.textSecondary} />
                      <Text style={styles.cardMetaText}>{formatEventDate(event.date)}</Text>
                    </View>
                    {event.location ? (
                      <View style={styles.cardMeta}>
                        <Ionicons name="location-outline" size={13} color={C.textSecondary} />
                        <Text style={styles.cardMetaText} numberOfLines={1}>{event.location}</Text>
                      </View>
                    ) : null}
                    <View style={styles.endedBadge}>
                      <Ionicons name="time-outline" size={11} color={C.rejected} />
                      <Text style={styles.endedBadgeText}>Encerrado</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Bottom Nav igual à gestão ── */}
      <View style={[styles.bottomNavOuter, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.bottomNavInner}>
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={user?.role === 'admin' ? 0.75 : 1}
            onPress={() => user?.role === 'admin' && router.push('/(app)/create-event')}
          >
            <GradientIcon name="add-circle-outline" size={20} active={user?.role === 'admin'} />
            <Text style={user?.role === 'admin' ? styles.navLabel : styles.navLabelDisabled}>Registrar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/(app)')} activeOpacity={0.75}>
            <GradientIcon name="home" size={22} active />
            <Text style={styles.navLabelActive}>Início</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={user?.role === 'admin' ? 0.75 : 1}
            onPress={() => user?.role === 'admin' && router.push('/(app)/admin/registrations')}
          >
            <GradientIcon name="people-outline" size={20} active={user?.role === 'admin'} />
            <Text style={user?.role === 'admin' ? styles.navLabel : styles.navLabelDisabled}>Gestão</Text>
          </TouchableOpacity>
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.cardBorder,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  errorText: { color: '#F87171', fontSize: 13, textAlign: 'center' },
  retryBtn: { borderRadius: 20, overflow: 'hidden' },
  retryGradient: { paddingVertical: 10, paddingHorizontal: 24 },
  retryText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },

  // Borda gradiente
  cardBorderGradient: {
    borderRadius: 16, padding: 1.5,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 14.5,
    padding: 16, gap: 8,
  },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMetaText: { color: C.textSecondary, fontSize: 12, flex: 1 },

  // Badge Encerrado — vermelho
  endedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8, marginTop: 2,
  },
  endedBadgeText: { color: C.rejected, fontSize: 10, fontWeight: '700' },

  emptyBox: { paddingTop: 80, alignItems: 'center', gap: 12 },
  emptyText: { color: C.textMuted, fontSize: 14, textAlign: 'center' },

  // Bottom Nav
  bottomNavOuter: {
    backgroundColor: C.navBg,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 12, paddingTop: 8,
  },
  bottomNavInner: {
    flexDirection: 'row', width: '100%', maxWidth: 480,
    alignSelf: 'center', paddingBottom: 4, paddingHorizontal: 8,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 4 },
  navLabel: { color: C.textMuted, fontSize: 9, fontWeight: '500', letterSpacing: 0.3 },
  navLabelActive: { color: C.primary, fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  navLabelDisabled: { color: 'rgba(107,107,123,0.4)', fontSize: 9, fontWeight: '500' },
});
