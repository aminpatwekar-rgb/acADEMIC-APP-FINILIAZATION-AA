# Admin Role & Security Management for ONYX

## Overview
ONYX no longer relies on hardcoded email addresses for admin detection. Instead, all role assignments are stored in Firestore and enforced via security rules.

## Architecture Changes

### Before (Hardcoded)
```typescript
// ❌ OLD - Hardcoded emails in App.tsx
const actualRole = (user?.email === 'merwynd12@gmail.com' || user?.email === 'aminpatwekar@gmail.com')
  ? 'admin'
  : (profile?.role || 'student');
```

### After (Firestore-Based)
```typescript
// ✅ NEW - Role from Firestore profile
const actualRole = profile?.role || 'student';
```

## Admin Role Assignment

### Firestore Schema
Each user document in the `/users/{userId}` collection has a `role` field:
- `student` - Default role
- `teacher` - Instructor/faculty
- `admin` - System administrator

### Admin Functions
Import from `src/lib/auth`:

```typescript
import {
  promoteUserToAdmin,
  revokeAdminRole,
  isUserAdmin,
  getAllAdmins
} from '@/lib/auth';

// Promote a user to admin
await promoteUserToAdmin('userId123', 'user@example.com', 'Promotion reason');

// Revoke admin role
await revokeAdminRole('userId123', 'user@example.com', 'Reason for revocation');

// Check if user is admin
const isAdmin = await isUserAdmin('userId123');

// Get all admins
const admins = await getAllAdmins();
```

## Security Rules

### Role Hierarchy
1. **Primary Source**: Firestore `/users/{userId}` document `role` field
2. **Fallback**: Firebase Custom Claims (if set via Admin SDK)
3. **Emergency**: Bootstrap emails (hardcoded, only as last resort)

### Admin Check (firestore.rules)
```
function isAdmin() {
  return isSignedIn() && (
    (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin" &&
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.active == true) ||
    request.auth.token.role == "admin" ||
    // Bootstrap emails as fallback only
    request.auth.token.email == "merwynd12@gmail.com" ||
    request.auth.token.email == "aminpatwekar@gmail.com"
  );
}
```

### Collections Protected by Admin Role
- `/admin_audit_log/{entryId}` - Read-only for admins
- User management (via Firebase Admin SDK)
- System settings
- Platform-wide announcements

## Bootstrap Admins (Initial Setup)

**IMPORTANT**: The bootstrap emails **MUST be removed** after initial setup:

1. Create user accounts in Firebase Authentication
2. Manually create `/users/{userId}` documents with `role: "admin"`
3. Remove the hardcoded email checks from `firestore.rules`
4. Update environment configuration

**Current bootstrap emails (TO BE REMOVED)**:
- `merwynd12@gmail.com`
- `aminpatwekar@gmail.com`

## Audit Trail

All admin actions are logged in `/admin_audit_log/{entryId}`:
```json
{
  "action": "PROMOTE_TO_ADMIN",
  "userId": "user123",
  "email": "user@example.com",
  "reason": "Reason for promotion",
  "timestamp": "2026-09-29T17:00:00Z",
  "performedBy": "system"
}
```

## Migration Checklist

- [x] Remove hardcoded emails from App.tsx
- [x] Update Firestore security rules (prioritize Firestore roles)
- [x] Create `adminManager.ts` service
- [x] Add admin audit logging
- [ ] Create Admin Panel UI for role management
- [ ] Set up Firebase Custom Claims via Admin SDK
- [ ] Remove bootstrap emails from rules (after all admins promoted via Firestore)
- [ ] Deploy security rules to Firebase Console

## Next Steps

1. **For Existing Admins**: Manually add `role: "admin"` to their `/users/{userId}` documents
2. **Create Admin Panel**: Build UI to promote/revoke roles (uses `adminManager.ts` functions)
3. **Set Custom Claims**: Use Firebase Admin SDK to set `role` custom claims on auth users
4. **Remove Bootstrap**: Once all admins are in Firestore, remove email checks from rules

## Troubleshooting

### User can't access admin panel
1. Check `/users/{userId}` document has `role: "admin"` AND `active: true`
2. Verify email verification if required by your auth flow
3. Check browser console for Firestore security errors
4. Verify security rules were deployed to Firebase

### Admin role changes not taking effect
- Firestore profile updates are cached; clear browser cache
- Restart the app to reload auth context
- Check `/admin_audit_log` to verify the promotion function was called

### Performance concerns
- Admin checks happen on every route; consider caching role in React Context
- Quiz answer keys use teacher role check; verify rules are correctly deployed
