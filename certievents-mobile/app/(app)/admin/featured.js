import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Animated,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAudioPlayer } from 'expo-audio';
import { useAuth } from '../../../src/contexts/AuthContext';
import { API_BASE_URL } from '../../../src/constants/api';
import { AppLogo } from '../../../src/components/AppLogo';

const successSound = require('../../../assets/sounds/notification.mp3');

const C = {
  bg: '#08070D',
  surface: '#0F0E17',
  card: '#13111F',
  cardBorder: '#1F1D2E',
  primary: '#7C5FE6',
  text: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textMuted: '#6B6B7B',
};

export default function AdminFeaturedScreen() {
  const router = useRouter();
  const { getToken, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [dateText, setDateText] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Modal de sucesso customizado ────────────────────────
  const [successVisible, setSuccessVisible] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successPlayer = useAudioPlayer(successSound);

  const showSuccessModal = useCallback(() => {
    setSuccessVisible(true);
    successScale.setValue(0.08);
    successOpacity.setValue(0);
    try { successPlayer.seekTo(0); successPlayer.play(); } catch { /* ignora */ }
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
    ]).start(() => {
      setSuccessVisible(false);
      router.replace('/(app)');
    });
  }, [successScale, successOpacity, router]);

  // Formatacao automatica de hora (ex: 1900 -> 19:00)
  const handleTimeChange = (setter) => (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) setter(digits);
    else setter(`${digits.slice(0, 2)}:${digits.slice(2)}`);
  };

  // Formatacao automatica de data (ex: 15102026 -> 15/10/2026)
  const handleDateChange = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    setDateText(formatted);
  };

  const loadFeatured = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/featured`, {
        headers: { 'bypass-tunnel-reminder': 'true' },
      });
      if (!res.ok) throw new Error('Falha ao carregar destaque');
      const data = await res.json();
      if (data) {
        setTitle(data.title || '');
        setSubtitle(data.subtitle || '');
        setLocation(data.location || '');
        setExistingImageUrl(data.imageUrl || '');
        if (data.date) {
          const d = new Date(data.date);
          setDateText(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
          setStartTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
        }
        if (data.endDate) {
          const e = new Date(data.endDate);
          setEndTime(`${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`);
        }
      }
    } catch (e) {
      // nenhum destaque criado ainda — ok
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFeatured(); }, [loadFeatured]);

  const handlePickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permissão necessária', 'Precisamos acessar a galeria para selecionar a imagem.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível abrir a galeria.');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Campo obrigatório', 'O título do destaque é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('subtitle', subtitle.trim());
      formData.append('location', location.trim());

      if (dateText && startTime) {
        const [day, month, year] = dateText.split('/');
        const [h, m] = startTime.split(':');
        if (day && month && year && h && m) {
          const date = new Date(+year, +month - 1, +day, +h, +m);
          formData.append('date', date.toISOString());
          if (endTime) {
            const [eh, em] = endTime.split(':');
            const endDate = new Date(+year, +month - 1, +day, +eh, +em);
            formData.append('endDate', endDate.toISOString());
          }
        }
      }

      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const fileType = match ? `image/${match[1]}` : 'image/jpeg';
        if (Platform.OS === 'web') {
          const r = await fetch(imageUri);
          const blob = await r.blob();
          formData.append('image', blob, filename);
        } else {
          formData.append('image', { uri: imageUri, name: filename, type: fileType });
        }
      }

      const res = await fetch(`${API_BASE_URL}/featured`, {
        method: 'POST',
        headers: {
          'bypass-tunnel-reminder': 'true',
          'Authorization': 'Bearer ' + token,
        },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Erro ${res.status}`);
      }
      showSuccessModal();
    } catch (e) {
      Alert.alert('Erro', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={C.textMuted} />
          <Text style={styles.deniedText}>Acesso negado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const previewUri = imageUri
    || (existingImageUrl
      ? (existingImageUrl.startsWith('http') ? existingImageUrl : `${API_BASE_URL}/uploads/${existingImageUrl}`)
      : null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <AppLogo size={24} textSize={13} />
              <Text style={styles.headerTitle}>EDITAR DESTAQUE</Text>
            </View>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="close" size={20} color={C.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
          ) : (
            <View style={styles.formCard}>
              {/* Imagem */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Imagem do destaque</Text>
                <TouchableOpacity style={styles.imageBox} onPress={handlePickImage} activeOpacity={0.75}>
                  {previewUri ? (
                    <>
                      <Image source={{ uri: previewUri }} style={styles.imagePreview} />
                      <View style={styles.changeOverlay}>
                        <Text style={styles.changeText}>Trocar imagem</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="cloud-upload-outline" size={28} color={C.primary} />
                      <Text style={styles.uploadText}>Carregar imagem</Text>
                      <Text style={styles.uploadHint}>Formato recomendado: 16:9</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Título */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Título</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Ex: Demo Week 2026"
                  placeholderTextColor={C.textMuted}
                />
              </View>

              {/* Subtítulo */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Subtítulo (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={subtitle}
                  onChangeText={setSubtitle}
                  placeholder="Semana de demonstrações"
                  placeholderTextColor={C.textMuted}
                />
              </View>

              {/* Data e Horário */}
              <View style={styles.rowFields}>
                <View style={[styles.fieldGroup, { flex: 1.5 }]}>
                  <Text style={styles.label}>Data</Text>
                  <TextInput
                    style={styles.input}
                    value={dateText}
                    onChangeText={handleDateChange}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={C.textMuted}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Início</Text>
                  <TextInput
                    style={[styles.input, { textAlign: 'center' }]}
                    value={startTime}
                    onChangeText={handleTimeChange(setStartTime)}
                    placeholder="09:00"
                    placeholderTextColor={C.textMuted}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Fim</Text>
                  <TextInput
                    style={[styles.input, { textAlign: 'center' }]}
                    value={endTime}
                    onChangeText={handleTimeChange(setEndTime)}
                    placeholder="18:00"
                    placeholderTextColor={C.textMuted}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
              </View>

              {/* Local */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Local</Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="IFPE / Igarassu"
                  placeholderTextColor={C.textMuted}
                />
              </View>

              {/* Botão Salvar */}
              <TouchableOpacity
                style={[styles.saveBtnWrapper, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.75}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtn}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>SALVAR DESTAQUE</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modal de sucesso: Destaque Atualizado ── */}
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
                <Ionicons name="star" size={28} color="#FFF" />
              </LinearGradient>
            </View>

            {/* Texto */}
            <Text style={styles.successTitle}>Destaque Atualizado!</Text>
            <Text style={styles.successSubtitle}>
              O banner em destaque foi{'\n'}salvo com sucesso.
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

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { padding: 20, paddingBottom: 40 },
  center: { padding: 40, alignItems: 'center', gap: 10 },
  deniedText: { color: C.textMuted, fontSize: 14 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  headerContent: { gap: 4 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDiamond: { width: 13, height: 13, backgroundColor: C.primary, transform: [{ rotate: '45deg' }] },
  logoText: { color: C.text, fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  headerTitle: { color: C.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },

  formCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 16,
    gap: 14,
  },
  hint: {
    color: C.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
  },

  fieldGroup: { gap: 6 },
  label: { color: C.textSecondary, fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: C.text,
    fontSize: 14,
  },
  rowFields: { flexDirection: 'row', gap: 10 },

  imageBox: {
    backgroundColor: 'rgba(124, 95, 230, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(124, 95, 230, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 160,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  changeOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 6, alignItems: 'center',
  },
  changeText: { color: C.text, fontSize: 11, fontWeight: '600' },
  imagePlaceholder: { alignItems: 'center', gap: 6 },
  uploadText: { color: C.text, fontSize: 14, fontWeight: '700' },
  uploadHint: { color: C.textMuted, fontSize: 11 },

  saveBtnWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
    alignSelf: 'center',
    width: '70%',
    shadowColor: '#7C5FE6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBtn: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
  },

  // ── Modal de sucesso ──
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8,7,13,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  successBox: {
    width: '100%',
    backgroundColor: '#13111F',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1F1D2E',
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 24,
  },
  successTopBar: {
    width: '100%',
    height: 3,
    marginBottom: 28,
  },
  successIconWrapper: {
    marginBottom: 16,
  },
  successIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    color: '#A0A0B0',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  successOkBtn: {
    width: '55%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  successOkGradient: {
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 20,
  },
  successOkText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});
