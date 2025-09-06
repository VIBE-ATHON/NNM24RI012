import { useState, useEffect } from 'react'
import { User } from '@/lib/auth'
import { createSupportMessage, getSupportMessages, resolveSupportMessage, SupportMessage } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MessageCircle, Send, Loader2, CheckCircle, Clock, User as UserIcon, Shield } from 'lucide-react'

interface SupportChatProps {
  user: User
  eventId?: string
}

export default function SupportChat({ user, eventId }: SupportChatProps) {
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    issueType: '',
    message: ''
  })
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const issueTypes = [
    'Registration Problem',
    'QR Code Issue',
    'Event Question',
    'Technical Issue',
    'Other'
  ]

  useEffect(() => {
    loadMessages()
  }, [user.id, eventId])

  const loadMessages = () => {
    try {
      const allMessages = getSupportMessages()
      // Filter messages for current user or all messages if admin
      const userMessages = user.role === 'admin' 
        ? allMessages 
        : allMessages.filter(msg => msg.user_id === user.id)
      
      // If eventId is provided, filter by event
      const filteredMessages = eventId 
        ? userMessages.filter(msg => msg.event_id === eventId)
        : userMessages

      setMessages(filteredMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      setError(null)
    } catch (err) {
      setError('Failed to load messages')
      console.error('Error loading messages:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.issueType || !formData.message.trim()) {
      setError('Please fill in all fields')
      return
    }

    setSending(true)
    setError(null)
    setSuccess(null)

    try {
      const newMessage = createSupportMessage(
        eventId || 'general',
        user.id,
        user.full_name,
        user.email,
        `[${formData.issueType}] ${formData.message}`
      )

      setMessages(prev => [newMessage, ...prev])
      setFormData({ issueType: '', message: '' })
      setDialogOpen(false)
      setSuccess('Your message has been sent to admin. You will receive a response soon.')
    } catch (err) {
      setError('Failed to send message')
      console.error('Error sending message:', err)
    } finally {
      setSending(false)
    }
  }

  const handleResolveMessage = async (messageId: string) => {
    try {
      const success = resolveSupportMessage(messageId, user.id)
      if (success) {
        loadMessages()
        setSuccess('Message marked as resolved')
      } else {
        setError('Failed to resolve message')
      }
    } catch (err) {
      setError('Failed to resolve message')
      console.error('Error resolving message:', err)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Open</Badge>
      case 'resolved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Resolved</Badge>
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{status}</Badge>
    }
  }

  const getIssueTypeFromMessage = (message: string) => {
    const match = message.match(/^\[([^\]]+)\]/)
    return match ? match[1] : 'General'
  }

  const getMessageContent = (message: string) => {
    return message.replace(/^\[[^\]]+\]\s*/, '')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and New Message Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {user.role === 'admin' ? 'Support Messages' : 'My Support Messages'}
          </h2>
          <p className="text-gray-400">
            {user.role === 'admin' 
              ? 'Manage participant support requests and issues'
              : 'Get help with registration, events, or technical issues'
            }
          </p>
        </div>
        
        {user.role === 'participant' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-pink">
                <MessageCircle className="h-4 w-4 mr-2" />
                Report Issue
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md card-dark border-pink-500/30">
              <DialogHeader>
                <DialogTitle className="text-white">Report an Issue</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Describe your problem and we'll help you resolve it
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitMessage} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="issueType" className="text-gray-300">Issue Type</Label>
                  <Select value={formData.issueType} onValueChange={(value) => setFormData({ ...formData, issueType: value })}>
                    <SelectTrigger className="input-dark">
                      <SelectValue placeholder="Select issue type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-pink-500/30">
                      {issueTypes.map((type) => (
                        <SelectItem key={type} value={type} className="text-gray-300 hover:bg-pink-500/20">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-gray-300">Describe Your Issue</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Please describe your issue in detail..."
                    rows={4}
                    className="input-dark"
                    required
                  />
                </div>
                
                <Button
                  type="submit"
                  disabled={sending || !formData.issueType || !formData.message.trim()}
                  className="w-full btn-pink"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Send Message
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <Alert className="error-pink">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="success-pink">
          <CheckCircle className="h-4 w-4 text-pink-400 mr-2 inline" />
          <AlertDescription className="text-pink-300">{success}</AlertDescription>
        </Alert>
      )}

      {/* Messages List */}
      <div className="space-y-4">
        {messages.length === 0 ? (
          <Card className="card-dark text-center py-12">
            <CardContent>
              <MessageCircle className="h-16 w-16 mx-auto text-pink-500/50 mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">
                {user.role === 'admin' ? 'No support messages yet' : 'No messages yet'}
              </h3>
              <p className="text-gray-400 mb-4">
                {user.role === 'admin' 
                  ? 'Participant support requests will appear here'
                  : 'Need help? Click "Report Issue" to contact support'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          messages.map((message) => (
            <Card key={message.id} className="card-dark">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-pink-500/20 rounded-full">
                      {user.role === 'admin' ? (
                        <UserIcon className="h-4 w-4 text-pink-400" />
                      ) : (
                        <Shield className="h-4 w-4 text-pink-400" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">
                        {user.role === 'admin' ? message.user_name : 'Support Request'}
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        {user.role === 'admin' && `${message.user_email} • `}
                        {getIssueTypeFromMessage(message.message)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(message.status)}
                    <div className="text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {getMessageContent(message.message)}
                  </p>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      Submitted {new Date(message.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  {message.resolved_at && (
                    <div className="flex items-center space-x-2 text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span>
                        Resolved {new Date(message.resolved_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Admin Actions */}
                {user.role === 'admin' && message.status === 'open' && (
                  <div className="pt-4 border-t border-gray-700">
                    <Button
                      onClick={() => handleResolveMessage(message.id)}
                      variant="outline"
                      size="sm"
                      className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Resolved
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}