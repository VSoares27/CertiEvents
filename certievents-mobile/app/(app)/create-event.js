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
} from '../../src/services/api';
import { Colors } from '../../src/constants/colors';

export default function CreateEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── DateTimePicker ────────────────────────────────────
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState('date'); // 'date' | 'time'
  const [pickerTarget, setPickerTarget] = useState('start'); // 'start' | 'end'
  const [pickerDate, setPickerDate] = useState(new Date());

  const openDatePicker = () => {
    // Inicializa com a data atual do campo
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
        // No iOS, após selecionar a data vai para o horário
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

  // Estados dos campos do formulário
  const [name, setName] = useState('');
  const [dateText, setDateText] = useState('15/10/2026');
  const [timeText, setTimeText] = useState('09:00');
  const [endTimeText, setEndTimeText] = useState('11:00');

  // Formata horário: insere ':' automaticamente após 2 dígitos
  const handleTimeChange = (setter) => (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) {
      setter(digits);
    } else {
      setter(`${digits.slice(0, 2)}:${digits.slice(2)}`);
    }
  };

  // Formata data: insere '/' automaticamente após dia e mês
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
  const [location, setLocation] = useState('IFPE / Igarassu');
  const [description, setDescription] = useState('');
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [type, setType] = useState('presencial'); // 'presencial' | 'online'
  const [imageUri, setImageUri] = useState(null);

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

          {/* Card Formulário Principal */}
          <View style={styles.formCard}>
            {/* Botões de navegação de gestão de eventos */}
            <View style={{ gap: 8 }}>
              <TouchableOpacity style={styles.manageLinkBtn} onPress={() => router.push('/(app)/admin/events')}>
                <Ionicons name="list-outline" size={14} color={Colors.text} style={{ marginRight: 6 }} />
                <Text style={styles.manageLinkText}>Registro de Eventos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.manageLinkBtn} onPress={() => router.push('/(app)/admin/ended-events')}>
                <Ionicons name="time-outline" size={14} color={Colors.text} style={{ marginRight: 6 }} />
                <Text style={styles.manageLinkText}>Eventos Encerrados</Text>
              </TouchableOpacity>
            </View>

            {/* Nome do evento */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nome do evento</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Workshop UX & Mobile"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Tipo: Toggle Presencial / Online */}
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

            {/* Data (linha própria, largura total) */}
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

            {/* Local (instituição) */}
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

            {/* Espaço com Seletor e Botão [+] */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Espaço</Text>
              <View style={styles.selectorRow}>
                <TouchableOpacity
                  style={styles.pickerSelector}
                  onPress={() => setIsSpacePickerOpen(true)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      !selectedSpaceObj && styles.pickerPlaceholder,
                    ]}
                  >
                    {selectedSpaceObj ? selectedSpaceObj.name : 'Selecione um espaço'}
                  </Text>
                  <Text style={styles.dropdownArrow}>⌄</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => setModalNewSpaceVisible(true)}
                >
                  <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Categoria com Seletor e Botão [+] */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Categoria</Text>
              <View style={styles.selectorRow}>
                <TouchableOpacity
                  style={styles.pickerSelector}
                  onPress={() => setIsCategoryPickerOpen(true)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      !selectedCategoryObj && styles.pickerPlaceholder,
                    ]}
                  >
                    {selectedCategoryObj ? selectedCategoryObj.name : 'Selecione uma categoria'}
                  </Text>
                  <Text style={styles.dropdownArrow}>⌄</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => setModalNewCategoryVisible(true)}
                >
                  <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Imagem de Capa */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Imagem de capa</Text>
              <TouchableOpacity
                style={styles.imagePickerBox}
                onPress={handlePickImage}
                activeOpacity={0.8}
              >
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

            {/* Botão Salvar Evento */}
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

    {/* ── DateTimePicker com Modal customizado ── */}
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
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDiamond: {
    width: 13, height: 13,
    backgroundColor: Colors.primary,
    transform: [{ rotate: '45deg' }],
  },
  logoText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
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
    marginBottom: 12,
  },
  manageLinkText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
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

  // Botão Salvar
  saveBtnWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 16,
    alignSelf: 'center',
    width: '65%',
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
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    letterSpacing: 0.5,
  },

  // Modais
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
    flex: 1, backgroundColor: 'rgba(8,7,13,0.85)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
  },
  successBox: {
    width: '100%', backgroundColor: '#13111F',
    borderRadius: 20, borderWidth: 1, borderColor: '#1F1D2E',
    overflow: 'hidden', alignItems: 'center', paddingBottom: 24,
  },
  successTopBar: { width: '100%', height: 3, marginBottom: 28 },
  successIconWrapper: { marginBottom: 16 },
  successIconBadge: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
  },
  successTitle: {
    color: '#FFFFFF', fontSize: 20, fontWeight: '800',
    letterSpacing: 0.3, marginBottom: 8, textAlign: 'center',
  },
  successSubtitle: {
    color: '#A0A0B0', fontSize: 13, textAlign: 'center',
    lineHeight: 20, marginBottom: 24, paddingHorizontal: 16,
  },
  successOkBtn: { width: '55%', borderRadius: 20, overflow: 'hidden' },
  successOkGradient: { paddingVertical: 11, alignItems: 'center', borderRadius: 20 },
  successOkText: { color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
});
