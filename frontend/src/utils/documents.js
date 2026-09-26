import api from './api.js';

const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 4 * 1024 * 1024;

// Uploads a Form 16A or receipt to private storage and returns its storage path.
export async function uploadDocument(file, kind) {
  if (!ALLOWED.includes(file.type)) throw new Error('Upload a PDF, PNG, JPG or WebP file');
  if (file.size > MAX_BYTES) throw new Error('File must be under 4 MB');
  const fileBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Couldn’t read the file'));
    reader.readAsDataURL(file);
  });
  const { data } = await api.post('/upload/document', { kind, fileBase64, mimeType: file.type }, { timeout: 60000 });
  return data.path;
}

// Opens a private document through a short-lived signed link.
export async function openDocument(path) {
  const tab = window.open('', '_blank');
  try {
    const { data } = await api.get('/upload/document-url', { params: { path } });
    if (tab) tab.location.href = data.url; else window.location.href = data.url;
  } catch (err) {
    tab?.close();
    throw err;
  }
}
