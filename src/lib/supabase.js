import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rqapzmhlyciiqxgtlrdf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxYXB6bWhseWNpaXF4Z3RscmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1OTc2MzksImV4cCI6MjA2OTE3MzYzOX0.Fc7e4Yx1G2Y_qwHIUoTEf22HlDZiBYxgfGab2N56qUY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 