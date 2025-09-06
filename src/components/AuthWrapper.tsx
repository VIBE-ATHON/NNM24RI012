import { useEffect, useState } from 'react'
import { getCurrentUser, signIn, signOut, User, validateEmail } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, LogOut, Info, Sparkles } from 'lucide-react'

interface AuthWrapperProps {
  children: (user: User) => React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = getCurrentUser()
    setUser(currentUser)
    setLoading(false)
  }, [])

  const handleSignOut = () => {
    signOut()
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark-theme">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-pink-400">Loading SwiftAttend...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm onAuthSuccess={setUser} />
  }

  return (
    <div className="dark-theme min-h-screen">
      <div className="nav-dark px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-pink-500" />
            <h1 className="text-2xl font-bold brand-text">SwiftAttend</h1>
          </div>
          <span className="text-gray-300 text-sm">
            Welcome, <span className="text-pink-400 font-medium">{user.full_name}</span> 
            <span className="text-gray-500 ml-2">({user.role})</span>
          </span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSignOut}
          className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10 hover:text-pink-300"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
      <div className="min-h-[calc(100vh-80px)]">
        {children(user)}
      </div>
    </div>
  )
}

interface AuthFormProps {
  onAuthSuccess: (user: User) => void
}

function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'participant' as 'admin' | 'staff' | 'participant',
    studentId: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  const handleEmailChange = (email: string) => {
    setFormData({ ...formData, email })
    
    // Real-time email validation
    if (email) {
      const validation = validateEmail(email)
      setEmailError(validation.valid ? null : validation.error || null)
    } else {
      setEmailError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Final email validation
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Invalid email')
      setLoading(false)
      return
    }

    const result = signIn(
      formData.email,
      formData.password,
      formData.role,
      formData.fullName,
      formData.studentId
    )

    if (result.success && result.user) {
      onAuthSuccess(result.user)
    } else {
      setError(result.error || 'Authentication failed')
    }

    setLoading(false)
  }

  const requiresPassword = formData.role === 'admin' || formData.role === 'staff'
  const isFormValid = formData.email && formData.fullName && !emailError && (requiresPassword ? formData.password : true)

  return (
    <div className="min-h-screen auth-background flex items-center justify-center p-4">
      <div className="auth-content w-full max-w-md">
        <Card className="card-dark border-pink-500/30 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Sparkles className="h-8 w-8 text-pink-500" />
              <CardTitle className="text-3xl font-bold brand-text">
                SwiftAttend
              </CardTitle>
            </div>
            <CardDescription className="text-gray-400 text-lg">
              Event Management & Attendance Tracking
            </CardDescription>
            <div className="w-16 h-1 pink-gradient mx-auto rounded-full"></div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="role" className="text-gray-300">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'admin' | 'staff' | 'participant') => 
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger className="input-dark">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-pink-500/30">
                    <SelectItem value="participant" className="text-gray-300 hover:bg-pink-500/20">
                      Participant
                    </SelectItem>
                    <SelectItem value="staff" className="text-gray-300 hover:bg-pink-500/20">
                      Staff
                    </SelectItem>
                    <SelectItem value="admin" className="text-gray-300 hover:bg-pink-500/20">
                      Admin
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-gray-300">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Enter your full name"
                  required
                  className="input-dark placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="Enter your @nmamit.in email"
                  required
                  className={`input-dark placeholder:text-gray-500 ${emailError ? 'border-red-500' : ''}`}
                />
                {emailError && (
                  <p className="text-sm text-red-400">{emailError}</p>
                )}
                <div className="text-xs text-gray-500">
                  Email must end with @nmamit.in
                </div>
              </div>

              {requiresPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300">Access Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter access password"
                    required
                    className="input-dark placeholder:text-gray-500"
                  />
                  <div className="flex items-start space-x-2 text-sm text-pink-400 bg-pink-500/10 p-3 rounded-lg border border-pink-500/20">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      Admin/Staff access requires password: <strong className="text-pink-300">14567</strong>
                    </span>
                  </div>
                </div>
              )}

              {formData.role === 'participant' && (
                <div className="space-y-2">
                  <Label htmlFor="studentId" className="text-gray-300">Student ID (Optional)</Label>
                  <Input
                    id="studentId"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    placeholder="Enter your student ID"
                    className="input-dark placeholder:text-gray-500"
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full btn-pink text-white font-medium py-3 text-lg"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                {formData.role === 'participant' ? 'Join SwiftAttend' : 'Access System'}
              </Button>
            </form>

            {error && (
              <Alert className="error-pink">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="mt-6 text-xs text-gray-500 space-y-2 bg-gray-800/50 p-4 rounded-lg">
              <p className="text-pink-400 font-medium">Demo Access:</p>
              <p>• Participants: Enter name and @nmamit.in email</p>
              <p>• Admin/Staff: Use password <strong className="text-pink-300">14567</strong></p>
              <p>• All emails must end with <strong className="text-pink-300">@nmamit.in</strong></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}