ALTER TABLE `direct_messages` ADD `client_nonce` text;
CREATE UNIQUE INDEX `direct_messages_sender_nonce_unique` ON `direct_messages` (`sender_email`,`client_nonce`);
