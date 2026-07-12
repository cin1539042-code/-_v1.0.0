CREATE TABLE `follows` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,`follower_email` text NOT NULL,`following_email` text NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE UNIQUE INDEX `follows_pair_unique` ON `follows` (`follower_email`,`following_email`);
