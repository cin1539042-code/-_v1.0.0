CREATE TABLE `user_activity` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_email` text NOT NULL,
  `activity_day` text NOT NULL,
  `fish_count` integer DEFAULT 0 NOT NULL,
  `fish_seconds` integer DEFAULT 0 NOT NULL,
  `last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `user_activity_user_day_unique` ON `user_activity` (`user_email`,`activity_day`);
CREATE INDEX `user_activity_last_seen_idx` ON `user_activity` (`last_seen_at`);
