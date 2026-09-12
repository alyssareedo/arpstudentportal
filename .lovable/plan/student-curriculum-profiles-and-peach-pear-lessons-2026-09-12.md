# Student curriculum profiles and Peach/Pear lessons

## What will change
- Add a **Curriculum** tab to every student's own profile, showing that signed-in student's existing curriculum map, timetable, and calendar.
- Keep this student view read-only; teachers and admins retain their existing editing tools.
- Add the supplied Lesson 1 and Lesson 2 phonics schedules to the matching Peach and Pear student curriculum records without changing existing items.

## Technical details
- Reuse the existing `CurriculumCalendar` so profile curriculum stays live and consistent with the Curriculum Plan and Roadmap pages.
- Identify the exact Peach and Pear profiles before adding records.
- Store each 40-minute lesson as a curriculum item with its full timed activities, focus words, and resources.
- Verify the app build and confirm the new records are present for both students.
