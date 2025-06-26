-- Create function to increment views
CREATE OR REPLACE FUNCTION increment_views(blog_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE blogs 
  SET views = views + 1, updated_at = NOW()
  WHERE id = blog_id;
END;
$$ LANGUAGE plpgsql;
