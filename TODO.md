# Fix: New Owners Not Visible/Usable (Pending Status Bug)

## ✅ Step 1: Create TODO.md [COMPLETED]

## ⬜ Step 2: Update supabase_schema.sql
- Modify handle_new_user() trigger: auto-set status='active' for role='owner'

## ⬜ Step 3: Update src/lib/supabase.js  
- signUp: explicitly set status: 'active' in metadata
- signIn: skip pending check OR only for non-owners

## ⬜ Step 4: Update src/App.jsx (SAOwners)
- Optional: Filter default view to active owners
- Remove console.log('owners data:', data)

## ⬜ Step 5: Test Registration Flow
- Register new owner → check Supabase profiles (status='active')
- Verify visible on superadmin page + can login

## ⬜ Step 6: Deploy & Complete
- User runs updated schema in Supabase SQL Editor
- Test end-to-end → attempt_completion

