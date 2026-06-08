-- ReviewFlow AI - Supabase/PostgreSQL Enterprise Database Schema
-- Multi-tenant isolation enforced via Row-Level Security (RLS)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 0. Lookup Tables (Global)
-- ==========================================

-- Roles Table
CREATE TABLE public.roles (
    id INTEGER PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 1. Core Platform Tables
-- ==========================================

-- Tenants Table
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Businesses Table
CREATE TABLE public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    logo_url TEXT,
    brand_colors JSONB DEFAULT '{"primary": "#2563eb", "secondary": "#475569"}'::jsonb,
    website VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Branches Table
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    google_review_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Users Profile Table (Extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL, -- Nullable for Super Admins
    role_id INTEGER NOT NULL REFERENCES public.roles(id),
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Customers Table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Services Table
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2),
    duration INTEGER, -- In minutes
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Staff Table
CREATE TABLE public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100), -- E.g. Stylist, Receptionist, Waiter
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Campaigns Engine Table
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- WhatsApp, Email, SMS, QR
    schedule_time TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Scheduled, Sent, Failed
    template_body TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback / Survey Table
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    category VARCHAR(100), -- Staff, Quality, Price, Cleanliness, Waiting Time, etc.
    sentiment VARCHAR(50), -- Positive, Neutral, Negative
    priority VARCHAR(50) DEFAULT 'Medium', -- High, Medium, Low
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- External Review Redirect Links Table
CREATE TABLE public.review_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    platform_name VARCHAR(100) NOT NULL, -- Google, Yelp, Facebook, TripAdvisor
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- QR Code Management Table
CREATE TABLE public.qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL, -- Branch, Staff, Chair, Table, Service
    target_id VARCHAR(255) NOT NULL, -- Identifier (e.g. "Chair 1")
    dynamic_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Analytics Engine Table
CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- page_open, rating_selected, feedback_submitted, review_click, qr_scan
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Subscriptions Table
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_name VARCHAR(100) NOT NULL, -- Starter, Growth, Enterprise
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    current_period_end TIMESTAMPTZ NOT NULL,
    limits JSONB DEFAULT '{"users": 5, "branches": 1, "campaigns_per_month": 100}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Logs Table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Settings Table
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    brand_logo TEXT,
    primary_color VARCHAR(50) DEFAULT '#2563eb',
    secondary_color VARCHAR(50) DEFAULT '#475569',
    custom_domain VARCHAR(255),
    favicon_url TEXT,
    email_branding JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 2. Database Indexes for Scaling
-- ==========================================
CREATE INDEX idx_businesses_tenant ON public.businesses(tenant_id);
CREATE INDEX idx_branches_tenant ON public.branches(tenant_id);
CREATE INDEX idx_users_tenant ON public.users(tenant_id);
CREATE INDEX idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX idx_services_tenant ON public.services(tenant_id);
CREATE INDEX idx_staff_tenant ON public.staff(tenant_id);
CREATE INDEX idx_campaigns_tenant ON public.campaigns(tenant_id);
CREATE INDEX idx_feedback_tenant ON public.feedback(tenant_id);
CREATE INDEX idx_review_links_tenant ON public.review_links(tenant_id);
CREATE INDEX idx_qr_codes_tenant ON public.qr_codes(tenant_id);
CREATE INDEX idx_analytics_events_tenant ON public.analytics_events(tenant_id);
CREATE INDEX idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX idx_audit_logs_tenant ON public.audit_logs(tenant_id);
CREATE INDEX idx_settings_tenant ON public.settings(tenant_id);

-- ==========================================
-- 3. Row-Level Security (RLS) Setup
-- ==========================================

-- Helper Function to resolve current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT tenant_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper Function to resolve current user's role_id
CREATE OR REPLACE FUNCTION public.get_user_role_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT role_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tenant tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 3a. Tenants RLS Policies
CREATE POLICY "Allow select for own tenant" ON public.tenants
    FOR SELECT USING (id = public.get_user_tenant_id() OR public.get_user_role_id() = 1);

CREATE POLICY "Allow update for owners/managers" ON public.tenants
    FOR UPDATE USING ((id = public.get_user_tenant_id() AND public.get_user_role_id() IN (2, 3)) OR public.get_user_role_id() = 1);

-- 3b. Users RLS Policies
CREATE POLICY "Allow select/update for user or tenant staff" ON public.users
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR id = auth.uid() OR public.get_user_role_id() = 1);

-- 3c. Generic Tenant Table Policies
-- Applies to businesses, branches, customers, services, staff, campaigns, feedback, review_links, qr_codes, analytics_events, subscriptions, audit_logs, settings
-- Users can access data matching their tenant_id. Super Admins (role_id = 1) bypass tenant isolation.

-- Businesses RLS
CREATE POLICY "Businesses isolation" ON public.businesses
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role_id() = 1);

-- Branches RLS
CREATE POLICY "Branches isolation" ON public.branches
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role_id() = 1);

-- Customers RLS
CREATE POLICY "Customers isolation" ON public.customers
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role_id() = 1);

-- Services RLS
CREATE POLICY "Services isolation" ON public.services
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role_id() = 1);

-- Staff RLS
CREATE POLICY "Staff isolation" ON public.staff
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role_id() = 1);

-- Campaigns RLS
CREATE POLICY "Campaigns isolation" ON public.campaigns
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role_id() = 1);

-- Feedback RLS
CREATE POLICY "Feedback isolation" ON public.feedback
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role_id() = 1);

-- Review Links RLS
CREATE POLICY "Review Links isolation" ON public.review_links
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role_id() = 1);

-- QR Codes RLS
CREATE POLICY "QR Codes isolation" ON public.qr_codes
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role_id() = 1);

-- Analytics RLS
CREATE POLICY "Analytics Events isolation" ON public.analytics_events
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role_id() = 1);

-- Subscriptions RLS
CREATE POLICY "Subscriptions isolation" ON public.subscriptions
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role_id() = 1);

-- Audit Logs RLS
CREATE POLICY "Audit Logs isolation" ON public.audit_logs
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role_id() = 1);

-- Settings RLS
CREATE POLICY "Settings isolation" ON public.settings
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role_id() = 1);

-- ==========================================
-- 4. User Registration Automation Trigger
-- ==========================================

-- Function to handle new user signup automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_tenant_id UUID;
BEGIN
  -- Create a new tenant container for the user
  INSERT INTO public.tenants (name)
  VALUES (COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)) || '''s Org')
  RETURNING id INTO default_tenant_id;

  -- Create a default subscription for the tenant
  INSERT INTO public.subscriptions (tenant_id, plan_name, current_period_end)
  VALUES (default_tenant_id, 'Starter', now() + interval '30 days');

  -- Insert the user into public.users table as Owner (role_id: 2)
  INSERT INTO public.users (id, tenant_id, role_id, name)
  VALUES (
    new.id,
    default_tenant_id,
    2, -- Owner
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

