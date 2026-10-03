const getBackendHost = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '');
  }
  return 'http://localhost:5000';
};

export const resolveMediaUrl = (rawUrl?: string, fallbackId?: string): string => {
  if (!rawUrl && !fallbackId) return '';
  if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('blob:') || rawUrl.startsWith('data:'))) {
    return rawUrl;
  }
  const host = getBackendHost();
  if (rawUrl && rawUrl.startsWith('/api/')) {
    return `${host}${rawUrl}`;
  }
  if (fallbackId) {
    return `${host}/api/attachments/${fallbackId}`;
  }
  return rawUrl || '';
};
