import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AppLogo } from '../../src/components/AppLogo';
import {
  fetchCategories,
  createCategory,
  fetchSpaces,
  createSpace,
  createEvent,
  previewCertificate,
} from '../../src/services/api';
import { Colors } from '../../src/constants/colors';

const TEMPLATES = [
  {
    id: 'moderno',
    name: 'Moderno',
    badge: 'Padrão',
    desc: 'Dark theme elegante, bordas douradas e gradiente roxo.',
    icon: 'sparkles',
    color: '#8B5CF6',
  },
  {
    id: 'classico',
    name: 'Clássico',
    badge: 'Acadêmico',
    desc: 'Estilo diploma tradicional com moldura dupla e marfim.',
    icon: 'ribbon',
    color: '#B8860B',
  },
  {
    id: 'minimalista',
    name: 'Minimalista',
    badge: 'Clean',
    desc: 'Fundo branco puro, tipografia limpa e econômico.',
    icon: 'document-text',
    color: '#0EA5E9',
  },
  {
    id: 'custom',
    name: 'Personalizado',
    badge: 'Custom',
    desc: 'Ajuste livre de cores, temas, títulos e textos.',
    icon: 'color-palette',
    color: '#EC4899',
  },
];

const COLOR_PRESETS = [
  { name: 'Índigo & Rosa', primary: '#6366F1', secondary: '#EC4899', bg: '#0F172A' },
  { name: 'Esmeralda & Ciano', primary: '#10B981', secondary: '#06B6D4', bg: '#064E3B' },
  { name: 'Ouro & Marinho', primary: '#F59E0B', secondary: '#3B82F6', bg: '#1E293B' },
  { name: 'Rubi & Violeta', primary: '#E11D48', secondary: '#8B5CF6', bg: '#18181B' },
];

