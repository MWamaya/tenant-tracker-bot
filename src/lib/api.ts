const API_URL = import.meta.env.VITE_API_URL ?? '';

if (!API_URL && import.meta.env.DEV) {
  console.warn('VITE_API_URL is not set. All API requests will fail.');
}

const getToken = (): string | null => localStorage.getItem('auth_token');

const setToken = (token: string): void => localStorage.setItem('auth_token', token);

const removeToken = (): void => localStorage.removeItem('auth_token');

const request = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
};

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  setToken,
  removeToken,
  getToken,
};
