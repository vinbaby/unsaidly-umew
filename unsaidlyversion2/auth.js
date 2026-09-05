// Pigpic authentication helpers
async function ensureProfile(user, displayName = "") {
  if (!user) return null;
  const { data: existing, error: readError } = await sb
    .from('profiles')
    .select('id,username,avatar_url,bio')
    .eq('id', user.id)
    .maybeSingle();

  if (readError) throw readError;
  if (existing) return existing;

  const base = (user.email || 'user').split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24) || 'user';
  const safeName = displayName.replace(/[^a-zA-Z0-9_ ]/g, '').trim().replace(/\s+/g, '_').slice(0, 24);
  const username = `${safeName || base}_${user.id.slice(0, 6)}`;
  const { data, error } = await sb
    .from('profiles')
    .insert({ id: user.id, username })
    .select()
    .single();

  if (error) throw error;
  return data;
}
