create or replace function array_distinct(anyarray)
  returns anyarray
  language sql
  as $$
  select
    array_agg(distinct x)
  from
    unnest($1) t(x);
$$;

create or replace function notify_schema_change()
  returns event_trigger
  language plpgsql
  as $$
declare
  schema_names text[];
  schema_name text;
  ddl_command RECORD;
begin
  -- Initialize an empty array to store unique schema names
  schema_names := '{}';
  -- Loop through each DDL command in the current transaction
  for ddl_command in
  select
    *
  from
    pg_event_trigger_ddl_commands()
    loop
      schema_names := array_append(schema_names, ddl_command.schema_name);
    end loop;
  -- Send a single notification with the list of unique schema names
  perform
    pg_notify('schema_changes', array_to_string(array_distinct(schema_names), ','));
end;
$$;

drop event trigger if exists schema_change_trigger;

create event trigger schema_change_trigger on ddl_command_end
  execute function notify_schema_change();

create or replace function notify_schema_drop()
  returns event_trigger
  language plpgsql
  as $$
declare
  schema_names text[];
  schema_name text;
  dropped_object RECORD;
begin
  -- Initialize an empty array to store unique schema names
  schema_names := '{}';
  for dropped_object in
  select
    *
  from
    pg_event_trigger_dropped_objects()
    loop
      schema_names := array_append(schema_names, dropped_object.schema_name);
    end loop;
  -- Send a single notification with the list of unique schema names
  perform
    pg_notify('schema_changes', array_to_string(array_distinct(schema_names), ','));
end;
$$;

-- Create or replace the event trigger to attach the trigger function to sql_drop event
drop event trigger if exists schema_drop_trigger;

create event trigger schema_drop_trigger on sql_drop
  execute function notify_schema_drop();

