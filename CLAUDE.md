# Project Notes

## Future Improvements

### Authentication
- [ ] Improve web auth security with HTTP-only cookies or server-side sessions
- [ ] Consider Supabase Auth Helpers for better web security
- [ ] Evaluate server-side auth flow vs current client-side approach

Current: Using memory-only storage on web (secure but requires re-login each session)
Goal: Persistent secure auth without localStorage/sessionStorage exposure