import { supabase } from '../lib/supabase.js';

const BUCKET = 'invoice-signatures';

// Every file a user uploaded: signatures and UPI QR codes (<userId>/…), Form 16A and other
// documents (<userId>/docs/…) and the avatar (avatars/<userId>.<ext>).
async function listFolder(folder: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 100, offset });
    if (error) throw new Error(`Couldn’t list ${folder}: ${error.message}`);
    for (const entry of data ?? []) {
      const path = `${folder}/${entry.name}`;
      if (entry.id) paths.push(path);                  // a file
      else paths.push(...await listFolder(path));      // a sub-folder (no id)
    }
    if (!data || data.length < 100) return paths;
  }
}

export async function removeUserFiles(userId: string): Promise<number> {
  const paths = await listFolder(userId);
  const { data: avatars, error } = await supabase.storage.from(BUCKET).list('avatars', { search: userId });
  if (error) throw new Error(`Couldn’t list avatars: ${error.message}`);
  paths.push(...(avatars ?? []).filter(a => a.id && a.name.startsWith(`${userId}.`)).map(a => `avatars/${a.name}`));

  for (let i = 0; i < paths.length; i += 100) {
    const { error: removeErr } = await supabase.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    if (removeErr) throw new Error(`Couldn’t delete files: ${removeErr.message}`);
  }
  return paths.length;
}
