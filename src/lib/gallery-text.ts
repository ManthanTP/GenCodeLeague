export const formatCredit = (v?: string | null) => {
  const n = (v ?? '').trim().replace(/^by\s+/i, '').replace(/\.+$/, '').trim();
  return n ? `BY ${n}.`.toUpperCase() : '';
};

export const splitFacts = (v?: string | null) =>
  (v ?? '').split('·').map((s) => s.trim()).filter(Boolean);
