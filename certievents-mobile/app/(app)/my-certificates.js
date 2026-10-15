import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useAuth } from '../../src/contexts/AuthContext';
import { API_BASE_URL } from '../../src/constants/api';
import { AppLogo } from '../../src/components/AppLogo';

const C = {
  bg: '#08070D',
  surface: '#0F0E17',
  navBg: '#0B0A12',
  card: '#13111F',
  cardBorder: '#1F1D2E',
  primary: '#7C5FE6',
  accent: '#A78BFA',
  gradientStart: '#8B5CF6',
  gradientEnd: '#6366F1',
  text: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textMuted: '#6B6B7B',
};

function formatCertDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export default function MyCertificatesScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const loadCertificates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) { setError('Você precisa estar autenticado.'); return; }
      const res = await fetch(`${API_BASE_URL}/certificates/user`, {
        headers: { 'Authorization': 'Bearer ' + token, 'bypass-tunnel-reminder': 'true' },
      });
      if (!res.ok) { setError('Não foi possível carregar seus certificados.'); return; }
      const data = await res.json();
      setCertificates(Array.isArray(data) ? data : []);
    } catch {
      setError('Erro ao conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { loadCertificates(); }, [loadCertificates]);

  const totalScore = certificates.length * 20;
  const totalPages = Math.ceil(certificates.length / PAGE_SIZE);
  const paginated = certificates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goFirst = () => setPage(1);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const goLast = () => setPage(totalPages);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Header igual à home ── */}
      <View style={styles.header}>
        <AppLogo size={30} textSize={16} tagline="MEUS CERTIFICADOS" />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtnWrapper} onPress={loadCertificates}>
            <LinearGradient colors={[C.gradientStart, C.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.retryGradient}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: 80 + insets.bottom }]}
        >
          {/* Score */}
          <LinearGradient
            colors={[C.gradientStart, C.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.scoreCard}
          >
            <Text style={styles.scoreValue}>{totalScore} pts</Text>
            <Text style={styles.scoreLabel}>{certificates.length} certificado(s) conquistado(s)</Text>
          </LinearGradient>

          {/* Lista */}
          {certificates.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="ribbon-outline" size={48} color={C.textMuted} />
              <Text style={styles.emptyText}>Nenhum certificado ainda.</Text>
              <Text style={styles.emptySubText}>Participe de eventos para conquistar certificados!</Text>
            </View>
          ) : (
            <>
              {paginated.map((cert) => {
                const eventId = cert.eventId?._id || cert.eventId;
                const eventName = cert.eventId?.name || 'Evento';
                const certDate = cert.readyAt || cert.eventId?.date;
                return (
                  <View key={cert._id} style={styles.certCard}>
                    <View style={styles.certCardHeader}>
                      <Text style={styles.certEventName}>{eventName}</Text>
                      <View style={styles.scoreBadge}>
                        <Text style={styles.scoreBadgeText}>+20 pts</Text>
                      </View>
                    </View>
                    <Text style={styles.certDate}>{formatCertDate(certDate)}</Text>
                    <View style={styles.certCardFooter}>
                      <View style={styles.issuedBadge}>
                        <Text style={styles.issuedBadgeText}>✓ Certificado Emitido</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.viewEventBtn}
                        onPress={() => router.push(`/(app)/event/${eventId}`)}
                        activeOpacity={0.75}
                      >
                        <LinearGradient
                          colors={[C.gradientStart, C.gradientEnd]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.viewEventGradient}
                        >
                          <Ionicons name="calendar-outline" size={12} color="#FFF" />
                          <Text style={styles.viewEventText}>Ver evento</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {/* ── Paginação ── */}
              {totalPages > 1 && (
                <View style={styles.pagination}>
                  {/* << */}
                  <TouchableOpacity style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]} onPress={goFirst} disabled={page === 1}>
                    <Ionicons name="play-skip-back" size={12} color={page === 1 ? C.textMuted : C.primary} />
                  </TouchableOpacity>
                  {/* < */}
                  <TouchableOpacity style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]} onPress={goPrev} disabled={page === 1}>
                    <Ionicons name="chevron-back" size={14} color={page === 1 ? C.textMuted : C.primary} />
                  </TouchableOpacity>

                  {/* Números */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === '...' ? (
                        <Text key={`ellipsis-${idx}`} style={styles.pageEllipsis}>…</Text>
                      ) : (
                        <TouchableOpacity
                          key={p}
                          style={[styles.pageBtn, p === page && styles.pageBtnActive]}
                          onPress={() => setPage(p)}
                        >
                          <Text style={[styles.pageBtnText, p === page && styles.pageBtnTextActive]}>{p}</Text>
                        </TouchableOpacity>
                      )
                    )}

                  {/* > */}
                  <TouchableOpacity style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]} onPress={goNext} disabled={page === totalPages}>
                    <Ionicons name="chevron-forward" size={14} color={page === totalPages ? C.textMuted : C.primary} />
                  </TouchableOpacity>
                  {/* >> */}
                  <TouchableOpacity style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]} onPress={goLast} disabled={page === totalPages}>
                    <Ionicons name="play-skip-forward" size={12} color={page === totalPages ? C.textMuted : C.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </>
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
          <MaskedView
            style={{ width: 22, height: 22 }}
            maskElement={
              <View style={{ backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="home" size={22} color="#000" />
              </View>
            }
          >
            <LinearGradient
              colors={[C.gradientStart, C.gradientEnd]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
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

  // Header igual à home
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  errorText: { color: '#F87171', fontSize: 14, textAlign: 'center' },
  retryBtnWrapper: { borderRadius: 20, overflow: 'hidden' },
  retryGradient: { paddingVertical: 10, paddingHorizontal: 24 },
  retryText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  scroll: { padding: 20, gap: 14 },

  scoreCard: {
    borderRadius: 16, padding: 24, alignItems: 'center', gap: 6, marginBottom: 6,
  },
  scoreValue: { color: '#FFF', fontSize: 42, fontWeight: '900', letterSpacing: -1 },
  scoreLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },

  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { color: C.textSecondary, fontSize: 16, fontWeight: '700' },
  emptySubText: { color: C.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  certCard: {
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.cardBorder, padding: 16, gap: 8,
  },
  certCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  certEventName: { color: C.text, fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  scoreBadge: {
    backgroundColor: 'rgba(124,95,230,0.2)', borderWidth: 1, borderColor: C.primary,
    borderRadius: 12, paddingVertical: 3, paddingHorizontal: 10,
  },
  scoreBadgeText: { color: C.accent, fontSize: 11, fontWeight: '700' },
  certDate: { color: C.textSecondary, fontSize: 12 },
  certCardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4,
  },
  issuedBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.5)', borderRadius: 12,
    paddingVertical: 3, paddingHorizontal: 10,
  },
  issuedBadgeText: { color: '#10B981', fontSize: 11, fontWeight: '700' },

  // Botão Ver Evento
  viewEventBtn: { borderRadius: 14, overflow: 'hidden' },
  viewEventGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14,
  },
  viewEventText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  // ── Paginação ──
  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingTop: 8, paddingBottom: 4,
  },
  pageBtn: {
    minWidth: 32, height: 32, borderRadius: 8,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  pageBtnActive: {
    backgroundColor: C.primary, borderColor: C.primary,
  },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },
  pageBtnTextActive: { color: '#FFF', fontWeight: '800' },
  pageEllipsis: { color: C.textMuted, fontSize: 13, paddingHorizontal: 2 },

  // Bottom Nav
  bottomNav: {
    backgroundColor: C.navBg,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 12,
    paddingTop: 8, alignItems: 'center',
  },
  navItem: { alignItems: 'center', gap: 3, paddingVertical: 4 },
  navLabel: { color: C.primary, fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
});
