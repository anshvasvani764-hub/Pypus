import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data, error } = await supabase.from('modules').select('*')

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Supabase Connection Test</h1>
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  )
}