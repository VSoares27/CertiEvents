import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  ImageBackground,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { fetchEvents } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { API_BASE_URL } from '../../src/constants/api';

// ── Paleta ───────────────────────────────────────────────────
const C = {
  bg: '#08070D',
  surface: '#0F0E17',
  navBg: '#0B0A12',
  card: '#13111F',
  cardBorder: '#1F1D2E',
  primary: '#7C5FE6',
  primaryDark: '#5B3FD6',
  gradientStart: '#8B5CF6',
  gradientEnd: '#6366F1',
  text: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textMuted: '#6B6B7B',
  live: '#EF4444',
  presencial: '#10B981',
  certBadgeBg: 'rgba(124,95,230,0.15)',
  certBadgeText: '#A78BFA',
};

const ACCENT_COLORS = [
  '#34D399', // verde
  '#EC4899', // rosa
  '#3B82F6', // azul
  '#F59E0B', // amarelo
  '#A78BFA', // roxo
];

const FALLBACK_BANNER =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80';

const FALLBACK_THUMBS = [
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400&q=80',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&q=80',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80',
];

// ── Helpers ──────────────────────────────────────────────────
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}  ·  ${hour}:${min}`;
}

function getStatusLabel(status) {
  switch (status) {
    case 'ongoing': return 'AO VIVO';
    case 'upcoming': return 'PRESENCIAL';
    case 'finished': return 'ENCERRADO';
    default: return 'PRESENCIAL';
  }
}

// ── Componente: Risco duplo no canto superior direito ────────
function AccentStreak({ color, size = 70 }) {
  const BOX = size * 2;
  const HALF = size;

  // Adiciona '00' ao final da cor HEX para torná-la transparente e o gradiente ficar suave.
  const transparentColor = color + '00';

  return (
    <View
      style={{
        width: size,
        height: size,
        overflow: 'hidden',
        borderTopRightRadius: 14,
        position: 'absolute',
        top: 0,
        right: 0,
      }}
      pointerEvents="none"
    >
      <View
        style={{
          position: 'absolute',
          top: -HALF,
          right: -HALF,
          width: BOX,
          height: BOX,
          transform: [{ rotate: '-45deg' }],
        }}
      >
        {/* ── Risco MAIOR (grosso e mais longo) ─────────────────────── */}
        <LinearGradient
          colors={[transparentColor, color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: 'absolute',
            top: HALF,
            right: HALF,
            width: 60,
            height: 2,      // Espessura maior
            borderRadius: 2,
          }}
        />

        {/* ── Risco MENOR (fino, curto e deslocado) ── */}
        <LinearGradient
          colors={[transparentColor, color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: 'absolute',
            top: HALF + 6,  // Afasta 6px da linha principal
            right: HALF + 4, // Começa ligeiramente depois do canto
            width: 35,       // Mais curto
            height: 1,       // Espessura bem fina
            borderRadius: 1,
            opacity: 0.8,    // Levemente mais apagado
          }}
        />
      </View>
    </View>
  );
}

// ── LOGO ─────────────────────────────────────────────────────
function LogoMark({ size = 22 }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          position: 'absolute', top: 0, right: 0, width: 0, height: 0,
          borderStyle: 'solid',
          borderRightWidth: size * 0.55,
          borderTopWidth: size * 0.85,
          borderRightColor: 'transparent',
          borderTopColor: '#8B5CF6',
          transform: [{ rotate: '15deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute', bottom: 0, left: 0, width: 0, height: 0,
          borderStyle: 'solid',
          borderLeftWidth: size * 0.45,
          borderBottomWidth: size * 0.75,
          borderLeftColor: 'transparent',
          borderBottomColor: '#7C5FE6',
          transform: [{ rotate: '-10deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute', top: size * 0.25, left: size * 0.15,
          width: size * 0.3, height: size * 0.3,
          backgroundColor: '#A78BFA',
          transform: [{ rotate: '45deg' }],
          opacity: 0.9,
          borderRadius: 1,
        }}
      />
    </View>
  );
}

// ── Ícone com gradiente ──────────────────────────────────────
function GradientIcon({ name, size, active }) {
  if (!active) {
    return <Ionicons name={name} size={size} color={C.textMuted} />;
  }
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
        style={{ flex: 1 }}
      />
    </MaskedView>
  );
}

// ── Badge ────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const isLive = status === 'ongoing';
  return (
    <View style={[styles.badge, isLive ? styles.badgeLive : styles.badgePresencial]}>
      {isLive && <View style={styles.liveDot} />}
      <Text style={[styles.badgeText, isLive ? styles.badgeTextLive : styles.badgeTextPresencial]}>
        {getStatusLabel(status)}
      </Text>
    </View>
  );
}

function getImageUrl(imageUrl, fallback) {
  if (!imageUrl) return fallback;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return `${API_BASE_URL}/uploads/${imageUrl}`;
}

// ── Featured Card ────────────────────────────────────────────
function FeaturedEventCard({ event, onParticipate }) {
  const bannerSource = getImageUrl(event.imageUrl, FALLBACK_BANNER);
  const categoryName = event.categoryId?.name || event.categoryId;

  return (
    <View style={styles.featuredCard}>
      <ImageBackground
        source={{ uri: bannerSource }}
        style={styles.featuredImage}
        imageStyle={{ borderRadius: 18 }}
      >
        <LinearGradient
          colors={['rgba(8,7,13,0.15)', 'rgba(8,7,13,0.55)', 'rgba(8,7,13,0.98)']}
          locations={[0, 0.5, 1]}
          style={styles.featuredGradient}
        />
        <View style={styles.featuredTopRow}>
          <StatusBadge status={event.status} />
          <View style={styles.featuredTags}>
            {categoryName ? (
              <Text style={[styles.featuredTagText, { color: '#A78BFA' }]}>
                {categoryName.toUpperCase()}
              </Text>
            ) : null}
            <Text style={styles.featuredTagText}>IDEIAS</Text>
            <Text style={styles.featuredTagText}>PROCESSOS</Text>
            <Text style={styles.featuredTagText}>RESULTADOS</Text>
          </View>
        </View>
        <View style={styles.featuredContent}>
          <Text style={styles.featuredEventNumber}>
            #{String(event._id || '03').slice(-2)}
          </Text>
          <Text style={styles.featuredTitle}>{event.name}</Text>
          <View style={styles.featuredMeta}>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.metaText}>{formatDate(event.date)}</Text>
            </View>
            {event.location ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={styles.metaText}>{event.location}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => onParticipate(event)}
            activeOpacity={0.85}
            style={styles.featuredBtnWrapper}
          >
            <LinearGradient
              colors={[C.gradientStart, C.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.featuredBtn}
            >
              <Text style={styles.featuredBtnText}>PARTICIPAR</Text>
              <Ionicons name="arrow-forward" size={15} color="#FFF" style={{ marginLeft: 6 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}

// ── List Card ────────────────────────────────────────────────
function EventListCard({ event, index, onPress }) {
  const thumbSource = getImageUrl(
    event.imageUrl,
    FALLBACK_THUMBS[index % FALLBACK_THUMBS.length]
  );

  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];

  const dateObj = event.date ? new Date(event.date) : new Date();
  const day = String(dateObj.getDate()).padStart(2, '0');
  const monthShort = [
    'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
    'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
  ][dateObj.getMonth()];
  const year = dateObj.getFullYear();
  const hour = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');

  // Categoria e Espaço dinâmicos
  const categoryName = event.categoryId?.name || (typeof event.categoryId === 'string' ? event.categoryId : '') || 'WORKSHOP';
  const spaceName = event.spaceId?.name || (typeof event.spaceId === 'string' ? event.spaceId : '');
  const displayLocal = (spaceName || event.location || 'AUDITÓRIO').toUpperCase();
  const eventTypeLabel = (event.type || 'presencial').toUpperCase();

  return (
    <View style={styles.eventCard}>
      {/* Risco duplo no canto sup. direito */}
      <View style={styles.accentCorner}>
        <AccentStreak color={accent} size={70} />
      </View>

      {/* ── HEADER ───────────────────────────────── */}
      <View style={styles.eventCardHeader}>
        <Text style={styles.eventCardNumber}>
          #{String(index + 1).padStart(2, '0')}
        </Text>
        <Text style={styles.eventCardSlash}>//</Text>
        <Text style={styles.eventCardTitle} numberOfLines={1}>
          {event.name?.toUpperCase()}
        </Text>
      </View>

      {/* ── BODY: DATA | IMAGEM ───────────────────── */}
      <View style={styles.eventCardBody}>
        <View style={styles.eventCardDateCol}>
          <Text style={styles.eventCardDateLabel}>DATA</Text>
          <Text style={styles.eventCardDateDay}>{day}</Text>
          <Text style={styles.eventCardDateMonth}>
            {monthShort} {year}
          </Text>
        </View>

        <View style={styles.eventCardImageWrapper}>
          <ImageBackground
            source={{ uri: thumbSource }}
            style={styles.eventCardImage}
          >
            <LinearGradient
              colors={['rgba(8,7,13,0.1)', 'rgba(8,7,13,0.4)']}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.eventCardTagsCol}>
              {/* Categoria acima de PRESENCIAL */}
              {categoryName ? (
                <View style={styles.eventCardCategoryTag}>
                  <Text style={styles.eventCardCategoryText}>
                    {String(categoryName).toUpperCase()}
                  </Text>
                </View>
              ) : null}

              {/* Tag PRESENCIAL / ONLINE */}
              <View style={styles.eventCardStatusTag}>
                <Text style={styles.eventCardStatusText}>
                  {eventTypeLabel}
                </Text>
              </View>
            </View>

            <View style={styles.eventCardAvailabilityTag}>
              <Text style={styles.eventCardAvailabilityText}>LIVRE</Text>
            </View>
          </ImageBackground>
        </View>
      </View>

      {/* ── FAIXA: HORÁRIO | LOCAL ────────────────── */}
      <View style={styles.eventCardInfoRow}>
        <View style={styles.eventCardInfoCol}>
          <Text style={styles.eventCardInfoLabel}>HORÁRIO</Text>
          <Text style={styles.eventCardInfoValue}>
            {hour}:{min} BRT
          </Text>
        </View>
        <View style={styles.eventCardInfoDivider} />
        <View style={styles.eventCardInfoCol}>
          <Text style={styles.eventCardInfoLabel}>INSTITUIÇÃO</Text>
          <Text style={styles.eventCardInfoValue}>
            {event.location?.toUpperCase() || 'IFPE / IGARASSU'}
          </Text>
        </View>
      </View>

      {/* ── LOCAL (dinâmico: Espaço cadastrado) ────── */}
      <View style={styles.eventCardLocationRow}>
        <Text style={styles.eventCardLocationLine}>
          LOCAL:  {displayLocal}
        </Text>
        <View style={styles.eventCardDashedLine} />
      </View>

      {/* ── BOTÃO ─────────────────────────────────── */}
      <View style={styles.eventCardBtnRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onPress(event)}
          style={styles.eventCardBtnWrapper}
        >
          <LinearGradient
            colors={[C.gradientStart, C.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.eventCardBtn}
          >
            <Text style={styles.eventCardBtnText}>PARTICIPAR DO EVENTO</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Home Screen ──────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadEvents = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchEvents();
      setEvents(data);
    } catch (err) {
      setError('Não foi possível carregar os eventos.');
      console.error('Erro ao buscar eventos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const handleParticipate = (event) => {
    if (isAuthenticated) {
      router.push(`/(app)/event/${event._id}`);
    } else {
      router.push('/(auth)/login');
    }
  };

  const featuredEvent = events.find((e) => e.status === 'ongoing') || events[0];
  const upcomingEvents = events.filter((e) => e !== featuredEvent);
  const bottomInset = insets.bottom;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Carregando eventos...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + bottomInset },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        <View style={styles.contentWrapper}>

          {/* ── Header ───────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.logoRow}>
                <LogoMark size={22} />
                <View>
                  <Text style={styles.logoText}>CERTIEVENT™</Text>
                  <Text style={styles.logoTagline}>PLATAFORMA DE EVENTOS</Text>
                </View>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => router.push('/(app)/create-event')}
                accessibilityLabel="Cadastrar Evento"
              >
                <Ionicons name="add" size={22} color={C.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="notifications-outline" size={18} color={C.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.avatarBtn}
                onPress={() => !isAuthenticated && router.push('/(auth)/login')}
              >
                <LinearGradient
                  colors={[C.gradientStart, C.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarText}>
                    {isAuthenticated ? user?.fullName?.[0]?.toUpperCase() : '?'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Greeting ─────────────────────── */}
          <View style={styles.greetingBlock}>
            <Text style={styles.greetingText}>
              Olá,{' '}
              <Text style={styles.greetingName}>
                {isAuthenticated ? user?.fullName?.split(' ')[0] : 'Visitante'}!
              </Text>
            </Text>
            <Text style={styles.greetingSubtitle}>
              Conecte-se, aprenda e conquiste seus certificados.
            </Text>
          </View>

          {/* ── Stats ────────────────────────── */}
          <View style={styles.statsRow}>
            <View style={styles.statsBox}>
              <View style={styles.statItem}>
                <View style={styles.statIconWrapper}>
                  <Ionicons name="calendar-outline" size={14} color={C.primary} />
                </View>
                <View>
                  <Text style={styles.statNumber}>{events.length}</Text>
                  <Text style={styles.statLabel}>eventos disponíveis</Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={styles.statIconWrapper}>
                  <Ionicons name="trophy-outline" size={14} color={C.primary} />
                </View>
                <View>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>certificados conquistados</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Erro ─────────────────────────── */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadEvents}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ── Featured ─────────────────────── */}
          {featuredEvent ? (
            <FeaturedEventCard event={featuredEvent} onParticipate={handleParticipate} />
          ) : (
            !error && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Nenhum evento disponível.</Text>
              </View>
            )
          )}

          {/* ── Próximos ─────────────────────── */}
          {upcomingEvents.length > 0 ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>PRÓXIMOS EVENTOS</Text>
              <TouchableOpacity>
                <Text style={styles.sectionLink}>VER TODOS →</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {upcomingEvents.map((event, idx) => (
            <EventListCard
              key={event._id}
              event={event}
              index={idx}
              onPress={handleParticipate}
            />
          ))}

          {/* ── Cert Banner ──────────────────── */}
          <View style={styles.certBanner}>
            <LinearGradient
              colors={['rgba(124,95,230,0.18)', 'rgba(99,102,241,0.10)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.certBannerIcon}
            >
              <Ionicons name="ribbon-outline" size={22} color={C.primary} />
            </LinearGradient>
            <View style={styles.certBannerContent}>
              <Text style={styles.certBannerLabel}>CERTIFICAÇÃO</Text>
              <Text style={styles.certBannerTitle}>Auto-homologada</Text>
              <Text style={styles.certBannerDesc}>
                Garanta seu certificado de participação de forma rápida e simples.
              </Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.certBannerLink}>SAIBA MAIS →</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* ── Bottom Nav ───────────────────────── */}
      <View
        style={[
          styles.bottomNavOuter,
          { paddingBottom: Math.max(bottomInset, 8) },
        ]}
      >
        <View style={styles.bottomNavInner}>
          <TouchableOpacity style={styles.navItem}>
            <GradientIcon name="home" size={20} active />
            <Text style={styles.navLabelActive}>Início</Text>
            <View style={styles.navActiveIndicator} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <GradientIcon name="calendar-outline" size={20} />
            <Text style={styles.navLabel}>Agenda</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <GradientIcon name="grid-outline" size={20} />
            <Text style={styles.navLabel}>Meus Eventos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => !isAuthenticated && router.push('/(auth)/login')}
          >
            <GradientIcon name="person-outline" size={20} />
            <Text style={styles.navLabel}>Perfil</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },

  contentWrapper: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
    gap: 16,
  },
  loadingText: { color: C.textSecondary, fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  headerLeft: { flex: 1, marginRight: 8 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { color: C.text, fontSize: 15, fontWeight: '800', letterSpacing: 1.2 },
  logoTagline: {
    color: C.textMuted,
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 3,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.cardBorder,
  },
  avatarBtn: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  avatarGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Greeting
  greetingBlock: { paddingTop: 12, paddingBottom: 14 },
  greetingText: {
    color: C.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  greetingName: { color: C.primary },
  greetingSubtitle: {
    color: C.textSecondary,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },

  // Stats
  statsRow: { marginBottom: 18 },
  statsBox: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  statIconWrapper: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(124,95,230,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  statNumber: { color: C.text, fontSize: 18, fontWeight: '800', lineHeight: 20 },
  statLabel: { color: C.textMuted, fontSize: 9, lineHeight: 11, marginTop: 1 },
  statDivider: {
    width: 1, height: 34,
    backgroundColor: C.cardBorder, marginHorizontal: 8,
  },

  // Error
  errorBox: {
    marginBottom: 16, backgroundColor: '#1A0A0A',
    borderRadius: 12, borderWidth: 1, borderColor: '#5A1A1A',
    padding: 14, alignItems: 'center', gap: 10,
  },
  errorText: { color: '#F87171', fontSize: 12, textAlign: 'center' },
  retryBtn: {
    backgroundColor: C.primary, paddingVertical: 8,
    paddingHorizontal: 20, borderRadius: 20,
  },
  retryText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  // ── Featured card ────────────────────────────────────
  featuredCard: {
    borderRadius: 18, overflow: 'hidden',
    marginBottom: 22, backgroundColor: C.card,
  },
  featuredImage: { minHeight: 340, justifyContent: 'space-between' },
  featuredGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 18 },
  featuredTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', padding: 14,
  },
  featuredTags: { alignItems: 'flex-end', gap: 2 },
  featuredTagText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 8, letterSpacing: 1.5, fontWeight: '600',
  },
  featuredContent: { padding: 16, paddingTop: 0, paddingBottom: 18 },
  featuredEventNumber: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12, fontWeight: '500', marginBottom: 4,
  },
  featuredTitle: {
    color: '#FFF', fontSize: 24, fontWeight: '800',
    marginBottom: 10, lineHeight: 30, letterSpacing: -0.3,
  },
  featuredMeta: { gap: 5, marginBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  featuredBtnWrapper: {
    alignSelf: 'flex-start', borderRadius: 24, overflow: 'hidden',
    shadowColor: C.gradientStart,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  featuredBtn: {
    paddingVertical: 11, paddingHorizontal: 22,
    flexDirection: 'row', alignItems: 'center', borderRadius: 24,
  },
  featuredBtnText: {
    color: '#FFF', fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
  },

  // ── Badge ────────────────────────────────────────────
  badge: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 3, paddingHorizontal: 8,
    borderRadius: 20, gap: 5,
  },
  badgeLive: {
    backgroundColor: 'rgba(239,68,68,0.18)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.6)',
  },
  badgePresencial: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.6)',
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.live },
  badgeText: { fontSize: 8, fontWeight: '700', letterSpacing: 1.2 },
  badgeTextLive: { color: C.live },
  badgeTextPresencial: { color: C.presencial },

  // ── Section header ───────────────────────────────────
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14, marginTop: 4,
  },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  sectionLink: {
    color: C.textSecondary, fontSize: 10, letterSpacing: 0.5, fontWeight: '600',
  },

  // ── Event Card ───────────────────────────────────────
  eventCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  // Container do risco: 70x70 no canto sup. direito
  accentCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 70,
    height: 70,
    overflow: 'hidden',
    borderTopRightRadius: 14,
    zIndex: 10,
  },

  // Header
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    gap: 6,
    paddingRight: 70,
  },
  eventCardNumber: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  eventCardSlash: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  eventCardTitle: {
    color: C.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    flex: 1,
    flexShrink: 1,
  },

  // Body: DATA | IMAGEM
  eventCardBody: {
    flexDirection: 'row',
    minHeight: 150,
  },
  eventCardDateCol: {
    width: 100,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: C.cardBorder,
  },
  eventCardDateLabel: {
    color: C.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  eventCardDateDay: {
    color: C.text,
    fontSize: 44,
    fontWeight: '900',
    lineHeight: 48,
    letterSpacing: -2,
  },
  eventCardDateMonth: {
    color: C.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },

  eventCardImageWrapper: {
    flex: 1,
    position: 'relative',
  },
  eventCardImage: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 8,
  },

  eventCardTagsCol: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    gap: 4,
  },
  eventCardCategoryTag: {
    backgroundColor: '#FACC15', // Amarelo vibrante conforme a ilustração do usuário
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  eventCardCategoryText: {
    color: '#08070D',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  eventCardStatusTag: {
    backgroundColor: 'rgba(8,7,13,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  eventCardStatusText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },

  eventCardAvailabilityTag: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(8,7,13,0.85)',
    borderWidth: 1,
    borderColor: C.presencial,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  eventCardAvailabilityText: {
    color: C.presencial,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // Faixa HORÁRIO | LOCAL
  eventCardInfoRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 6,
  },
  eventCardInfoCol: { flex: 1, gap: 2 },
  eventCardInfoDivider: {
    width: 1, height: 26,
    backgroundColor: C.cardBorder, marginHorizontal: 12,
  },
  eventCardInfoLabel: {
    color: C.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  eventCardInfoValue: {
    color: C.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Local (centralizado)
  eventCardLocationRow: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    alignItems: 'center',
    gap: 10,
  },
  eventCardLocationLine: {
    color: C.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
  },
  eventCardDashedLine: {
    width: '90%',
    height: 0,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderStyle: 'dashed',
    borderRadius: 1,
  },

  // Botão
  eventCardBtnRow: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    alignItems: 'center',
  },
  eventCardBtnWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: C.gradientStart,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  eventCardBtn: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  eventCardBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // Cert banner
  certBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 20, marginBottom: 8,
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.cardBorder,
    padding: 14, gap: 12,
  },
  certBannerIcon: {
    width: 44, height: 44, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  certBannerContent: { flex: 1 },
  certBannerLabel: { color: C.primary, fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  certBannerTitle: { color: C.text, fontSize: 13, fontWeight: '700', marginTop: 2 },
  certBannerDesc: { color: C.textSecondary, fontSize: 9, marginTop: 3, lineHeight: 12 },
  certBannerLink: { color: C.primary, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  // Empty
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyText: { color: C.textSecondary, fontSize: 13 },

  // ── Bottom nav ───────────────────────────────────────
  bottomNavOuter: {
    backgroundColor: C.navBg,
    borderTopWidth: 1, borderTopColor: C.cardBorder,
    ...Platform.select({
      web: { boxShadow: '0 -8px 20px rgba(0,0,0,0.5)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 12,
      },
    }),
  },
  bottomNavInner: {
    flexDirection: 'row',
    width: '100%', maxWidth: 480,
    alignSelf: 'center',
    paddingTop: 8, paddingBottom: 8, paddingHorizontal: 8,
  },
  navItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 3, paddingVertical: 4, position: 'relative',
  },
  navLabel: {
    color: C.textMuted, fontSize: 9, fontWeight: '500', letterSpacing: 0.3,
  },
  navLabelActive: {
    color: C.primary, fontSize: 9, fontWeight: '700', letterSpacing: 0.3,
  },
  navActiveIndicator: {
    position: 'absolute', bottom: -8,
    width: 20, height: 2, borderRadius: 1, backgroundColor: C.primary,
  },
});