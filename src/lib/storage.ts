// LocalStorage-based data management for SwiftAttend
export interface Event {
  id: string
  name: string
  description?: string
  event_date: string
  start_time: string
  end_time: string
  location: string
  max_capacity?: number
  poster_url?: string
  created_by: string
  created_at: string
}

export interface Registration {
  id: string
  event_id: string
  user_id: string
  user_name: string
  user_email: string
  qr_code_data: string
  backup_code: string
  created_at: string
}

export interface Attendance {
  id: string
  registration_id: string
  event_id: string
  user_id: string
  checked_in_at: string
  check_in_method: 'qr_scan' | 'backup_code'
  staff_id: string
}

export interface SupportMessage {
  id: string
  event_id: string
  user_id: string
  user_name: string
  user_email: string
  message: string
  status: 'open' | 'resolved'
  created_at: string
  resolved_at?: string
  resolved_by?: string
}

// Generate unique IDs
const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Generate backup code (8 characters)
const generateBackupCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Generate QR code data (longer string for QR)
const generateQRCodeData = (eventId: string, userId: string, registrationId: string) => {
  return `SWIFTATTEND_${eventId}_${userId}_${registrationId}_${Date.now()}`
}

// Event Management
export const createEvent = (eventData: Omit<Event, 'id' | 'created_at'>): Event => {
  const event: Event = {
    ...eventData,
    id: generateId(),
    created_at: new Date().toISOString()
  }
  
  const events = getEvents()
  events.push(event)
  localStorage.setItem('swiftattend_events', JSON.stringify(events))
  
  return event
}

export const getEvents = (): Event[] => {
  const eventsStr = localStorage.getItem('swiftattend_events')
  return eventsStr ? JSON.parse(eventsStr) : []
}

export const getEventById = (eventId: string): Event | null => {
  const events = getEvents()
  return events.find(event => event.id === eventId) || null
}

// Registration Management
export const registerForEvent = (eventId: string, userId: string, userName: string, userEmail: string): Registration => {
  const registrationId = generateId()
  const registration: Registration = {
    id: registrationId,
    event_id: eventId,
    user_id: userId,
    user_name: userName,
    user_email: userEmail,
    qr_code_data: generateQRCodeData(eventId, userId, registrationId),
    backup_code: generateBackupCode(),
    created_at: new Date().toISOString()
  }
  
  const registrations = getRegistrations()
  
  // Check if already registered
  const existingRegistration = registrations.find(
    reg => reg.event_id === eventId && reg.user_id === userId
  )
  
  if (existingRegistration) {
    throw new Error('Already registered for this event')
  }
  
  registrations.push(registration)
  localStorage.setItem('swiftattend_registrations', JSON.stringify(registrations))
  
  return registration
}

export const getRegistrations = (): Registration[] => {
  const registrationsStr = localStorage.getItem('swiftattend_registrations')
  return registrationsStr ? JSON.parse(registrationsStr) : []
}

export const getEventRegistrations = (eventId: string): Registration[] => {
  const registrations = getRegistrations()
  return registrations.filter(reg => reg.event_id === eventId)
}

export const checkRegistrationStatus = (eventId: string, userId: string): Registration | null => {
  const registrations = getRegistrations()
  return registrations.find(reg => reg.event_id === eventId && reg.user_id === userId) || null
}

// Delete registration function for admin
export const deleteRegistration = (registrationId: string): boolean => {
  const registrations = getRegistrations()
  const filteredRegistrations = registrations.filter(reg => reg.id !== registrationId)
  
  if (filteredRegistrations.length === registrations.length) {
    return false // Registration not found
  }
  
  localStorage.setItem('swiftattend_registrations', JSON.stringify(filteredRegistrations))
  
  // Also remove any associated attendance records
  const attendances = getAttendances()
  const filteredAttendances = attendances.filter(att => att.registration_id !== registrationId)
  localStorage.setItem('swiftattend_attendances', JSON.stringify(filteredAttendances))
  
  return true
}

