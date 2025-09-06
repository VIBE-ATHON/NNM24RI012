import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, Users, QrCode } from 'lucide-react'
import { Event, User, registerForEvent } from '@/lib/supabase'
import { toast } from 'sonner'

interface EventCardProps {
  event: Event
  user: User
  onRegister?: () => void
  showAdminActions?: boolean
  onEdit?: (event: Event) => void
  onDelete?: (event: Event) => void
}

export default function EventCard({ 
  event, 
  user, 
  onRegister, 
  showAdminActions = false,
  onEdit,
  onDelete 
}: EventCardProps) {
  const [registering, setRegistering] = useState(false)

  const handleRegister = async () => {
    setRegistering(true)
    try {
      await registerForEvent(event.id, user.id)
      toast.success('Successfully registered for event!')
      onRegister?.()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to register for event'
      toast.error(errorMessage)
    } finally {
      setRegistering(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const isEventPast = new Date(event.event_date) < new Date()
  const isEventToday = new Date(event.event_date).toDateString() === new Date().toDateString()

  return (
    <Card className="w-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-gray-900">{event.name}</CardTitle>
            <CardDescription className="mt-2 text-gray-600">
              {event.description}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isEventToday && (
              <Badge variant="default" className="bg-green-500">
                Today
              </Badge>
            )}
            {isEventPast && (
              <Badge variant="secondary">
                Past
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(event.event_date)}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4" />
          <span>{event.location}</span>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{event.registration_count || 0} registered</span>
          </div>
          {event.max_capacity && (
            <span>/ {event.max_capacity} max</span>
          )}
        </div>
        
        {event.attendance_count !== undefined && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <QrCode className="h-4 w-4" />
            <span>{event.attendance_count} checked in</span>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex gap-2">
        {user.role === 'participant' && !isEventPast && (
          <Button
            onClick={handleRegister}
            disabled={registering}
            className="flex-1"
          >
            {registering ? 'Registering...' : 'Register'}
          </Button>
        )}
        
        {showAdminActions && (user.role === 'admin' || user.role === 'staff') && (
          <>
            <Button
              variant="outline"
              onClick={() => onEdit?.(event)}
              className="flex-1"
            >
              Edit
            </Button>
            {user.role === 'admin' && (
              <Button
                variant="destructive"
                onClick={() => onDelete?.(event)}
                className="flex-1"
              >
                Delete
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  )
}