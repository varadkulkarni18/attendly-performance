ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_sessionId_class_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_enrollmentId_enrollments_id_fk" FOREIGN KEY ("enrollmentId") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_classId_classes_id_fk" FOREIGN KEY ("classId") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacherId_user_id_fk" FOREIGN KEY ("teacherId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_classId_classes_id_fk" FOREIGN KEY ("classId") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_records_enrollmentId_idx" ON "attendance_records" USING btree ("enrollmentId");--> statement-breakpoint
CREATE INDEX "class_sessions_classId_idx" ON "class_sessions" USING btree ("classId");--> statement-breakpoint
CREATE INDEX "classes_teacherId_idx" ON "classes" USING btree ("teacherId");--> statement-breakpoint
CREATE INDEX "enrollments_classId_idx" ON "enrollments" USING btree ("classId");--> statement-breakpoint
CREATE INDEX "enrollments_studentEmail_idx" ON "enrollments" USING btree ("studentEmail");