// Support Message Management
export const createSupportMessage = (eventId: string, userId: string, userName: string, userEmail: string, message: string): SupportMessage => {
  const supportMessage: SupportMessage = {
    id: generateId(),
    event_id: eventId,
    user_id: userId,
    user_name: userName,
    user_email: userEmail,
    message: message,
    status: 'open',
    created_at: new Date().toISOString()
  }
  
  const messages = getSupportMessages()
  messages.push(supportMessage)
  localStorage.setItem('swiftattend_support_messages', JSON.stringify(messages))
  
  return supportMessage
}

export const getSupportMessages = (): SupportMessage[] => {
  const messagesStr = localStorage.getItem('swiftattend_support_messages')
  return messagesStr ? JSON.parse(messagesStr) : []
}

export const getEventSupportMessages = (eventId: string): SupportMessage[] => {
  const messages = getSupportMessages()
  return messages.filter(msg => msg.event_id === eventId)
}

export const getAllSupportMessages = (): SupportMessage[] => {
  return getSupportMessages()
}

export const resolveSupportMessage = (messageId: string, resolvedBy: string): boolean => {
  const messages = getSupportMessages()
  const messageIndex = messages.findIndex(msg => msg.id === messageId)
  
  if (messageIndex === -1) {
    return false
  }
  
  messages[messageIndex].status = 'resolved'
  messages[messageIndex].resolved_at = new Date().toISOString()
  messages[messageIndex].resolved_by = resolvedBy
  
  localStorage.setItem('swiftattend_support_messages', JSON.stringify(messages))
  return true
}

// Find registration by QR code or backup code
export const findRegistrationByQR = (qrData: string): Registration | null => {
  const registrations = getRegistrations()
  return registrations.find(reg => reg.qr_code_data === qrData) || null
}

export const findRegistrationByBackupCode = (backupCode: string): Registration | null => {
  const registrations = getRegistrations()
  return registrations.find(reg => reg.backup_code === backupCode.toUpperCase()) || null
}

// Attendance Management
export const checkInAttendee = (registrationId: string, method: 'qr_scan' | 'backup_code', staffId: string): Attendance => {
  const registration = getRegistrations().find(reg => reg.id === registrationId)
  if (!registration) {
    throw new Error('Registration not found')
  }
  
  // Check if already checked in
  if (isAttendeeCheckedIn(registrationId)) {
    throw new Error('Already checked in')
  }
  
  const attendance: Attendance = {
    id: generateId(),
    registration_id: registrationId,
    event_id: registration.event_id,
    user_id: registration.user_id,
    checked_in_at: new Date().toISOString(),
    check_in_method: method,
    staff_id: staffId
  }
  
  const attendances = getAttendances()
  attendances.push(attendance)
  localStorage.setItem('swiftattend_attendances', JSON.stringify(attendances))
  
  return attendance
}

export const getAttendances = (): Attendance[] => {
  const attendancesStr = localStorage.getItem('swiftattend_attendances')
  return attendancesStr ? JSON.parse(attendancesStr) : []
}

export const getEventAttendances = (eventId: string): Attendance[] => {
  const attendances = getAttendances()
  return attendances.filter(att => att.event_id === eventId)
}

export const isAttendeeCheckedIn = (registrationId: string): boolean => {
  const attendances = getAttendances()
  return attendances.some(att => att.registration_id === registrationId)
}

// Utility functions
export const getEventStats = (eventId: string) => {
  const registrations = getEventRegistrations(eventId)
  const attendances = getEventAttendances(eventId)
  
  return {
    totalRegistrations: registrations.length,
    totalAttendances: attendances.length,
    attendanceRate: registrations.length > 0 ? (attendances.length / registrations.length) * 100 : 0
  }
}

// Clear all data (for development/testing)
export const clearAllData = () => {
  localStorage.removeItem('swiftattend_events')
  localStorage.removeItem('swiftattend_registrations')
  localStorage.removeItem('swiftattend_attendances')
  localStorage.removeItem('swiftattend_support_messages')
}