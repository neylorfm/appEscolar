// test.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fkymqpvpshdhccmdpdgi.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreW1xcHZwc2hkaGNjbWRwZGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTQyNDcsImV4cCI6MjA4ODgzMDI0N30.qHs_S4jDP6AnOMdbHWxa-GvKK0jOmf2KuK-yCmZ_XQ0'

async function test() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  // Create a fake JWT or just call it without one
  console.log('Fetching without auth...')
  const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer fake...`
    },
    body: JSON.stringify({ action: 'invite', email: 'test@test.com' })
  })
  
  console.log('Status no-auth:', res.status)
  console.log('Body:', await res.text())
}

test()
