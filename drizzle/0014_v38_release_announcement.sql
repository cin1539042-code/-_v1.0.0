INSERT INTO `site_settings` (`key`,`value`,`updated_at`) VALUES ('version','v38',CURRENT_TIMESTAMP) ON CONFLICT(`key`) DO UPDATE SET `value`='v38',`updated_at`=CURRENT_TIMESTAMP;
UPDATE `announcements` SET `active`=0 WHERE `active`=1;
INSERT INTO `announcements` (`content`,`active`,`created_by`,`created_at`) VALUES ('摸鱼箱 v38 已更新：优化黑夜模式可读性；消息与设置入口更紧凑；用户查找与私信分离；关注和粉丝整合进私信；收藏整合进个人主页作品筛选；修复应用窗口误关闭与搜索结果残留问题。',1,'system',CURRENT_TIMESTAMP);
