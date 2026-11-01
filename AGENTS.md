# ARP Student Portal — standing rules

- Save every schema or access-rule change as a migration file, never as one-off SQL run only
  against the live database. The user intends to move this app onto a database they own, and a
  change that exists only live would silently make that copy looser or older than the running
  app. If a change has to be applied directly, write the equivalent migration file in the same
  turn and note which migration covers it.
