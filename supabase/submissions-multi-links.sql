-- Add JSONB links array to submissions for multi-link support
alter table if exists public.submissions
  add column if not exists links jsonb;

-- Optional: backfill links from existing submission_url
update public.submissions
set links = jsonb_build_array(submission_url)
where links is null and submission_url is not null;

