import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useAuth } from '../../src/contexts/AuthContext';
import { API_BASE_URL } from '../../src/constants/api';
import { AppLogo } from '../../src/components/AppLogo';

// Mesma paleta da tela inicial
const C = {
  bg: '#08070D',
  surface: '#0F0E17',
  navBg: '#0B0A12',
  card: '#13111F',
  cardHover: '#1A1830',
  cardBorder: '#1F1D2E',
  primary: '#7C5FE6',
  accent: '#A78BFA',
  gradientStart: '#8B5CF6',
  gradientEnd: '#6366F1',
  text: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textMuted: '#6B6B7B',
  gold: '#F59E0B',
};

function GradientIcon({ name, size }) {
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
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size }}
      />
    </MaskedView>
  );
}

export default function RankingScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;
  const loadRanking = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE_URL}/ranking`, {
        headers: { 'bypass-tunnel-reminder': 'true' },
      });
      if (!res.ok) { setError('Não foi possível carregar o ranking.'); return; }
      const data = await res.json();
      setParticipants(Array.isArray(data) ? data : []);
    } catch {
      setError('Erro ao conectar ao servidor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadRanking(); }, [loadRanking]);
  const onRefresh = () => { setRefreshing(true); loadRanking(); };

  const filtered = participants.filter((p) =>
    !search || p.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset página ao mudar o search
  useEffect(() => { setPage(1); }, [search]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <AppLogo size={26} textSize={14} />
        <Text style={styles.headerTitle}>RANKING GERAL</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="wifi-outline" size={48} color={C.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadRanking}>
            <LinearGradient
              colors={[C.gradientStart, C.gradientEnd]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.retryGradient}
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: 80 + insets.bottom }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />
          }
        >
          {/* ── Campo de Busca ── */}
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={15} color={C.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar participante..."
              placeholderTextColor={C.textMuted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={15} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Lista completa ── */}
          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="trophy-outline" size={48} color={C.textMuted} />
              <Text style={styles.emptyTitle}>
                {search ? `Nenhum resultado para "${search}"` : 'Nenhum participante ainda.'}
              </Text>
              {!search && (
                <Text style={styles.emptySubText}>
                  Conquiste certificados para aparecer no ranking!
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.listWrapper}>
              {paginated.map((item) => {
                const isMe = isAuthenticated &&
                  (item.userId === user?._id || item.userId === user?.id);
                const initial = item.fullName?.[0]?.toUpperCase() || '?';
                const isTop3 = item.position <= 3;
                const posColor =
                  item.position === 1 ? C.gold
                  : item.position === 2 ? '#94A3B8'
                  : item.position === 3 ? '#CD7F32'
                  : C.textMuted;

                return (
                  <LinearGradient
                    key={item.userId}
                    colors={
                      isMe ? [C.gradientStart, C.gradientEnd]
                      : isTop3 ? [posColor, posColor + 'AA']
                      : [C.gradientStart, C.gradientEnd]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.rankBorderGradient}
                  >
                    <View style={[styles.rankRow, isMe && styles.rankRowMe]}>
                    {/* Posição */}
                    <Text style={[styles.rankPos, isTop3 && { color: posColor, fontSize: 14 }]}>
                      #{item.position}
                    </Text>

                    {/* Avatar */}
                    <View style={[
                      styles.rankAvatar,
                      isMe && { borderColor: C.primary },
                      isTop3 && { borderColor: posColor },
                    ]}>
                      {item.avatarUrl ? (
                        <Image
                          source={{ uri: (item.avatarUrl.startsWith('http') ? item.avatarUrl : `${API_BASE_URL}/uploads/${item.avatarUrl}`) + `?t=${Date.now()}` }}
                          style={styles.rankAvatarImg}
                        />
                      ) : (
                        <Text style={styles.rankInitial}>{initial}</Text>
                      )}
                    </View>

                    {/* Info */}
                    <View style={styles.rankInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[styles.rankName, isMe && { color: C.accent }]} numberOfLines={1}>
                          {item.fullName || 'Participante'}
                        </Text>
                        {isMe && (
                          <View style={styles.voceBadge}>
                            <Text style={styles.voceText}>VOCÊ</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.rankSub}>
                        {item.certificateCount} certificado{item.certificateCount !== 1 ? 's' : ''}
                      </Text>
                    </View>

                    {/* Pontuação */}
                    <Text style={[
                      styles.rankPts,
                      (isMe || isTop3) && { color: isTop3 ? posColor : C.gold },
                    ]}>
                      {item.score} pts
                    </Text>
                  </View>
                  </LinearGradient>
                );
              })}

              {/* ── Paginação ── */}
              {totalPages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]} onPress={() => setPage(1)} disabled={page === 1}>
                    <Ionicons name="play-skip-back" size={12} color={page === 1 ? C.textMuted : C.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]} onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <Ionicons name="chevron-back" size={14} color={page === 1 ? C.textMuted : C.primary} />
                  </TouchableOpacity>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...'); acc.push(p); return acc; }, [])
                    .map((p, idx) => p === '...' ? (
                      <Text key={`e${idx}`} style={styles.pageEllipsis}>…</Text>
                    ) : (
                      <TouchableOpacity key={p} style={[styles.pageBtn, p === page && styles.pageBtnActive]} onPress={() => setPage(p)}>
                        <Text style={[styles.pageBtnText, p === page && styles.pageBtnTextActive]}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  <TouchableOpacity style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]} onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <Ionicons name="chevron-forward" size={14} color={page === totalPages ? C.textMuted : C.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]} onPress={() => setPage(totalPages)} disabled={page === totalPages}>
                    <Ionicons name="play-skip-forward" size={12} color={page === totalPages ? C.textMuted : C.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Bottom Nav — só Início ── */}
      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.75}
          onPress={() => router.replace('/(app)')}
          accessibilityLabel="Início"
        >
          <View style={styles.activeGlow}>
            <GradientIcon name="home" size={22} />
          </View>
          <Text style={styles.navLabelActive}>Início</Text>
          <View style={styles.navIndicator} />
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    gap: 4,
  },
  headerTitle: {
    color: C.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // States
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 32 },
  errorText: { color: '#F87171', fontSize: 14, textAlign: 'center' },
  retryBtn: { borderRadius: 20, overflow: 'hidden' },
  retryGradient: { paddingVertical: 10, paddingHorizontal: 28 },
  retryText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  // Scroll
  scroll: { padding: 16 },

  // Busca
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.cardBorder,
    paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 13 },

  // Lista
  listWrapper: { gap: 8 },

  rankBorderGradient: { borderRadius: 16, padding: 1.5 },
  rankRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.cardHover,
    borderRadius: 14.5,
    paddingVertical: 13, paddingHorizontal: 14, gap: 12,
  },
  rankRowMe: {
    backgroundColor: 'rgba(124,95,230,0.10)',
  },
  rankPos: {
    color: C.textMuted, fontSize: 12, fontWeight: '700',
    width: 30, textAlign: 'center',
  },
  rankAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.surface,
    borderWidth: 2, borderColor: C.cardBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  rankInitial: { color: C.text, fontSize: 17, fontWeight: '800' },
  rankAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  rankInfo: { flex: 1 },
  rankName: { color: C.text, fontSize: 14, fontWeight: '700' },
  rankSub: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  rankPts: { color: C.textSecondary, fontSize: 14, fontWeight: '800' },

  voceBadge: {
    backgroundColor: C.primary, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  voceText: { color: '#FFF', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },

  // Paginação
  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingTop: 12, paddingBottom: 4,
  },
  pageBtn: {
    minWidth: 32, height: 32, borderRadius: 8,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  pageBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },
  pageBtnTextActive: { color: '#FFF', fontWeight: '800' },
  pageEllipsis: { color: C.textMuted, fontSize: 13, paddingHorizontal: 2 },

  // Empty
  emptyBox: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  emptyTitle: { color: C.textSecondary, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptySubText: { color: C.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // Bottom Nav
  bottomNav: {
    backgroundColor: C.navBg,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 12,
    paddingTop: 8,
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center', justifyContent: 'center',
    gap: 3, paddingVertical: 4, position: 'relative',
  },
  navLabelActive: {
    color: C.primary, fontSize: 9, fontWeight: '700', letterSpacing: 0.3,
  },
  navIndicator: {
    position: 'absolute', bottom: -8,
    width: 20, height: 2, borderRadius: 1, backgroundColor: C.primary,
  },
  activeGlow: {
    shadowColor: C.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 8, elevation: 4,
  },
});
