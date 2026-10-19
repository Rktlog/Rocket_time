// src/components/TestConnection.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function TestConnection() {
  const [statusMessage, setStatusMessage] = useState('Checking connection...');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    async function checkSupabase() {
      try {
        const { data, error } = await supabase.from('departments').select('*');
        
        if (error) {
          // Explicitly extract the error message string
          setStatusMessage(`❌ Supabase Error: ${error.message || JSON.stringify(error)}`);
          setIsConnected(false);
        } else {
          setStatusMessage(`✅ Connected! Database is responsive (${data ? data.length : 0} departments found).`);
          setIsConnected(true);
        }
      } catch (err) {
        // Extract string from catch error
        const msg = err instanceof Error ? err.message : String(err);
        setStatusMessage(`❌ Network Error: ${msg}`);
        setIsConnected(false);
      }
    }

    checkSupabase();
  }, []);

  return (
    <div
      style={{
        padding: '14px 18px',
        borderRadius: '10px',
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fontWeight: 'bold',
        backgroundColor: isConnected ? '#dcfce7' : '#fee2e2',
        color: isConnected ? '#166534' : '#991b1b',
        border: `1px solid ${isConnected ? '#86efac' : '#fca5a5'}`,
        margin: '16px 0',
      }}
    >
      {statusMessage}
    </div>
  );
}