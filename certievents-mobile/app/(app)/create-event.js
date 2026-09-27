import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
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

  // Estados dos campos do formulário
  const [name, setName] = useState('');
  const [dateText, setDateText] = useState('15/10/2026');
  const [timeText, setTimeText] = useState('09:00');
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
      }

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('date', eventDate.toISOString());
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

      Alert.alert('Sucesso!', 'Evento cadastrado com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/(app)');
          },
        },
      ]);
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backBtnText}>← Voltar</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Cadastrar Evento</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Card Formulário Principal */}
          <View style={styles.formCard}>
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

            {/* Data e Horário lado a lado */}
            <View style={styles.rowFields}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Data</Text>
                <TextInput
                  style={styles.input}
                  value={dateText}
                  onChangeText={setDateText}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Horário</Text>
                <TextInput
                  style={styles.input}
                  value={timeText}
                  onChangeText={setTimeText}
                  placeholder="09:00"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                />
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
                    <Text style={styles.uploadIcon}>📤</Text>
                    <Text style={styles.uploadText}>Escolher imagem</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Botão Salvar Evento */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSaveEvent}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <Text style={styles.saveBtnText}>Salvar evento</Text>
              )}
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
    </SafeAreaView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginBottom: 8,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Form Card
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
    borderColor: Colors.cardBorder,
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
    borderColor: Colors.cardBorder,
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
    borderColor: Colors.cardBorder,
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
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(124, 95, 230, 0.15)',
    borderColor: Colors.primary,
  },
  toggleBtnInactive: {
    backgroundColor: Colors.card,
    borderColor: Colors.cardBorder,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleTextActive: {
    color: Colors.primary,
  },
  toggleTextInactive: {
    color: Colors.textSecondary,
  },

  // Upload Imagem
  imagePickerBox: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    height: 130,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    alignItems: 'center',
    gap: 6,
  },
  uploadIcon: {
    fontSize: 24,
  },
  uploadText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
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
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
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
});
