CREATE TABLE `profiles` (
	`email` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`bio` text DEFAULT '这个人正在认真摸鱼和创造。' NOT NULL,
	`avatar` text DEFAULT '🐟' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