export default function CreateEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── Etapa do Wizard: 1 = Dados do Evento, 2 = Certificado ──
  const [currentStep, setCurrentStep] = useState(1);

  // ── DateTimePicker ────────────────────────────────────
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState('date'); // 'date' | 'time'
  const [pickerTarget, setPickerTarget] = useState('start'); // 'start' | 'end'
  const [pickerDate, setPickerDate] = useState(new Date());

  const openDatePicker = () => {
    if (dateText && dateText.includes('/')) {
      const [d, m, y] = dateText.split('/');
      const [h, mi] = timeText.includes(':') ? timeText.split(':') : ['09', '00'];
      setPickerDate(new Date(+y, +m - 1, +d, +h, +mi));
    } else {
      setPickerDate(new Date());
    }
    setPickerMode('date');
    setPickerTarget('start');
    setPickerVisible(true);
  };

  const openTimePicker = (target) => {
    if (dateText && dateText.includes('/')) {
      const [d, m, y] = dateText.split('/');
      const timeStr = target === 'end' ? endTimeText : timeText;
      const [h, mi] = timeStr.includes(':') ? timeStr.split(':') : ['09', '00'];
      setPickerDate(new Date(+y, +m - 1, +d, +h, +mi));
    } else {
      setPickerDate(new Date());
    }
    setPickerMode('time');
    setPickerTarget(target);
    setPickerVisible(true);
  };

  const onPickerChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setPickerVisible(false);
    if (event.type === 'dismissed' || !selectedDate) {
      setPickerVisible(false);
      return;
    }
    const d = selectedDate;
    if (pickerMode === 'date') {
      const day = String(d.getDate()).padStart(2, '0');
      const mon = String(d.getMonth() + 1).padStart(2, '0');
      const yr = d.getFullYear();
      setDateText(`${day}/${mon}/${yr}`);
      setPickerDate(d);
      if (Platform.OS === 'ios') {
        setPickerMode('time');
        setPickerTarget('start');
      }
    } else {
      const h = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      if (pickerTarget === 'end') setEndTimeText(`${h}:${mi}`);
      else setTimeText(`${h}:${mi}`);
      setPickerVisible(false);
    }
  };

  // ── Modal de sucesso ──────────────────────────────────
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
    ]).start(() => {
      setSuccessVisible(false);
      router.replace('/(app)');
    });
  }, [successScale, successOpacity, router]);

  // ── Estados da Etapa 1: Dados do Evento ───────────────
  const [name, setName] = useState('');
  const [dateText, setDateText] = useState('15/10/2026');
  const [timeText, setTimeText] = useState('09:00');
  const [endTimeText, setEndTimeText] = useState('11:00');
  const [location, setLocation] = useState('IFPE / Igarassu');
  const [description, setDescription] = useState('');
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [type, setType] = useState('presencial'); // 'presencial' | 'online'
  const [imageUri, setImageUri] = useState(null);

  // ── Estados da Etapa 2: Personalização do Certificado ───
  const [templateId, setTemplateId] = useState('moderno');
  const [workloadHours, setWorkloadHours] = useState('2h');
  const [certTitle, setCertTitle] = useState('Certificado');
  const [certSubtitle, setCertSubtitle] = useState('de participação');
  const [certOrg, setCertOrg] = useState('Instituto Federal de Pernambuco');
  const [certSubOrg, setCertSubOrg] = useState('Campus Igarassu');
  const [signerName, setSignerName] = useState('Liliane Alves');
  const [signerRole, setSignerRole] = useState('Coordenadora do Evento');
  const [signer2Name, setSigner2Name] = useState('Lincoln Tavares');
  const [signer2Role, setSigner2Role] = useState('Diretor Geral');
  const [certCustomText, setCertCustomText] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#6366F1');
  const [secondaryColor, setSecondaryColor] = useState('#EC4899');
  const [bgColor, setBgColor] = useState('#0F172A');

  // ── Estados de Pré-visualização do Certificado ──────────
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState(null);

  // Estados de listas (categorias e espaços)
  const [spaces, setSpaces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados para Modais de Novo Espaço / Categoria
  const [isSpacePickerOpen, setIsSpacePickerOpen] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [modalNewSpaceVisible, setModalNewSpaceVisible] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [addingSpace, setAddingSpace] = useState(false);

  const [modalNewCategoryVisible, setModalNewCategoryVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  // Carrega opções iniciais em paralelo
  useEffect(() => {
    async function loadData() {
      try {
        const [loadedSpaces, loadedCategories] = await Promise.all([
          fetchSpaces().catch(() => []),
          fetchCategories().catch(() => []),
        ]);
        setSpaces(loadedSpaces);
        setCategories(loadedCategories);

        if (loadedSpaces.length > 0) {
          setSelectedSpaceId(loadedSpaces[0]._id);
        }
        if (loadedCategories.length > 0) {
          setSelectedCategoryId(loadedCategories[0]._id);
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  // Calcula automaticamente a carga horária a partir dos horários de início e término
  const calculateWorkload = (t1, t2) => {
    if (!t1 || !t2 || !t1.includes(':') || !t2.includes(':')) return '2h';
    const [sh, sm] = t1.split(':').map(Number);
    const [eh, em] = t2.split(':').map(Number);
    const startMins = sh * 60 + (sm || 0);
    const endMins = eh * 60 + (em || 0);
    const diff = endMins - startMins;
    if (diff > 0) {
      const h = Math.round((diff / 60) * 10) / 10;
      return `${h}h`;
    }
    return '2h';
  };

  // Avançar para a Etapa 2 (Validação prévia)
  const handleGoToStep2 = () => {
    if (!name.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, informe o nome do evento antes de avançar.');
      return;
    }
    // Auto-calcula a carga horária se ainda estiver vazia ou com valor padrão
    const autoHours = calculateWorkload(timeText, endTimeText);
    setWorkloadHours(autoHours);
    setCurrentStep(2);
  };

  // Selecionar imagem da galeria
  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permissão necessária',
          'É preciso autorizar o acesso às fotos para escolher a imagem de capa.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Erro ao escolher imagem:', err);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  // Criar novo espaço
  const handleAddNewSpace = async () => {
    if (!newSpaceName.trim()) {
      Alert.alert('Aviso', 'Digite o nome do espaço.');
      return;
    }
    setAddingSpace(true);
    try {
      const created = await createSpace(newSpaceName.trim());
      setSpaces((prev) => [...prev, created]);
      setSelectedSpaceId(created._id);
      setNewSpaceName('');
      setModalNewSpaceVisible(false);
    } catch (err) {
      Alert.alert('Erro', err.message || 'Falha ao salvar espaço.');
    } finally {
      setAddingSpace(false);
    }
  };

  // Criar nova categoria
  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Aviso', 'Digite o nome da categoria.');
      return;
    }
    setAddingCategory(true);
    try {
      const created = await createCategory(newCategoryName.trim());
      setCategories((prev) => [...prev, created]);
      setSelectedCategoryId(created._id);
      setNewCategoryName('');
      setModalNewCategoryVisible(false);
    } catch (err) {
      Alert.alert('Erro', err.message || 'Falha ao salvar categoria.');
    } finally {
      setAddingCategory(false);
    }
  };

  // Chamar pré-visualização instantânea do certificado sem salvar
  const handleOpenPreview = async () => {
    setPreviewLoading(true);
    setPreviewModalVisible(true);
    setPreviewImageUri(null);

    try {
      const result = await previewCertificate({
        templateId,
        fullName: 'NOME DO PARTICIPANTE',
        eventName: name.trim() || 'Nome do Evento Exemplo',
        eventDate: dateText || '15/10/2026',
        cargaHoraria: workloadHours,
        titulo: certTitle,
        subtitulo: certSubtitle,
        instituicao: certOrg,
        subInstituicao: certSubOrg,
        assinaturaNome: signerName,
        assinaturaCargo: signerRole,
        assinatura2Nome: signer2Name,
        assinatura2Cargo: signer2Role,
        textoPersonalizado: certCustomText,
        primaryColor,
        secondaryColor,
        bgColor,
      });

      if (result && result.previewUrl) {
        setPreviewImageUri(result.previewUrl);
      } else {
        throw new Error('Nenhuma prévia retornada pelo servidor.');
      }
    } catch (err) {
      console.error('Erro na pré-visualização:', err);
      Alert.alert('Erro no Preview', err.message || 'Não foi possível gerar a pré-visualização.');
      setPreviewModalVisible(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Salvar evento via multipart/form-data
  const handleSaveEvent = async () => {
    if (!name.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, informe o nome do evento.');
      return;
    }

    setSaving(true);
    try {
      let eventDate = new Date();
      let eventEndDate = null;
      if (dateText.includes('/')) {
        const [day, month, year] = dateText.split('/');
        const [hour, min] = timeText.includes(':') ? timeText.split(':') : ['09', '00'];
        eventDate = new Date(
          parseInt(year, 10),
          parseInt(month, 10) - 1,
          parseInt(day, 10),
          parseInt(hour, 10),
          parseInt(min, 10)
        );
        if (endTimeText.includes(':')) {
          const [eHour, eMin] = endTimeText.split(':');
          eventEndDate = new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            parseInt(eHour, 10),
            parseInt(eMin, 10)
          );
        }
      }

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('date', eventDate.toISOString());
      if (eventEndDate) {
        formData.append('endDate', eventEndDate.toISOString());
      }
      formData.append('location', location.trim());
      formData.append('description', description.trim());
      formData.append('type', type);
      formData.append('status', 'upcoming');

      if (selectedSpaceId) {
        formData.append('spaceId', selectedSpaceId);
      }
      if (selectedCategoryId) {
        formData.append('categoryId', selectedCategoryId);
      }

      // Adiciona as configurações do certificado
      const certificateConfig = {
        templateId,
        primaryColor,
        secondaryColor,
        bgColor,
        cargaHoraria: workloadHours,
        titulo: certTitle,
        subtitulo: certSubtitle,
        instituicao: certOrg,
        subInstituicao: certSubOrg,
        textoPersonalizado: certCustomText,
        assinaturaNome: signerName,
        assinaturaCargo: signerRole,
        assinatura2Nome: signer2Name,
        assinatura2Cargo: signer2Role,
      };
      formData.append('certificateConfig', JSON.stringify(certificateConfig));

      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const fileType = match ? `image/${match[1]}` : 'image/jpeg';

        if (Platform.OS === 'web') {
          const res = await fetch(imageUri);
          const blob = await res.blob();
          formData.append('image', blob, filename);
        } else {
          formData.append('image', {
            uri: imageUri,
            name: filename,
            type: fileType,
          });
        }
      }

      await createEvent(formData);
      showSuccessModal();
    } catch (err) {
      console.error('Erro ao salvar evento:', err);
      Alert.alert('Erro ao salvar', err.message || 'Ocorreu um erro ao salvar o evento.');
    } finally {
      setSaving(false);
    }
  };

  const selectedSpaceObj = spaces.find((s) => s._id === selectedSpaceId);
  const selectedCategoryObj = categories.find((c) => c._id === selectedCategoryId);

  return (
    <>
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header estilo home */}
            <View style={styles.header}>
              <AppLogo size={30} textSize={16} tagline="CADASTRO DE EVENTOS" />
            </View>

            {/* ── Barra de Progresso / Stepper das 2 Etapas ── */}
            <View style={styles.stepperBox}>
              <TouchableOpacity
                style={styles.stepTab}
                onPress={() => setCurrentStep(1)}
                activeOpacity={0.8}
              >
                <View style={[styles.stepDot, currentStep === 1 ? styles.stepDotActive : styles.stepDotDone]}>
                  {currentStep === 2 ? (
                    <Ionicons name="checkmark" size={13} color="#FFF" />
                  ) : (
                    <Text style={styles.stepNum}>1</Text>
                  )}
                </View>
                <Text style={[styles.stepText, currentStep === 1 && styles.stepTextActive]}>
                  Dados do Evento
                </Text>
              </TouchableOpacity>

              <View style={[styles.stepLine, currentStep === 2 && styles.stepLineActive]} />

              <TouchableOpacity
                style={styles.stepTab}
                onPress={handleGoToStep2}
                activeOpacity={0.8}
              >
                <View style={[styles.stepDot, currentStep === 2 && styles.stepDotActive]}>
                  <Text style={styles.stepNum}>2</Text>
                </View>
                <Text style={[styles.stepText, currentStep === 2 && styles.stepTextActive]}>
                  Certificado
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── CARD FORMULÁRIO PRINCIPAL ── */}
            <View style={styles.formCard}>
              {currentStep === 1 ? (
                /* ========================================================
                   ETAPA 1: DADOS DO EVENTO
                   ======================================================== */
                <>
                  {/* Botões de navegação de gestão de eventos */}
                  <View style={{ gap: 8 }}>
                    <TouchableOpacity
                      style={styles.manageLinkBtn}
                      onPress={() => router.push('/(app)/admin/events')}
                    >
                      <Ionicons name="list-outline" size={14} color={Colors.text} style={{ marginRight: 6 }} />
                      <Text style={styles.manageLinkText}>Registro de Eventos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.manageLinkBtn}
                      onPress={() => router.push('/(app)/admin/ended-events')}
                    >
                      <Ionicons name="time-outline" size={14} color={Colors.text} style={{ marginRight: 6 }} />
                      <Text style={styles.manageLinkText}>Eventos Encerrados</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Nome do evento */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Nome do evento *</Text>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Workshop UX & Mobile"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>

                  {/* Tipo: Presencial / Online */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Tipo</Text>
                    <View style={styles.toggleRow}>
                      <TouchableOpacity
                        style={[
                          styles.toggleBtn,
                          type === 'presencial' ? styles.toggleBtnActive : styles.toggleBtnInactive,
                        ]}
                        onPress={() => setType('presencial')}
                      >
                        <Text
                          style={[
                            styles.toggleText,
                            type === 'presencial' ? styles.toggleTextActive : styles.toggleTextInactive,
                          ]}
                        >
                          Presencial
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.toggleBtn,
                          type === 'online' ? styles.toggleBtnActive : styles.toggleBtnInactive,
                        ]}
                        onPress={() => setType('online')}
                      >
                        <Text
                          style={[
                            styles.toggleText,
                            type === 'online' ? styles.toggleTextActive : styles.toggleTextInactive,
                          ]}
                        >
                          Online
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Data */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Data</Text>
                    <TouchableOpacity style={styles.input} onPress={openDatePicker} activeOpacity={0.75}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
                        <Text style={dateText ? { color: Colors.text, fontSize: 14 } : { color: Colors.textMuted, fontSize: 14 }}>
                          {dateText || 'Selecionar data'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Horário de início e fim */}
                  <View style={styles.rowFields}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Início</Text>
                      <TouchableOpacity style={[styles.input, { alignItems: 'center' }]} onPress={() => openTimePicker('start')} activeOpacity={0.75}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="time-outline" size={15} color={Colors.textMuted} />
                          <Text style={timeText ? { color: Colors.text, fontSize: 14 } : { color: Colors.textMuted, fontSize: 14 }}>
                            {timeText || '09:00'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Fim</Text>
                      <TouchableOpacity style={[styles.input, { alignItems: 'center' }]} onPress={() => openTimePicker('end')} activeOpacity={0.75}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="time-outline" size={15} color={Colors.textMuted} />
                          <Text style={endTimeText ? { color: Colors.text, fontSize: 14 } : { color: Colors.textMuted, fontSize: 14 }}>
                            {endTimeText || '11:00'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Local */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Local (instituição)</Text>
                    <TextInput
                      style={styles.input}
                      value={location}
                      onChangeText={setLocation}
                      placeholder="IFPE / Igarassu"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>

                  {/* Descrição */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Descrição (opcional)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Descreva detalhes, palestrantes, tópicos..."
                      placeholderTextColor={Colors.textMuted}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  {/* Espaço */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Espaço</Text>
                    <View style={styles.selectorRow}>
                      <TouchableOpacity
                        style={styles.pickerSelector}
                        onPress={() => setIsSpacePickerOpen(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.pickerText, !selectedSpaceObj && styles.pickerPlaceholder]}>
                          {selectedSpaceObj ? selectedSpaceObj.name : 'Selecione um espaço'}
                        </Text>
                        <Text style={styles.dropdownArrow}>⌄</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.addBtn} onPress={() => setModalNewSpaceVisible(true)}>
                        <Text style={styles.addBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Categoria */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Categoria</Text>
                    <View style={styles.selectorRow}>
                      <TouchableOpacity
                        style={styles.pickerSelector}
                        onPress={() => setIsCategoryPickerOpen(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.pickerText, !selectedCategoryObj && styles.pickerPlaceholder]}>
                          {selectedCategoryObj ? selectedCategoryObj.name : 'Selecione uma categoria'}
                        </Text>
                        <Text style={styles.dropdownArrow}>⌄</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.addBtn} onPress={() => setModalNewCategoryVisible(true)}>
                        <Text style={styles.addBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Imagem de Capa */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Imagem de capa</Text>
                    <TouchableOpacity style={styles.imagePickerBox} onPress={handlePickImage} activeOpacity={0.8}>
                      {imageUri ? (
                        <View style={styles.imagePreviewWrapper}>
                          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                          <View style={styles.changeImageOverlay}>
                            <Text style={styles.changeImageText}>Trocar imagem</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Ionicons name="cloud-upload-outline" size={28} color={Colors.primary} />
                          <Text style={styles.uploadText}>Carregar imagem</Text>
                          <Text style={styles.uploadHint}>Clique para selecionar da galeria</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Botão Avançar para Etapa 2 */}
                  <TouchableOpacity
                    style={styles.nextStepBtnWrapper}
                    onPress={handleGoToStep2}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#8B5CF6', '#6366F1']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.nextStepBtn}
                    >
                      <Text style={styles.nextStepBtnText}>AVANÇAR: CERTIFICADO</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                /* ========================================================
                   ETAPA 2: PERSONALIZAÇÃO DO CERTIFICADO
                   ======================================================== */
                <>
                  {/* Cabeçalho da Etapa 2 com botão voltar */}
                  <View style={styles.step2Header}>
                    <TouchableOpacity
                      style={styles.backStepLink}
                      onPress={() => setCurrentStep(1)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="arrow-back" size={15} color={Colors.primary} />
                      <Text style={styles.backStepLinkText}>Voltar para dados do evento</Text>
                    </TouchableOpacity>
                    <Text style={styles.step2Title}>Modelo do Certificado</Text>
                    <Text style={styles.step2Desc}>
                      Selecione o design e ajuste os dados que serão impressos no certificado dos participantes.
                    </Text>
                  </View>

                  {/* Grade de Seleção de Templates */}
                  <View style={styles.templateGrid}>
                    {TEMPLATES.map((t) => {
                      const isSelected = templateId === t.id;
                      return (
                        <TouchableOpacity
                          key={t.id}
                          style={[
                            styles.templateCard,
                            isSelected && styles.templateCardActive,
                          ]}
                          onPress={() => setTemplateId(t.id)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.templateCardTop}>
                            <View style={[styles.templateIconWrap, { backgroundColor: `${t.color}20` }]}>
                              <Ionicons name={t.icon} size={20} color={t.color} />
                            </View>
                            <View style={[styles.templateBadge, isSelected && { backgroundColor: t.color }]}>
                              <Text style={[styles.templateBadgeText, isSelected && { color: '#FFF' }]}>
                                {t.badge}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.templateName, isSelected && { color: Colors.text }]}>
                            {t.name}
                          </Text>
                          <Text style={styles.templateDesc} numberOfLines={2}>
                            {t.desc}
                          </Text>
                          {isSelected && (
                            <View style={[styles.templateCheckCircle, { backgroundColor: t.color }]}>
                              <Ionicons name="checkmark" size={11} color="#FFF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Se for template Custom, exibe seletor de paletas */}
                  {templateId === 'custom' && (
                    <View style={styles.customPaletteBox}>
                      <Text style={styles.customPaletteTitle}>Paletas Pré-definidas</Text>
                      <View style={styles.presetsRow}>
                        {COLOR_PRESETS.map((p, idx) => {
                          const isPresetActive = primaryColor === p.primary && secondaryColor === p.secondary;
                          return (
                            <TouchableOpacity
                              key={idx}
                              style={[
                                styles.presetChip,
                                isPresetActive && styles.presetChipActive,
                              ]}
                              onPress={() => {
                                setPrimaryColor(p.primary);
                                setSecondaryColor(p.secondary);
                                setBgColor(p.bg);
                              }}
                            >
                              <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
                                <View style={[styles.colorBubble, { backgroundColor: p.primary }]} />
                                <View style={[styles.colorBubble, { backgroundColor: p.secondary }]} />
                              </View>
                              <Text style={styles.presetText}>{p.name}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <View style={styles.rowFields}>
                        <View style={[styles.fieldGroup, { flex: 1 }]}>
                          <Text style={styles.label}>Cor Primária (Hex)</Text>
                          <TextInput
                            style={styles.input}
                            value={primaryColor}
                            onChangeText={setPrimaryColor}
                            placeholder="#6366F1"
                            placeholderTextColor={Colors.textMuted}
                          />
                        </View>
                        <View style={[styles.fieldGroup, { flex: 1 }]}>
                          <Text style={styles.label}>Cor Secundária (Hex)</Text>
                          <TextInput
                            style={styles.input}
                            value={secondaryColor}
                            onChangeText={setSecondaryColor}
                            placeholder="#EC4899"
                            placeholderTextColor={Colors.textMuted}
                          />
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Carga Horária com badge de cálculo automático */}
                  <View style={styles.fieldGroup}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.label}>Carga Horária</Text>
                      <View style={styles.autoCalcBadge}>
                        <Ionicons name="calculator-outline" size={11} color={Colors.primary} />
                        <Text style={styles.autoCalcText}>Calculada automaticamente</Text>
                      </View>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={workloadHours}
                      onChangeText={setWorkloadHours}
                      placeholder="Ex: 4h ou 20 horas"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>

                  {/* Título e Subtítulo do Certificado */}
                  <View style={styles.rowFields}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Título</Text>
                      <TextInput
                        style={styles.input}
                        value={certTitle}
                        onChangeText={setCertTitle}
                        placeholder="Certificado"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Subtítulo</Text>
                      <TextInput
                        style={styles.input}
                        value={certSubtitle}
                        onChangeText={setCertSubtitle}
                        placeholder="de participação"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  </View>

                  {/* Instituição e Campus */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Instituição / Organização</Text>
                    <TextInput
                      style={styles.input}
                      value={certOrg}
                      onChangeText={setCertOrg}
                      placeholder="Instituto Federal de Pernambuco"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Sub-instituição / Campus / Núcleo</Text>
                    <TextInput
                      style={styles.input}
                      value={certSubOrg}
                      onChangeText={setCertSubOrg}
                      placeholder="Campus Igarassu"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>

                  {/* Assinatura Principal */}
                  <View style={styles.rowFields}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Assinante 1 (Nome)</Text>
                      <TextInput
                        style={styles.input}
                        value={signerName}
                        onChangeText={setSignerName}
                        placeholder="Liliane Alves"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Cargo Assinante 1</Text>
                      <TextInput
                        style={styles.input}
                        value={signerRole}
                        onChangeText={setSignerRole}
                        placeholder="Coordenadora do Evento"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  </View>

                  {/* Assinatura Secundária (opcional) */}
                  <View style={styles.rowFields}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Assinante 2 (Nome)</Text>
                      <TextInput
                        style={styles.input}
                        value={signer2Name}
                        onChangeText={setSigner2Name}
                        placeholder="Lincoln Tavares"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Cargo Assinante 2</Text>
                      <TextInput
                        style={styles.input}
                        value={signer2Role}
                        onChangeText={setSigner2Role}
                        placeholder="Diretor Geral"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  </View>

                  {/* Texto livre explicativo opcional */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Texto explicativo (opcional)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={certCustomText}
                      onChangeText={setCertCustomText}
                      placeholder="Deixe em branco para usar o texto padrão do modelo ou customize aqui..."
                      placeholderTextColor={Colors.textMuted}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  {/* Botões da Etapa 2: Pré-visualizar e Salvar */}
                  <View style={{ gap: 12, marginTop: 10 }}>
                    <TouchableOpacity
                      style={styles.previewBtn}
                      onPress={handleOpenPreview}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="eye-outline" size={17} color={Colors.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.previewBtnText}>PRÉ-VISUALIZAR CERTIFICADO</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.saveBtnWrapper, saving && styles.saveBtnDisabled]}
                      onPress={handleSaveEvent}
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
                          <Text style={styles.saveBtnText}>SALVAR EVENTO</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Modal Seletor de Espaço ── */}
        <Modal visible={isSpacePickerOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Selecione o Espaço</Text>
              <ScrollView style={{ maxHeight: 250 }}>
                {spaces.length === 0 ? (
                  <Text style={styles.emptyListText}>Nenhum espaço cadastrado. Crie um no botão (+).</Text>
                ) : (
                  spaces.map((s) => (
                    <TouchableOpacity
                      key={s._id}
                      style={[
                        styles.optionItem,
                        selectedSpaceId === s._id && styles.optionItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedSpaceId(s._id);
                        setIsSpacePickerOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.optionItemText,
                          selectedSpaceId === s._id && styles.optionItemTextSelected,
                        ]}
                      >
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsSpacePickerOpen(false)}
              >
                <Text style={styles.modalCloseText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Modal Seletor de Categoria ── */}
        <Modal visible={isCategoryPickerOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Selecione a Categoria</Text>
              <ScrollView style={{ maxHeight: 250 }}>
                {categories.length === 0 ? (
                  <Text style={styles.emptyListText}>Nenhuma categoria cadastrada. Crie uma no botão (+).</Text>
                ) : (
                  categories.map((c) => (
                    <TouchableOpacity
                      key={c._id}
                      style={[
                        styles.optionItem,
                        selectedCategoryId === c._id && styles.optionItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedCategoryId(c._id);
                        setIsCategoryPickerOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.optionItemText,
                          selectedCategoryId === c._id && styles.optionItemTextSelected,
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsCategoryPickerOpen(false)}
              >
                <Text style={styles.modalCloseText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Modal Adicionar Novo Espaço ── */}
        <Modal visible={modalNewSpaceVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Novo Espaço</Text>
              <Text style={styles.modalSubtitle}>Digite o nome do auditório, sala ou laboratório:</Text>
              <TextInput
                style={styles.modalInput}
                value={newSpaceName}
                onChangeText={setNewSpaceName}
                placeholder="Ex: Auditório Principal, Sala 102"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setModalNewSpaceVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleAddNewSpace}
                  disabled={addingSpace}
                >
                  {addingSpace ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Adicionar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Modal Adicionar Nova Categoria ── */}
        <Modal visible={modalNewCategoryVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Nova Categoria</Text>
              <Text style={styles.modalSubtitle}>Digite o nome da categoria do evento:</Text>
              <TextInput
                style={styles.modalInput}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="Ex: Workshop, Palestra, Hackathon"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setModalNewCategoryVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleAddNewCategory}
                  disabled={addingCategory}
                >
                  {addingCategory ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Adicionar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Bottom Nav customizado apenas com Início ── */}
        <View style={[styles.customBottomNav, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.customNavItem}
            activeOpacity={0.75}
            onPress={() => router.replace('/(app)')}
            accessibilityLabel="Início"
          >
            <View style={styles.customActiveGlow}>
              <MaskedView
                style={{ width: 22, height: 22 }}
                maskElement={
                  <View style={{ backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="home" size={22} color="#000" />
                  </View>
                }
              >
                <LinearGradient
                  colors={['#8B5CF6', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: 22, height: 22 }}
                />
              </MaskedView>
            </View>
            <Text style={styles.customLabelActive}>Início</Text>
            <View style={styles.customIndicator} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Modal de Pré-visualização do Certificado ── */}
      <Modal visible={previewModalVisible} transparent animationType="fade" onRequestClose={() => setPreviewModalVisible(false)}>
        <View style={styles.previewModalOverlay}>
          <View style={styles.previewModalCard}>
            <View style={styles.previewModalHeader}>
              <View>
                <Text style={styles.previewModalTitle}>Prévia do Certificado</Text>
                <Text style={styles.previewModalSubtitle}>Modelo: {TEMPLATES.find((t) => t.id === templateId)?.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.previewCloseIcon}
                onPress={() => setPreviewModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.previewImageContainer}>
              {previewLoading ? (
                <View style={styles.previewLoadingBox}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.previewLoadingText}>Renderizando prévia do certificado...</Text>
                </View>
              ) : previewImageUri ? (
                <Image
                  source={{ uri: previewImageUri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.emptyListText}>Falha ao carregar prévia.</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.previewModalCloseBtn}
              onPress={() => setPreviewModalVisible(false)}
            >
              <Text style={styles.previewModalCloseBtnText}>Fechar Prévia</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── DateTimePicker ── */}
      {pickerVisible && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide" visible={pickerVisible}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <View style={{ backgroundColor: '#13111F', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 8 }}>
                  <TouchableOpacity onPress={() => setPickerVisible(false)}>
                    <Text style={{ color: '#A78BFA', fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setPickerVisible(false)}>
                    <Text style={{ color: '#8B5CF6', fontSize: 16, fontWeight: '700' }}>Confirmar</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={pickerDate}
                  mode={pickerMode}
                  display="spinner"
                  onChange={onPickerChange}
                  minimumDate={pickerMode === 'date' ? new Date(2020, 0, 1) : undefined}
                  themeVariant="dark"
                  accentColor="#7C5FE6"
                  textColor="#FFFFFF"
                  style={{ backgroundColor: '#13111F' }}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={pickerDate}
            mode={pickerMode}
            display="default"
            onChange={onPickerChange}
            minimumDate={pickerMode === 'date' ? new Date(2020, 0, 1) : undefined}
            themeVariant="dark"
            accentColor="#8B5CF6"
          />
        )
      )}

      {/* ── Modal de Sucesso: Cadastro Realizado ── */}
      <Modal visible={successVisible} transparent statusBarTranslucent animationType="none" onRequestClose={hideSuccessModal}>
        <TouchableOpacity style={styles.successOverlay} activeOpacity={1} onPress={hideSuccessModal}>
          <Animated.View style={[styles.successBox, { transform: [{ scale: successScale }], opacity: successOpacity }]}>
            <LinearGradient colors={['#8B5CF6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.successTopBar} />
            <View style={styles.successIconWrapper}>
              <LinearGradient colors={['#8B5CF6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.successIconBadge}>
                <Ionicons name="checkmark" size={28} color="#FFF" />
              </LinearGradient>
            </View>
            <Text style={styles.successTitle}>Cadastro Realizado!</Text>
            <Text style={styles.successSubtitle}>O evento foi cadastrado{'\n'}com sucesso.</Text>
            <TouchableOpacity style={styles.successOkBtn} onPress={hideSuccessModal} activeOpacity={0.75}>
              <LinearGradient colors={['#8B5CF6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.successOkGradient}>
                <Text style={styles.successOkText}>OK</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  manageLinkBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,95,230,0.4)',
    backgroundColor: 'rgba(124,95,230,0.08)',
    marginBottom: 6,
  },
  manageLinkText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Stepper ──
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    paddingHorizontal: 10,
  },
  stepTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepDotDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepNum: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  stepTextActive: {
    color: Colors.text,
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.cardBorder,
    marginHorizontal: 12,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },

  // ── FormCard ──
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 20,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: 'rgba(124,95,230,0.55)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: Colors.text,
    fontSize: 14,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },

  // Selectors com [+]
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerSelector: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: 'rgba(124,95,230,0.55)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    color: Colors.text,
    fontSize: 14,
  },
  pickerPlaceholder: {
    color: Colors.textMuted,
  },
  dropdownArrow: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(124,95,230,0.55)',
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 24,
  },

  // Toggle Presencial / Online
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'flex-start',
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minWidth: 100,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleBtnInactive: {
    backgroundColor: Colors.card,
    borderColor: Colors.cardBorder,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  toggleTextActive: {
    color: '#FFF',
  },
  toggleTextInactive: {
    color: Colors.textSecondary,
  },

  // Upload Imagem
  imagePickerBox: {
    backgroundColor: 'rgba(124, 95, 230, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(124, 95, 230, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 140,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  uploadText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  uploadHint: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  imagePreviewWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  changeImageText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Botão Avançar ──
  nextStepBtnWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 10,
    alignSelf: 'center',
    width: '80%',
    shadowColor: '#7C5FE6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  nextStepBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  nextStepBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // ── Etapa 2: Estilos do Certificado ──
  step2Header: {
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    paddingBottom: 14,
  },
  backStepLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  backStepLinkText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  step2Title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  step2Desc: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  // Grade de Templates
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 4,
  },
  templateCard: {
    width: '48%',
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    position: 'relative',
  },
  templateCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(124, 95, 230, 0.08)',
  },
  templateCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  templateBadgeText: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  templateName: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  templateDesc: {
    color: Colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
  },
  templateCheckCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Custom Palette
  customPaletteBox: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  customPaletteTitle: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.surface,
  },
  presetChipActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(124, 95, 230, 0.15)',
  },
  colorBubble: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  presetText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  autoCalcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124, 95, 230, 0.12)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  autoCalcText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '600',
  },

  // Botão Pré-visualizar
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(124, 95, 230, 0.1)',
  },
  previewBtnText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  // Botão Salvar
  saveBtnWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'center',
    width: '75%',
    shadowColor: '#7C5FE6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  // ── Modal de Pré-visualização ──
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewModalCard: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: '#13111F',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2D2845',
    padding: 16,
    gap: 12,
  },
  previewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 10,
  },
  previewModalTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  previewModalSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  previewCloseIcon: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  previewImageContainer: {
    width: '100%',
    aspectRatio: 297 / 210, // Proporção exata de A4 Paisagem
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
  },
  previewLoadingText: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  previewModalCloseBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 95, 230, 0.15)',
    borderRadius: 12,
  },
  previewModalCloseBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  // Modais de Criação
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  modalInput: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: Colors.text,
    fontSize: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 6,
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  modalConfirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  modalConfirmText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  modalCloseBtn: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 6,
  },
  modalCloseText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  optionItemSelected: {
    backgroundColor: 'rgba(124, 95, 230, 0.1)',
  },
  optionItemText: {
    color: Colors.text,
    fontSize: 14,
  },
  optionItemTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  emptyListText: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 14,
  },

  // ── Bottom Nav Customizado ──
  customBottomNav: {
    backgroundColor: '#0B0A12',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
    position: 'relative',
  },
  customLabelActive: {
    color: '#7C5FE6',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  customIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#7C5FE6',
  },
  customActiveGlow: {
    shadowColor: '#7C5FE6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },

  // ── Modal de Sucesso ──
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
