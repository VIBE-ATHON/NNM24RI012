// Simple authentication system using localStorage
export interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'staff' | 'participant'
  student_id?: string
  created_at: string
}

// Hardcoded passwords for admin and staff
const ADMIN_PASSWORD = '14567'
const STAFF_PASSWORD = '14567'

// Email validation function
const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email) {
    return { valid: false, error: 'Email is required' }
  }
  
  if (!email.includes('@')) {
    return { valid: false, error: 'Please enter a valid email address' }
  }
  
  if (!email.endsWith('@nmamit.in')) {
    return { valid: false, error: 'Email must end with @nmamit.in' }
  }
  
  return { valid: true }
}

// Get current user from localStorage
export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('swiftattend_user')
  if (userStr) {
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  }
  return null
}

// Sign in function
export const signIn = (email: string, password: string, role: 'admin' | 'staff' | 'participant', fullName?: string, studentId?: string): { success: boolean; error?: string; user?: User } => {
  // Validate email format
  const emailValidation = validateEmail(email)
  if (!emailValidation.valid) {
    return { success: false, error: emailValidation.error }
  }
  
  // Validate role-specific passwords
  if (role === 'admin' && password !== ADMIN_PASSWORD) {
    return { success: false, error: 'Invalid admin password. Contact administrator for access.' }
  }
  
  if (role === 'staff' && password !== STAFF_PASSWORD) {
    return { success: false, error: 'Invalid staff password. Contact administrator for access.' }
  }
  
  // For participants, no password required, just name
  if (role === 'participant' && !fullName) {
    return { success: false, error: 'Full name is required for participants.' }
  }
  
  // Create user object
  const user: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email,
    full_name: fullName || email.split('@')[0],
    role,
    student_id: studentId,
    created_at: new Date().toISOString()
  }
  
  // Store in localStorage
  localStorage.setItem('swiftattend_user', JSON.stringify(user))
  
  return { success: true, user }
}

// Sign out function
export const signOut = () => {
  localStorage.removeItem('swiftattend_user')
}

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null
}

// Export email validation for use in other components
export { validateEmail }