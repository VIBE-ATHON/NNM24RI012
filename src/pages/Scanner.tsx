import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User } from '@/lib/auth'
import { getEvents, findRegistrationByQR, findRegistrationByBackupCode, checkInAttendee, isAttendeeCheckedIn, Event } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Clock, MapPin, QrCode, Loader2, CheckCircle, XCircle, ArrowLeft, Sparkles } from 'lucide-react'

interface ScannerProps {
  user: User
}

export default function Scanner({ user }: ScannerProps) {
  const navigate = useNavigate()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanInput, setScanInput] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadEvents = () => {
      try {
        console.log('Loading events for staff portal...')
        const allEvents = getEvents()
        console.log('All events found:', allEvents)
        
        // Show all events for staff (not just today's events)
        // Staff should be able to take attendance for any event
        setEvents(allEvents)
        setError(null)
        
        if (allEvents.length === 0) {
          setError('No events found. Please ask admin to create events first.')
        }
      } catch (err) {
        console.error('Error loading events for staff:', err)
        setError('Failed to load events')
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [])

  const handleScan = async () => {
    if (!selectedEventId || !scanInput.trim()) {
      setMessage({ type: 'error', text: 'Please select an event and enter QR code or backup code' })
      return
    }

    setScanning(true)
    setMessage(null)

    try {
      // Try to find registration by QR code first
      let registration = findRegistrationByQR(scanInput.trim())
      
      // If not found, try backup code
      if (!registration) {
        registration = findRegistrationByBackupCode(scanInput.trim().toUpperCase())
      }

      if (!registration) {
        setMessage({ type: 'error', text: 'Invalid QR code or backup code' })
        setScanning(false)
        return
      }

      // Check if registration is for the selected event
      if (registration.event_id !== selectedEventId) {
        setMessage({ type: 'error', text: 'This registration is not for the selected event' })
        setScanning(false)
        return
      }

      // Check if already checked in
      if (isAttendeeCheckedIn(registration.id)) {
        setMessage({ type: 'error', text: `${registration.user_name} is already checked in` })
        setScanning(false)
        return
      }

      // Check in the attendee
      const method = scanInput.length > 10 ? 'qr_scan' : 'backup_code'
      await checkInAttendee(registration.id, method, user.id)

      setMessage({ 
        type: 'success', 
        text: `✅ ${registration.user_name} checked in successfully!` 
      })
      setScanInput('')
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to check in attendee' })
      console.error('Check-in error:', err)
    } finally {
      setScanning(false)
    }
  }

  const selectedEvent = events.find(e => e.id === selectedEventId)

  if (user.role !== 'staff' && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md card-dark">
          <CardContent className="pt-6">
            <Alert className="error-pink">
              <AlertDescription>Access denied. Staff or Admin role required.</AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/')} className="w-full mt-4 btn-pink">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-pink-400">Loading events...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
          className="mb-6 border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Attendance Scanner</h1>
          <p className="text-gray-400 text-lg">Scan QR codes or enter backup codes to check in attendees</p>
        </div>

        {error && (
          <Alert className="mb-6 error-pink">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Event Selection */}
        <Card className="mb-6 card-dark">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-pink-500" />
              Select Event
            </CardTitle>
            <CardDescription className="text-gray-400">
              Choose the event you want to take attendance for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="event-select" className="text-gray-300">Event</Label>
                {events.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-pink-500/50 mb-4" />
                    <p className="text-gray-400 mb-2">No events available</p>
                    <p className="text-gray-500 text-sm">Ask admin to create events first</p>
                  </div>
                ) : (
                  <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger className="input-dark">
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-pink-500/30">
                      {events.map((event) => (
                        <SelectItem 
                          key={event.id} 
                          value={event.id}
                          className="text-gray-300 hover:bg-pink-500/20"
                        >
                          {event.name} - {new Date(event.event_date).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedEvent && (
                <div className="p-4 bg-pink-500/10 rounded-lg border border-pink-500/20">
                  <h3 className="font-medium text-pink-300 mb-2">{selectedEvent.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-pink-200">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(selectedEvent.event_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {selectedEvent.start_time} - {selectedEvent.end_time}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {selectedEvent.location}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scanner Interface */}
        {selectedEventId && (
          <Card className="mb-6 card-dark">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <QrCode className="h-5 w-5 mr-2 text-pink-500" />
                Scan Attendee
              </CardTitle>
              <CardDescription className="text-gray-400">
                Scan the QR code or enter the backup code to check in attendees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scan-input" className="text-gray-300">QR Code or Backup Code</Label>
                  <Input
                    id="scan-input"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Scan QR code or enter backup code (e.g., ABC12345)"
                    onKeyPress={(e) => e.key === 'Enter' && handleScan()}
                    className="input-dark placeholder:text-gray-500"
                  />
                  <p className="text-xs text-gray-500">
                    QR codes are long strings, backup codes are 8 characters (e.g., ABC12345)
                  </p>
                </div>

                <Button
                  onClick={handleScan}
                  disabled={scanning || !scanInput.trim()}
                  className="w-full btn-pink"
                >
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Check In Attendee
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Messages */}
        {message && (
          <Alert className={`mb-6 ${message.type === 'success' ? 'success-pink' : 'error-pink'}`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-pink-400 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400 mr-2" />
              )}
              <AlertDescription className={message.type === 'success' ? 'text-pink-300' : 'text-red-300'}>
                {message.text}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Instructions */}
        <Card className="card-dark">
          <CardHeader>
            <CardTitle className="text-white">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-400">
            <p>1. Select the event you want to take attendance for</p>
            <p>2. Ask attendees to show their QR code or provide their backup code</p>
            <p>3. Scan the QR code or manually enter the backup code</p>
            <p>4. Click "Check In Attendee" to mark them as present</p>
            <p>5. The system will prevent duplicate check-ins automatically</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}