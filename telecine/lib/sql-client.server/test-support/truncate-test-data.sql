-- This deletes all data from the test database before each test
-- Currently it is only deleting from the identity schema
-- You will need to modify this to delete from other schemas
-- if you have data in other schemas
create or replace function truncate_test_data()
  returns void
  language plpgsql
  as $$
declare
  statements text;
  stmt_count int;
begin
  select
    STRING_AGG('"' || schemaname || '"."' || tablename || '"', ', ') into statements
  from
    pg_tables
  where
    schemaname in ('identity');
  if statements is not null then
    execute 'TRUNCATE TABLE ' || statements || ' CASCADE;';
  end if;
end;
$$;

