# PlateMate

PlateMate is a workout tracker for lifters. Pick a proven training split, log every set in seconds, and keep a training diary that shows your progress and the days you missed.

## Features

### Plan your training

- **Nine built-in splits:** Push / Pull / Legs, Upper / Lower, Full Body, Bro Split, Arnold Split, PHUL, PHAT, Push / Pull, and Torso / Limbs. Each comes with its workouts, exercises and a default schedule.
- **A goal that sets your targets.** Every exercise gets a default target number of sets and reps based on your goal:

  | Goal        | Compound lifts | Accessories |
  | ----------- | -------------- | ----------- |
  | Strength    | 5 × 5          | 3 × 8       |
  | Muscle      | 4 × 8          | 3 × 12      |
  | Weight loss | 3 × 12         | 3 × 15      |

  Power days in PHUL and PHAT stay heavy whatever your goal.

- **Two kinds of schedule:**
  - **Weekly:** each day of the week is a workout or a rest day, the same every week.
  - **Loop:** a sequence that repeats regardless of the weekday, such as Upper → Rest → Lower → Rest. Rest days always move on. A missed workout stays next in line until you do it or skip it, so a busy day never costs you a session.
- **Change your mind any time.** Switching split or schedule applies from today. Your diary keeps the plan you actually had on every earlier day, so past days are never re-marked as missed.

### Today

- Opens to today's workout, with the week around it at a glance.
- Each exercise shows its target and what you lifted last time, with weight and reps prefilled from your last set.
- Log sets with large, tap-friendly controls. Delete a set, or swap to a different workout.
- **Make each workout yours.** Change how many sets an exercise needs, add exercises by searching a list of over 100 common lifts (or type your own), and delete the ones you don't do. Changes apply to every day that workout comes up.
- On a rest day, train anyway if you feel like it.
- Not training today? **Take a break** (it doesn't count as missed) or **Skip** the workout.

### Diary

- A monthly calendar colored by what happened each day.
- Stats for the month: workouts, consistency, missed days and total volume. Consistency counts workouts done against workouts missed or skipped; breaks don't count against you.
- A list of every tracked day: trained, rest, break, skipped or missed.
- Open any past day to see its sets, or to log a workout you forgot to record.

### Settings

- Training split, schedule (weekly or loop), and goal.
- Units: pounds or kilograms. Everything you've logged is shown in the unit you choose.
- First day of the week, time zone (detected when you sign up), and light, dark or system appearance.

### Accounts

- Sign up and sign in with Google, or with email and password.
- Email confirmation and a forgot-password flow.
- The landing page is public; everything else needs an account.

## How it works

### Built with

- **[Next.js 16](https://nextjs.org)** (App Router): server components render pages with the user's data, and server actions handle every change.
- **React 19** and **TypeScript**.
- **[Tailwind CSS v4](https://tailwindcss.com)** with a custom theme and class-based dark mode.
- **[Supabase](https://supabase.com)** for authentication (Google OAuth and email, with cookie-based sessions via `@supabase/ssr`) and for the Postgres database.
- Hosted on **[Vercel](https://vercel.com)**.

### Data model

| Table                  | What it holds                                                                 |
| ---------------------- | ----------------------------------------------------------------------------- |
| `profiles`             | Name, goal, weight unit, time zone, first day of the week, current split     |
| `splits`               | A user's split, the day it took effect, and whether it's weekly or a loop     |
| `split_days`           | The workouts in a split (Push, Pull, Legs, …)                                 |
| `split_day_exercises`  | Each workout's exercises, with target sets and reps                           |
| `split_day_schedule`   | Weekly schedules: which weekdays each workout falls on                        |
| `split_loop_entries`   | Loops: the workouts and rest days in order                                    |
| `exercises`            | The exercise library; users own the exercises they log                        |
| `workout_sessions`     | One row per user per day that's recorded: completed, skipped, or a break     |
| `set_logs`             | Each logged set: exercise, weight and reps                                    |

A few ideas shape the design:

- **Splits are versioned.** Changing split or schedule creates a new split that takes effect today, rather than editing the old one. Past days are always judged against the plan that was in effect on that day.
- **Built-in splits live in code** (`src/lib/splits.ts`) and are copied into your own tables when you choose one.
- **Only what happened is stored.** Rest days and missed days aren't saved as rows; they're worked out from your schedule and sessions. For loops, that includes where the loop has got to since it started.
- **Weights are stored in kilograms** to two decimal places and converted for display, so weights logged in pounds come back exactly as entered.
- **"Today" follows your time zone**, so your day rolls over at your midnight rather than the server's.

### Security

- **Row level security on every table:** users can only read and change their own rows. Policies also stop anyone attaching their sets or sessions to another user's workouts or exercises. Signed-out visitors have no access to any table.
- **Server actions re-check the session** and validate every input, since they can be called directly.
- **Route protection:** `src/proxy.ts` refreshes the session on each request and sends signed-out visitors to the sign-in page for anything beyond the landing and account pages.

## Project structure

```
src/
  app/
    page.tsx              landing page, onboarding, or today's workout
    (app)/                diary and settings pages, and the server actions for training data
    (auth)/               sign in, sign up and password reset pages
    auth/                 OAuth callback, email link confirmation, and auth server actions
  components/
    app/                  signed-in UI: day view, set logging, diary, settings, schedule editor
    landing/              the marketing page
  lib/
    splits.ts             built-in splits, goals and rep targets
    training.ts           schedules, loops and day statuses
    data.ts               database queries
    dates.ts, units.ts    calendar dates and kg / lbs conversion
    supabase/             Supabase clients and session refresh
  proxy.ts                session refresh and route protection
supabase/migrations/      database schema, security policies and changes
```

## Roadmap

- A demo mode to try PlateMate without an account
- Workout reminders
- An AI training assistant
- A progress chart

## License

PlateMate is licensed under the [GNU General Public License v3.0](LICENSE).
