CREATE TABLE "class_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"academicYear" text NOT NULL,
	"section" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "class_groups_name_academicYear_section_unique" UNIQUE("name","academicYear","section")
);
--> statement-breakpoint
CREATE TABLE "group_students" (
	"id" serial PRIMARY KEY NOT NULL,
	"classGroupId" integer NOT NULL,
	"studentName" text NOT NULL,
	"rollNo" text NOT NULL,
	"studentEmail" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_students_classGroupId_rollNo_unique" UNIQUE("classGroupId","rollNo")
);
--> statement-breakpoint
CREATE TABLE "lecture_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"lectureSessionId" integer NOT NULL,
	"groupStudentId" integer NOT NULL,
	"status" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lecture_attendance_lectureSessionId_groupStudentId_unique" UNIQUE("lectureSessionId","groupStudentId")
);
--> statement-breakpoint
CREATE TABLE "lecture_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"timetableEntryId" integer NOT NULL,
	"date" date NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lecture_sessions_timetableEntryId_date_unique" UNIQUE("timetableEntryId","date")
);
--> statement-breakpoint
CREATE TABLE "timetable_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"classGroupId" integer NOT NULL,
	"subjectName" text NOT NULL,
	"subjectCode" text NOT NULL,
	"teacherId" text NOT NULL,
	"dayOfWeek" integer NOT NULL,
	"startTime" text NOT NULL,
	"endTime" text NOT NULL,
	"room" text,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timetable_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"timetableEntryId" integer,
	"type" text NOT NULL,
	"note" text,
	"createdBy" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_students" ADD CONSTRAINT "group_students_classGroupId_class_groups_id_fk" FOREIGN KEY ("classGroupId") REFERENCES "public"."class_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecture_attendance" ADD CONSTRAINT "lecture_attendance_lectureSessionId_lecture_sessions_id_fk" FOREIGN KEY ("lectureSessionId") REFERENCES "public"."lecture_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecture_attendance" ADD CONSTRAINT "lecture_attendance_groupStudentId_group_students_id_fk" FOREIGN KEY ("groupStudentId") REFERENCES "public"."group_students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecture_sessions" ADD CONSTRAINT "lecture_sessions_timetableEntryId_timetable_entries_id_fk" FOREIGN KEY ("timetableEntryId") REFERENCES "public"."timetable_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecture_sessions" ADD CONSTRAINT "lecture_sessions_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_classGroupId_class_groups_id_fk" FOREIGN KEY ("classGroupId") REFERENCES "public"."class_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_teacherId_user_id_fk" FOREIGN KEY ("teacherId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_exceptions" ADD CONSTRAINT "timetable_exceptions_timetableEntryId_timetable_entries_id_fk" FOREIGN KEY ("timetableEntryId") REFERENCES "public"."timetable_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_exceptions" ADD CONSTRAINT "timetable_exceptions_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_students_classGroupId_idx" ON "group_students" USING btree ("classGroupId");--> statement-breakpoint
CREATE INDEX "lecture_attendance_student_idx" ON "lecture_attendance" USING btree ("groupStudentId");--> statement-breakpoint
CREATE INDEX "lecture_sessions_date_idx" ON "lecture_sessions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "timetable_entries_teacher_day_idx" ON "timetable_entries" USING btree ("teacherId","dayOfWeek");--> statement-breakpoint
CREATE INDEX "timetable_entries_classGroupId_idx" ON "timetable_entries" USING btree ("classGroupId");--> statement-breakpoint
CREATE INDEX "timetable_exceptions_date_idx" ON "timetable_exceptions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "timetable_exceptions_entry_date_idx" ON "timetable_exceptions" USING btree ("timetableEntryId","date");