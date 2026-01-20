import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull()
});

export const apiKeys = pgTable("api_keys", {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull().references(() => user.id),
    name: text("name").notNull(),
    key_hash: text("key_hash").notNull().unique(),
    key_prefix: text("key_prefix").notNull(),
    scopes: jsonb("scopes").default(['read', 'write']),
    allowed_endpoint_ids: jsonb("allowed_endpoint_ids"), // Null = All, Array = Specific IDs
    is_active: boolean("is_active").default(true),
    expires_at: timestamp("expires_at"),
    last_used_at: timestamp("last_used_at"),
    created_at: timestamp("created_at").defaultNow()
});

export const session = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull()
});

export const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    idToken: text("id_token"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull()
});

export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at")
});

export const endpoints = pgTable("endpoints", {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull().references(() => user.id),
    name: text("name").notNull(),
    alias: text("alias").notNull().unique(),
    gas_url: text("gas_url").notNull(),
    description: text("description"),
    payload_mapping: jsonb("payload_mapping"),
    require_api_key: boolean("require_api_key").default(false),
    is_active: boolean("is_active").default(true),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
    last_used_at: timestamp("last_used_at")
});

export const logs = pgTable("logs", {
    id: text("id").primaryKey(),
    endpoint_id: text("endpoint_id").references(() => endpoints.id),
    request_method: text("request_method"),
    request_headers: jsonb("request_headers"),
    request_payload: jsonb("request_payload"),
    response_status: integer("response_status"),
    response_body: jsonb("response_body"),
    response_time_ms: integer("response_time_ms"),
    ip_address: text("ip_address"),
    user_agent: text("user_agent"),
    error_message: text("error_message"),
    created_at: timestamp("created_at").defaultNow()
});


