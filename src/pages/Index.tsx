import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User } from '@/lib/auth'
import { getEvents, getEventRegistrations, Event } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar, Clock, MapPin, Users, Loader2, Plus, Sparkles, MessageCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import SupportChat from '@/components/SupportChat'

interface IndexProps {
  user: User
}

export default function Index({ user }: IndexProps) {
  const navigate = useNavigate()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supportDialogOpen, setSupportDialogOpen] = useState(false)

  useEffect(() => {
    try {
      const allEvents = getEvents()
      // Filter to show only upcoming events
      const upcomingEvents = allEvents.filter(event => {
        const eventDate = new Date(event.event_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return eventDate >= today
      })
      setEvents(upcomingEvents)
      setError(null)
    } catch (err) {
      setError('Failed to load events')
      console.error('Error loading events:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const getEventStats = (event: Event) => {
    const registrations = getEventRegistrations(event.id)
    return {
      registrations: registrations.length,
      capacity: event.max_capacity || 'Unlimited'
    }
  }

  const handleEventClick = (eventId: string) => {
    navigate(`/event/${eventId}`)
  }

  const getPageTitle = () => {
    switch (user.role) {
      case 'admin':
        return 'Admin Dashboard'
      case 'staff':
        return 'Staff Portal'
      case 'participant':
        return 'Available Events'
      default:
        return 'SwiftAttend'
    }
  }

  const getPageDescription = () => {
    switch (user.role) {
      case 'admin':
        return 'Manage events and view analytics'
      case 'staff':
        return 'Select events for attendance tracking'
      case 'participant':
        return 'Browse and register for upcoming events'
      default:
        return 'Event management system'
    }
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
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{getPageTitle()}</h1>
            <p className="text-gray-400 text-lg">{getPageDescription()}</p>
          </div>
          
          <div className="flex space-x-4">
            {user.role === 'participant' && (
              <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Get Help
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl card-dark border-pink-500/30">
                  <DialogHeader>
                    <DialogTitle className="text-white">Support & Help</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Report issues or get help with events and registration
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[70vh] overflow-y-auto">
                    <SupportChat user={user} />
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {user.role === 'admin' && (
              <Button 
                onClick={() => navigate('/dashboard')}
                className="btn-pink"
              >
                <Plus className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            )}
            
            {user.role === 'staff' && (
              <Button 
                onClick={() => navigate('/scanner')}
                className="btn-pink"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Attendance Scanner
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert className="mb-6 error-pink">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="text-pink-500/50 mb-6">
                <Calendar className="h-20 w-20 mx-auto" />
              </div>
              <h3 className="text-2xl font-medium text-white mb-4">No upcoming events</h3>
              <p className="text-gray-400 mb-6 text-lg">
                {user.role === 'admin' 
                  ? 'Create your first event to get started'
                  : 'Check back later for new events'
                }
              </p>
              {user.role === 'admin' && (
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="btn-pink"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              )}
            </div>
          ) : (
            events.map((event) => {
              const stats = getEventStats(event)
              return (
                <Card key={event.id} className="event-card cursor-pointer">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl text-white">{event.name}</CardTitle>
                      <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">
                        {stats.registrations} registered
                      </Badge>
                    </div>
                    {event.description && (
                      <CardDescription className="line-clamp-2 text-gray-400">
                        {event.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {event.poster_url && (
                      <div className="poster-preview mb-3">
                        <img
                          src={event.poster_url}
                          alt={`${event.name} poster`}
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-300">
                      <Calendar className="h-4 w-4 mr-3 text-pink-400" />
                      {new Date(event.event_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center text-sm text-gray-300">
                      <Clock className="h-4 w-4 mr-3 text-pink-400" />
                      {event.start_time} - {event.end_time}
                    </div>
                    <div className="flex items-center text-sm text-gray-300">
                      <MapPin className="h-4 w-4 mr-3 text-pink-400" />
                      {event.location}
                    </div>
                    <div className="flex items-center text-sm text-gray-300">
                      <Users className="h-4 w-4 mr-3 text-pink-400" />
                      {stats.registrations} / {stats.capacity}
                    </div>
                    <div className="pt-4">
                      <Button 
                        className="w-full btn-pink"
                        onClick={() => handleEventClick(event.id)}
                      >
                        {user.role === 'participant' ? 'Register' : 
                         user.role === 'staff' ? 'Take Attendance' : 
                         'View Details'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}