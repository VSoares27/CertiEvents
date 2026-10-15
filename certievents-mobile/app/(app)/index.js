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
  Image,
  Modal,
  Animated,
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
import { AppLogo } from '../../src/components/AppLogo';
import { useAudioPlayer } from 'expo-audio';

const notificationSound = require('../../assets/sounds/notification.mp3');

// ── Paleta ───────────────────────────────────────────────────
const C = {
  bg: '#08070D',
  surface: '#0F0E17',
  navBg: '#0B0A12',
  card: '#13111F',
  cardHover: '#1A1830',
  cardBorder: '#1F1D2E',
  primary: '#7C5FE6',
  primaryDark: '#5B3FD6',
  accent: '#A78BFA',
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

function formatDateRange(dateString, endDateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const start = `${hour}:${min}`;
  if (endDateString) {
    const end = new Date(endDateString);
    const eHour = String(end.getHours()).padStart(2, '0');
    const eMin = String(end.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}  ·  ${start} às ${eHour}:${eMin}`;
  }
  return `${day} ${month} ${year}  ·  ${start}`;
}

function getStatusLabel(status) {
  switch (status) {
    case 'ongoing': return 'AO VIVO';
    case 'upcoming': return 'PRESENCIAL';
    case 'finished': return 'ENCERRADO';
    default: return 'PRESENCIAL';
  }
}

// Verifica pelo horário atual se o evento está acontecendo agora
function computeEventStatus(event) {
  const now = new Date();
  const start = event.date ? new Date(event.date) : null;
  if (!start) return event.status || 'upcoming';

  // Fim: usa endDate se existir, senão assume +2h após o início
  const end = event.endDate
    ? new Date(event.endDate)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  if (now >= start && now <= end) return 'ongoing';
  if (now > end) return 'finished';
  return 'upcoming';
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
            opacity: 0.9,
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
function StatusBadge({ event }) {
  const status = computeEventStatus(event);
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

// ── Hook de animação de pulso suave ──────────────────────────
function usePulse() {
  const scale = React.useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.035, duration: 1800, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [scale]);
  return scale;
}

// ── Featured Banner (independente de eventos — editavel pelo admin) ──
function FeaturedBannerCard({ banner, isAdmin, onEdit }) {
  const bannerSource = getImageUrl(banner.imageUrl, FALLBACK_BANNER);
  // Verifica se o destaque esta "ao vivo" pelo horario
  const now = new Date();
  const start = banner.date ? new Date(banner.date) : null;
  const end = banner.endDate
    ? new Date(banner.endDate)
    : (start ? new Date(start.getTime() + 2 * 60 * 60 * 1000) : null);
  const isLive = start && end && now >= start && now <= end;

  return (
    <LinearGradient
      colors={[C.gradientStart, C.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.featuredCardBorder}
    >
    <View style={styles.featuredCard}>
      <ImageBackground
        source={{ uri: bannerSource }}
        style={styles.featuredImage}
        imageStyle={{ borderRadius: 18 }}
      >
        <LinearGradient
          colors={['rgba(8,7,13,0.45)', 'rgba(8,7,13,0.10)', 'rgba(8,7,13,0.70)', 'rgba(8,7,13,0.98)']}
          locations={[0, 0.25, 0.6, 1]}
          style={styles.featuredGradient}
        />

        {/* Topo: badge AO VIVO + botao editar (admin) */}
        <View style={styles.featuredTopRow}>
          {isLive ? (
            <View style={[styles.badge, styles.badgeLive]}>
              <View style={styles.liveDot} />
              <Text style={[styles.badgeText, styles.badgeTextLive]}>AO VIVO</Text>
            </View>
          ) : <View />}
          {isAdmin && (
            <TouchableOpacity
              style={styles.editIconBtn}
              onPress={onEdit}
              activeOpacity={0.75}
              accessibilityLabel="Editar destaque"
            >
              <Ionicons name="pencil" size={14} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Conteudo: titulo + metadata */}
        <View style={styles.featuredContent}>
          <Text style={styles.featuredTitle}>{banner.title || 'Destaque'}</Text>
          {banner.subtitle ? (
            <Text style={styles.featuredSubtitle}>{banner.subtitle}</Text>
          ) : null}
          <View style={styles.featuredMeta}>
            {banner.date ? (
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.75)" />
                <Text style={styles.metaText}>
                  {formatDateRange(banner.date, banner.endDate)}
                </Text>
              </View>
            ) : null}
            {banner.location ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.75)" />
                <Text style={styles.metaText}>{banner.location}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ImageBackground>
    </View>
    </LinearGradient>
  );
}

// ── Featured Card (evento) ───────────────────────────────────
function FeaturedEventCard({ event, onParticipate }) {
  const bannerSource = getImageUrl(event.imageUrl, FALLBACK_BANNER);
  const categoryName = event.categoryId?.name || event.categoryId;
  const pulseScale = usePulse();

  return (
    <LinearGradient
      colors={[C.gradientStart, C.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.featuredCardBorder}
    >
    <View style={styles.featuredCard}>
      <ImageBackground
        source={{ uri: bannerSource }}
        style={styles.featuredImage}
        imageStyle={{ borderRadius: 18 }}
      >
        <LinearGradient
          colors={['rgba(8,7,13,0.55)', 'rgba(8,7,13,0.10)', 'rgba(8,7,13,0.60)', 'rgba(8,7,13,0.98)']}
          locations={[0, 0.25, 0.6, 1]}
          style={styles.featuredGradient}
        />
        <View style={styles.featuredTopRow}>
          {/* Badge AO VIVO só quando o evento estiver acontecendo */}
          {computeEventStatus(event) === 'ongoing' && <StatusBadge event={event} />}
          <View style={{ flex: 1 }} />
        </View>
        <View style={styles.featuredContent}>
          <Text style={styles.featuredEventNumber}>
            #{String(event._id || '03').slice(-2)}
          </Text>
          <Text style={styles.featuredTitle}>{event.name}</Text>
          <View style={styles.featuredMeta}>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.metaText}>{formatDateRange(event.date, event.endDate)}</Text>
            </View>
            {event.location ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={styles.metaText}>{event.location}</Text>
              </View>
            ) : null}
            {event.ratingCount > 0 && (
              <View style={styles.metaRow}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={[styles.metaText, { color: '#10B981', fontWeight: '700' }]}>
                  {Math.round((event.ratingAverage / 5) * 100)}% aprovação
                </Text>
                <Text style={styles.metaText}>({event.ratingCount} votos)</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => onParticipate(event)}
            activeOpacity={0.75}
            style={styles.featuredBtnWrapper}
          >
            <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
              <LinearGradient
                colors={[C.gradientStart, C.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.featuredBtn}
              >
                <Text style={styles.featuredBtnText}>PARTICIPAR</Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
    </LinearGradient>
  );
}

// ── List Card ────────────────────────────────────────────────
function EventListCard({ event, index, onPress }) {
  const pulseScale = usePulse();
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
        <Text style={styles.eventCardTitle}>
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
            {hour}:{min}{event.endDate ? ` - ${String(new Date(event.endDate).getHours()).padStart(2,'0')}:${String(new Date(event.endDate).getMinutes()).padStart(2,'0')}` : ''} BRT
          </Text>
        </View>
        <View style={styles.eventCardInfoDivider} />
        <View style={styles.eventCardInfoCol}>
          <Text style={styles.eventCardInfoLabel}>INSTITUIÇÃO</Text>
          <Text style={styles.eventCardInfoValue}>
            {event.location?.toUpperCase() || 'IFPE / IGARASSU'}
          </Text>
        </View>
        {event.ratingCount > 0 && (
          <>
            <View style={styles.eventCardInfoDivider} />
            <View style={styles.eventCardInfoCol}>
              <Text style={styles.eventCardInfoLabel}>APROVAÇÃO</Text>
              <Text style={[styles.eventCardInfoValue, { color: '#10B981' }]}>
                {Math.round((event.ratingAverage / 5) * 100)}%
              </Text>
            </View>
          </>
        )}
      </View>

      {/* ── LOCAL (dinâmico: Espaço cadastrado) ────── */}
      <View style={styles.eventCardLocationRow}>
        <Text style={styles.eventCardLocationLabel}>LOCAL:</Text>
        <Text style={styles.eventCardLocationValue}>{displayLocal}</Text>
      </View>

      {/* ── BOTÃO ─────────────────────────────────── */}
      <View style={styles.eventCardBtnRow}>
        <TouchableOpacity
          activeOpacity={0.75}
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
  const { isAuthenticated, user, hasStoredToken, getToken } = useAuth();
  const insets = useSafeAreaInsets();

  const [events, setEvents] = useState([]);
  const [featuredBanner, setFeaturedBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifModal, setNotifModal] = useState(false);

  // Som e animação de balanço do sino ao chegar notificação nova
  const notificationPlayer = useAudioPlayer(notificationSound);
  const bellShake = React.useRef(new Animated.Value(0)).current;
  const prevUnreadCount = React.useRef(0);
  const hasLoadedNotifOnce = React.useRef(false);

  const triggerBellAlert = useCallback(() => {
    // Som
    try {
      notificationPlayer.seekTo(0);
      notificationPlayer.play();
    } catch { /* ignora falha de audio (ex: web sem interação do usuário) */ }

    // Animação de balanço (shake) do ícone do sino — roda em loop por ~2s
    bellShake.setValue(0);
    const oneShake = Animated.sequence([
      Animated.timing(bellShake, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(bellShake, { toValue: -1, duration: 90, useNativeDriver: true }),
      Animated.timing(bellShake, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(bellShake, { toValue: -1, duration: 90, useNativeDriver: true }),
      Animated.timing(bellShake, { toValue: 0, duration: 90, useNativeDriver: true }),
    ]);
    // Cada ciclo dura 450ms; 5 repetições ≈ 2.25s de balanço contínuo
    Animated.loop(oneShake, { iterations: 5 }).start();
  }, [notificationPlayer, bellShake]);

  const loadEvents = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchEvents();
      setEvents(data);
      // Busca o banner de destaque customizado (independente)
      try {
        const res = await fetch(`${API_BASE_URL}/featured`, {
          headers: { 'bypass-tunnel-reminder': 'true' },
        });
        if (res.ok) {
          const bannerData = await res.json();
          setFeaturedBanner(bannerData || null);
        }
      } catch { /* sem destaque — ok */ }
    } catch (err) {
      setError('Não foi possível carregar os eventos.');
      console.error('Erro ao buscar eventos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Cache buster para o avatar — atualiza ao focar a tela
  const [avatarCacheBuster, setAvatarCacheBuster] = useState(Date.now());

  useFocusEffect(
    useCallback(() => {
      loadEvents();
      setAvatarCacheBuster(Date.now()); // força recarregar foto de perfil
    }, [loadEvents])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  // Re-renderiza a cada 60s para atualizar os status calculados por horário
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: {
          'Content-Type': 'application/json',
          'bypass-tunnel-reminder': 'true',
          'Authorization': 'Bearer ' + token,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      const newUnread = data.unreadCount ?? 0;
      setNotifications(data.notifications ?? []);
      setUnreadCount(newUnread);
      // Dispara som + balanço do sino: na primeira carga se já houver não lidas,
      // ou em qualquer carga posterior em que o total de não lidas aumentar
      const isFirstLoad = !hasLoadedNotifOnce.current;
      if ((isFirstLoad && newUnread > 0) || (!isFirstLoad && newUnread > prevUnreadCount.current)) {
        triggerBellAlert();
      }
      hasLoadedNotifOnce.current = true;
      prevUnreadCount.current = newUnread;
    } catch {
      // silently ignore notification polling errors
    }
  }, [isAuthenticated, getToken, triggerBellAlert]);

  useEffect(() => {
    loadNotifications();
    const intervalId = setInterval(loadNotifications, 30000);
    return () => clearInterval(intervalId);
  }, [loadNotifications]);

  const handleParticipate = async (event) => {
    const hasToken = await hasStoredToken();
    if (isAuthenticated || hasToken) {
      router.push(`/(app)/event/${event._id}`);
    } else {
      router.push('/(auth)/login');
    }
  };

  // Seleciona o evento em destaque:
  // 1. Prioriza eventos "ao vivo" (acontecendo agora)
  // 2. Se nenhum ao vivo, pega o próximo evento futuro mais próximo
  // 3. Eventos que já acabaram não aparecem no destaque
  const now = new Date();
  
  const liveEvent = events.find((e) => !e.deleted && e.status !== 'deleted' && computeEventStatus(e) === 'ongoing');
  
  const futureEvents = events
    .filter((e) => {
      if (e.deleted === true || e.status === 'deleted') return false;
      const status = computeEventStatus(e);
      return status === 'upcoming'; // Só eventos que ainda não começaram
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // Ordena pelo mais próximo
  
  const featuredEvent = liveEvent || futureEvents[0] || events[0];
  
  // Próximos eventos: inclui todos (quando houver banner, nenhum evento é "destaque")
  // Exclui o featuredEvent apenas se não houver banner customizado
  const upcomingEvents = events.filter((e) => {
    if (e.deleted === true || e.status === 'deleted') return false;
    if (!featuredBanner && e === featuredEvent) return false;
    const status = computeEventStatus(e);
    return status !== 'finished';
  });

  // Paginação de próximos eventos
  const EVENTS_PAGE_SIZE = 6;
  const [eventsPage, setEventsPage] = React.useState(1);
  const eventsTotalPages = Math.ceil(upcomingEvents.length / EVENTS_PAGE_SIZE);
  const paginatedEvents = upcomingEvents.slice((eventsPage - 1) * EVENTS_PAGE_SIZE, eventsPage * EVENTS_PAGE_SIZE);
  
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
              <AppLogo size={30} textSize={16} tagline="PLATAFORMA DE EVENTOS" />
            </View>
            <View style={styles.headerRight}>
              {/* Favoritos */}
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => router.push('/(app)/favorites')}
                activeOpacity={0.75}
                accessibilityLabel="Favoritos"
              >
                <Ionicons name="heart-outline" size={18} color={C.text} />
              </TouchableOpacity>
              {/* Notificações */}
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setNotifModal(true)}
                activeOpacity={0.75}
                accessibilityLabel="Notificações"
              >
                <Animated.View
                  style={{
                    transform: [{
                      rotate: bellShake.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: ['-18deg', '0deg', '18deg'],
                      }),
                    }],
                  }}
                >
                  <Ionicons name="notifications-outline" size={18} color={C.text} />
                </Animated.View>
                {unreadCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>
                      {unreadCount > 99 ? '99+' : String(unreadCount)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              {/* Avatar / Perfil */}
              <TouchableOpacity
                style={styles.avatarBtn}
                activeOpacity={0.75}
                onPress={() => isAuthenticated ? router.push('/(app)/profile') : router.push('/(auth)/login')}
              >
                <LinearGradient
                  colors={[C.gradientStart, C.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarBorder}
                >
                  {isAuthenticated && user?.avatarUrl ? (
                    <Image
                      source={{ uri: (user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_BASE_URL}/uploads/${user.avatarUrl}`) + `?t=${avatarCacheBuster}` }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarInner}>
                      <Text style={styles.avatarText}>
                        {isAuthenticated ? user?.fullName?.[0]?.toUpperCase() : '?'}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Greeting ─────────────────────── */}
          <View style={styles.greetingBlock}>
            <View style={styles.greetingRow}>
              <Text style={styles.greetingText}>
                Olá,{' '}
                <Text style={styles.greetingName}>
                  {isAuthenticated ? user?.fullName?.split(' ')[0] : 'Visitante'}!
                </Text>
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(app)/ranking')}
                activeOpacity={0.75}
                style={styles.rankingPillBtn}
              >
                <LinearGradient
                  colors={[C.gradientStart, C.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.rankingPill}
                >
                  <Ionicons name="trophy-outline" size={13} color="#FFF" />
                  <Text style={styles.rankingPillText}>Ranking</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <Text style={styles.greetingSubtitle}>
              Conecte-se, aprenda e conquiste seus certificados.
            </Text>
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
          {featuredBanner ? (
            <FeaturedBannerCard
              banner={featuredBanner}
              isAdmin={user?.role === 'admin'}
              onEdit={() => router.push('/(app)/admin/featured')}
            />
          ) : user?.role === 'admin' ? (
            // Admin sem destaque criado: card convite para criar
            <TouchableOpacity
              style={styles.featuredEmptyCard}
              onPress={() => router.push('/(app)/admin/featured')}
              activeOpacity={0.75}
            >
              <Ionicons name="add-circle-outline" size={38} color={C.primary} />
              <Text style={styles.featuredEmptyTitle}>Criar destaque</Text>
              <Text style={styles.featuredEmptySubtitle}>
                Adicione um banner promocional no topo da tela inicial
              </Text>
            </TouchableOpacity>
          ) : featuredEvent ? (
            <FeaturedEventCard
              event={featuredEvent}
              onParticipate={handleParticipate}
            />
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
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>PRÓXIMOS EVENTOS</Text>
              </View>
            </View>
          ) : null}

          {paginatedEvents.map((event, idx) => (
            <EventListCard
              key={event._id}
              event={event}
              index={(eventsPage - 1) * EVENTS_PAGE_SIZE + idx}
              onPress={handleParticipate}
            />
          ))}

          {/* ── Paginação Próximos Eventos ── */}
          {eventsTotalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity style={[styles.pageBtn, eventsPage === 1 && styles.pageBtnDisabled]} onPress={() => setEventsPage(1)} disabled={eventsPage === 1}>
                <Ionicons name="play-skip-back" size={12} color={eventsPage === 1 ? C.textMuted : C.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pageBtn, eventsPage === 1 && styles.pageBtnDisabled]} onPress={() => setEventsPage(p => Math.max(1, p - 1))} disabled={eventsPage === 1}>
                <Ionicons name="chevron-back" size={14} color={eventsPage === 1 ? C.textMuted : C.primary} />
              </TouchableOpacity>
              {Array.from({ length: eventsTotalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === eventsTotalPages || Math.abs(p - eventsPage) <= 1)
                .reduce((acc, p, idx2, arr) => { if (idx2 > 0 && p - arr[idx2 - 1] > 1) acc.push('...'); acc.push(p); return acc; }, [])
                .map((p, i) => p === '...' ? (
                  <Text key={`e${i}`} style={styles.pageEllipsis}>…</Text>
                ) : (
                  <TouchableOpacity key={p} style={[styles.pageBtn, p === eventsPage && styles.pageBtnActive]} onPress={() => setEventsPage(p)}>
                    <Text style={[styles.pageBtnText, p === eventsPage && styles.pageBtnTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              <TouchableOpacity style={[styles.pageBtn, eventsPage === eventsTotalPages && styles.pageBtnDisabled]} onPress={() => setEventsPage(p => Math.min(eventsTotalPages, p + 1))} disabled={eventsPage === eventsTotalPages}>
                <Ionicons name="chevron-forward" size={14} color={eventsPage === eventsTotalPages ? C.textMuted : C.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pageBtn, eventsPage === eventsTotalPages && styles.pageBtnDisabled]} onPress={() => setEventsPage(eventsTotalPages)} disabled={eventsPage === eventsTotalPages}>
                <Ionicons name="play-skip-forward" size={12} color={eventsPage === eventsTotalPages ? C.textMuted : C.primary} />
              </TouchableOpacity>
            </View>
          )}

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
          {/* Registrar — admin vê botão ativo, outros veem desabilitado/vazio */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={isAuthenticated && user?.role === 'admin' ? 0.75 : 1}
            onPress={() => isAuthenticated && user?.role === 'admin' && router.push('/(app)/create-event')}
            accessibilityLabel="Registrar Evento"
          >
            <GradientIcon name="add-circle-outline" size={20} active={isAuthenticated && user?.role === 'admin'} />
            <Text style={isAuthenticated && user?.role === 'admin' ? styles.navLabel : styles.navLabelDisabled}>
              Registrar
            </Text>
          </TouchableOpacity>

          {/* Início — centro */}
          <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/(app)')} activeOpacity={0.75}>
            <View style={styles.navActiveGlow}>
              <GradientIcon name="home" size={22} active />
            </View>
            <Text style={styles.navLabelActive}>Início</Text>
            <View style={styles.navActiveIndicator} />
          </TouchableOpacity>

          {/* Gestão — admin vê ativo, outros veem desabilitado */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={isAuthenticated && user?.role === 'admin' ? 0.75 : 1}
            onPress={() => isAuthenticated && user?.role === 'admin' && router.push('/(app)/admin/registrations')}
            accessibilityLabel="Gerenciamento"
          >
            <GradientIcon name="people-outline" size={20} active={isAuthenticated && user?.role === 'admin'} />
            <Text style={isAuthenticated && user?.role === 'admin' ? styles.navLabel : styles.navLabelDisabled}>
              Gestão
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Notifications Modal ──────────────── */}
      <Modal
        visible={notifModal}
        animationType="slide"
        transparent
        onRequestClose={() => setNotifModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notificações</Text>
              <TouchableOpacity
                onPress={() => setNotifModal(false)}
                accessibilityLabel="Fechar notificações"
              >
                <Ionicons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <Text style={styles.notifEmpty}>Nenhuma notificação.</Text>
              ) : (
                notifications.map((n) => (
                  <TouchableOpacity
                    key={n._id}
                    style={[styles.notifItem, n.read && styles.notifItemRead]}
                    onPress={async () => {
                      const token = await getToken();
                      if (!token) return;
                      try {
                        await fetch(`${API_BASE_URL}/notifications/${n._id}/read`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            'bypass-tunnel-reminder': 'true',
                            'Authorization': 'Bearer ' + token,
                          },
                        });
                        setNotifications((prev) =>
                          prev.map((item) =>
                            item._id === n._id ? { ...item, read: true } : item,
                          ),
                        );
                        if (!n.read) setUnreadCount((c) => Math.max(0, c - 1));
                        // Se a notificação tem eventId, navegar para os detalhes do evento
                        if (n.eventId) {
                          setNotifModal(false);
                          router.push(`/(app)/event/${n.eventId}`);
                        }
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    <Text style={styles.notifTitle}>
                      {n.title || n.message || 'Notificação'}
                    </Text>
                    {n.body ? <Text style={styles.notifBody}>{n.body}</Text> : null}
                    {!n.read && (
                      <View style={styles.notifUnreadDot} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  headerLeft: { flex: 1, marginRight: 16, minWidth: 0 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoText: { color: C.text, fontSize: 16, fontWeight: '800', letterSpacing: 1.5 },
  logoTagline: {
    color: C.textMuted,
    fontSize: 8,
    letterSpacing: 0.8,
    marginTop: 3,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  adminBtn: {
    borderColor: C.primary,
    backgroundColor: 'rgba(124,95,230,0.15)',
  },
  avatarBtn: { width: 38, height: 38, borderRadius: 19 },
  avatarBorder: {
    width: 38, height: 38, borderRadius: 19,
    padding: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInner: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  avatarImage: { width: 34, height: 34, borderRadius: 17 },

  // Greeting
  greetingBlock: { paddingTop: 12, paddingBottom: 20 },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  greetingText: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  greetingName: { color: C.primary },
  greetingSubtitle: {
    color: C.textSecondary,
    fontSize: 11,
    marginTop: 6,
    lineHeight: 18,
  },

  greetingPillRow: { flexDirection: 'row', marginTop: 10 },
  rankingPillBtn: { borderRadius: 20, overflow: 'hidden' },
  rankingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rankingPillText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

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
  featuredCardBorder: {
    borderRadius: 20,
    padding: 2,
    marginBottom: 28,
    shadowColor: C.gradientStart,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  featuredCard: {
    borderRadius: 18, overflow: 'hidden',
    backgroundColor: C.card,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  featuredImage: { minHeight: 380, justifyContent: 'space-between' },
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
  editIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  featuredSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: -2,
  },
  featuredEmptyCard: {
    minHeight: 220,
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 95, 230, 0.4)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  featuredEmptyTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
  },
  featuredEmptySubtitle: {
    color: C.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 240,
  },
  featuredContent: { padding: 16, paddingTop: 0, paddingBottom: 18 },
  featuredEventNumber: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12, fontWeight: '500', marginBottom: 4,
  },
  featuredTitle: {
    color: '#FFF', fontSize: 28, fontWeight: '800',
    marginBottom: 10, lineHeight: 34, letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  featuredMeta: { gap: 5, marginBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  featuredBtnWrapper: {
    alignSelf: 'flex-start', borderRadius: 24, overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
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
    alignItems: 'center', marginBottom: 14, marginTop: 24,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.primary,
  },
  sectionTitle: { color: C.text, fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  sectionLink: {
    color: C.textSecondary, fontSize: 10, letterSpacing: 0.5, fontWeight: '600',
  },

  // ── Paginação ────────────────────────────────────────────
  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 12,
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

  // ── Event Card ───────────────────────────────────────
  eventCard: {
    backgroundColor: C.cardHover,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
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
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 6,
    flexWrap: 'wrap',
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
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    flex: 1,
    flexShrink: 1,
    flexWrap: 'wrap',
  },

  // Body: DATA | IMAGEM
  eventCardBody: {
    flexDirection: 'row',
    minHeight: 150,
  },
  eventCardDateCol: {
    width: 100,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
  },
  eventCardDateLabel: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  eventCardDateDay: {
    color: C.text,
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 40,
    letterSpacing: -1,
  },
  eventCardDateMonth: {
    color: C.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
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
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
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
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
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
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // Faixa HORÁRIO | LOCAL
  eventCardInfoRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 6,
  },
  eventCardInfoCol: { flex: 1, gap: 2 },
  eventCardInfoDivider: {
    width: 1, height: 26,
    backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 12,
  },
  eventCardInfoLabel: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  eventCardInfoValue: {
    color: C.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Local (centralizado)
  eventCardLocationRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  eventCardLocationLabel: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  eventCardLocationValue: {
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Botão
  eventCardBtnRow: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    alignItems: 'center',
  },
  eventCardBtnWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  eventCardBtn: {
    paddingVertical: 11,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
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
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
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
  navLabelDisabled: {
    color: 'rgba(107,107,123,0.4)', fontSize: 9, fontWeight: '500', letterSpacing: 0.3,
  },
  navActiveIndicator: {
    position: 'absolute', bottom: -8,
    width: 20, height: 2, borderRadius: 1, backgroundColor: C.primary,
  },
  navActiveGlow: {
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },

  // ── Notification badge ───────────────────────────────────
  notifBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: C.live,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '800' },

  // ── Notifications modal ──────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  modalTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  modalScroll: { flexGrow: 0 },
  notifEmpty: {
    color: C.textMuted,
    textAlign: 'center',
    padding: 24,
    fontSize: 14,
  },
  notifItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    position: 'relative',
  },
  notifItemRead: { opacity: 0.6 },
  notifTitle: { color: C.text, fontSize: 14, fontWeight: '600' },
  notifBody: { color: C.textSecondary, fontSize: 12, marginTop: 3 },
  notifUnreadDot: {
    position: 'absolute', top: 14, right: 14,
    width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary,
  },
});