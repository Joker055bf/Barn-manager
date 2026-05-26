# Tasks: Profile Settings & Forgot Password Upgrades

- [x] Add Forgot Password to Login screen `components/AuthScreen.tsx` <!-- id: 0 -->
- [x] Implement Owner-Only Profile Upgrades inside `components/SettingsModal.tsx` <!-- id: 1 -->
- [x] Fix reported bugs (unknown creator, missing animal color, and sub-pen expenses not showing) <!-- id: 2 -->
    - [x] Added `addedBy` field to automated and manual expenses in `types.ts` and `App.tsx`
    - [x] Found the related animal inside `relevantExpenses` mappings in `App.tsx` and set `tagColor: animal?.tagColor`
    - [x] Removed strict single-pen `penId === penId` filtering inside `FinanceManager.tsx` to let pre-filtered sub-pen expenses display correctly
- [x] Document and verify changes <!-- id: 3 -->
