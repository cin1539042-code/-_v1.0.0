ALTER TABLE `works` ADD `play_count` integer NOT NULL DEFAULT 0;
CREATE TABLE `favorites` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `work_id` integer NOT NULL,
  `user_email` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `favorites_work_user_unique` ON `favorites` (`work_id`,`user_email`);

INSERT INTO `profiles` (`email`,`display_name`,`bio`,`avatar`)
SELECT 'cin1539042@gmail.com','浅笑','这个人正在认真摸鱼和创造。','🐟'
WHERE NOT EXISTS (SELECT 1 FROM `profiles` WHERE `email`='cin1539042@gmail.com');
UPDATE `profiles` SET `display_name`='浅笑' WHERE `email`='cin1539042@gmail.com';

INSERT INTO `works` (`title`,`description`,`type`,`author_email`,`author_name`,`content`,`status`)
SELECT '午后小说馆','沉浸阅读，治愈时光。','其他','cin1539042@gmail.com','浅笑','<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>午后小说馆</title></head><body style="font-family:serif;background:#fff8ed;padding:40px;line-height:2"><h1>午后小说馆</h1><p>选择一本喜欢的小说，在安静的午后慢慢阅读。</p></body></html>','published'
WHERE NOT EXISTS (SELECT 1 FROM `works` WHERE `title`='午后小说馆');
INSERT INTO `works` (`title`,`description`,`type`,`author_email`,`author_name`,`content`,`status`)
SELECT '像素摸鱼大作战','三分钟一局，快乐加倍。','娱乐','cin1539042@gmail.com','浅笑','<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>像素摸鱼大作战</title></head><body style="font-family:sans-serif;text-align:center;background:#b9e5ff;padding:50px"><h1>🕹️ 像素摸鱼大作战</h1><p id="score">得分：0</p><button onclick="score.textContent=`得分：${++window.n}`" style="padding:15px 25px">摸一下</button><script>window.n=0</script></body></html>','published'
WHERE NOT EXISTS (SELECT 1 FROM `works` WHERE `title`='像素摸鱼大作战');
INSERT INTO `works` (`title`,`description`,`type`,`author_email`,`author_name`,`content`,`status`)
SELECT '今日新闻窗','轻松掌握每日趣闻。','其他','cin1539042@gmail.com','浅笑','<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>今日新闻窗</title></head><body style="font-family:sans-serif;background:#f7f5f0;padding:40px"><h1>📰 今日新闻窗</h1><p>这里展示值得在摸鱼时间轻松了解的每日趣闻。</p></body></html>','published'
WHERE NOT EXISTS (SELECT 1 FROM `works` WHERE `title`='今日新闻窗');
