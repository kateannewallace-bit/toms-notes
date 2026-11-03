// Supabase project for syncing progress between devices: the same one Tom's Chalkboard uses.
// This app hashes sync codes with its own prefix, so its progress lives in separate rows.
// The publishable (anon) key is safe to ship in a web page: the database only
// allows the two functions in supabase/schema.sql, and each family's data is
// found only by its private sync code.
// Leave these empty to keep progress on each device only.
window.NOTES_CONFIG = {
  supabaseUrl: 'https://dvjmvrxafqjsinqdkayi.supabase.co',
  supabaseKey: 'sb_publishable_PDQCrFu_bTBVDPLB6TnldQ_Qv1tXS_8',
};
