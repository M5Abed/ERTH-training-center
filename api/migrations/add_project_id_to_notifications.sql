-- Add project_id column to notifications (for click-to-navigate)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS project_id INT NULL DEFAULT NULL AFTER type;
ALTER TABLE notifications ADD INDEX idx_notif_project (project_id);
