CREATE SCHEMA IF NOT EXISTS "aero_resolve";
--> statement-breakpoint
CREATE TABLE "aero_resolve"."actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aero_resolve"."bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pnr" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"flight_id" uuid NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"fare_class" text DEFAULT 'economy' NOT NULL,
	"payment_method" text DEFAULT 'card' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_pnr_unique" UNIQUE("pnr")
);
--> statement-breakpoint
CREATE TABLE "aero_resolve"."conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"booking_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aero_resolve"."customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"loyalty_tier" text DEFAULT 'Silver' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aero_resolve"."escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"requested_action" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aero_resolve"."flights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flight_number" text NOT NULL,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"departure_time" timestamp NOT NULL,
	"arrival_time" timestamp NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"delay_minutes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "flights_flight_number_unique" UNIQUE("flight_number")
);
--> statement-breakpoint
CREATE TABLE "aero_resolve"."messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aero_resolve"."policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "policies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "aero_resolve"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "aero_resolve"."actions" ADD CONSTRAINT "actions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "aero_resolve"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aero_resolve"."bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "aero_resolve"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aero_resolve"."bookings" ADD CONSTRAINT "bookings_flight_id_flights_id_fk" FOREIGN KEY ("flight_id") REFERENCES "aero_resolve"."flights"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aero_resolve"."conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "aero_resolve"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aero_resolve"."conversations" ADD CONSTRAINT "conversations_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "aero_resolve"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aero_resolve"."escalations" ADD CONSTRAINT "escalations_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "aero_resolve"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aero_resolve"."messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "aero_resolve"."conversations"("id") ON DELETE no action ON UPDATE no action;