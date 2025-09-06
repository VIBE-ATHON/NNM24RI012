# SwiftAttend MVP Implementation Plan

## Core Features to Implement

### 1. Authentication & User Management
- [ ] Supabase Auth integration
- [ ] Role-based access control (admin, staff, participant)
- [ ] User profile management
- [ ] Login/Register components

### 2. Database Setup
- [ ] Supabase database schema creation
- [ ] Row Level Security policies
- [ ] Database functions and triggers

### 3. Event Management (Admin)
- [ ] Event creation form
- [ ] Event listing dashboard
- [ ] Event editing/deletion
- [ ] QR code generation for events

### 4. Participant Registration
- [ ] Public event listing page
- [ ] Registration form
- [ ] Participant QR code generation
- [ ] Registration confirmation

### 5. Check-in System (Staff)
- [ ] QR code scanner interface
- [ ] Backup code entry system
- [ ] Real-time attendance marking
- [ ] Visual feedback for check-ins

### 6. Real-time Features
- [ ] Live attendance dashboard
- [ ] Real-time counter updates
- [ ] Supabase subscriptions

### 7. Reporting & Export
- [ ] Attendance reports
- [ ] CSV export functionality
- [ ] Basic analytics

## File Structure Plan

### Core Files (8 files max)
1. **src/lib/supabase.ts** - Supabase client configuration
2. **src/pages/Index.tsx** - Landing page with event listing
3. **src/pages/Dashboard.tsx** - Admin/Staff dashboard
4. **src/pages/EventDetails.tsx** - Event details and registration
5. **src/pages/Scanner.tsx** - QR code scanner interface
6. **src/components/EventCard.tsx** - Reusable event card component
7. **src/components/QRScanner.tsx** - QR scanner component
8. **src/components/AuthWrapper.tsx** - Authentication wrapper

### Key Components
- Event creation/editing forms
- Registration forms
- Real-time attendance counters
- QR code display/scanner
- Role-based navigation
- Responsive layouts

## Implementation Priority
1. Database setup and authentication
2. Basic event management
3. Registration system
4. QR code generation
5. Scanner interface
6. Real-time features
7. Reporting

## Simplifications for MVP
- Focus on core functionality over advanced features
- Use browser-based QR scanning (no native app)
- Basic reporting (detailed analytics in future versions)
- Simple role management (3 roles only)
- Essential UI components only