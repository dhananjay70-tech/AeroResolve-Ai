CREATE TABLE "aero_resolve"."voice_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escalation_id" uuid NOT NULL,
	"provider" text DEFAULT 'exotel' NOT NULL,
	"provider_call_id" text,
	"phone_number_masked" text NOT NULL,
	"status" text DEFAULT 'CALL_REQUESTED' NOT NULL,
	"failure_reason" text,
	"started_at" timestamp,
	"connected_at" timestamp,
	"ended_at" timestamp,
	"duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aero_resolve"."voice_calls" ADD CONSTRAINT "voice_calls_escalation_id_escalations_id_fk" FOREIGN KEY ("escalation_id") REFERENCES "aero_resolve"."escalations"("id") ON DELETE no action ON UPDATE no action;