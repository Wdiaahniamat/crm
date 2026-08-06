import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkzrvzctnhgznnocxovh.supabase.co';
const supabaseKey = 'sb_publishable_0VJ-an-3dlkzPV7d40iWiw_xX8tr6Cu';

export const supabase = createClient(supabaseUrl, supabaseKey);
