CREATE TABLE `announcements` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,`content` text NOT NULL,`active` integer DEFAULT 1 NOT NULL,`created_by` text NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE TABLE `site_settings` (`key` text PRIMARY KEY NOT NULL,`value` text NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
