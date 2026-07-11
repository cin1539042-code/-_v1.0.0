import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const works = sqliteTable("works", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  type: text("type").notNull(),
  authorEmail: text("author_email").notNull(),
  authorName: text("author_name").notNull(),
  content: text("content").notNull().default(""),
  fileKey: text("file_key"),
  fileName: text("file_name"),
  coverKey: text("cover_key"),
  externalUrl: text("external_url"),
  status: text("status").notNull().default("published"),
  playCount: integer("play_count").notNull().default(0),
  windowSize: text("window_size").notNull().default("desktop"),
  windowWidth: integer("window_width"),
  windowHeight: integer("window_height"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const favorites = sqliteTable("favorites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workId: integer("work_id").notNull(),
  userEmail: text("user_email").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const profiles = sqliteTable("profiles", {
  email: text("email").primaryKey(),
  displayName: text("display_name").notNull(),
  bio: text("bio").notNull().default("这个人正在认真摸鱼和创造。"),
  avatar: text("avatar").notNull().default("🐟"),
  avatarKey: text("avatar_key"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
