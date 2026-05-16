import { supabase } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache';

export const revalidate = 0; // Deshabilitar caché para ver cambios en tiempo real

export default async function QueuePage() {
  // Fetch de la cola
  const { data: queueData, error: queueError } = await supabase
    .from('video_queue')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch de algunos leads sin procesar
  const { data: rawLeads, error: leadsError } = await supabase
    .from('raw_leads')
    .select('id, raw_data, processed')
    .eq('processed', false)
    .limit(10);

  // Server Action para mover un lead a la cola
  async function testSendToQueue(formData: FormData) {
    'use server';
    const leadName = formData.get('leadName') as string;
    
    // El backend de python escucha nuevas filas con status = 'pending'
    await supabase.from('video_queue').insert({
      business_name: leadName,
      status: 'pending'
    });
    
    revalidatePath('/dashboard/queue');
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', color: 'white', background: '#111', minHeight: '100vh' }}>
      <h1 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>Data-First Dashboard (Raw View)</h1>
      
      {/* SECCIÓN 1: VIDEO QUEUE */}
      <section style={{ marginBottom: '50px', marginTop: '30px' }}>
        <h2 style={{ color: '#4CAF50' }}>Video Queue (Estado del Worker)</h2>
        {queueError && <p style={{ color: 'red' }}>Error Queue: {queueError.message}</p>}
        
        <table border={1} cellPadding={10} style={{ borderCollapse: 'collapse', width: '100%', borderColor: '#444' }}>
          <thead>
            <tr style={{ background: '#222', textAlign: 'left' }}>
              <th>ID Tarea</th>
              <th>Negocio</th>
              <th>Status</th>
              <th>Tiempo Exec (s)</th>
              <th>Ruta Local</th>
              <th>Errores</th>
            </tr>
          </thead>
          <tbody>
            {queueData?.map((item) => (
              <tr key={item.id} style={{ background: item.status === 'completed' ? '#0a2e0b' : item.status === 'failed' ? '#3b0b0b' : 'transparent' }}>
                <td style={{ fontSize: '12px', color: '#888' }}>{item.id}</td>
                <td><strong>{item.business_name || 'N/A'}</strong></td>
                <td>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                    background: item.status === 'pending' ? '#b8860b' : 
                               item.status === 'completed' ? '#006400' : '#444' 
                  }}>
                    {item.status}
                  </span>
                </td>
                <td>{item.execution_time_seconds || '-'}</td>
                <td style={{ fontSize: '12px', color: '#aaa' }}>{item.local_video_path || '-'}</td>
                <td style={{ color: '#ff6b6b' }}>{item.error_message || ''}</td>
              </tr>
            ))}
            {(!queueData || queueData.length === 0) && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#666' }}>No hay tareas en la cola</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* SECCIÓN 2: RAW LEADS PARA TEST */}
      <section>
        <h2 style={{ color: '#2196F3' }}>Master Data (raw_leads) - Muestras</h2>
        {leadsError && <p style={{ color: 'red' }}>Error Leads: {leadsError.message}</p>}
        
        <table border={1} cellPadding={10} style={{ borderCollapse: 'collapse', width: '100%', borderColor: '#444' }}>
          <thead>
            <tr style={{ background: '#222', textAlign: 'left' }}>
              <th>ID Lead (DB)</th>
              <th>Business Name</th>
              <th>Google Rating</th>
              <th>Acción de Prueba</th>
            </tr>
          </thead>
          <tbody>
            {rawLeads?.map((lead) => {
              const name = lead.raw_data.name || 'Sin nombre';
              const rating = lead.raw_data.rating || 0;
              return (
                <tr key={lead.id}>
                  <td style={{ fontSize: '12px', color: '#888' }}>{lead.id}</td>
                  <td>{name}</td>
                  <td>{rating} ⭐</td>
                  <td>
                    <form action={testSendToQueue} style={{ margin: 0 }}>
                      <input type="hidden" name="leadName" value={name} />
                      <button 
                        type="submit" 
                        style={{ 
                          padding: '6px 12px', 
                          background: '#2196F3', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px',
                          cursor: 'pointer' 
                        }}
                      >
                        Mandar a Queue ➔
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {(!rawLeads || rawLeads.length === 0) && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#666' }}>La tabla está vacía. Ejecuta el script de importación.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
