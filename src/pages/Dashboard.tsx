import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User } from '@/lib/auth'
import { createEvent, getEvents, getEventRegistrations, deleteRegistration, getAllSupportMessages, Event, Registration } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Clock, MapPin, Users, Plus, Loader2, Trash2, Eye, Upload } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import SupportChat from '@/components/SupportChat'

interface DashboardProps {
  user: User
}

export default function Dashboard({ user }: DashboardProps) {
  const navigate = useNavigate()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [registrationsDialogOpen, setRegistrationsDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [eventRegistrations, setEventRegistrations] = useState<Registration[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('events')
  const [supportMessageCount, setSupportMessageCount] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    max_capacity: '',
    poster: null as File | null
  })

  // Load events and support message count
  const loadEvents = () => {
    try {
      const allEvents = getEvents()
      setEvents(allEvents)
      setError(null)
    } catch (err) {
      setError('Failed to load events')
      console.error('Error loading events:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSupportMessageCount = () => {
    try {
      const messages = getAllSupportMessages()
      const openMessages = messages.filter(msg => msg.status === 'open')
      setSupportMessageCount(openMessages.length)
    } catch (err) {
      console.error('Error loading support messages:', err)
    }
  }

  useEffect(() => {
    loadEvents()
    loadSupportMessageCount()
  }, [])

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setSuccess(null)

    try {
      let posterUrl = ''
      
      // Handle poster upload (convert to base64 for localStorage)
      if (formData.poster) {
        const reader = new FileReader()
        posterUrl = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(formData.poster!)
        })
      }

      const eventData = {
        name: formData.name,
        description: formData.description,
        event_date: formData.event_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        location: formData.location,
        max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : undefined,
        poster_url: posterUrl,
        created_by: user.id
      }

      const newEvent = createEvent(eventData)
      
      // Reload events to show the new event
      loadEvents()
      
      // Reset form and close dialog
      setFormData({
        name: '',
        description: '',
        event_date: '',
        start_time: '',
        end_time: '',
        location: '',
        max_capacity: '',
        poster: null
      })
      setCreateDialogOpen(false)
      setSuccess(`Event "${newEvent.name}" created successfully!`)
    } catch (err) {
      setError('Failed to create event')
      console.error('Error creating event:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleViewRegistrations = (event: Event) => {
    setSelectedEvent(event)
    const registrations = getEventRegistrations(event.id)
    setEventRegistrations(registrations)
    setRegistrationsDialogOpen(true)
  }

  const handleDeleteRegistration = async (registrationId: string) => {
    if (!confirm('Are you sure you want to delete this registration?')) {
      return
    }

    try {
      const success = deleteRegistration(registrationId)
      if (success) {
        // Reload registrations for current event
        if (selectedEvent) {
          const updatedRegistrations = getEventRegistrations(selectedEvent.id)
          setEventRegistrations(updatedRegistrations)
        }
        // Reload events to update counts
        loadEvents()
        setSuccess('Registration deleted successfully')
      } else {
        setError('Failed to delete registration')
      }
    } catch (err) {
      setError('Failed to delete registration')
      console.error('Error deleting registration:', err)
    }
  }

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB')
        return
      }
      setFormData({ ...formData, poster: file })
      setError(null)
    }
  }

  const getEventStats = (event: Event) => {
    const registrations = getEventRegistrations(event.id)
    return {
      registrations: registrations.length,
      capacity: event.max_capacity || 'Unlimited'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-pink-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-400 text-lg">Manage events, registrations, and support</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-800 border-pink-500/30">
            <TabsTrigger value="events" className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-300">
              Events
            </TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-300 relative">
              Support
              {supportMessageCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                  {supportMessageCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Event Management</h2>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-pink">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl card-dark border-pink-500/30">
                  <DialogHeader>
                    <DialogTitle className="text-white">Create New Event</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Fill in the details to create a new event
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateEvent} className="space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-300">Event Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter event name"
                        required
                        className="input-dark"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-gray-300">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Enter event description"
                        rows={3}
                        className="input-dark"
                      />
                    </div>

                    {/* Poster Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="poster" className="text-gray-300">Event Poster (Optional)</Label>
                      <div className="poster-upload p-4 rounded-lg text-center">
                        <input
                          id="poster"
                          type="file"
                          accept="image/*"
                          onChange={handlePosterChange}
                          className="hidden"
                        />
                        <Label htmlFor="poster" className="cursor-pointer">
                          <div className="flex flex-col items-center space-y-2">
                            {formData.poster ? (
                              <div className="poster-preview">
                                <img
                                  src={URL.createObjectURL(formData.poster)}
                                  alt="Poster preview"
                                  className="w-32 h-32 object-cover"
                                />
                              </div>
                            ) : (
                              <>
                                <Upload className="h-8 w-8 text-pink-400" />
                                <div className="text-pink-400">
                                  <span className="font-medium">Click to upload poster</span>
                                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP up to 5MB</p>
                                </div>
                              </>
                            )}
                          </div>
                        </Label>
                        {formData.poster && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData({ ...formData, poster: null })}
                            className="mt-2 border-pink-500/30 text-pink-400"
                          >
                            Remove Poster
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="event_date" className="text-gray-300">Date</Label>
                        <Input
                          id="event_date"
                          type="date"
                          value={formData.event_date}
                          onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                          required
                          className="input-dark"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location" className="text-gray-300">Location</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder="Event location"
                          required
                          className="input-dark"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start_time" className="text-gray-300">Start Time</Label>
                        <Input
                          id="start_time"
                          type="time"
                          value={formData.start_time}
                          onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                          required
                          className="input-dark"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end_time" className="text-gray-300">End Time</Label>
                        <Input
                          id="end_time"
                          type="time"
                          value={formData.end_time}
                          onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                          required
                          className="input-dark"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="max_capacity" className="text-gray-300">Max Capacity (Optional)</Label>
                      <Input
                        id="max_capacity"
                        type="number"
                        value={formData.max_capacity}
                        onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                        placeholder="Leave empty for unlimited"
                        min="1"
                        className="input-dark"
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={creating}
                      className="w-full btn-pink"
                    >
                      {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create Event
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {error && (
              <Alert className="error-pink">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="success-pink">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <div className="text-pink-500/50 mb-6">
                    <Calendar className="h-20 w-20 mx-auto" />
                  </div>
                  <h3 className="text-2xl font-medium text-white mb-4">No events yet</h3>
                  <p className="text-gray-400 mb-6 text-lg">Create your first event to get started</p>
                  <Button onClick={() => setCreateDialogOpen(true)} className="btn-pink">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </div>
              ) : (
                events.map((event) => {
                  const stats = getEventStats(event)
                  return (
                    <Card key={event.id} className="event-card">
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
                          {new Date(event.event_date).toLocaleDateString()}
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
                        <div className="pt-4 space-y-2">
                          <Button 
                            className="w-full btn-pink"
                            onClick={() => navigate(`/event/${event.id}`)}
                          >
                            View Details
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
                            onClick={() => handleViewRegistrations(event)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Registrations ({stats.registrations})
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <SupportChat user={user} />
          </TabsContent>
        </Tabs>

        {/* Registrations Dialog */}
        <Dialog open={registrationsDialogOpen} onOpenChange={setRegistrationsDialogOpen}>
          <DialogContent className="max-w-4xl card-dark border-pink-500/30">
            <DialogHeader>
              <DialogTitle className="text-white">
                Event Registrations: {selectedEvent?.name}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Manage registrations for this event ({eventRegistrations.length} total)
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              {eventRegistrations.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-pink-500/50 mb-4" />
                  <p className="text-gray-400">No registrations yet</p>
                </div>
              ) : (
                <Table className="admin-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-pink-400">Name</TableHead>
                      <TableHead className="text-pink-400">Email</TableHead>
                      <TableHead className="text-pink-400">Registration Date</TableHead>
                      <TableHead className="text-pink-400">Backup Code</TableHead>
                      <TableHead className="text-pink-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventRegistrations.map((registration) => (
                      <TableRow key={registration.id}>
                        <TableCell className="text-white font-medium">
                          {registration.user_name}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {registration.user_email}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(registration.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-pink-300 font-mono">
                          {registration.backup_code}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRegistration(registration.id)}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}