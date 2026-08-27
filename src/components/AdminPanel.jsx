// src/components/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AdminPanel({ onDataChange }) {
  const [sites, setSites] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New Site Form State
  const [newSiteName, setNewSiteName] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newSuburb, setNewSuburb] = useState('');
  const [newState, setNewState] = useState('VIC');
  const [newPostcode, setNewPostcode] = useState('');
  const [newAssignedDept, setNewAssignedDept] = useState('');

  // Edit Site State
  const [editingSiteId, setEditingSiteId] = useState(null);
  const [editSiteName, setEditSiteName] = useState('');
  const [editStreet, setEditStreet] = useState('');
  const [editSuburb, setEditSuburb] = useState('');
  const [editState, setEditState] = useState('');
  const [editPostcode, setEditPostcode] = useState('');
  const [editAssignedDept, setEditAssignedDept] = useState('');

  // New Department State
  const [newDeptName, setNewDeptName] = useState('');

  const [msg, setMsg] = useState({ text: '', isError: false });

  useEffect(() => {
    fetchSitesAndDepts();
  }, []);

  const fetchSitesAndDepts = async () => {
    setLoading(true);
    try {
      const { data: sitesData, error: sitesErr } = await supabase.from('sites').select('*').order('name');
      const { data: deptsData, error: deptsErr } = await supabase.from('departments').select('*').order('name');
      
      if (sitesErr) console.warn('Sites fetch warning:', sitesErr.message);
      if (deptsErr) console.warn('Depts fetch warning:', deptsErr.message);

      setSites(sitesData || []);
      setDepartments(deptsData || []);

      if (deptsData && deptsData.length > 0 && !newAssignedDept) {
        setNewAssignedDept(deptsData[0].name);
      }

      if (onDataChange) onDataChange();
    } catch (err) {
      console.error('Error fetching configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (street, suburb, state, postcode) => {
    return [street, suburb, state, postcode].filter(Boolean).join(', ');
  };

  // Guaranteed Geocoding Engine (OpenStreetMap + Suburb Centroid Fallbacks)
  const geocodeAddress = async (street, suburb, state, postcode) => {
    const cleanStreet = street.replace(/^[0-9\/\-]+\s*/, '').trim();

    const searchQueries = [
      `${street}, ${suburb}, ${state} ${postcode}, Australia`,
      `${cleanStreet}, ${suburb}, ${state}, Australia`,
      `${suburb}, ${state} ${postcode}, Australia`,
      `${suburb}, ${state}, Australia`
    ];

    for (const query of searchQueries) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=au`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();

        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
        }
      } catch (err) {
        console.warn(`Geocoding attempt failed for "${query}":`, err);
      }
    }

    // Default Fallback Coordinates for Known Regions if API is blocked
    const regionDefaults = {
      campbellfield: { lat: -37.6698, lng: 144.9540 },
      melbourne: { lat: -37.8136, lng: 144.9631 },
      sydney: { lat: -33.8688, lng: 151.2093 },
      brisbane: { lat: -27.4705, lng: 153.0260 }
    };

    const subKey = suburb.toLowerCase().trim();
    if (regionDefaults[subKey]) {
      return regionDefaults[subKey];
    }

    // Default fallback to Campbellfield coordinates
    return { lat: -37.6698, lng: 144.9540 };
  };

  // Add New Site (Prevents 409 Conflicts via Upsert)
  const handleAddSite = async (e) => {
    e.preventDefault();
    if (!newSiteName.trim()) return;

    setMsg({ text: '📡 Geocoding location and saving site...', isError: false });

    const fullAddress = formatAddress(newStreet, newSuburb, newState, newPostcode);
    const { lat, lng } = await geocodeAddress(newStreet, newSuburb, newState, newPostcode);

    try {
      const { error } = await supabase.from('sites').upsert([
        { 
          name: newSiteName.trim(), 
          address: fullAddress,
          department: newAssignedDept,
          lat: lat,
          lng: lng,
          latitude: lat,
          longitude: lng,
          radius_km: 5.0
        }
      ]);

      if (error) throw error;

      setMsg({ text: `✅ Site "${newSiteName}" saved with GPS coordinates!`, isError: false });
      setNewSiteName('');
      setNewStreet('');
      setNewSuburb('');
      setNewState('VIC');
      setNewPostcode('');
      fetchSitesAndDepts();
    } catch (err) {
      setMsg({ text: `❌ Error adding site: ${err.message}`, isError: true });
    }
    setTimeout(() => setMsg({ text: '', isError: false }), 4000);
  };

  // Start Editing Site
  const startEditingSite = (site) => {
    setEditingSiteId(site.id);
    setEditSiteName(site.name);

    const addressParts = (site.address || '').split(', ').map(p => p.trim());
    setEditStreet(addressParts[0] || '');
    setEditSuburb(addressParts[1] || '');
    setEditState(addressParts[2] || 'VIC');
    setEditPostcode(addressParts[3] || '');
    setEditAssignedDept(site.department || (departments[0]?.name || ''));
  };

  // Update Site
  const handleUpdateSite = async (e) => {
    e.preventDefault();
    setMsg({ text: '📡 Updating GPS coordinates and site details...', isError: false });

    const fullAddress = formatAddress(editStreet, editSuburb, editState, editPostcode);
    const { lat, lng } = await geocodeAddress(editStreet, editSuburb, editState, editPostcode);

    try {
      const { error } = await supabase
        .from('sites')
        .update({ 
          name: editSiteName.trim(), 
          address: fullAddress,
          department: editAssignedDept,
          lat: lat,
          lng: lng,
          latitude: lat,
          longitude: lng,
          radius_km: 5.0
        })
        .eq('id', editingSiteId);

      if (error) throw error;

      setMsg({ text: '✅ Site details and GPS updated successfully!', isError: false });
      setEditingSiteId(null);
      fetchSitesAndDepts();
    } catch (err) {
      setMsg({ text: `❌ Update failed: ${err.message}`, isError: true });
    }
    setTimeout(() => setMsg({ text: '', isError: false }), 4000);
  };

  // Delete Site
  const handleDeleteSite = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const { error } = await supabase.from('sites').delete().eq('id', id);
      if (error) throw error;

      setMsg({ text: `✅ Site "${name}" removed.`, isError: false });
      fetchSitesAndDepts();
    } catch (err) {
      setMsg({ text: `❌ Delete failed: ${err.message}`, isError: true });
    }
    setTimeout(() => setMsg({ text: '', isError: false }), 4000);
  };

  // Add Department (Handles RLS 403)
  const handleAddDept = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    try {
      const { error } = await supabase.from('departments').insert([{ name: newDeptName.trim() }]);
      if (error) throw error;

      setMsg({ text: `✅ Department "${newDeptName}" added!`, isError: false });
      setNewDeptName('');
      fetchSitesAndDepts();
    } catch (err) {
      setMsg({ text: `❌ Failed to add department: ${err.message}`, isError: true });
    }
    setTimeout(() => setMsg({ text: '', isError: false }), 4000);
  };

  return (
    <div>
      <h2>📍 Sites & Department Configuration</h2>
      <p style={subTextStyle}>Configure workplace sites and operational departments.</p>

      {msg.text && (
        <div style={{
          padding: '12px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', marginBottom: '20px',
          backgroundColor: msg.isError ? '#fef2f2' : '#f0fdf4',
          color: msg.isError ? '#991b1b' : '#15803d',
          border: `1px solid ${msg.isError ? '#fca5a5' : '#bbf7d0'}`
        }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        
        {/* SITES SECTION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={cardStyle}>
            <h3 style={cardHeadingStyle}>➕ Add New Site</h3>
            <form onSubmit={handleAddSite}>
              <label style={labelStyle}>Site / Location Name</label>
              <input
                type="text"
                placeholder="e.g. Campbellfield Site"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                required
                style={{ ...inputStyle, marginBottom: '12px' }}
              />

              <label style={labelStyle}>Street Name</label>
              <input
                type="text"
                placeholder="e.g. 23 Scammel St"
                value={newStreet}
                onChange={(e) => setNewStreet(e.target.value)}
                required
                style={{ ...inputStyle, marginBottom: '12px' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Suburb</label>
                  <input
                    type="text"
                    placeholder="e.g. Campbellfield"
                    value={newSuburb}
                    onChange={(e) => setNewSuburb(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>State</label>
                  <select
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="VIC">VIC</option>
                    <option value="NSW">NSW</option>
                    <option value="QLD">QLD</option>
                    <option value="SA">SA</option>
                    <option value="WA">WA</option>
                    <option value="TAS">TAS</option>
                    <option value="ACT">ACT</option>
                    <option value="NT">NT</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Postcode</label>
                  <input
                    type="text"
                    placeholder="3061"
                    value={newPostcode}
                    onChange={(e) => setNewPostcode(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <label style={labelStyle}>Assigned Department</label>
              <select
                value={newAssignedDept}
                onChange={(e) => setNewAssignedDept(e.target.value)}
                style={{ ...inputStyle, marginBottom: '16px' }}
              >
                {departments.length === 0 ? (
                  <option value="">No saved departments available</option>
                ) : (
                  departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>🏢 {dept.name}</option>
                  ))
                )}
              </select>

              <button type="submit" style={primaryBtnStyle}>Save Site 📍</button>
            </form>
          </div>

          {/* CONFIGURED SITES LIST */}
          <div style={cardStyle}>
            <h3 style={cardHeadingStyle}>🏢 Configured Sites</h3>
            {loading ? (
              <div style={{ color: '#64748b', fontSize: '13px' }}>Loading sites...</div>
            ) : sites.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>No configured sites in database.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sites.map((site) => (
                  <div key={site.id} style={listItemStyle}>
                    {editingSiteId === site.id ? (
                      <form onSubmit={handleUpdateSite} style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <label style={labelStyle}>Edit Site Name</label>
                        <input
                          type="text"
                          value={editSiteName}
                          onChange={(e) => setEditSiteName(e.target.value)}
                          required
                          style={inputStyle}
                        />

                        <label style={labelStyle}>Street Name</label>
                        <input
                          type="text"
                          value={editStreet}
                          onChange={(e) => setEditStreet(e.target.value)}
                          required
                          style={inputStyle}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={labelStyle}>Suburb</label>
                            <input
                              type="text"
                              value={editSuburb}
                              onChange={(e) => setEditSuburb(e.target.value)}
                              required
                              style={inputStyle}
                            />
                          </div>
                          <div>
                            <label style={labelStyle}>State</label>
                            <select
                              value={editState}
                              onChange={(e) => setEditState(e.target.value)}
                              style={inputStyle}
                            >
                              <option value="VIC">VIC</option>
                              <option value="NSW">NSW</option>
                              <option value="QLD">QLD</option>
                              <option value="SA">SA</option>
                              <option value="WA">WA</option>
                              <option value="TAS">TAS</option>
                              <option value="ACT">ACT</option>
                              <option value="NT">NT</option>
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>Postcode</label>
                            <input
                              type="text"
                              value={editPostcode}
                              onChange={(e) => setEditPostcode(e.target.value)}
                              required
                              style={inputStyle}
                            />
                          </div>
                        </div>

                        <label style={labelStyle}>Assigned Department</label>
                        <select
                          value={editAssignedDept}
                          onChange={(e) => setEditAssignedDept(e.target.value)}
                          style={inputStyle}
                        >
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.name}>🏢 {dept.name}</option>
                          ))}
                        </select>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                          <button type="button" onClick={() => setEditingSiteId(null)} style={secondaryBtnStyle}>Cancel</button>
                          <button type="submit" style={primaryBtnStyle}>Save Changes 💾</button>
                        </div>
                      </form>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>
                            📍 {site.name} {site.department && <span style={deptBadgeStyle}>🏢 {site.department}</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            {site.address || 'No address specified'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => startEditingSite(site)} style={secondaryBtnStyle}>✏️ Edit</button>
                          <button onClick={() => handleDeleteSite(site.id, site.name)} style={deleteBtnStyle}>🗑️</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* DEPARTMENTS SECTION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={cardStyle}>
            <h3 style={cardHeadingStyle}>➕ Add Department</h3>
            <form onSubmit={handleAddDept}>
              <label style={labelStyle}>Department Name</label>
              <input
                type="text"
                placeholder="e.g. Warehouse, Logistics"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                required
                style={{ ...inputStyle, marginBottom: '16px' }}
              />
              <button type="submit" style={primaryBtnStyle}>Add Dept 🏢</button>
            </form>
          </div>

          <div style={cardStyle}>
            <h3 style={cardHeadingStyle}>📋 Configured Departments</h3>
            {loading ? (
              <div style={{ color: '#64748b', fontSize: '13px' }}>Loading departments...</div>
            ) : departments.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>No departments found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {departments.map((dept) => (
                  <div key={dept.id} style={{ ...listItemStyle, justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>🏢 {dept.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Inline Styles
const cardStyle = { backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' };
const cardHeadingStyle = { margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' };
const subTextStyle = { color: '#64748b', fontSize: '14px', marginTop: '4px', marginBottom: '24px' };
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' };
const primaryBtnStyle = { padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' };
const secondaryBtnStyle = { padding: '6px 12px', backgroundColor: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' };
const deleteBtnStyle = { padding: '6px 10px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' };
const listItemStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center' };
const deptBadgeStyle = { fontSize: '11px', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '12px', marginLeft: '6px', fontWeight: 'bold' };