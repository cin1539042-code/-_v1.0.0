CREATE TABLE `notification_reads` (
	`user_email` text PRIMARY KEY NOT NULL,
	`last_read_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
