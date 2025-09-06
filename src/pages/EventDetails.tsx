import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User, validateEmail } from '@/lib/auth'
import { getEventById, registerForEvent, checkRegistrationStatus, Event, Registration } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Clock, MapPin, Users, ArrowLeft, QrCode, Loader2, CheckCircle, Copy } from 'lucide-react'

interface EventDetailsProps {
  user: User
}

export default function EventDetails({ user }: EventDetailsProps) {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const [event, setEvent] = useState<Event | null>(null)
  const [registration, setRegistration] = useState<Registration | null>(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) {
      navigate('/')
      return
    }

    const eventData = getEventById(eventId)
    if (!eventData) {
      setError('Event not found')
      setLoading(false)
      return
    }

    setEvent(eventData)
    
    // Check if user is already registered
    if (user) {
      const existingRegistration = checkRegistrationStatus(eventId, user.id)
      setRegistration(existingRegistration)
    }
    
    setLoading(false)
  }, [eventId, user, navigate])

  const handleOneClickRegister = async () => {
    if (!event || !user) return
    
    setRegistering(true)
    setError(null)
    setSuccess(null)

    try {
      // Use logged-in user's information for registration
      const newRegistration = registerForEvent(event.id, user.id, user.full_name, user.email)
      setRegistration(newRegistration)
      setSuccess(`Successfully registered for ${event.name}! Your QR code and backup code are ready.`)
    } catch (err) {
      setError('Failed to register for event')
      console.error('Registration error:', err)
    } finally {
      setRegistering(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md card-dark">
          <CardContent className="pt-6">
            <Alert className="error-pink">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/')} className="w-full mt-4 btn-pink">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!event) return null

  const isRegistered = !!registration
  const canRegister = !isRegistered && user?.role === 'participant'

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
          className="mb-6 border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>

        <Card className="mb-6 card-dark">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-2 text-white">{event.name}</CardTitle>
                {event.description && (
                  <CardDescription className="text-base text-gray-400">
                    {event.description}
                  </CardDescription>
                )}
              </div>
              {isRegistered && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Registered
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.poster_url && (
              <div className="poster-preview mb-4">
                <img
                  src={event.poster_url}
                  alt={`${event.name} poster`}
                  className="w-full max-h-64 object-cover rounded-lg"
                />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center text-gray-300">
                <Calendar className="h-5 w-5 mr-3 text-pink-400" />
                <span>{new Date(event.event_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
              <div className="flex items-center text-gray-300">
                <Clock className="h-5 w-5 mr-3 text-pink-400" />
                <span>{event.start_time} - {event.end_time}</span>
              </div>
              <div className="flex items-center text-gray-300">
                <MapPin className="h-5 w-5 mr-3 text-pink-400" />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center text-gray-300">
                <Users className="h-5 w-5 mr-3 text-pink-400" />
                <span>
                  {event.max_capacity ? `Max ${event.max_capacity} participants` : 'Unlimited capacity'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert className="mb-6 error-pink">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 success-pink">
            <CheckCircle className="h-4 w-4 text-pink-400 mr-2 inline" />
            <AlertDescription className="text-pink-300">{success}</AlertDescription>
          </Alert>
        )}

        {/* One-Click Registration for Participants */}
        {canRegister && (
          <Card className="mb-6 card-dark">
            <CardHeader>
              <CardTitle className="text-white">Quick Registration</CardTitle>
              <CardDescription className="text-gray-400">
                Register for this event with one click using your account information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-pink-500/10 rounded-lg border border-pink-500/20">
                  <h4 className="font-medium text-pink-300 mb-2">Registration Details</h4>
                  <div className="space-y-1 text-sm text-pink-200">
                    <p><strong>Name:</strong> {user.full_name}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    {user.student_id && <p><strong>Student ID:</strong> {user.student_id}</p>}
                  </div>
                </div>
                
                <Button
                  onClick={handleOneClickRegister}
                  disabled={registering}
                  className="w-full btn-pink"
                  size="lg"
                >
                  {registering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Register for Event
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registration Success with QR Code */}
        {isRegistered && registration && (
          <Card className="mb-6 card-dark">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Registration Successful!
              </CardTitle>
              <CardDescription className="text-gray-400">
                You are registered for this event. Save your QR code and backup code for check-in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backup Code - Now Visible */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white">Backup Code</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(registration.backup_code)}
                      className="text-pink-400 hover:bg-pink-500/10"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="backup-code p-4 rounded-md text-xl text-center tracking-wider">
                    {registration.backup_code}
                  </div>
                  <p className="text-xs text-gray-400">
                    Use this code if QR scan doesn't work. Click copy button to copy.
                  </p>
                </div>

                {/* QR Code - Now Visible */}
                <div className="space-y-3">
                  <h4 className="font-medium text-white">QR Code</h4>
                  <div className="flex justify-center">
                    <div className="qr-container">
                      <div className="w-32 h-32 bg-white flex items-center justify-center">
                        <div className="text-center">
                          <QrCode className="h-8 w-8 mx-auto mb-1 text-gray-600" />
                          <p className="text-xs text-gray-600">QR Code</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
                    onClick={() => setShowQR(true)}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    View Full QR Code
                  </Button>
                </div>
              </div>

              {/* Registration Details */}
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <h4 className="font-medium text-green-300 mb-2">Registration Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-green-200">
                  <p><strong>Name:</strong> {registration.user_name}</p>
                  <p><strong>Email:</strong> {registration.user_email}</p>
                  <p><strong>Registered:</strong> {new Date(registration.created_at).toLocaleString()}</p>
                  <p><strong>Status:</strong> Confirmed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* QR Code Dialog */}
        <Dialog open={showQR} onOpenChange={setShowQR}>
          <DialogContent className="max-w-md card-dark border-pink-500/30">
            <DialogHeader>
              <DialogTitle className="text-white">Your QR Code</DialogTitle>
              <DialogDescription className="text-gray-400">
                Show this QR code to staff for check-in at the event
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center p-6">
              <div className="qr-container">
                <div className="w-48 h-48 bg-white flex items-center justify-center">
                  <div className="text-center">
                    <QrCode className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                    <p className="text-sm text-gray-600 mb-2">QR Code for</p>
                    <p className="text-xs text-gray-500 font-mono break-all">
                      {registration?.qr_code_data}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-300">Backup Code: <strong className="text-pink-300">{registration?.backup_code}</strong></p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => registration && copyToClipboard(registration.backup_code)}
                className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Backup Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Admin/Staff Only - Event Management */}
        {(user?.role === 'admin' || user?.role === 'staff') && (
          <Card className="card-dark">
            <CardHeader>
              <CardTitle className="text-white">Event Management</CardTitle>
              <CardDescription className="text-gray-400">
                Administrative tools for this event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/scanner`)}
                  className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
                >
                  Scan Attendees
                </Button>
                {user.role === 'admin' && (
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/dashboard`)}
                    className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
                  >
                    Back to Dashboard
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}