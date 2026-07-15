CREATE TABLE `user_moderation` (`user_email` text PRIMARY KEY NOT NULL,`status` text DEFAULT 'active' NOT NULL,`note` text DEFAULT '' NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE TABLE `feedback` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,`user_email` text NOT NULL,`content` text NOT NULL,`status` text DEFAULT 'open' NOT NULL,`admin_reply` text DEFAULT '' NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE INDEX `feedback_user_idx` ON `feedback` (`user_email`,`created_at`);
CREATE INDEX `feedback_status_idx` ON `feedback` (`status`,`created_at`);
