CREATE TABLE "screening_results" (
	"submission_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"proposal_content" text NOT NULL,
	"evaluation" jsonb NOT NULL,
	"near_account" varchar(255) NOT NULL,
	"model" varchar(255),
	"verification_id" varchar(255),
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"quality_score" real,
	"attention_score" real
);
--> statement-breakpoint
CREATE INDEX "idx_screening_results_near_account" ON "screening_results" USING btree ("near_account");--> statement-breakpoint
CREATE INDEX "idx_screening_results_timestamp" ON "screening_results" USING btree ("timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_screening_results_overall_pass" ON "screening_results" USING btree (((evaluation->>'overallPass')::boolean));--> statement-breakpoint
CREATE INDEX "idx_screening_results_quality_score" ON "screening_results" USING btree ("quality_score");--> statement-breakpoint
CREATE INDEX "idx_screening_results_attention_score" ON "screening_results" USING btree ("attention_score");--> statement-breakpoint
CREATE INDEX "idx_screening_results_relevant" ON "screening_results" USING btree ((evaluation->'relevant'->>'score'));--> statement-breakpoint
CREATE INDEX "idx_screening_results_material" ON "screening_results" USING btree ((evaluation->'material'->>'score'));
