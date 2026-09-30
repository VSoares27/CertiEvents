import { API_BASE_URL } from '../constants/api';

const defaultHeaders = {
  'Content-Type': 'application/json',
  'bypass-tunnel-reminder': 'true',
};

export async function fetchEvents() {
  const response = await fetch(`${API_BASE_URL}/events`, {
    headers: defaultHeaders,
  });
  if (!response.ok) {
    throw new Error(`Erro ao buscar eventos: ${response.status}`);
  }
  return response.json();
}

export async function fetchEventById(id) {
  const response = await fetch(`${API_BASE_URL}/events/${id}`, {
    headers: defaultHeaders,
  });
  if (!response.ok) {
    throw new Error(`Evento não encontrado: ${response.status}`);
  }
  return response.json();
}

export async function fetchCategories() {
  const response = await fetch(`${API_BASE_URL}/categories`, {
    headers: defaultHeaders,
  });
  if (!response.ok) {
    throw new Error(`Erro ao buscar categorias: ${response.status}`);
  }
  return response.json();
}

export async function createCategory(name) {
  const response = await fetch(`${API_BASE_URL}/categories`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(`Erro ao criar categoria: ${response.status}`);
  }
  return response.json();
}

export async function fetchSpaces() {
  const response = await fetch(`${API_BASE_URL}/spaces`, {
    headers: defaultHeaders,
  });
  if (!response.ok) {
    throw new Error(`Erro ao buscar espaços: ${response.status}`);
  }
  return response.json();
}

export async function createSpace(name) {
  const response = await fetch(`${API_BASE_URL}/spaces`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(`Erro ao criar espaço: ${response.status}`);
  }
  return response.json();
}

export async function createEvent(formData) {
  const response = await fetch(`${API_BASE_URL}/events`, {
    method: 'POST',
    headers: {
      'bypass-tunnel-reminder': 'true',
      // Não definir 'Content-Type': o runtime / browser seta com o boundary correto para multipart/form-data
    },
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erro ao salvar evento: ${response.status}`);
  }
  return response.json();
}

// Verifica a disponibilidade de um e-mail em tempo real
export async function checkEmailAvailable(email) {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) return { exists: false };
  const response = await fetch(`${API_BASE_URL}/auth/check-email?email=${encodeURIComponent(normalized)}`, {
    headers: defaultHeaders,
  });
  if (!response.ok) {
    return { exists: false };
  }
  return response.json();
}

// Registra um novo usuario no backend
export async function registerUser({ fullName, email, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({
      fullName: (fullName || '').trim(),
      email: (email || '').trim().toLowerCase(),
      password,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Erro ao cadastrar');
  }
  return data;
}

// Autentica o usuario no backend retornando os dados de sessao e o token JWT
export async function loginUser({ email, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({
      email: (email || '').trim().toLowerCase(),
      password,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Credenciais inválidas');
  }
  return data;
}
