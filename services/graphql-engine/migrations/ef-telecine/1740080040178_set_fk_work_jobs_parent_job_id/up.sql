alter table "work"."jobs"
  add constraint "jobs_parent_job_id_fkey"
  foreign key ("parent_job_id")
  references "work"."jobs"
  ("id") on update restrict on delete no action;
