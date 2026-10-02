import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Animated,
  ImageBackground,
  Modal,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/contexts/AuthContext';
import { API_BASE_URL } from '../../../src/constants/api';
import { useAudioPlayer } from 'expo-audio';

import MaskedView from '@react-native-masked-view/masked-view';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { BottomNav } from '../../../src/components/BottomNav';

const certSound = require('../../../assets/sounds/notification.mp3');
const deletedSound = require('../../../assets/sounds/deleted.mp3');
// ── Paleta ────────────────────────────────────────────────
const C = {
  bg: '#08070D',
  surface: '#0F0E17',
  card: '#13111F',
  cardBorder: '#1F1D2E',
  primary: '#7C5FE6',
  accent: '#A78BFA',
  text: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textMuted: '#6B6B7B',
  approved: '#10B981',
  rejected: '#EF4444',
  pending: '#F59E0B',
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80';

function formatDate(dateString, endDateString) {
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
    return `${day} ${month} ${year} · ${start} às ${eHour}:${eMin}`;
  }
  return `${day} ${month} ${year} · ${start}`;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { getToken, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRegistration, setUserRegistration] = useState(null);
  const [userRating, setUserRating] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [participating, setParticipating] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // ── Modal de certificado solicitado ────────────────────
  const [certModalVisible, setCertModalVisible] = useState(false);
  const certScale = useRef(new Animated.Value(0)).current;
  const certOpacity = useRef(new Animated.Value(0)).current;
  const certPlayer = useAudioPlayer(certSound);

  // ── Modal de confirmação de exclusão ───────────────────
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const deleteScale = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const deletedPlayer = useAudioPlayer(deletedSound);

  // ── Modal de feedback pós-exclusão ─────────────────────
  const [deletedModalVisible, setDeletedModalVisible] = useState(false);
  const deletedScale = useRef(new Animated.Value(0)).current;
  const deletedOpacity = useRef(new Animated.Value(0)).current;

  const showDeletedModal = useCallback(() => {
    setDeletedModalVisible(true);
    deletedScale.setValue(0.08);
    deletedOpacity.setValue(0);
    try { deletedPlayer.seekTo(0); deletedPlayer.play(); } catch { /* ignora */ }
    Animated.parallel([
      Animated.spring(deletedScale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 10 }),
      Animated.timing(deletedOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [deletedPlayer, deletedScale, deletedOpacity]);

  const hideDeletedModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(deletedScale, { toValue: 0.08, duration: 140, useNativeDriver: true }),
      Animated.timing(deletedOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setDeletedModalVisible(false);
      router.replace('/(app)');
    });
  }, [deletedScale, deletedOpacity, router]);

  const showDeleteModal = useCallback(() => {
    setDeleteModalVisible(true);
    deleteScale.setValue(0.08);
    deleteOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(deleteScale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 10 }),
      Animated.timing(deleteOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [deleteScale, deleteOpacity]);

  const hideDeleteModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(deleteScale, { toValue: 0.08, duration: 140, useNativeDriver: true }),
      Animated.timing(deleteOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(() => setDeleteModalVisible(false));
  }, [deleteScale, deleteOpacity]);

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await authFetch('DELETE', '/events/' + id);
      hideDeleteModal();
      setTimeout(() => showDeletedModal(), 250);
    } catch (e) {
      hideDeleteModal();
      Alert.alert('Erro', e.message);
    } finally {
      setDeleting(false);
    }
  };

  const showCertModal = useCallback(() => {
    setCertModalVisible(true);
    certScale.setValue(0.08);
    certOpacity.setValue(0);
    try { certPlayer.seekTo(0); certPlayer.play(); } catch { /* ignora */ }
    Animated.parallel([
      Animated.spring(certScale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 10 }),
      Animated.timing(certOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [certPlayer, certScale, certOpacity]);

  const hideCertModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(certScale, { toValue: 0.08, duration: 140, useNativeDriver: true }),
      Animated.timing(certOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(() => setCertModalVisible(false));
  }, [certScale, certOpacity]);

  useEffect(() => {
    if (!id) return;
    loadEvent();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadEvent(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const token = await getToken();
      const headers = { 'Content-Type': 'application/json', 'bypass-tunnel-reminder': 'true' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const res = await fetch(`${API_BASE_URL}/events/${id}`, { headers });
      if (!res.ok) throw new Error('Evento não encontrado.');
      const data = await res.json();
      setEvent(data);
      setUserRegistration(data.userRegistration ?? null);
      setUserRating(data.userRating ?? null);
      setIsFavorited(data.isFavorited ?? false);
    } catch (e) {
      setError(e.message || 'Erro ao carregar evento.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function authFetch(method, path, body) {
    const token = await getToken();
    const headers = {
      'Content-Type': 'application/json',
      'bypass-tunnel-reminder': 'true',
      'Authorization': 'Bearer ' + token,
    };
    const options = { method, headers };
    if (body !== undefined) options.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE_URL}${path}`, options);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Erro na requisição.');
    }
    return res.json().catch(() => ({}));
  }

  const handleFavorite = async () => {
    try {
      const method = isFavorited ? 'DELETE' : 'POST';
      await authFetch(method, `/events/${id}/favorite`);
      setIsFavorited((prev) => !prev);
    } catch (e) { Alert.alert('Erro', e.message); }
  };

  const handleRate = async (stars) => {
    try {
      const result = await authFetch('POST', `/events/${id}/rate`, { stars });
      setUserRating(result);
    } catch (e) { Alert.alert('Erro', e.message); }
  };

  const handleParticipate = async () => {
    try {
      setParticipating(true);
      const result = await authFetch('POST', `/events/${id}/participate`);
      setUserRegistration(result);
    } catch (e) {
      Alert.alert('Erro', e.message);
    } finally {
      setParticipating(false);
    }
  };

  const handleRequestCertificate = async () => {
    try {
      setRequesting(true);
      await authFetch('POST', `/events/${id}/request-certificate`);
      showCertModal();
      setUserRegistration((prev) => ({ ...prev, certificateRequested: true }));
    } catch (e) {
      Alert.alert('Erro', e.message);
    } finally {
      setRequesting(false);
    }
  };

  const handleDownloadCertificate = async () => {
    try {
      setDownloading(true);
      const certId = userRegistration.certificateDocId;
      const url = `${API_BASE_URL}/certificates/${certId}/download`;
      const token = await getToken();
      const localUri = FileSystem.documentDirectory + `certificate-${certId}.pdf`;
      const result = await FileSystem.downloadAsync(url, localUri, {
        headers: {
          Authorization: 'Bearer ' + token,
          'bypass-tunnel-reminder': 'true',
        },
      });
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Certificado',
      });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível baixar o certificado.');
    } finally {
      setDownloading(false);
    }
  };

  // Resolve URL da imagem — relativa ou absoluta
  function getImageUri() {
    if (!event?.imageUrl) return FALLBACK_IMAGE;
    if (event.imageUrl.startsWith('http://') || event.imageUrl.startsWith('https://')) {
      return event.imageUrl;
    }
    return `${API_BASE_URL}/uploads/${event.imageUrl}`;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#F87171" />
        <Text style={styles.errorText}>{error || 'Erro ao carregar evento.'}</Text>
        <TouchableOpacity style={styles.errorBackBtn} onPress={() => router.back()}>
          <Text style={styles.errorBackBtnText}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const status = userRegistration?.status;

  return (
    <>
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadEvent(true)}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >

        {/* ── Hero com imagem + info overlay ─── */}
        <ImageBackground
          source={{ uri: getImageUri() }}
          style={styles.heroArea}
          imageStyle={{ resizeMode: 'cover' }}
        >
          <LinearGradient
            colors={['rgba(8,7,13,0.0)', 'rgba(8,7,13,0.5)', 'rgba(8,7,13,0.95)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Botões topo — só favorito */}
          <View style={styles.heroButtons}>
            <View style={{ width: 28 }} />
            <TouchableOpacity
              style={styles.circleButton}
              onPress={handleFavorite}
              accessibilityLabel={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorited ? '#EF4444' : C.text}
              />
            </TouchableOpacity>
          </View>

          {/* Info card sobreposto na base da imagem — removido, vai abaixo do título */}
        </ImageBackground>

        <View style={styles.content}>

          {/* ── Título + badges lado direito ─── */}
          <View style={styles.titleRow}>
            <Text style={styles.eventTitle}>{event.name}</Text>
            {/* Badges — tipo e categoria empilhados à direita */}
            <View style={styles.badgesCol}>
              {event.categoryId?.name ? (
                <View style={styles.badgeCategory}>
                  <Text style={styles.badgeCategoryText}>{event.categoryId.name.toUpperCase()}</Text>
                </View>
              ) : null}
              {event.type ? (
                <View style={styles.badgeType}>
                  <Text style={styles.badgeTypeText}>{event.type.toUpperCase()}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Data e local com espaçamento maior */}
          <View style={styles.metaBlock}>
            <View style={styles.metaLine}>
              <Ionicons name="calendar-outline" size={13} color={C.primary} />
              <Text style={styles.metaLineText}>{formatDate(event.date, event.endDate)}</Text>
            </View>
            {event.location ? (
              <View style={styles.metaLine}>
                <Ionicons name="location-outline" size={13} color={C.primary} />
                <Text style={styles.metaLineText}>{event.location}</Text>
              </View>
            ) : null}
          </View>

          {event.description ? (
            <View style={{ gap: 4 }}>
              <Text style={styles.descriptionLabel}>Descrição:</Text>
              <Text style={styles.eventDescription}>{event.description}</Text>
            </View>
          ) : null}

          {/* ── Status da inscrição (acima do info card) ── */}
          {status === 'pending' && (
            <View style={styles.statusCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusCardTitle}>Inscrição Pendente</Text>
                <Text style={styles.statusCardSub}>Aguardando aprovação do administrador</Text>
              </View>
              <Ionicons name="time-outline" size={18} color={C.pending} />
            </View>
          )}

          {status === 'approved' && (
            <View style={[styles.statusCard, styles.statusCardApproved]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusCardTitle, { color: C.approved }]}>Inscrito</Text>
                <Text style={styles.statusCardSub}>Sua participação foi aprovada</Text>
              </View>
              <Ionicons name="checkmark-circle-outline" size={18} color={C.approved} />
            </View>
          )}

          {status === 'rejected' && (
            <View style={[styles.statusCard, styles.statusCardRejected, { marginTop: 8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusCardTitle, { color: C.rejected }]}>Não aprovado.</Text>
                <Text style={styles.statusCardSub}>Entre em contato com o organizador</Text>
              </View>
              <Ionicons name="close-circle-outline" size={18} color={C.rejected} />
            </View>
          )}

          {/* ── Avaliação (só após evento ocorrido + aprovado + certificado emitido) ── */}
          {event.status === 'finished' &&
           status === 'approved' &&
           userRegistration?.certificateRequested && (
            <View style={styles.ratingCard}>
              <View style={styles.ratingHeader}>
                <Text style={styles.ratingTitle}>Sua avaliação</Text>
                {event.ratingCount > 0 && (
                  <View style={styles.approvalBadge}>
                    <Text style={styles.approvalText}>
                      {Math.round((event.ratingAverage / 5) * 100)}% aprovação
                    </Text>
                    <Text style={styles.approvalCount}>
                      ({event.ratingCount} voto{event.ratingCount !== 1 ? 's' : ''})
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.starsRow}>
                {[0, 1, 2, 3, 4].map((index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleRate(index + 1)}
                    accessibilityLabel={`Avaliar com ${index + 1} estrela${index > 0 ? 's' : ''}`}
                  >
                    <Ionicons
                      name={userRating && index < userRating.stars ? 'star' : 'star-outline'}
                      size={28}
                      color={userRating && index < userRating.stars ? C.pending : C.textMuted}
                      style={{ marginHorizontal: 4 }}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── User card removido conforme solicitado ── */}

          {/* ── Botão de participar ─────────────── */}
          {!userRegistration && (
            <TouchableOpacity
              style={[styles.participateBtnWrapper, participating && styles.btnDisabled]}
              onPress={handleParticipate}
              disabled={participating}
              activeOpacity={0.75}
            >
              <LinearGradient
                colors={['#8B5CF6', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.participateBtn}
              >
                {participating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.participateBtnText}>PARTICIPAR DO EVENTO</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* ── Solicitar Certificado ──────────── */}
          {status === 'approved' && !userRegistration?.certificateRequested && (
            <TouchableOpacity
              style={[styles.certBtn, requesting && styles.btnDisabled]}
              onPress={handleRequestCertificate}
              disabled={requesting}
              activeOpacity={0.8}
            >
              {requesting ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : (
                <>
                  <Ionicons name="ribbon-outline" size={18} color={C.primary} />
                  <Text style={styles.certBtnText}>Solicitar Certificado</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Certificado já solicitado / pronto para download */}
          {userRegistration?.certificateRequested && !userRegistration?.certificate && (
            <View style={styles.certRequestedCard}>
              <Ionicons name="ribbon" size={18} color={C.accent} />
              <Text style={styles.certRequestedText}>Certificado solicitado</Text>
            </View>
          )}

          {/* Botão de download — aparece quando o certificado foi emitido pelo admin */}
          {userRegistration?.certificateIssued && userRegistration?.certificateDocId && (
            <TouchableOpacity
              style={[styles.downloadBtn, downloading && styles.btnDisabled]}
              onPress={handleDownloadCertificate}
              disabled={downloading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8B5CF6', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.downloadBtnGradient}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#FFF" />
                    <Text style={styles.downloadBtnText}>Baixar Certificado</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* ── Botão Excluir Evento (admin only) ── */}
          {user?.role === 'admin' && (
            <TouchableOpacity
              style={[styles.certBtn, { borderColor: C.rejected, paddingVertical: 10, alignSelf: 'center', paddingHorizontal: 28, width: 'auto', marginTop: 12 }, deleting && styles.btnDisabled]}
              onPress={showDeleteModal}
              disabled={deleting}
              activeOpacity={0.8}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={C.rejected} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={15} color={C.rejected} />
                  <Text style={[styles.certBtnText, { color: C.rejected, fontSize: 13 }]}>Excluir Evento</Text>
                </>
              )}
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>

      {/* ── Bottom Nav ─────────────────────── */}
      <BottomNav active="home" isAdmin={user?.role === 'admin'} />
    </SafeAreaView>

    {/* ── Modal: Certificado Solicitado ─────── */}
    <Modal
      visible={certModalVisible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={hideCertModal}
    >
      <TouchableOpacity
        style={styles.certOverlay}
        activeOpacity={1}
        onPress={hideCertModal}
      >
        <Animated.View
          style={[styles.certBox, { transform: [{ scale: certScale }], opacity: certOpacity }]}
        >
          <LinearGradient
            colors={['#8B5CF6', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.certTopBar}
          />
          <View style={styles.certIconWrapper}>
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.certIconBadge}
            >
              <Ionicons name="ribbon" size={28} color="#FFF" />
            </LinearGradient>
          </View>
          <Text style={styles.certModalTitle}>Certificado Solicitado!</Text>
          <Text style={styles.certModalSubtitle}>
            Aguarde a aprovação{'\n'}do administrador.
          </Text>
          <TouchableOpacity
            style={styles.certOkBtn}
            onPress={hideCertModal}
            activeOpacity={0.75}
          >
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.certOkGradient}
            >
              <Text style={styles.certOkText}>OK</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>

    {/* ── Modal de confirmação de exclusão ─── */}
    <Modal
      visible={deleteModalVisible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={hideDeleteModal}
    >
      <TouchableOpacity
        style={styles.certOverlay}
        activeOpacity={1}
        onPress={hideDeleteModal}
      >
        <Animated.View
          style={[styles.certBox, { transform: [{ scale: deleteScale }], opacity: deleteOpacity }]}
        >
          {/* Linha topo vermelha */}
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.certTopBar}
          />

          {/* Ícone */}
          <View style={styles.certIconWrapper}>
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.certIconBadge, { width: 48, height: 48, borderRadius: 24 }]}
            >
              <Ionicons name="trash-outline" size={20} color="#FFF" />
            </LinearGradient>
          </View>

          {/* Texto */}
          <Text style={[styles.certTitle, { fontSize: 15, marginBottom: 16 }]}>Excluir Evento</Text>

          {/* Botões: Cancelar + Excluir */}
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, width: '100%' }}>
            <TouchableOpacity
              style={[styles.certOkBtn, { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }]}
              onPress={hideDeleteModal}
              activeOpacity={0.75}
            >
              <View style={{ paddingVertical: 8, alignItems: 'center' }}>
                <Text style={{ color: C.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>CANCELAR</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.certOkBtn, { flex: 1 }]}
              onPress={confirmDelete}
              disabled={deleting}
              activeOpacity={0.75}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.certOkGradient, { paddingVertical: 8, borderRadius: 16 }]}
              >
                {deleting
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={[styles.certOkText, { fontSize: 11 }]}>EXCLUIR</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
    {/* ── Modal de feedback pós-exclusão: Evento Encerrado ── */}
    <Modal
      visible={deletedModalVisible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={hideDeletedModal}
    >
      <TouchableOpacity
        style={styles.certOverlay}
        activeOpacity={1}
        onPress={hideDeletedModal}
      >
        <Animated.View
          style={[styles.certBox, { transform: [{ scale: deletedScale }], opacity: deletedOpacity }]}
        >
          {/* Linha topo vermelha */}
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.certTopBar}
          />

          {/* Ícone */}
          <View style={styles.certIconWrapper}>
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.certIconBadge}
            >
              <Ionicons name="checkmark-done-outline" size={28} color="#FFF" />
            </LinearGradient>
          </View>

          {/* Texto */}
          <Text style={[styles.certTitle, { fontSize: 16 }]}>Evento encerrado</Text>
          <Text style={styles.certSubtitle}>
            O evento foi removido{'\n'}com sucesso.
          </Text>

          {/* Botão OK */}
          <TouchableOpacity
            style={styles.certOkBtn}
            onPress={hideDeletedModal}
            activeOpacity={0.75}
          >
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.certOkGradient}
            >
              <Text style={styles.certOkText}>OK</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: C.bg, gap: 16, padding: 20,
  },
  errorText: { color: '#F87171', fontSize: 14, textAlign: 'center' },
  errorBackBtn: {
    backgroundColor: C.primary, borderRadius: 20,
    paddingVertical: 10, paddingHorizontal: 24,
  },
  errorBackBtnText: { color: C.text, fontWeight: '600' },

  // Hero
  heroArea: { height: 260, justifyContent: 'flex-start', backgroundColor: C.card },
  heroButtons: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16,
  },
  heroInfoOverlay: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 6,
  },
  heroInfoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  heroInfoText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
  },
  heroInfoTags: {
    flexDirection: 'row', gap: 8, marginTop: 4,
  },
  heroInfoTag: {
    paddingVertical: 3, paddingHorizontal: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(124,95,230,0.6)',
    backgroundColor: 'rgba(124,95,230,0.15)',
  },
  heroInfoTagText: {
    color: C.primary, fontSize: 9, fontWeight: '700', letterSpacing: 0.8,
  },
  backButton: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(124,95,230,0.12)',
    borderWidth: 1, borderColor: C.cardBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  circleButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },

  // Content
  content: { padding: 20, gap: 20, paddingBottom: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  eventTitle: { color: C.text, fontSize: 22, fontWeight: '800', lineHeight: 28, flex: 1 },
  metaBlock: { gap: 8 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaLineText: { color: C.textSecondary, fontSize: 13 },
  badgesCol: { gap: 5, alignItems: 'flex-end', paddingTop: 2 },
  badgeCategory: {
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6,
    backgroundColor: '#F59E0B',
  },
  badgeCategoryText: { color: '#08070D', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  badgeType: {
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6,
    backgroundColor: '#1A1A2E',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  badgeTypeText: { color: C.text, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  descriptionLabel: { color: C.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  eventDescription: { color: C.textSecondary, fontSize: 13, lineHeight: 19 },

  // Info card
  infoCard: {
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.cardBorder,
    padding: 16, gap: 14,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoLabel: { color: C.textMuted, fontSize: 11 },
  infoValue: { color: C.text, fontSize: 13, fontWeight: '600', marginTop: 2 },

  // Rating
  ratingCard: {
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.cardBorder,
    padding: 16, gap: 10,
  },
  ratingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingTitle: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },
  approvalBadge: { alignItems: 'flex-end', gap: 2 },
  approvalText: { color: C.approved, fontSize: 13, fontWeight: '700' },
  approvalCount: { color: C.textMuted, fontSize: 10 },
  starsRow: { flexDirection: 'row', alignItems: 'center' },

  // User card
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.cardBorder,
    padding: 14, gap: 12,
  },
  userAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  userAvatarText: { color: C.text, fontSize: 16, fontWeight: '800' },
  userCardName: { color: C.text, fontSize: 14, fontWeight: '700' },
  userCardEmail: { color: C.textMuted, fontSize: 12 },

  // Participar button
  participateBtnWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 48,
    alignSelf: 'center',
    width: '70%',
    shadowColor: '#7C5FE6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  participateBtn: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  participateBtnText: { color: '#FFF', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  btnDisabled: { opacity: 0.6 },

  // Status cards
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 1, borderColor: C.cardBorder,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  statusCardApproved: {
    borderColor: 'rgba(16,185,129,0.4)',
    backgroundColor: 'rgba(16,185,129,0.06)',
  },
  statusCardRejected: {
    borderColor: 'rgba(239,68,68,0.4)',
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusCardTitle: { color: C.text, fontSize: 12, fontWeight: '700' },
  statusCardSub: { color: C.textMuted, fontSize: 10, marginTop: 1 },

  // Certificado
  certBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'transparent', borderRadius: 30,
    paddingVertical: 15, borderWidth: 1.5, borderColor: C.primary,
  },
  certBtnText: { color: C.primary, fontSize: 15, fontWeight: '700' },
  certRequestedCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(167,139,250,0.08)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
    paddingVertical: 12,
  },
  certRequestedText: { color: C.accent, fontSize: 14, fontWeight: '600' },

  // Download certificado
  downloadBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'center',
    width: '80%',
    shadowColor: '#7C5FE6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  downloadBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  downloadBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  // Bottom nav
  bottomNavOuter: {
    backgroundColor: '#0B0A12',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    elevation: 12,
  },
  bottomNavInner: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navItem: {
    alignItems: 'center', justifyContent: 'center',
    gap: 3, paddingHorizontal: 40, paddingVertical: 4,
    position: 'relative',
  },
  navLabelActive: { color: C.primary, fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  navActiveIndicator: {
    position: 'absolute', bottom: -8,
    width: 20, height: 2, borderRadius: 1, backgroundColor: C.primary,
  },

  // ── Modal Certificado Solicitado ──────────
  certOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center',
  },
  certBox: {
    width: 300, backgroundColor: C.card,
    borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder,
    alignItems: 'center', overflow: 'hidden',
    shadowColor: '#7C5FE6', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 24, elevation: 16,
  },
  certTopBar: { width: '100%', height: 4 },
  certIconWrapper: { marginTop: 28, marginBottom: 16 },
  certIconBadge: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#7C5FE6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  certModalTitle: {
    color: C.text, fontSize: 18, fontWeight: '800',
    letterSpacing: 0.3, marginBottom: 8,
  },
  certModalSubtitle: {
    color: C.textSecondary, fontSize: 13, textAlign: 'center',
    lineHeight: 20, paddingHorizontal: 24, marginBottom: 28,
  },
  certOkBtn: {
    width: '70%', borderRadius: 20, overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#7C5FE6', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  certOkGradient: {
    paddingVertical: 11, alignItems: 'center', borderRadius: 20,
  },
  certOkText: {
    color: '#FFF', fontSize: 13, fontWeight: '800', letterSpacing: 1.2,
  },

  // Título e subtítulo dos modais de exclusão
  certTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  certSubtitle: {
    color: '#A0A0B0',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
});
