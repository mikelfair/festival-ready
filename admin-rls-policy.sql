-- Enable Row Level Security on submissions table
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admin dashboard read access
CREATE POLICY "Admin dashboard read"
ON submissions FOR SELECT
USING ( current_setting('request.headers:x-admin-password', true) = 'festivalready2025!' );

-- Optional: Create policy for admin dashboard updates (for email editing)
CREATE POLICY "Admin dashboard update"
ON submissions FOR UPDATE
USING ( current_setting('request.headers:x-admin-password', true) = 'festivalready2025!' );
