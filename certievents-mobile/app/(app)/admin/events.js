import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../src/contexts/AuthContext';
import { API_BASE_URL } from '../../../src/constants/api';
import { AppLogo } from '../../../src/components/AppLogo';

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

const STATUS_LABELS = { upcoming: 'Próximo', ongoing: 'Ao Vivo', finished: 'Encerrado' };
const STATUS_COLORS = { upcoming: '#A78BFA', ongoing: C.approved, finished: C.textMuted };

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
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
      <LinearGradient colors={['#8B5CF6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
    </MaskedView>
  );
}

export default function AdminEventsScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams();
  const { getToken, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editType, setEditType] = useState('presencial');
  const [editStatus, setEditStatus] = useState('upcoming');
  const [saving, setSaving] = useState(false);

  // ── Modal de confirmação de exclusão ──────────────────
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const deleteScale = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;

  const showDeleteModal = useCallback((ev) => {
    setDeleteTarget(ev);
    setDeleteModal(true);
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
    ]).start(() => { setDeleteModal(false); setDeleteTarget(null); });
  }, [deleteScale, deleteOpacity]);

  const confirmDeleteEvent = async () => {
    try {
      await authFetch('DELETE', `/events/${deleteTarget._id}`);
      setEvents((prev) => prev.filter((e) => e._id !== deleteTarget._id));
      hideDeleteModal();
    } catch (e) {
      hideDeleteModal();
      Alert.alert('Erro', e.message);
    }
  };

  async function authFetch(method, path, body) {
    const token = await getToken();
    const headers = { 'Content-Type': 'application/json', 'bypass-tunnel-reminder': 'true', 'Authorization': 'Bearer ' + token };
    const options = { method, headers };
    if (body !== undefined) options.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE_URL}${path}`, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Erro ${res.status}`);
    }
    return res.json().catch(() => ({}));
  }

  const loadEvents = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await authFetch('GET', '/events');
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(useCallback(() => { loadEvents(); }, [loadEvents]));

  // Abre o modal de edição automaticamente se receber ?editId=xxx
  useEffect(() => {
    if (editId && events.length > 0) {
      const ev = events.find((e) => e._id === editId);
      if (ev) openEdit(ev);
    }
  }, [editId, events]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = (ev) => {
    setEditEvent(ev);
    setEditName(ev.name || '');
    const d = ev.date ? new Date(ev.date) : new Date();
    setEditDate(`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`);
    setEditTime(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
    if (ev.endDate) {
      const e = new Date(ev.endDate);
      setEditEndTime(`${String(e.getHours()).padStart(2,'0')}:${String(e.getMinutes()).padStart(2,'0')}`);
    } else { setEditEndTime(''); }
    setEditLocation(ev.location || '');
    setEditType(ev.type || 'presencial');
    setEditStatus(ev.status || 'upcoming');
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) { Alert.alert('Campo obrigatório', 'Nome não pode ser vazio.'); return; }
    setSaving(true);
    try {
      const [day, month, year] = editDate.split('/');
      const [h, m] = editTime.split(':');
      const date = new Date(+year, +month-1, +day, +h, +m);
      const payload = {
        name: editName.trim(),
        date: date.toISOString(),
        location: editLocation.trim(),
        type: editType,
        status: editStatus,
      };
      if (editEndTime) {
        const [eh, em] = editEndTime.split(':');
        payload.endDate = new Date(+year, +month-1, +day, +eh, +em).toISOString();
      }
      await authFetch('PATCH', `/events/${editEvent._id}`, payload);
      setEditModal(false);
      await loadEvents();
    } catch (e) { Alert.alert('Erro', e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (ev) => {
    showDeleteModal(ev);
  };

  const filtered = events.filter((e) =>
    e.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (!user || user.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={C.textMuted} />
          <Text style={styles.emptyText}>Acesso negado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }) => {
    const sc = STATUS_COLORS[item.status] || C.textMuted;
    const sl = STATUS_LABELS[item.status] || item.status;
    return (
      <LinearGradient
        colors={['#8B5CF6', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardBorderGradient}
      >
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
              {item.location ? <Text style={styles.cardLocation} numberOfLines={1}>{item.location}</Text> : null}
            </View>
            <View style={[styles.statusBadge, { borderColor: sc + '99', backgroundColor: sc + '18' }]}>
              <Text style={[styles.statusText, { color: sc }]}>{sl.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)} activeOpacity={0.75}>
              <Ionicons name="pencil-outline" size={14} color={C.accent} />
              <Text style={styles.editBtnText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)} activeOpacity={0.75}>
              <Ionicons name="trash-outline" size={14} color={C.rejected} />
              <Text style={styles.deleteBtnText}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <AppLogo size={30} textSize={16} tagline="REGISTRO DE EVENTOS" />
      </View>

      {/* Busca */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={15} color={C.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar evento..."
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={15} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 8) + 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadEvents(true)} tintColor={C.primary} colors={[C.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="calendar-outline" size={40} color={C.textMuted} />
              <Text style={styles.emptyText}>{search ? 'Nenhum evento encontrado.' : 'Nenhum evento cadastrado ainda.'}</Text>
            </View>
          }
        />
      )}

      {/* Bottom nav */}
      <View style={[styles.bottomNavOuter, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.bottomNavInner}>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(app)/create-event')} activeOpacity={0.75}>
            <GradientIcon name="add-circle-outline" size={20} active />
            <Text style={styles.navLabelActive}>Registrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/(app)')} activeOpacity={0.75}>
            <GradientIcon name="home" size={22} active />
            <Text style={styles.navLabel}>Início</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(app)/admin/registrations')} activeOpacity={0.75}>
            <GradientIcon name="people-outline" size={20} active />
            <Text style={styles.navLabelActive}>Gestão</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de edição */}
      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditModal(false)} />
        <View style={styles.modalPanel}>
          <View style={styles.panelHandle} />
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Editar Evento</Text>
            <TouchableOpacity onPress={() => setEditModal(false)}>
              <Ionicons name="close" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.panelScroll}>
            {/* Nome */}
            <Text style={styles.fieldLabel}>Nome</Text>
            <TextInput style={styles.fieldInput} value={editName} onChangeText={setEditName} placeholderTextColor={C.textMuted} placeholder="Nome do evento" />

            {/* Data | Início | Fim */}
            <View style={styles.rowFields}>
              <View style={{ flex: 1.3 }}>
                <Text style={styles.fieldLabel}>Data</Text>
                <TextInput style={styles.fieldInput} value={editDate} onChangeText={setEditDate} keyboardType="numeric" placeholder="DD/MM/AAAA" placeholderTextColor={C.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Início</Text>
                <TextInput style={styles.fieldInput} value={editTime} onChangeText={setEditTime} keyboardType="numeric" placeholder="09:00" placeholderTextColor={C.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Fim</Text>
                <TextInput style={styles.fieldInput} value={editEndTime} onChangeText={setEditEndTime} keyboardType="numeric" placeholder="11:00" placeholderTextColor={C.textMuted} />
              </View>
            </View>

            {/* Local */}
            <Text style={styles.fieldLabel}>Local</Text>
            <TextInput style={styles.fieldInput} value={editLocation} onChangeText={setEditLocation} placeholder="Local do evento" placeholderTextColor={C.textMuted} />

            {/* Tipo */}
            <Text style={styles.fieldLabel}>Tipo</Text>
            <View style={styles.toggleRow}>
              {['presencial', 'online'].map((t) => (
                <TouchableOpacity key={t} style={[styles.toggleBtn, editType === t && styles.toggleActive]} onPress={() => setEditType(t)}>
                  <Text style={[styles.toggleText, editType === t && styles.toggleTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Status */}
            <Text style={styles.fieldLabel}>Status</Text>
            <View style={styles.toggleRow}>
              {['upcoming', 'ongoing', 'finished'].map((s) => (
                <TouchableOpacity key={s} style={[styles.toggleBtn, editStatus === s && styles.toggleActive]} onPress={() => setEditStatus(s)}>
                  <Text style={[styles.toggleText, editStatus === s && styles.toggleTextActive]}>{STATUS_LABELS[s]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveEdit} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Salvar alterações</Text>}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Modal de confirmação de exclusão ── */}
      <Modal visible={deleteModal} transparent statusBarTranslucent animationType="none" onRequestClose={hideDeleteModal}>
        <TouchableOpacity style={styles.deleteOverlay} activeOpacity={1} onPress={hideDeleteModal}>
          <Animated.View style={[styles.deleteBox, { transform: [{ scale: deleteScale }], opacity: deleteOpacity }]}>
            <LinearGradient colors={['#8B5CF6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.deleteTopBar} />
            <View style={styles.deleteIconWrapper}>
              <LinearGradient colors={['#8B5CF6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.deleteIconBadge}>
                <Ionicons name="trash-outline" size={28} color="#FFF" />
              </LinearGradient>
            </View>
            <Text style={styles.deleteTitle}>Excluir evento</Text>
            <Text style={styles.deleteSubtitle}>
              {deleteTarget ? `"${deleteTarget.name}"` : 'Este evento'}{'\n'}será excluído permanentemente.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, width: '100%' }}>
              <TouchableOpacity
                style={[styles.deleteOkBtn, { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }]}
                onPress={hideDeleteModal} activeOpacity={0.75}
              >
                <View style={{ paddingVertical: 11, alignItems: 'center' }}>
                  <Text style={{ color: C.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 }}>CANCELAR</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteOkBtn, { flex: 1 }]} onPress={confirmDeleteEvent} activeOpacity={0.75}>
                <LinearGradient colors={['#8B5CF6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.deleteOkGradient}>
                  <Text style={styles.deleteOkText}>EXCLUIR</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  emptyText: { color: C.textMuted, fontSize: 14, textAlign: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.cardBorder,
  },
  headerContent: { flex: 1, gap: 3 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDiamond: { width: 13, height: 13, backgroundColor: C.primary, transform: [{ rotate: '45deg' }] },
  logoText: { color: C.text, fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  headerTitle: { color: C.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(124,95,230,0.12)', borderWidth: 1, borderColor: C.cardBorder,
    justifyContent: 'center', alignItems: 'center',
  },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 14, padding: 0 },

  list: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  cardBorderGradient: { borderRadius: 16, padding: 1.5 },
  card: {
    backgroundColor: C.card, borderRadius: 14.5,
    padding: 14, gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardName: { color: C.text, fontSize: 14, fontWeight: '700' },
  cardDate: { color: C.textSecondary, fontSize: 12 },
  cardLocation: { color: C.textMuted, fontSize: 11 },
  statusBadge: { borderWidth: 1, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8 },
  statusText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 8, borderRadius: 10,
    backgroundColor: 'rgba(167,139,250,0.08)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)',
  },
  editBtnText: { color: C.accent, fontSize: 12, fontWeight: '600' },
  deleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 8, borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)',
  },
  deleteBtnText: { color: C.rejected, fontSize: 12, fontWeight: '600' },

  // Bottom nav
  bottomNavOuter: {
    backgroundColor: '#0B0A12', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', elevation: 12,
  },
  bottomNavInner: { flexDirection: 'row', width: '100%', maxWidth: 480, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 8 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 4 },
  navLabel: { color: C.textMuted, fontSize: 9, fontWeight: '500', letterSpacing: 0.3 },
  navLabelActive: { color: C.primary, fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

  // Modal edição
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalPanel: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', paddingBottom: 32, borderTopWidth: 1, borderColor: C.cardBorder,
  },
  panelHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.cardBorder, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  panelHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.cardBorder,
  },
  panelTitle: { color: C.text, fontSize: 16, fontWeight: '800' },
  panelScroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 8 },
  fieldLabel: { color: C.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  fieldInput: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14, color: C.text, fontSize: 14,
  },
  rowFields: { flexDirection: 'row', gap: 8 },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder,
  },
  toggleActive: { backgroundColor: 'rgba(124,95,230,0.15)', borderColor: C.primary },
  toggleText: { color: C.textSecondary, fontSize: 12, fontWeight: '600' },
  toggleTextActive: { color: C.primary },
  saveBtn: {
    marginHorizontal: 20, marginTop: 16, backgroundColor: C.primary,
    borderRadius: 30, paddingVertical: 15, alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, elevation: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // ── Modal exclusão ──
  deleteOverlay: {
    flex: 1, backgroundColor: 'rgba(8,7,13,0.85)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
  },
  deleteBox: {
    width: '100%', backgroundColor: C.card,
    borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder,
    overflow: 'hidden', alignItems: 'center', paddingBottom: 24,
  },
  deleteTopBar: { width: '100%', height: 3, marginBottom: 28 },
  deleteIconWrapper: { marginBottom: 16 },
  deleteIconBadge: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
  },
  deleteTitle: {
    color: '#FFFFFF', fontSize: 20, fontWeight: '800',
    letterSpacing: 0.3, marginBottom: 8, textAlign: 'center',
  },
  deleteSubtitle: {
    color: '#A0A0B0', fontSize: 13, textAlign: 'center',
    lineHeight: 20, marginBottom: 24, paddingHorizontal: 16,
  },
  deleteOkBtn: { width: '55%', borderRadius: 20, overflow: 'hidden' },
  deleteOkGradient: { paddingVertical: 11, alignItems: 'center', borderRadius: 20 },
  deleteOkText: { color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
});
