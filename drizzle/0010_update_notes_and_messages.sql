ALTER TABLE `works` ADD `update_notes` text DEFAULT '' NOT NULL;
CREATE TABLE `direct_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sender_email` text NOT NULL,
	`recipient_email` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`read_at` text
);
CREATE INDEX `direct_messages_participants_idx` ON `direct_messages` (`sender_email`,`recipient_email`,`created_at`);
CREATE INDEX `direct_messages_unread_idx` ON `direct_messages` (`recipient_email`,`read_at`);
