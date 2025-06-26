-- Create blogs table
CREATE TABLE IF NOT EXISTS blogs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  summary TEXT,
  author VARCHAR(100) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  thumbnail_url TEXT,
  external_url TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_blogs_published_at ON blogs(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blogs_views ON blogs(views DESC);
CREATE INDEX IF NOT EXISTS idx_blogs_title ON blogs(title);
CREATE INDEX IF NOT EXISTS idx_blogs_external_url ON blogs(external_url);
CREATE INDEX IF NOT EXISTS idx_blogs_tags ON blogs USING GIN(tags);
