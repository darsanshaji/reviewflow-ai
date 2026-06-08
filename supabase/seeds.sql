-- ReviewFlow AI - Initial Database Seed Data

-- Insert default role configurations
INSERT INTO public.roles (id, name, description) VALUES
(1, 'Super Admin', 'Platform-wide developer and operations access'),
(2, 'Owner', 'Full control over the business group, billing, and settings'),
(3, 'Manager', 'Access to business metrics, branch configuration, and staff performance'),
(4, 'Receptionist', 'Front-desk operations, guest check-in, review request triggers, and customer contact management'),
(5, 'Staff', 'Performance metric reading and receipt of personal review attribution')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;
