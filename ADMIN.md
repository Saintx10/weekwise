# Adding courses to Weekwise (for the site owner)

Everyone's app reads `catalog.json` from this website each time it opens with internet.

## To add or update a course
1. Send Claude the course material, the summary, the study guide (optional), the LMS week list,
   and the class: department, level, semester.
2. Claude gives you back:
   - one pack file per course, e.g. `mac201.json`
   - an updated `catalog.json`
3. On GitHub, open your `weekwise` repository:
   - open the `packs` folder → Add file → Upload files → drop the new pack file(s) → Commit
   - at the top level → Add file → Upload files → drop the new `catalog.json` (it replaces the old one) → Commit
4. Wait 1–2 minutes. Students in that class get the course the next time they open Weekwise online.

## Rules
- Never rename or delete a pack file that students already use.
- To correct a pack, upload the fixed file with the same name; Claude raises its version number
  in both the pack and `catalog.json`, so phones download the fix. Progress is kept.
