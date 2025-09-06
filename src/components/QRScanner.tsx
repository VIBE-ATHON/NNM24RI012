import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Camera, Keyboard } from 'lucide-react'
import { supabase, User } from '@/lib/supabase'
import { toast } from 'sonner'

interface QRScannerProps {
  user: User
  eventId?: string
}

export default function QRScanner({ user, eventId }: QRScannerProps) {
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera')
  const [manualCode, setManualCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean
    message: string
    attendeeName?: string
  } | null>(null)
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const scannerElementId = 'qr-scanner'

  useEffect(() => {
    if (scanMode === 'camera') {
      startScanner()
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [scanMode])

  const startScanner = () => {
    if (scannerRef.current) {
      stopScanner()
    }

    scannerRef.current = new Html5QrcodeScanner(
      scannerElementId,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    )

    scannerRef.current.render(onScanSuccess, onScanFailure)
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error)
      scannerRef.current = null
    }
  }

  const onScanSuccess = async (decodedText: string) => {
    setScanning(true)
    await processCheckIn(decodedText, 'qr_scan')
    setScanning(false)
  }

  const onScanFailure = (error: string) => {
    // Ignore scan failures as they're common during scanning
  }

  const handleManualCheckIn = async () => {
    if (!manualCode.trim()) {
      toast.error('Please enter a backup code')
      return
    }

    setScanning(true)
    await processCheckIn(manualCode.trim(), 'backup_code')
    setScanning(false)
    setManualCode('')
  }

  const processCheckIn = async (code: string, method: 'qr_scan' | 'backup_code') => {
    try {
      // Find registration by QR code or backup code
      const { data: registration, error: regError } = await supabase
        .from('registrations')
        .select(`
          *,
          user:users(*),
          event:events(*),
          attendance(*)
        `)
        .or(
          method === 'qr_scan' 
            ? `qr_code_data.eq.${code}`
            : `backup_code.eq.${code}`
        )
        .single()

      if (regError || !registration) {
        setLastScanResult({
          success: false,
          message: 'Invalid code or registration not found'
        })
        toast.error('Invalid code or registration not found')
        return
      }

      // Check if event matches (if eventId is specified)
      if (eventId && registration.event_id !== eventId) {
        setLastScanResult({
          success: false,
          message: 'This code is not for the current event'
        })
        toast.error('This code is not for the current event')
        return
      }

      // Check if already checked in
      if (registration.attendance && registration.attendance.length > 0) {
        setLastScanResult({
          success: false,
          message: `${registration.user.full_name} is already checked in`,
          attendeeName: registration.user.full_name
        })
        toast.error(`${registration.user.full_name} is already checked in`)
        return
      }

      // Check in the attendee
      const { error: attendanceError } = await supabase
        .from('attendance')
        .insert([{
          registration_id: registration.id,
          check_in_method: method,
          checked_in_by: user.id
        }])

      if (attendanceError) {
        setLastScanResult({
          success: false,
          message: 'Failed to check in attendee'
        })
        toast.error('Failed to check in attendee')
        return
      }

      setLastScanResult({
        success: true,
        message: `${registration.user.full_name} checked in successfully!`,
        attendeeName: registration.user.full_name
      })
      toast.success(`${registration.user.full_name} checked in successfully!`)

    } catch (error: unknown) {
      console.error('Check-in error:', error)
      setLastScanResult({
        success: false,
        message: 'An error occurred during check-in'
      })
      toast.error('An error occurred during check-in')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Attendance Check-In
          </CardTitle>
          <CardDescription>
            Scan QR codes or enter backup codes to check in attendees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={scanMode === 'camera' ? 'default' : 'outline'}
              onClick={() => setScanMode('camera')}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Camera Scan
            </Button>
            <Button
              variant={scanMode === 'manual' ? 'default' : 'outline'}
              onClick={() => setScanMode('manual')}
              className="flex-1"
            >
              <Keyboard className="h-4 w-4 mr-2" />
              Manual Entry
            </Button>
          </div>

          {scanMode === 'camera' && (
            <div className="space-y-4">
              <div
                id={scannerElementId}
                className="w-full max-w-sm mx-auto"
              />
              {scanning && (
                <div className="text-center text-sm text-gray-600">
                  Processing check-in...
                </div>
              )}
            </div>
          )}

          {scanMode === 'manual' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-code">Backup Code</Label>
                <Input
                  id="manual-code"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Enter backup code (e.g., ABC123XY)"
                  className="text-center font-mono"
                />
              </div>
              <Button
                onClick={handleManualCheckIn}
                disabled={scanning || !manualCode.trim()}
                className="w-full"
              >
                {scanning ? 'Processing...' : 'Check In'}
              </Button>
            </div>
          )}

          {lastScanResult && (
            <Alert className={lastScanResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {lastScanResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={lastScanResult.success ? 'text-green-800' : 'text-red-800'}>
                  {lastScanResult.message}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}