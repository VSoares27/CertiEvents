import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { registerUser, checkEmailAvailable } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';

// Tela responsavel pelo cadastro de novas contas de usuarios
export default function RegisterScreen() {
  const router = useRouter();

  // Estados dos campos de entrada e carregamento
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Estados para validacoes inline e feedback em tempo real
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Verificacao de e-mail em tempo real com debounce de 500ms
  useEffect(() => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setEmailExists(false);
      setCheckingEmail(false);
      return;
    }

    setCheckingEmail(true);
    const timer = setTimeout(async () => {
      try {
        const result = await checkEmailAvailable(cleanEmail);
        setEmailExists(!!result?.exists);
      } catch {
        // Nao bloqueia a UX caso a verificacao falhe
      } finally {
        setCheckingEmail(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email]);

  // Validacao de senhas identicas em tempo real
  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  // Valida os campos do formulario e envia os dados para criacao da conta
  const handleRegister = async () => {
    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanFullName || !cleanEmail || !password.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Senhas diferentes', 'As senhas digitadas não coincidem.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Senha fraca', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await registerUser({ fullName: cleanFullName, email: cleanEmail, password });
      Alert.alert(
        'Conta criada!',
        'Seu cadastro foi realizado com sucesso. Faça login para continuar.',
        [
          {
            text: 'Fazer Login',
            onPress: () => router.replace('/(auth)/login'),
          },
        ],
      );
    } catch (err) {
      Alert.alert('Erro no cadastro', err.message || 'Não foi possível criar a conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Botao para retornar a tela anterior */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Voltar</Text>
          </TouchableOpacity>

          {/* Logotipo e identificacao do app */}
          <View style={styles.logoArea}>
            <View style={styles.logoDiamond} />
            <Text style={styles.logoText}>CERTIEVENTS</Text>
          </View>

          {/* Titulo e descricao da tela */}
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>
            Cadastre-se para acessar eventos, palestras e gerenciar seus certificados.
          </Text>

          {/* Formulario de cadastro */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome completo</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Seu nome completo"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>E-mail</Text>
                {checkingEmail && (
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 6 }} />
                )}
              </View>
              <TextInput
                style={[styles.input, emailExists && styles.inputWarning]}
                value={email}
                onChangeText={setEmail}
                placeholder="seu.email@exemplo.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {/* Aviso inline nao bloqueante se o e-mail ja existe */}
              {emailExists && (
                <Text style={styles.warningText}>Este e-mail já está cadastrado no sistema.</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                />
                {/* Botao de alternancia de visualizacao da senha com icone */}
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmar senha</Text>
              <TextInput
                style={[styles.input, passwordMismatch && styles.inputWarning]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repita sua senha"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
              />
              {/* Aviso inline imediato quando as senhas divergem */}
              {passwordMismatch && (
                <Text style={styles.warningText}>As senhas digitadas não coincidem.</Text>
              )}
            </View>

            {/* Botao de confirmacao do cadastro */}
            <TouchableOpacity
              style={[styles.registerBtn, (loading || passwordMismatch) && styles.registerBtnDisabled]}
              onPress={handleRegister}
              disabled={loading || passwordMismatch}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <Text style={styles.registerBtnText}>Criar conta</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Link para redirecionamento ao login */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Já tem conta? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Estilos da tela de cadastro
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 12,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 32,
  },
  backBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 32,
  },
  logoDiamond: {
    width: 20,
    height: 20,
    backgroundColor: Colors.primary,
    transform: [{ rotate: '45deg' }],
  },
  logoText: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 36,
  },
  form: { gap: 18 },
  inputGroup: { gap: 8 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: Colors.text,
    fontSize: 15,
  },
  inputWarning: {
    borderColor: '#EF4444',
  },
  warningText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: -2,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    overflow: 'hidden',
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  registerBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  registerBtnDisabled: { opacity: 0.7 },
  registerBtnText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  loginText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});

