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
  status: text("status").notNull().default("published"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
