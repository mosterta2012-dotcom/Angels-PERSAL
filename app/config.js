// Angels PERSAL – connection settings
// DEMO = true shows sample data and a role switcher (no sign-in, nothing saved online).
// To go live: set DEMO to false and paste your Supabase project URL and anon (public) key
// from Supabase → Project Settings → API. The anon key is safe in the browser: row-level
// security in the database decides what each person can see.
window.PERSAL_CONFIG = {
  DEMO: true,
  SUPABASE_URL: 'https://YOUR-PROJECT-ID.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY',
  SIGN_IN_WITH_MICROSOFT: true,   // needs the Azure (Entra ID) provider switched on in Supabase
  ORGANISATION: 'Angels Resource Centres'
};
