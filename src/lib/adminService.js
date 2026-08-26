import { supabase } from './supabaseClient';

/**
 * 1. Add a new Work Location (with GPS coordinates for the 5 km geofence rule)
 */
export async function createLocation(name, latitude, longitude) {
  const { data, error } = await supabase
    .from('locations')
    .insert([{ 
      name, 
      latitude: parseFloat(latitude), 
      longitude: parseFloat(longitude) 
    }])
    .select();

  if (error) {
    console.error('Error creating location:', error.message);
    throw error;
  }
  return data[0];
}

/**
 * 2. Add a new Department
 */
export async function createDepartment(name) {
  const { data, error } = await supabase
    .from('departments')
    .insert([{ name }])
    .select();

  if (error) {
    console.error('Error creating department:', error.message);
    throw error;
  }
  return data[0];
}

/**
 * 3. Fetch all existing locations and departments for dropdown menus
 */
export async function getAdminMetadata() {
  const { data: locations, error: locErr } = await supabase
    .from('locations')
    .select('*')
    .order('name', { ascending: true });

  const { data: departments, error: deptErr } = await supabase
    .from('departments')
    .select('*')
    .order('name', { ascending: true });

  if (locErr || deptErr) {
    throw new Error(locErr?.message || deptErr?.message);
  }

  return { locations, departments };
}