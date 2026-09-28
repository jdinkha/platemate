


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."goal_enum" AS ENUM (
    'strength',
    'mass',
    'weight_loss'
);


ALTER TYPE "public"."goal_enum" OWNER TO "postgres";


CREATE TYPE "public"."status_enum" AS ENUM (
    'completed',
    'skipped'
);


ALTER TYPE "public"."status_enum" OWNER TO "postgres";


CREATE TYPE "public"."unit_enum" AS ENUM (
    'kg',
    'lbs'
);


ALTER TYPE "public"."unit_enum" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "muscle_group" "text",
    "user_id" "uuid"
);


ALTER TABLE "public"."exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "goal" "public"."goal_enum",
    "timezone" "text",
    "reminder_time" time without time zone,
    "unit_preference" "public"."unit_enum",
    "active_split_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."set_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "exercise_id" "uuid",
    "set_number" smallint,
    "weight_kg" numeric(4,1),
    "reps" smallint
);


ALTER TABLE "public"."set_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."split_day_exercises" (
    "split_day_id" "uuid" NOT NULL,
    "exercise_id" "uuid" NOT NULL,
    "position" smallint,
    "target_sets" smallint,
    "target_reps" smallint
);


ALTER TABLE "public"."split_day_exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."split_day_schedule" (
    "split_day_id" "uuid" NOT NULL,
    "weekday" smallint NOT NULL
);


ALTER TABLE "public"."split_day_schedule" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."split_days" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "split_id" "uuid" NOT NULL,
    "name" "text",
    "position" smallint
);


ALTER TABLE "public"."split_days" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."splits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "name" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."splits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "split_day_id" "uuid",
    "date" "date",
    "status" "public"."status_enum",
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."workout_sessions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."set_logs"
    ADD CONSTRAINT "set_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."split_day_schedule"
    ADD CONSTRAINT "split_day_schedule_pkey" PRIMARY KEY ("split_day_id", "weekday");



ALTER TABLE ONLY "public"."split_days"
    ADD CONSTRAINT "split_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."splits"
    ADD CONSTRAINT "splits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_split_day_id_key" UNIQUE ("split_day_id");



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_active_split_id_fkey" FOREIGN KEY ("active_split_id") REFERENCES "public"."splits"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."set_logs"
    ADD CONSTRAINT "set_logs_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."set_logs"
    ADD CONSTRAINT "set_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."split_day_exercises"
    ADD CONSTRAINT "split_day_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."split_day_exercises"
    ADD CONSTRAINT "split_day_exercises_split_day_id_fkey" FOREIGN KEY ("split_day_id") REFERENCES "public"."split_days"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."split_day_schedule"
    ADD CONSTRAINT "split_day_schedule_split_day_id_fkey" FOREIGN KEY ("split_day_id") REFERENCES "public"."split_days"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."split_days"
    ADD CONSTRAINT "split_days_split_id_fkey" FOREIGN KEY ("split_id") REFERENCES "public"."splits"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."splits"
    ADD CONSTRAINT "splits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_split_day_id_fkey" FOREIGN KEY ("split_day_id") REFERENCES "public"."split_days"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE "public"."exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."set_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."split_day_exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."split_day_schedule" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."split_days" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."splits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_sessions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."exercises" TO "anon";
GRANT ALL ON TABLE "public"."exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."exercises" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."set_logs" TO "anon";
GRANT ALL ON TABLE "public"."set_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."set_logs" TO "service_role";



GRANT ALL ON TABLE "public"."split_day_exercises" TO "anon";
GRANT ALL ON TABLE "public"."split_day_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."split_day_exercises" TO "service_role";



GRANT ALL ON TABLE "public"."split_day_schedule" TO "anon";
GRANT ALL ON TABLE "public"."split_day_schedule" TO "authenticated";
GRANT ALL ON TABLE "public"."split_day_schedule" TO "service_role";



GRANT ALL ON TABLE "public"."split_days" TO "anon";
GRANT ALL ON TABLE "public"."split_days" TO "authenticated";
GRANT ALL ON TABLE "public"."split_days" TO "service_role";



GRANT ALL ON TABLE "public"."splits" TO "anon";
GRANT ALL ON TABLE "public"."splits" TO "authenticated";
GRANT ALL ON TABLE "public"."splits" TO "service_role";



GRANT ALL ON TABLE "public"."workout_sessions" TO "anon";
GRANT ALL ON TABLE "public"."workout_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_sessions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


