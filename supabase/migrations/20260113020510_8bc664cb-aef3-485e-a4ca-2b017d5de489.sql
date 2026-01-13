-- Add last_secondary_neighborhood_change column for 45-day cooldown on secondary neighborhood
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_secondary_neighborhood_change TIMESTAMP WITH TIME ZONE;

-- Update scheduled_notifications to use Brasilia timezone for scheduling
COMMENT ON COLUMN public.scheduled_notifications.scheduled_at IS 'Schedule time in UTC-3 (Brasilia timezone)';

-- Create index for faster queries on scheduled notifications
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_at 
ON public.scheduled_notifications (scheduled_at);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user_notification 
ON public.notification_reads (user_id, notification_id);