-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  type TEXT NOT NULL DEFAULT 'other',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create time_blocks table
CREATE TABLE IF NOT EXISTS time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  notes TEXT,
  mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;

-- Create policies for categories table
CREATE POLICY "Categories are viewable by their owner" ON categories
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Categories can be created by authenticated users" ON categories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Categories can be updated by their owner" ON categories
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Categories can be deleted by their owner" ON categories
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for time_blocks table
CREATE POLICY "Time blocks are viewable by their owner" ON time_blocks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Time blocks can be created by authenticated users" ON time_blocks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Time blocks can be updated by their owner" ON time_blocks
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Time blocks can be deleted by their owner" ON time_blocks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_user_id ON time_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_start_end ON time_blocks(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_time_blocks_category_id ON time_blocks(category_id);

-- Create function to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating updated_at column
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_blocks_updated_at
BEFORE UPDATE ON time_blocks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories for new users
CREATE OR REPLACE FUNCTION insert_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO categories (user_id, name, color, type)
  VALUES
    (NEW.id, 'Deep Work', '#6366f1', 'productive'),
    (NEW.id, 'Meetings', '#8b5cf6', 'productive'),
    (NEW.id, 'Rest', '#10b981', 'rest'),
    (NEW.id, 'Entertainment', '#f59e0b', 'other'),
    (NEW.id, 'Exercise', '#ec4899', 'productive'),
    (NEW.id, 'Learning', '#3b82f6', 'productive');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to insert default categories when a new user is created
CREATE TRIGGER insert_default_categories_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION insert_default_categories();