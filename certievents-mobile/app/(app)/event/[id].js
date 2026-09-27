import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchEventById } from '../../../src/services/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import { Colors } from '../../../src/constants/colors';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} · ${hour}:${min}`;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [participating, setParticipating] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchEventById(id)
      .then(setEvent)
      .catch(() => setError('Evento não encontrado.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleParticipate = () => {
    setParticipating(true);
    setTimeout(() => {
      setParticipating(false);
      Alert.alert(
        '✅ Inscrição realizada!',
        `Você foi inscrito no evento "${event?.name}". Acompanhe pelo app!`,
        [{ text: 'OK' }],
      );
    }, 1200);
  };

  const handleCertificate = () => {
    Alert.alert(
      '🎓 Certificado',
      'Em breve você poderá solicitar o certificado após concluir o evento.',
      [{ text: 'OK' }],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>⚠️ {error || 'Erro ao carregar evento.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroArea}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>

          {event.status === 'ongoing' && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>AO VIVO</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.eventTitle}>{event.name}</Text>

          {event.description ? (
            <Text style={styles.eventDescription}>{event.description}</Text>
          ) : null}

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📅</Text>
              <View>
                <Text style={styles.infoLabel}>Data e Hora</Text>
                <Text style={styles.infoValue}>{formatDate(event.date)}</Text>
              </View>
            </View>
            {event.location ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📍</Text>
                <View>
                  <Text style={styles.infoLabel}>Local</Text>
                  <Text style={styles.infoValue}>{event.location}</Text>
                </View>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🎯</Text>
              <View>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={styles.infoValue}>
                  {event.status === 'upcoming' ? 'Em breve' : event.status === 'ongoing' ? 'Acontecendo agora' : 'Encerrado'}
                </Text>
              </View>
            </View>
          </View>

          {user && (
            <View style={styles.userCard}>
              <Text style={styles.userCardIcon}>👤</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.userCardName}>{user?.fullName}</Text>
                <Text style={styles.userCardEmail}>{user?.email}</Text>
              </View>
            </View>
          )}

          {/* Botão 1: Participar */}
          <TouchableOpacity
            style={[styles.primaryBtn, participating && styles.primaryBtnDisabled]}
            onPress={handleParticipate}
            disabled={participating}
          >
            {participating ? (
              <ActivityIndicator size="small" color={Colors.text} />
            ) : (
              <Text style={styles.primaryBtnText}>✅ Participar do Evento</Text>
            )}
          </TouchableOpacity>

          {/* Botão 2: Solicitar Certificado */}
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleCertificate}>
            <Text style={styles.secondaryBtnText}>🎓 Solicitar Certificado</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    gap: 16,
    padding: 20,
  },
  errorText: { color: '#F87171', fontSize: 14, textAlign: 'center' },
  backBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  backBtnText: { color: Colors.text, fontWeight: '600' },
  heroArea: {
    height: 180,
    backgroundColor: Colors.card,
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  backButtonText: { color: Colors.text, fontSize: 13 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderWidth: 1,
    borderColor: Colors.live,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.live },
  liveBadgeText: { color: Colors.live, fontSize: 10, fontWeight: '700' },
  content: { padding: 20, gap: 14 },
  eventTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  eventDescription: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: { fontSize: 18, marginTop: 1 },
  infoLabel: { color: Colors.textMuted, fontSize: 11 },
  infoValue: { color: Colors.text, fontSize: 14, fontWeight: '600', marginTop: 1 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    gap: 12,
  },
  userCardIcon: { fontSize: 28 },
  userCardName: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  userCardEmail: { color: Colors.textMuted, fontSize: 12 },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  secondaryBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
});

