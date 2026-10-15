import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/contexts/AuthContext';
import { API_BASE_URL } from '../../../src/constants/api';
import { AppLogo } from '../../../src/components/AppLogo';
import { useAudioPlayer } from 'expo-audio';

const successSound = require('../../../assets/sounds/notification.mp3');

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

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'rejected', label: 'Rejeitado' },
  { value: 'pending', label: 'Pendente' },
];

const CERT_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'yes', label: 'Certificado solicitado' },
  { value: 'no', label: 'Sem solicitação' },
];

const STATUS_COLORS = { pending: C.pending, approved: C.approved, rejected: C.rejected };
const STATUS_LABELS = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado' };

export default function AdminRegistrationsScreen() {
  const router = useRouter();
  const { user, getToken } = useAuth();
  const insets = useSafeAreaInsets();

  // ── Modal de sucesso customizado ────────────────────────
  const [successVisible, setSuccessVisible] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successPlayer = useAudioPlayer(successSound);

  // ── Modal de rejeição customizado ───────────────────────
  const [rejectionVisible, setRejectionVisible] = useState(false);
  const rejectionScale = useRef(new Animated.Value(0)).current;
  const rejectionOpacity = useRef(new Animated.Value(0)).current;
  const rejectionPlayer = useAudioPlayer(successSound);

  // ── Modal de status atualizado ──────────────────────────
  const [updateVisible, setUpdateVisible] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const updateScale = useRef(new Animated.Value(0)).current;
  const updateOpacity = useRef(new Animated.Value(0)).current;

  const showUpdateModal = useCallback((msg) => {
    setUpdateMessage(msg);
    setUpdateVisible(true);
    updateScale.setValue(0.08);
    updateOpacity.setValue(0);
    try { successPlayer.seekTo(0); successPlayer.play(); } catch { /* ignora */ }
    Animated.parallel([
      Animated.spring(updateScale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 10 }),
      Animated.timing(updateOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [successPlayer, updateScale, updateOpacity]);

  const hideUpdateModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(updateScale, { toValue: 0.08, duration: 140, useNativeDriver: true }),
      Animated.timing(updateOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(() => setUpdateVisible(false));
  }, [updateScale, updateOpacity]);

  const showSuccessModal = useCallback(() => {
    setSuccessVisible(true);
    successScale.setValue(0.08);
    successOpacity.setValue(0);
    // Som positivo
    try { successPlayer.seekTo(0); successPlayer.play(); } catch { /* ignora */ }
    // Animação de expansão: 8% → 100% com mola
    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 180,
        friction: 10,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [successPlayer, successScale, successOpacity]);

  const hideSuccessModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(successScale, { toValue: 0.08, duration: 140, useNativeDriver: true }),
      Animated.timing(successOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(() => setSuccessVisible(false));
  }, [successScale, successOpacity]);

  const showRejectionModal = useCallback(() => {
    setRejectionVisible(true);
    rejectionScale.setValue(0.08);
    rejectionOpacity.setValue(0);
    // Som de notificação
    try { rejectionPlayer.seekTo(0); rejectionPlayer.play(); } catch { /* ignora */ }
    // Animação de expansão: 8% → 100% com mola
    Animated.parallel([
      Animated.spring(rejectionScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 180,
        friction: 10,
      }),
      Animated.timing(rejectionOpacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [rejectionPlayer, rejectionScale, rejectionOpacity]);

  const hideRejectionModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(rejectionScale, { toValue: 0.08, duration: 140, useNativeDriver: true }),
      Animated.timing(rejectionOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(() => setRejectionVisible(false));
  }, [rejectionScale, rejectionOpacity]);

  // ── Modal de confirmação de exclusão ──────────────────
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const deleteConfirmScale = useRef(new Animated.Value(0)).current;
  const deleteConfirmOpacity = useRef(new Animated.Value(0)).current;

  const showDeleteConfirm = useCallback((id) => {
    setDeleteTargetId(id);
    setDeleteConfirmVisible(true);
    deleteConfirmScale.setValue(0.08);
    deleteConfirmOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(deleteConfirmScale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 10 }),
      Animated.timing(deleteConfirmOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [deleteConfirmScale, deleteConfirmOpacity]);

  const hideDeleteConfirm = useCallback(() => {
    Animated.parallel([
      Animated.timing(deleteConfirmScale, { toValue: 0.08, duration: 140, useNativeDriver: true }),
      Animated.timing(deleteConfirmOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(() => { setDeleteConfirmVisible(false); setDeleteTargetId(null); });
  }, [deleteConfirmScale, deleteConfirmOpacity]);

  const confirmDelete = async () => {
    try {
      await authFetch('DELETE', `/admin/registrations/${deleteTargetId}`);
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(deleteTargetId); return n; });
      hideDeleteConfirm();
      await loadRegistrations();
    } catch (e) {
      hideDeleteConfirm();
      Alert.alert('Erro', e.message);
    }
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
          style={{ flex: 1 }}
        />
      </MaskedView>
    );
  }

  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [nameInput, setNameInput] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [certFilter, setCertFilter] = useState('');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [editingIds, setEditingIds] = useState(new Set()); // cards em modo edição
  const [historyMode, setHistoryMode] = useState(false); // false = pendentes, true = histórico
  const [certsSentMode, setCertsSentMode] = useState(false); // certificados já emitidos

  const [tmpEvent, setTmpEvent] = useState('');
  const [tmpStatus, setTmpStatus] = useState('');
  const [tmpCert, setTmpCert] = useState('');

  const debounceRef = useRef(null);

  const eventOptions = useCallback(() => {
    const map = new Map();
    registrations.forEach((r) => {
      if (r.event?._id) map.set(r.event._id, r.event.name || r.event._id);
    });
    return [{ id: '', name: 'Todos os eventos' }, ...Array.from(map, ([id, name]) => ({ id, name }))];
  }, [registrations]);

  async function authFetch(method, path, body) {
    const token = await getToken();
    if (!token) throw new Error('Sessão expirada. Faça login novamente.');
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
      throw new Error(errData.message || `Erro ${res.status}`);
    }
    return res.json().catch(() => ({}));
  }

  const loadRegistrations = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const params = new URLSearchParams();
      if (eventFilter) params.set('eventId', eventFilter);
      if (nameFilter) params.set('participantName', nameFilter);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await authFetch('GET', `/admin/registrations${query}`);
      setRegistrations(Array.isArray(data) ? data : data.registrations ?? []);
    } catch (e) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventFilter, nameFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user?.role === 'admin') {
      loadRegistrations().catch(() => {});
    }
  }, [loadRegistrations]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRegistrations = registrations.filter((r) => {
    // Modo: certificados enviados (emitidos pelo admin)
    if (certsSentMode) {
      return r.certificateIssued === true;
    }
    // Modo histórico: inscrições decididas (aprovadas/rejeitadas) + certs rejeitados
    if (historyMode) {
      if (r.certificateIssued === true) return false; // emitidos vão para certificados enviados
      if (r.certificateRequested && !r.certificateIssued) return false; // cert pendente fica na view principal
      if (r.status === 'pending' && !r.certificateRequested) return false;
      return true;
    }
    // Modo padrão: pendentes de aprovação OU certificado solicitado mas ainda não emitido
    if (r.certificateIssued === true) return false; // já emitido — sai da view principal
    const needsAttention = r.status === 'pending' || (r.certificateRequested && !r.certificateIssued);
    if (!needsAttention) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (certFilter === 'yes' && !r.certificateRequested) return false;
    if (certFilter === 'no' && r.certificateRequested) return false;
    return true;
  });

  const activeFilterCount = [eventFilter, statusFilter, certFilter].filter(Boolean).length;

  const openFilterPanel = () => {
    setTmpEvent(eventFilter);
    setTmpStatus(statusFilter);
    setTmpCert(certFilter);
    setFilterPanelOpen(true);
  };

  const applyFilters = () => {
    setEventFilter(tmpEvent);
    setStatusFilter(tmpStatus);
    setCertFilter(tmpCert);
    setFilterPanelOpen(false);
  };

  const clearFilters = () => {
    setTmpEvent('');
    setTmpStatus('');
    setTmpCert('');
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleApprove = async (id, fromEdit = false) => {
    try {
      await authFetch('PATCH', `/admin/registrations/${id}/approve`);
      if (fromEdit) {
        showUpdateModal('Status atualizado para Aprovado!\nUma notificação foi enviada ao participante.');
      } else {
        showSuccessModal();
      }
      await loadRegistrations();
    } catch (e) { Alert.alert('Erro', e.message); }
  };

  const handleApproveCertificate = async (id) => {
    try {
      // Emite o certificado para o participante
      await authFetch('POST', '/admin/registrations/send-certificates', {
        registrationIds: [id],
      });
      showSuccessModal();
      await loadRegistrations();
    } catch (e) { Alert.alert('Erro', e.message); }
  };

  const handleRejectCertificate = async (id) => {
    try {
      // Rejeita a solicitação de certificado — marca como não solicitado novamente
      await authFetch('PATCH', `/admin/registrations/${id}/reject-certificate`);
      showRejectionModal();
      await loadRegistrations();
    } catch (e) {
      // Fallback: tenta endpoint alternativo
      try {
        await authFetch('PATCH', `/admin/registrations/${id}`, { certificateRequested: false, certificateRejected: true });
        showRejectionModal();
        await loadRegistrations();
      } catch (e2) { Alert.alert('Erro', e2.message); }
    }
  };

  const handleReject = async (id, fromEdit = false) => {
    try {
      // Rejeitar a solicitação
      await authFetch('PATCH', `/admin/registrations/${id}/reject`);
      
      if (fromEdit) {
        showUpdateModal('Status atualizado para Rejeitado!\nUma notificação foi enviada ao participante.');
      } else {
        // Mostrar modal de confirmação de rejeição
        showRejectionModal();
      }
      
      await loadRegistrations();
    } catch (e) { Alert.alert('Erro', e.message); }
  };
  const handleDelete = (id) => {
    showDeleteConfirm(id);
  };

  const handleSendCertificates = async () => {
    try {
      const result = await authFetch('POST', '/admin/registrations/send-certificates', {
        registrationIds: Array.from(selectedIds),
      });
      Alert.alert('Certificados enviados', `${result.success ?? selectedIds.size} certificado(s) gerado(s).`);
      setSelectedIds(new Set());
    } catch (e) { Alert.alert('Erro', e.message); }
  };

  const handleExportPdf = async () => {
    try {
      const token = await getToken();
      const params = new URLSearchParams();
      if (eventFilter) params.set('eventId', eventFilter);
      if (nameFilter) params.set('participantName', nameFilter);
      const url = `${API_BASE_URL}/admin/registrations/export-pdf${params.toString() ? '?' + params.toString() : ''}`;
      Alert.alert('Exportar', 'Abrir relatório no navegador?', [
        { text: 'Abrir', onPress: () => Linking.openURL(url) },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    } catch (e) { Alert.alert('Erro', e.message); }
  };

  const handleNameInputChange = (text) => {
    setNameInput(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setNameFilter(text), 400);
  };

  if (!user || user.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={C.textMuted} />
          <Text style={styles.accessDeniedText}>Acesso negado</Text>
          <Text style={styles.accessDeniedSub}>Esta área é restrita a administradores.</Text>
          <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.replace('/(app)')}>
            <Text style={styles.backHomeBtnText}>Ir para o início</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Evento selecionado no filtro ativo
  const activeEventName = eventFilter
    ? (eventOptions().find((e) => e.id === eventFilter)?.name || 'Evento')
    : null;
  const activeStatusLabel = statusFilter
    ? STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label
    : null;
  const activeCertLabel = certFilter
    ? CERT_OPTIONS.find((c) => c.value === certFilter)?.label
    : null;

  // Cabeçalho da lista (tags de filtros ativos)
  const ListHeader = activeFilterCount > 0 ? (
    <View style={styles.activeFiltersRow}>
      {activeEventName && (
        <TouchableOpacity
          style={styles.activeFilterTag}
          onPress={() => setEventFilter('')}
          activeOpacity={0.75}
        >
          <Text style={styles.activeFilterTagText} numberOfLines={1}>{activeEventName}</Text>
          <View style={styles.activeFilterTagX}>
            <Ionicons name="close" size={11} color={C.primary} />
          </View>
        </TouchableOpacity>
      )}
      {activeStatusLabel && (
        <TouchableOpacity
          style={styles.activeFilterTag}
          onPress={() => setStatusFilter('')}
          activeOpacity={0.75}
        >
          <Text style={styles.activeFilterTagText}>{activeStatusLabel}</Text>
          <View style={styles.activeFilterTagX}>
            <Ionicons name="close" size={11} color={C.primary} />
          </View>
        </TouchableOpacity>
      )}
      {activeCertLabel && (
        <TouchableOpacity
          style={styles.activeFilterTag}
          onPress={() => setCertFilter('')}
          activeOpacity={0.75}
        >
          <Text style={styles.activeFilterTagText}>{activeCertLabel}</Text>
          <View style={styles.activeFilterTagX}>
            <Ionicons name="close" size={11} color={C.primary} />
          </View>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => { setEventFilter(''); setStatusFilter(''); setCertFilter(''); }}>
        <Text style={styles.clearAllText}>Limpar busca</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  const renderItem = ({ item }) => {
    const isSelected = selectedIds.has(item._id);
    const isEditing = editingIds.has(item._id);
    const statusColor = STATUS_COLORS[item.status] || C.textMuted;
    const statusLabel = STATUS_LABELS[item.status] || item.status;
    const isDecided = item.status === 'approved' || item.status === 'rejected';

    const toggleEdit = () => setEditingIds((prev) => {
      const next = new Set(prev);
      next.has(item._id) ? next.delete(item._id) : next.add(item._id);
      return next;
    });

    const closeEdit = (id) => setEditingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });

    return (
      <View style={[styles.card, isSelected && styles.cardSelected]}>
        <View style={styles.cardRow}>
          <TouchableOpacity onPress={() => toggleSelect(item._id)} style={styles.checkbox}>
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={22}
              color={isSelected ? C.primary : C.textMuted}
            />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.participantName}>
              {item.user?.name || item.user?.fullName || item.user?.email || '—'}
            </Text>
            <Text style={styles.eventName} numberOfLines={1} ellipsizeMode="tail">
              Evento: {item.event?.name || '—'}
            </Text>
          </View>
          {item.certificateRequested ? (
            <View style={styles.certBadge}>
              <Ionicons name="ribbon-outline" size={12} color={C.accent} />
              <Text style={styles.certBadgeText}>Certificado Solicitado</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, {
              backgroundColor: statusColor === C.pending
                ? 'rgba(245,158,11,0.12)'
                : statusColor === C.approved
                ? 'rgba(16,185,129,0.12)'
                : 'rgba(239,68,68,0.12)',
              borderColor: statusColor === C.pending
                ? 'rgba(245,158,11,0.55)'
                : statusColor === C.approved
                ? 'rgba(16,185,129,0.55)'
                : 'rgba(239,68,68,0.55)',
            }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionsRow}>
          {item.certificateRequested && !item.certificateIssued && !isEditing ? (
            /* Certificado solicitado aguardando emissão — Emitir + Rejeitar + Excluir */
            <>
              <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApproveCertificate(item._id)}>
                <Ionicons name="ribbon-outline" size={12} color={C.approved} />
                <Text style={[styles.actionBtnText, { color: C.approved }]}>Emitir</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleRejectCertificate(item._id)}>
                <Ionicons name="close" size={12} color={C.rejected} />
                <Text style={[styles.actionBtnText, { color: C.rejected }]}>Rejeitar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item._id)}>
                <Ionicons name="trash-outline" size={12} color="#9CA3AF" />
                <Text style={[styles.actionBtnText, { color: '#9CA3AF' }]}>Excluir</Text>
              </TouchableOpacity>
            </>
          ) : isDecided && !isEditing ? (
            /* Aprovado/Rejeitado — estado padrão: Editar + Excluir */
            <>
              <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={toggleEdit}>
                <Ionicons name="pencil-outline" size={12} color={C.accent} />
                <Text style={[styles.actionBtnText, { color: C.accent }]}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item._id)}>
                <Ionicons name="trash-outline" size={12} color="#9CA3AF" />
                <Text style={[styles.actionBtnText, { color: '#9CA3AF' }]}>Excluir</Text>
              </TouchableOpacity>
            </>
          ) : isEditing ? (
            /* Modo edição: mostra ação contrária + Excluir + Voltar */
            <>
              {item.status === 'approved' ? (
                <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={async () => { await handleReject(item._id, true); closeEdit(item._id); }}>
                  <Ionicons name="close" size={12} color={C.rejected} />
                  <Text style={[styles.actionBtnText, { color: C.rejected }]}>Rejeitar</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={async () => { await handleApprove(item._id, true); closeEdit(item._id); }}>
                  <Ionicons name="checkmark" size={12} color={C.approved} />
                  <Text style={[styles.actionBtnText, { color: C.approved }]}>Aprovar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item._id)}>
                <Ionicons name="trash-outline" size={12} color="#9CA3AF" />
                <Text style={[styles.actionBtnText, { color: '#9CA3AF' }]}>Excluir</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={toggleEdit}>
                <Ionicons name="arrow-back" size={12} color={C.textMuted} />
                <Text style={[styles.actionBtnText, { color: C.textMuted }]}>Voltar</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Pendente: Aprovar + Rejeitar + Excluir */
            <>
              <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(item._id)}>
                <Ionicons name="checkmark" size={12} color={C.approved} />
                <Text style={[styles.actionBtnText, { color: C.approved }]}>Aprovar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleReject(item._id)}>
                <Ionicons name="close" size={12} color={C.rejected} />
                <Text style={[styles.actionBtnText, { color: C.rejected }]}>Rejeitar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item._id)}>
                <Ionicons name="trash-outline" size={12} color="#9CA3AF" />
                <Text style={[styles.actionBtnText, { color: '#9CA3AF' }]}>Excluir</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Header ───────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerContent}>
            <AppLogo size={24} textSize={13} />
            <Text style={styles.headerTitle}>GERENCIAMENTO DE PARTICIPANTES</Text>
          </View>
        </View>
      </View>

      {/* ── Barra: Filtrar | Buscar ───────── */}
      <View style={styles.searchBar}>
        {/* Filtrar — esquerda */}
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={openFilterPanel}
          activeOpacity={0.75}
        >
          <Ionicons name="options-outline" size={15} color={activeFilterCount > 0 ? C.primary : C.textSecondary} />
          <Text style={[styles.filterBtnText, activeFilterCount > 0 && { color: C.primary }]}>
            Filtrar{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>

        {/* Buscar por nome — direita */}
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={15} color={C.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome..."
            placeholderTextColor={C.textMuted}
            value={nameInput}
            onChangeText={handleNameInputChange}
            returnKeyType="search"
          />
          {nameInput.length > 0 && (
            <TouchableOpacity onPress={() => { setNameInput(''); setNameFilter(''); }}>
              <Ionicons name="close-circle" size={15} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Toggle Histórico ─────────────── */}
      <TouchableOpacity
        style={[styles.historyToggle, historyMode && styles.historyToggleActive]}
        onPress={() => {
          setHistoryMode((v) => !v);
          if (!historyMode) setCertsSentMode(false); // desativa certificados enviados ao ativar histórico
        }}
        activeOpacity={0.75}
      >
        <Ionicons
          name={historyMode ? 'time' : 'time-outline'}
          size={15}
          color={historyMode ? C.primary : C.textSecondary}
        />
        <Text style={[styles.historyToggleText, historyMode && { color: C.text }]}>
          Histórico de Gerenciamento
        </Text>
        <View style={[styles.historyBadge, historyMode && styles.historyBadgeActive]}>
          <Text style={[styles.historyBadgeText, historyMode && { color: '#FFF' }]}>
            {historyMode ? 'Ativo' : 'Ver'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* ── Toggle Certificados Enviados ─── */}
      <TouchableOpacity
        style={[styles.historyToggle, certsSentMode && styles.historyToggleActive]}
        onPress={() => {
          setCertsSentMode((v) => !v);
          if (!certsSentMode) setHistoryMode(false); // desativa histórico ao ativar este
        }}
        activeOpacity={0.75}
      >
        <Ionicons
          name={certsSentMode ? 'ribbon' : 'ribbon-outline'}
          size={15}
          color={certsSentMode ? C.primary : C.textSecondary}
        />
        <Text style={[styles.historyToggleText, certsSentMode && { color: C.text }]}>
          Certificados Enviados
        </Text>
        <View style={[styles.historyBadge, certsSentMode && styles.historyBadgeActive]}>
          <Text style={[styles.historyBadgeText, certsSentMode && { color: '#FFF' }]}>
            {certsSentMode ? 'Ativo' : 'Ver'}
          </Text>
        </View>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredRegistrations}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={[styles.listContent, selectedIds.size > 0 && { paddingBottom: 170 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadRegistrations(true)}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={40} color={C.textMuted} />
              <Text style={styles.emptyText}>
                {certsSentMode ? 'Nenhum certificado emitido ainda.' : historyMode ? 'Nenhum registro no histórico.' : 'Nenhuma solicitação pendente.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Barra inferior ───────────────── */}
      {selectedIds.size > 0 && (
        <View style={styles.bottomBar}>
          <Text style={styles.bottomBarCount}>{selectedIds.size} selecionado(s)</Text>
          <TouchableOpacity style={styles.bottomBarBtn} onPress={handleSendCertificates}>
            <Ionicons name="ribbon-outline" size={14} color="#FFF" />
            <Text style={styles.bottomBarBtnText}>Certificados</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomBarBtnSecondary} onPress={handleExportPdf}>
            <Ionicons name="document-outline" size={14} color={C.primary} />
            <Text style={styles.bottomBarBtnTextSecondary}>PDF</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom Nav ─────────────────────── */}
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

          <TouchableOpacity style={styles.navItem} activeOpacity={0.75}>
            <GradientIcon name="people-outline" size={20} active />
            <Text style={styles.navLabelActive}>Gestão</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Painel de filtros ─────────────── */}
      <Modal
        visible={filterPanelOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterPanelOpen(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterPanelOpen(false)} />
        <View style={styles.filterPanel}>
          <View style={styles.panelHandle} />
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Filtrar por</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.panelClearText}>Limpar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.panelScroll}>

            <Text style={styles.sectionLabel}>Evento</Text>
            {eventOptions().map((opt) => (
              <TouchableOpacity key={opt.id} style={styles.radioRow} onPress={() => setTmpEvent(opt.id)} activeOpacity={0.7}>
                <View style={[styles.radioOuter, tmpEvent === opt.id && styles.radioOuterActive]}>
                  {tmpEvent === opt.id && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.radioLabel, tmpEvent === opt.id && styles.radioLabelActive]} numberOfLines={1}>
                  {opt.name}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Status da inscrição</Text>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity key={opt.value} style={styles.radioRow} onPress={() => setTmpStatus(opt.value)} activeOpacity={0.7}>
                <View style={[styles.radioOuter, tmpStatus === opt.value && styles.radioOuterActive]}>
                  {tmpStatus === opt.value && <View style={styles.radioInner} />}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  {opt.value ? <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[opt.value] }]} /> : null}
                  <Text style={[styles.radioLabel, tmpStatus === opt.value && styles.radioLabelActive]}>{opt.label}</Text>
                </View>
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Certificado</Text>
            {CERT_OPTIONS.map((opt) => (
              <TouchableOpacity key={opt.value} style={styles.radioRow} onPress={() => setTmpCert(opt.value)} activeOpacity={0.7}>
                <View style={[styles.radioOuter, tmpCert === opt.value && styles.radioOuterActive]}>
                  {tmpCert === opt.value && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.radioLabel, tmpCert === opt.value && styles.radioLabelActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
            <Text style={styles.applyBtnText}>Aplicar filtros</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Modal de sucesso: Participante Aprovado ── */}
      <Modal
        visible={successVisible}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={hideSuccessModal}
      >
        <TouchableOpacity
          style={styles.successOverlay}
          activeOpacity={1}
          onPress={hideSuccessModal}
        >
          <Animated.View
            style={[
              styles.successBox,
              { transform: [{ scale: successScale }], opacity: successOpacity },
            ]}
          >
            {/* Linha decorativa topo */}
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.successTopBar}
            />

            {/* Ícone */}
            <View style={styles.successIconWrapper}>
              <LinearGradient
                colors={['#8B5CF6', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.successIconBadge}
              >
                <Ionicons name="checkmark" size={28} color="#FFF" />
              </LinearGradient>
            </View>

            {/* Texto */}
            <Text style={styles.successTitle}>Participante Aprovado!</Text>
            <Text style={styles.successSubtitle}>
              Uma notificação foi enviada{'\n'}com a confirmação.
            </Text>

            {/* Botão OK */}
            <TouchableOpacity
              style={styles.successOkBtn}
              onPress={hideSuccessModal}
              activeOpacity={0.75}
            >
              <LinearGradient
                colors={['#8B5CF6', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.successOkGradient}
              >
                <Text style={styles.successOkText}>OK</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal de rejeição: Participante Rejeitado ── */}
      <Modal
        visible={rejectionVisible}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={hideRejectionModal}
      >
        <TouchableOpacity
          style={styles.successOverlay}
          activeOpacity={1}
          onPress={hideRejectionModal}
        >
          <Animated.View
            style={[
              styles.successBox,
              { transform: [{ scale: rejectionScale }], opacity: rejectionOpacity },
            ]}
          >
            {/* Linha decorativa topo - cor vermelha para rejeição */}
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.successTopBar}
            />

            {/* Ícone */}
            <View style={styles.successIconWrapper}>
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.successIconBadge}
              >
                <Ionicons name="close" size={28} color="#FFF" />
              </LinearGradient>
            </View>

            {/* Texto */}
            <Text style={styles.successTitle}>Solicitação Rejeitada!</Text>
            <Text style={styles.successSubtitle}>
              O participante foi notificado{'\n'}sobre a rejeição.
            </Text>

            {/* Botão OK */}
            <TouchableOpacity
              style={styles.successOkBtn}
              onPress={hideRejectionModal}
              activeOpacity={0.75}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.successOkGradient}
              >
                <Text style={styles.successOkText}>OK</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal de Status Atualizado ── */}
      <Modal visible={updateVisible} transparent statusBarTranslucent animationType="none" onRequestClose={hideUpdateModal}>
        <TouchableOpacity style={styles.successOverlay} activeOpacity={1} onPress={hideUpdateModal}>
          <Animated.View style={[styles.successBox, { transform: [{ scale: updateScale }], opacity: updateOpacity }]}>
            <LinearGradient colors={['#8B5CF6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.successTopBar} />
            <View style={styles.successIconWrapper}>
              <LinearGradient colors={['#8B5CF6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.successIconBadge}>
                <Ionicons name="refresh" size={28} color="#FFF" />
              </LinearGradient>
            </View>
            <Text style={styles.successTitle}>Status Atualizado!</Text>
            <Text style={styles.successSubtitle}>{updateMessage}</Text>
            <TouchableOpacity style={styles.successOkBtn} onPress={hideUpdateModal} activeOpacity={0.75}>
              <LinearGradient colors={['#8B5CF6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.successOkGradient}>
                <Text style={styles.successOkText}>OK</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal de confirmação de exclusão ── */}
      <Modal
        visible={deleteConfirmVisible}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={hideDeleteConfirm}
      >
        <TouchableOpacity
          style={styles.successOverlay}
          activeOpacity={1}
          onPress={hideDeleteConfirm}
        >
          <Animated.View
            style={[
              styles.successBox,
              { transform: [{ scale: deleteConfirmScale }], opacity: deleteConfirmOpacity },
            ]}
          >
            {/* Linha topo roxa */}
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.successTopBar}
            />

            {/* Ícone */}
            <View style={styles.successIconWrapper}>
              <LinearGradient
                colors={['#8B5CF6', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.successIconBadge}
              >
                <Ionicons name="trash-outline" size={28} color="#FFF" />
              </LinearGradient>
            </View>

            {/* Texto */}
            <Text style={styles.successTitle}>Confirmar exclusão</Text>
            <Text style={styles.successSubtitle}>
              Deseja excluir esta inscrição?
            </Text>

            {/* Botões */}
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, width: '100%' }}>
              <TouchableOpacity
                style={[styles.successOkBtn, { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }]}
                onPress={hideDeleteConfirm}
                activeOpacity={0.75}
              >
                <View style={{ paddingVertical: 11, alignItems: 'center' }}>
                  <Text style={{ color: C.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 }}>CANCELAR</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.successOkBtn, { flex: 1 }]}
                onPress={confirmDelete}
                activeOpacity={0.75}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.successOkGradient}
                >
                  <Text style={styles.successOkText}>EXCLUIR</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  accessDeniedText: { color: C.text, fontSize: 22, fontWeight: '800', marginTop: 12 },
  accessDeniedSub: { color: C.textSecondary, fontSize: 13, textAlign: 'center' },
  backHomeBtn: { marginTop: 8, backgroundColor: C.primary, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 24 },
  backHomeBtnText: { color: '#FFF', fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyText: { color: C.textMuted, fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  backBtn: {
    width: 28, height: 28, borderRadius: 14,
    marginTop: 2,
    backgroundColor: 'rgba(124,95,230,0.12)',
    borderWidth: 1, borderColor: C.cardBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  headerContent: { gap: 3, paddingLeft: 4 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDiamond: { width: 13, height: 13, backgroundColor: C.primary, transform: [{ rotate: '45deg' }] },
  logoText: { color: C.text, fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  headerTitle: { color: C.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(124,95,230,0.12)',
    borderWidth: 1, borderColor: C.cardBorder,
    justifyContent: 'center', alignItems: 'center',
  },

  // Search bar — Filtrar esquerda, Buscar direita
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 12, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  filterBtnActive: { borderColor: C.primary, backgroundColor: 'rgba(124,95,230,0.12)' },
  filterBtnText: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },
  searchInputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 14, padding: 0 },

  // Active filter tags — dentro do ListHeader (fluem com a lista)
  activeFiltersRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4,
  },
  activeFilterTag: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 5, paddingLeft: 12, paddingRight: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: C.primary, backgroundColor: 'rgba(124,95,230,0.12)',
    gap: 6,
  },
  activeFilterTagText: { color: C.primary, fontSize: 12, fontWeight: '600' },
  activeFilterTagX: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(124,95,230,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  clearAllText: { color: C.textMuted, fontSize: 12, fontWeight: '600', paddingVertical: 5 },

  // History toggle
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  historyToggleActive: {
    borderColor: C.primary,
    backgroundColor: 'rgba(124,95,230,0.08)',
  },
  historyToggleText: {
    flex: 1,
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  historyBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: C.cardBorder,
  },
  historyBadgeActive: {
    backgroundColor: C.primary,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textMuted,
  },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 },
  card: {
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1,
    borderColor: C.cardBorder, marginBottom: 12, padding: 14, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  cardSelected: { borderColor: C.primary },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { padding: 2 },
  participantName: { color: C.text, fontSize: 14, fontWeight: '700' },
  eventName: { color: C.textSecondary, fontSize: 12, marginTop: 2 },
  statusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  certBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)', backgroundColor: 'rgba(167,139,250,0.1)',
  },
  certBadgeText: { color: C.accent, fontSize: 11, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 5 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 3, paddingVertical: 5, borderRadius: 7,
  },
  approveBtn: { backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)' },
  rejectBtn: { backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)' },
  editBtn: { backgroundColor: 'rgba(167,139,250,0.08)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)' },
  deleteBtn: { backgroundColor: 'rgba(156,163,175,0.06)', borderWidth: 1, borderColor: 'rgba(156,163,175,0.2)' },
  cancelBtn: { backgroundColor: 'rgba(107,114,128,0.08)', borderWidth: 1, borderColor: 'rgba(107,114,128,0.25)' },
  actionBtnText: { fontSize: 10, fontWeight: '600' },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.cardBorder,
    padding: 12, gap: 8, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, elevation: 12,
  },
  bottomBarCount: { color: C.textSecondary, fontSize: 12, fontWeight: '600', flex: 1 },
  bottomBarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primary, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16,
  },
  bottomBarBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  bottomBarBtnSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: C.primary, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16,
  },
  bottomBarBtnTextSecondary: { color: C.primary, fontSize: 12, fontWeight: '700' },

  // ── Modal de sucesso ──────────────────────────────────
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBox: {
    width: 300,
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#7C5FE6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  successTopBar: {
    width: '100%',
    height: 4,
  },
  successIconWrapper: {
    marginTop: 28,
    marginBottom: 16,
  },
  successIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C5FE6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  successTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  successSubtitle: {
    color: C.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  successOkBtn: {
    width: '70%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#7C5FE6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  successOkGradient: {
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 20,
  },
  successOkText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  // Filter panel
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  filterPanel: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '80%', paddingBottom: 32, borderTopWidth: 1, borderColor: C.cardBorder,
  },
  panelHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: C.cardBorder,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  panelHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.cardBorder,
  },
  panelTitle: { color: C.text, fontSize: 16, fontWeight: '800' },
  panelClearText: { color: C.textMuted, fontSize: 13, fontWeight: '600' },
  panelScroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  sectionLabel: { color: C.text, fontSize: 14, fontWeight: '800', marginBottom: 12 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: C.cardBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  radioOuterActive: { borderColor: C.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  radioLabel: { flex: 1, color: C.textSecondary, fontSize: 14, fontWeight: '400' },
  radioLabelActive: { color: C.text, fontWeight: '600' },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  applyBtn: {
    marginHorizontal: 20, marginTop: 16, backgroundColor: C.primary,
    borderRadius: 30, paddingVertical: 15, alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  applyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Bottom nav
  bottomNavOuter: {
    backgroundColor: '#0B0A12',
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
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  navItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 3, paddingVertical: 4,
  },
  navLabel: { color: C.textMuted, fontSize: 9, fontWeight: '500', letterSpacing: 0.3 },
  navLabelActive: { color: C.primary, fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  navLabelDisabled: { color: 'rgba(107,107,123,0.4)', fontSize: 9, fontWeight: '500', letterSpacing: 0.3 },
});
