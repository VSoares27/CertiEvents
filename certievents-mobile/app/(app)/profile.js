import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import * as ImagePicker from 'expo-image-picker';
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
  navBg: '#0B0A12',
  rejected: '#EF4444',
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
        colors={[C.gradientStart, C.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size }}
      />
    </MaskedView>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, getToken, signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [uploading, setUploading] = useState(false);
  const [avatarCacheBuster, setAvatarCacheBuster] = useState(Date.now());

  // ── Modal de erro customizado ──────────────────────────
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const errorScale = useRef(new Animated.Value(0)).current;
  const errorOpacity = useRef(new Animated.Value(0)).current;

  const showErrorModal = useCallback((msg) => {
    setErrorMessage(msg);
    setErrorVisible(true);
    errorScale.setValue(0.08);
    errorOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(errorScale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 10 }),
      Animated.timing(errorOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [errorScale, errorOpacity]);

  const hideErrorModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(errorScale, { toValue: 0.08, duration: 140, useNativeDriver: true }),
      Animated.timing(errorOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(() => setErrorVisible(false));
  }, [errorScale, errorOpacity]);

  // ── Modal de sucesso ───────────────────────────────────
  const [successVisible, setSuccessVisible] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const showSuccessModal = useCallback(() => {
    setSuccessVisible(true);
    successScale.setValue(0.08);
    successOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 10 }),
      Animated.timing(successOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [successScale, successOpacity]);

  const hideSuccessModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(successScale, { toValue: 0.08, duration: 140, useNativeDriver: true }),
      Animated.timing(successOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(() => setSuccessVisible(false));
  }, [successScale, successOpacity]);

  const handleSignOut = () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showErrorModal('Permita o acesso à galeria para fazer upload da foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const token = await getToken();
    if (!token) return;

    setUploading(true);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const r = await fetch(asset.uri);
        const blob = await r.blob();
        formData.append('avatar', blob, 'avatar.jpg');
      } else {
        // eslint-disable-next-line no-undef
        formData.append('avatar', {
          uri: asset.uri,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        });
      }

      const res = await fetch(`${API_BASE_URL}/auth/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'bypass-tunnel-reminder': 'true',
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        await signIn({ ...user, avatarUrl: data.avatarUrl }, token);
        setAvatarCacheBuster(Date.now()); // força recarregar a imagem
        showSuccessModal();
      } else {
        const err = await res.json().catch(() => ({}));
        showErrorModal(err.message || 'Não foi possível fazer o upload da imagem.');
      }
    } catch {
      showErrorModal('Falha ao enviar a imagem. Verifique sua conexão.');
    } finally {
      setUploading(false);
    }
  };

  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const roleLabel = user?.role === 'admin' ? 'Administrador' : 'Participante';
  const roleBadgeColor = user?.role === 'admin' ? '#F59E0B' : C.primary;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <AppLogo size={30} textSize={16} />
        <Text style={styles.headerSubtitle}>Configurações de perfil</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 200 + insets.bottom }]}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarLeft}>
            <Text style={styles.avatarGreeting}>
              Olá, <Text style={styles.avatarGreetingName}>{user?.fullName?.split(' ')[0] || '—'}!</Text>
            </Text>
          </View>
          <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickImage} disabled={uploading}>
            <LinearGradient
              colors={[C.gradientStart, C.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarBorder}
            >
              {user?.avatarUrl ? (
                <Image
                  source={{ uri: (user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_BASE_URL}/uploads/${user.avatarUrl}`) + `?t=${avatarCacheBuster}` }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
            </LinearGradient>
            <View style={styles.avatarEditBadge}>
              {uploading
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Ionicons name="camera" size={14} color="#FFF" />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { color: C.text }]}>INFORMAÇÕES DA CONTA</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={C.textMuted} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Nome completo</Text>
              <Text style={styles.infoValue}>{user?.fullName || '—'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color={C.textMuted} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>E-mail</Text>
              <Text style={styles.infoValue}>{user?.email || '—'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="shield-outline" size={16} color={C.textMuted} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Tipo de conta</Text>
              <Text style={[styles.infoValue, { color: roleBadgeColor }]}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        {/* Ações */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>AÇÕES</Text>
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(app)/my-certificates')}>
            <Ionicons name="ribbon-outline" size={18} color={C.primary} />
            <Text style={styles.actionText}>Acessar Certificados</Text>
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sair */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={17} color="#EF4444" />
          <Text style={styles.signOutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Bottom Nav — só Início ── */}
      <View style={[styles.bottomNavOuter, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.bottomNavInner}>
          <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/(app)')} activeOpacity={0.75}>
            <GradientIcon name="home" size={22} active />
            <Text style={styles.navLabelActive}>Início</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Modal de Erro ─────────────────── */}
      <Modal visible={errorVisible} transparent statusBarTranslucent animationType="none" onRequestClose={hideErrorModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={hideErrorModal}>
          <Animated.View style={[styles.modalBox, { transform: [{ scale: errorScale }], opacity: errorOpacity }]}>
            <LinearGradient colors={['#EF4444', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalTopBar} />
            <View style={styles.modalIconWrapper}>
              <LinearGradient colors={['#EF4444', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalIconBadge}>
                <Ionicons name="alert-circle-outline" size={28} color="#FFF" />
              </LinearGradient>
            </View>
            <Text style={styles.modalTitle}>Erro no carregamento</Text>
            <Text style={styles.modalSubtitle}>{errorMessage}</Text>
            <TouchableOpacity style={styles.modalOkBtn} onPress={hideErrorModal} activeOpacity={0.75}>
              <LinearGradient colors={['#EF4444', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalOkGradient}>
                <Text style={styles.modalOkText}>OK</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal de Sucesso ──────────────── */}
      <Modal visible={successVisible} transparent statusBarTranslucent animationType="none" onRequestClose={hideSuccessModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={hideSuccessModal}>
          <Animated.View style={[styles.modalBox, { transform: [{ scale: successScale }], opacity: successOpacity }]}>
            <LinearGradient colors={[C.gradientStart, C.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalTopBar} />
            <View style={styles.modalIconWrapper}>
              <LinearGradient colors={[C.gradientStart, C.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalIconBadge}>
                <Ionicons name="checkmark" size={28} color="#FFF" />
              </LinearGradient>
            </View>
            <Text style={[styles.modalTitle, { fontSize: 15 }]}>Foto atualizada com sucesso!</Text>
            <TouchableOpacity style={styles.modalOkBtn} onPress={hideSuccessModal} activeOpacity={0.75}>
              <LinearGradient colors={[C.gradientStart, C.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalOkGradient}>
                <Text style={styles.modalOkText}>OK</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.cardBorder,
    gap: 2,
  },
  headerSubtitle: {
    color: C.textSecondary, fontSize: 12, fontWeight: '600',
    letterSpacing: 0.5, marginLeft: 40,
  },
  scroll: { padding: 20, gap: 10 },

  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  avatarLeft: { flex: 1, gap: 2 },
  avatarGreeting: {
    color: C.text, fontSize: 24, fontWeight: '700',
    lineHeight: 32, letterSpacing: -0.3,
  },
  avatarGreetingName: { color: C.primary, fontWeight: '800' },
  avatarWrapper: { position: 'relative', marginBottom: 4 },
  avatarBorder: {
    width: 96, height: 96, borderRadius: 48,
    padding: 3,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { color: '#FFF', fontSize: 30, fontWeight: '800' },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: C.bg,
  },
  avatarName: { color: C.text, fontSize: 20, fontWeight: '800' },
  roleBadge: { borderWidth: 1, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 12 },
  roleBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  card: {
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.cardBorder, padding: 14, gap: 10,
  },
  cardTitle: { color: C.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { flex: 1 },
  infoLabel: { color: C.textMuted, fontSize: 11 },
  infoValue: { color: C.text, fontSize: 14, fontWeight: '600', marginTop: 2 },
  divider: { height: 1, backgroundColor: C.cardBorder },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 2 },
  actionText: { flex: 1, color: C.text, fontSize: 14, fontWeight: '600' },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    paddingVertical: 14, paddingHorizontal: 24,
    alignSelf: 'center', marginTop: 8,
  },
  signOutText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },

  // ── Bottom Nav ──
  bottomNavOuter: {
    backgroundColor: C.navBg,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 12,
    paddingTop: 8,
  },
  bottomNavInner: {
    flexDirection: 'row', width: '100%', maxWidth: 480,
    alignSelf: 'center', paddingBottom: 4, paddingHorizontal: 8,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 4 },
  navLabel: { color: C.textMuted, fontSize: 9, fontWeight: '500', letterSpacing: 0.3 },
  navLabelActive: { color: C.primary, fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  navLabelDisabled: { color: 'rgba(107,107,123,0.4)', fontSize: 9, fontWeight: '500' },

  // ── Modais ──
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(8,7,13,0.85)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
  },
  modalBox: {
    width: '100%', backgroundColor: C.card,
    borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder,
    overflow: 'hidden', alignItems: 'center', paddingBottom: 24,
  },
  modalTopBar: { width: '100%', height: 3, marginBottom: 28 },
  modalIconWrapper: { marginBottom: 16 },
  modalIconBadge: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
  },
  modalTitle: {
    color: '#FFFFFF', fontSize: 20, fontWeight: '800',
    letterSpacing: 0.3, marginBottom: 8, textAlign: 'center',
  },
  modalSubtitle: {
    color: '#A0A0B0', fontSize: 13, textAlign: 'center',
    lineHeight: 20, marginBottom: 24, paddingHorizontal: 16,
  },
  modalOkBtn: { width: '55%', borderRadius: 20, overflow: 'hidden' },
  modalOkGradient: { paddingVertical: 11, alignItems: 'center', borderRadius: 20 },
  modalOkText: { color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
});
