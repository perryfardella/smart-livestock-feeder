- remove invites when a feeder is deleted
- make manual sync button send the feeding schedule
- Need performance optimisations for feeder page
- Full permissions system + full testing system to make sure things don't regress
- Implement DMARC
- add reset feeder button to site - write data request initialised = 0
- Fix invite emails going to the wrong URL (localhost) - this is fixed for now, need to update vercel env vars again when we go to prod
- email a user when the've been removed from a team
- Email a user when their permissions have changed
- Make sure changing permissions actually works
- Fix error where users who have been removed from a team can't be invited back
- Fix security and performance issues in supabase dashboard
- Look into supabase rate limiting for sending emails when we go live to prod. This is separate to resend and could cause issues
