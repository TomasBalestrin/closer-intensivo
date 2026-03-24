-- Bethel Events Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'closer');
CREATE TYPE participant_color AS ENUM ('rosa', 'preto', 'azul_claro', 'dourado', 'laranja');
CREATE TYPE qualification_level AS ENUM ('super', 'medio', 'baixo');
CREATE TYPE disc_profile_type AS ENUM ('D', 'I', 'S', 'C');

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'closer',
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    photo_url TEXT,
    revenue TEXT,
    niche TEXT,
    color participant_color,
    instagram TEXT,
    webhook_data JSONB,
    funnel TEXT,
    seller_closer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    mentee_inviter TEXT,
    companion TEXT,
    is_opportunity BOOLEAN DEFAULT FALSE,
    assigned_closer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    times_called INTEGER DEFAULT 0 CHECK (times_called >= 0 AND times_called <= 4),
    checked_in_day1 BOOLEAN DEFAULT FALSE,
    checked_in_day2 BOOLEAN DEFAULT FALSE,
    checked_in_day3 BOOLEAN DEFAULT FALSE,
    qualification qualification_level,
    -- DISC & Archetype fields (migration_002)
    primary_archetype TEXT,
    secondary_archetype TEXT,
    archetype_description TEXT,
    disc_profile TEXT,
    disc_score_d NUMERIC(3,1),
    disc_score_i NUMERIC(3,1),
    disc_score_s NUMERIC(3,1),
    disc_score_c NUMERIC(3,1),
    disc_analysis JSONB,
    personality_summary TEXT,
    sales_approach JSONB,
    decision_triggers JSONB,
    predicted_objections JSONB,
    closing_strategies JSONB,
    things_to_avoid TEXT[],
    quick_tips TEXT[],
    challenge_answer TEXT,
    desired_change_answer TEXT,
    form_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forms table
CREATE TABLE IF NOT EXISTS forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    form_url TEXT UNIQUE NOT NULL,
    responses JSONB,
    disc_profile disc_profile_type,
    disc_description TEXT,
    sales_insights TEXT,
    objections TEXT,
    objection_handling TEXT,
    closing_examples TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    closer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    total_value DECIMAL(12, 2) NOT NULL,
    entry_value DECIMAL(12, 2) NOT NULL,
    negotiation_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhooks log table
CREATE TABLE IF NOT EXISTS webhooks_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_participants_assigned_closer ON participants(assigned_closer_id);
CREATE INDEX IF NOT EXISTS idx_participants_seller_closer ON participants(seller_closer_id);
CREATE INDEX IF NOT EXISTS idx_participants_is_opportunity ON participants(is_opportunity);
CREATE INDEX IF NOT EXISTS idx_participants_qualification ON participants(qualification);
CREATE INDEX IF NOT EXISTS idx_participants_name ON participants(name);
CREATE INDEX IF NOT EXISTS idx_forms_participant ON forms(participant_id);
CREATE INDEX IF NOT EXISTS idx_sales_participant ON sales(participant_id);
CREATE INDEX IF NOT EXISTS idx_sales_closer ON sales(closer_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON webhooks_log(processed);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participants_updated_at
    BEFORE UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks_log ENABLE ROW LEVEL SECURITY;

-- Users policies
-- Admins can see all users, closers can only see themselves
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert users"
    ON users FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update users"
    ON users FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete users"
    ON users FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Participants policies
-- Admins can see all participants, closers can only see assigned participants
CREATE POLICY "Admins can view all participants"
    ON participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Closers can view assigned participants"
    ON participants FOR SELECT
    USING (assigned_closer_id = auth.uid());

CREATE POLICY "Admins can insert participants"
    ON participants FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update participants"
    ON participants FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Closers can update assigned participants"
    ON participants FOR UPDATE
    USING (assigned_closer_id = auth.uid());

CREATE POLICY "Admins can delete participants"
    ON participants FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Forms policies
CREATE POLICY "Authenticated users can view forms"
    ON forms FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public can view forms by URL"
    ON forms FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert forms"
    ON forms FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update forms"
    ON forms FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public can update forms"
    ON forms FOR UPDATE
    USING (true);

-- Sales policies
CREATE POLICY "Admins can view all sales"
    ON sales FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Closers can view their own sales"
    ON sales FOR SELECT
    USING (closer_id = auth.uid());

CREATE POLICY "Authenticated users can insert sales"
    ON sales FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Webhooks log policies (service role only in production)
CREATE POLICY "Service role can manage webhooks"
    ON webhooks_log FOR ALL
    USING (true);

-- Function to sync auth.users with public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'closer')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert initial admin user (update email as needed)
-- Note: You'll need to first create the user via Supabase Auth, then update their role
-- INSERT INTO users (id, email, name, role) VALUES ('your-auth-user-id', 'admin@bethel.com', 'Admin', 'admin');
