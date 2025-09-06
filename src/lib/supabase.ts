import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'staff' | 'participant'
  student_id?: string
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  name: string
  description?: string
  event_date: string
  start_time: string
  end_time: string
  location: string
  qr_code_data: string
  max_capacity?: number
  created_by: string
  created_at: string
  updated_at: string
  registration_count?: number
  attendance_count?: number
}

export interface Registration {
  id: string
  event_id: string
  user_id: string
  qr_code_data: string
  backup_code: string
  registration_date: string
  event?: Event
  user?: User
}

export interface Attendance {
  id: string
  registration_id: string
  check_in_time: string
  check_in_method: 'qr_scan' | 'backup_code'
  checked_in_by: string
  registration?: Registration
}

// Auth helpers
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password })
}

export const signUp = async (email: string, password: string, userData: Partial<User>) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData
    }
  })
  return { data, error }
}

export const signOut = async () => {
  return await supabase.auth.signOut()
}

// Database helpers
export const createEvent = async (eventData: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'qr_code_data'>) => {
  const qr_code_data = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  return await supabase
    .from('events')
    .insert([{ ...eventData, qr_code_data }])
    .select()
    .single()
}

export const getEvents = async () => {
  return await supabase
    .from('events')
    .select('*, registration_count:registrations(count), attendance_count:registrations!inner(attendance(count))')
    .order('event_date', { ascending: true })
}

export const getEventById = async (eventId: string) => {
  return await supabase
    .from('events')
    .select('*, registration_count:registrations(count), attendance_count:registrations!inner(attendance(count))')
    .eq('id', eventId)
    .single()
}

export const registerForEvent = async (eventId: string, userId: string) => {
  const qr_code_data = `reg_${eventId}_${userId}_${Date.now()}`
  const backup_code = Math.random().toString(36).substr(2, 8).toUpperCase()
  
  return await supabase
    .from('registrations')
    .insert([{
      event_id: eventId,
      user_id: userId,
      qr_code_data,
      backup_code
    }])
    .select()
    .single()
}

export const checkRegistrationStatus = async (eventId: string, userId: string) => {
  return await supabase
    .from('registrations')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single()
}

export const checkInAttendee = async (registrationId: string, method: 'qr_scan' | 'backup_code', staffId: string) => {
  return await supabase
    .from('attendance')
    .insert([{
      registration_id: registrationId,
      check_in_method: method,
      checked_in_by: staffId
    }])
    .select()
    .single()
}

export const getEventAttendance = async (eventId: string) => {
  return await supabase
    .from('attendance')
    .select('*, registration:registrations!inner(*, user:users(*), event:events(*))')
    .eq('registration.event_id', eventId)
}

export const findRegistrationByQR = async (qrCode: string) => {
  return await supabase
    .from('registrations')
    .select('*, event:events(*), user:users(*)')
    .eq('qr_code_data', qrCode)
    .single()
}

export const findRegistrationByBackupCode = async (backupCode: string) => {
  return await supabase
    .from('registrations')
    .select('*, event:events(*), user:users(*)')
    .eq('backup_code', backupCode)
    .single()
}