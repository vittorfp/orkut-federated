CREATE TABLE "invitation_redemptions" (
	"invitation_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_redemptions_pk" PRIMARY KEY("invitation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_digest" text NOT NULL,
	"inviter_user_id" text NOT NULL,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_code_digest_format" CHECK ("invitations"."code_digest" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "invitations_max_uses_range" CHECK ("invitations"."max_uses" between 1 and 100),
	CONSTRAINT "invitations_use_count_range" CHECK ("invitations"."use_count" between 0 and "invitations"."max_uses"),
	CONSTRAINT "invitations_expiry_after_creation" CHECK ("invitations"."expires_at" > "invitations"."created_at"),
	CONSTRAINT "invitations_revocation_after_creation" CHECK ("invitations"."revoked_at" is null or "invitations"."revoked_at" >= "invitations"."created_at")
);
--> statement-breakpoint
ALTER TABLE "invitation_redemptions" ADD CONSTRAINT "invitation_redemptions_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_redemptions" ADD CONSTRAINT "invitation_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_user_id_members_user_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."members"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_redemptions_user_unique" ON "invitation_redemptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_code_digest_unique" ON "invitations" USING btree ("code_digest");