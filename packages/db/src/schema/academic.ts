import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { userRoleEnum } from "./enums";

export const universities = pgTable(
  "universities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    shortCode: text("short_code").notNull(),
    country: text("country").notNull().default("Nigeria"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("universities_short_code_idx").on(table.shortCode)],
);

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    universityId: uuid("university_id")
      .notNull()
      .references(() => universities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("departments_university_id_idx").on(table.universityId),
    uniqueIndex("departments_uni_code_idx").on(table.universityId, table.code),
  ],
);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    academicLevel: text("academic_level").notNull().default("200L"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("courses_code_idx").on(table.code),
    index("courses_department_id_idx").on(table.departmentId),
  ],
);

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    orderIndex: integer("order_index").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("topics_course_id_idx").on(table.courseId),
    uniqueIndex("topics_course_slug_idx").on(table.courseId, table.slug),
  ],
);

/**
 * Student & reviewer profiles.
 * `id` corresponds to the Supabase Auth `auth.users.id` UUID (or deterministic UUID for seeded profiles).
 */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    username: text("username").notNull(),
    avatarUrl: text("avatar_url"),
    avatarNumber: integer("avatar_number").notNull().default(1),
    role: userRoleEnum("role").notNull().default("student"),
    universityId: uuid("university_id").references(() => universities.id, {
      onDelete: "set null",
    }),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    academicLevel: text("academic_level").default("200L"),
    xp: integer("xp").notNull().default(0),
    battlesPlayed: integer("battles_played").notNull().default(0),
    battlesWon: integer("battles_won").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("profiles_email_idx").on(table.email),
    uniqueIndex("profiles_username_idx").on(table.username),
    index("profiles_university_id_idx").on(table.universityId),
    index("profiles_xp_idx").on(table.xp),
  ],
);
