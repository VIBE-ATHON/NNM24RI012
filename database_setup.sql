-- SwiftAttend Database Setup Script
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff', 'participant')),
  student_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(255) NOT NULL,
  qr_code_data TEXT NOT NULL UNIQUE,
  max_capacity INTEGER,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create registrations table
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  qr_code_data TEXT NOT NULL UNIQUE,
  backup_code VARCHAR(20) NOT NULL UNIQUE,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  check_in_method VARCHAR(20) NOT NULL CHECK (check_in_method IN ('qr_scan', 'backup_code')),
  checked_in_by UUID REFERENCES public.users(id),
  UNIQUE(registration_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON public.registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON public.registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_registration ON public.attendance(registration_id);
CREATE INDEX IF NOT EXISTS idx_attendance_checked_in_by ON public.attendance(checked_in_by);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, student_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'participant'),
    NEW.raw_user_meta_data->>'student_id'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Events table policies
CREATE POLICY "Anyone can view events" ON public.events
  FOR SELECT USING (true);

CREATE POLICY "Admins can create events" ON public.events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin')
    )
  );

CREATE POLICY "Admins can update events" ON public.events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin')
    )
  );

CREATE POLICY "Admins can delete events" ON public.events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin')
    )
  );

-- Registrations table policies
CREATE POLICY "Users can view own registrations" ON public.registrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own registrations" ON public.registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own registrations" ON public.registrations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all registrations" ON public.registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Attendance table policies
CREATE POLICY "Staff can view attendance" ON public.attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Staff can create attendance records" ON public.attendance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Users can view own attendance" ON public.attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.id = registration_id AND r.user_id = auth.uid()
    )
  );

-- Create views for easier querying
CREATE OR REPLACE VIEW public.events_with_stats AS
SELECT 
  e.*,
  COALESCE(r.registration_count, 0) as registration_count,
  COALESCE(a.attendance_count, 0) as attendance_count
FROM public.events e
LEFT JOIN (
  SELECT event_id, COUNT(*) as registration_count
  FROM public.registrations
  GROUP BY event_id
) r ON e.id = r.event_id
LEFT JOIN (
  SELECT r.event_id, COUNT(*) as attendance_count
  FROM public.attendance a
  JOIN public.registrations r ON a.registration_id = r.id
  GROUP BY r.event_id
) a ON e.id = a.event_id;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Insert sample data (optional - remove in production)
-- Sample admin user (you'll need to create this user through Supabase Auth first)
-- INSERT INTO public.users (id, email, full_name, role) VALUES 
-- ('your-admin-user-id', 'admin@swiftattend.com', 'Admin User', 'admin');