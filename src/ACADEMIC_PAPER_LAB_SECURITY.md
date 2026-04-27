# Academic Paper Lab — Security Audit & Lockdown

**Last Updated:** 2026-04-27  
**Status:** LOCKED TO ADMIN ONLY

---

## Overview

The Academic Paper Lab is a private developer tool for generating AI-assisted academic paper drafts from real DataWinder species data. It is **strictly restricted to admin users** and must never be exposed to public or regular user access.

---

## Access Control Mechanisms

### 1. Frontend Access Gate (pages/AcademicPaperLab.jsx)

**Implementation:**
- Authentication check on component mount using `useQuery` to fetch current user via `base44.auth.me()`
- Role validation: `user.role !== 'admin'` blocks all non-admin access
- Renders "Access Denied" UI with detailed explanation if access is denied
- Console warning logged for any unauthorized access attempt

**Code Location:** Lines 392–411  
**Protection Level:** ⭐⭐⭐ (Three-layer check: auth state, role verification, UI gate)

### 2. Backend Function Access Gate (functions/generateAcademicPaper.js)

**Implementation:**
- All function invocations require authenticated admin user: `user.role !== 'admin'` returns 403 Forbidden
- Request origin & referer headers logged for audit trail
- Admin email and timestamp logged on every successful invocation
- Unauthorized access attempts logged with user role information

**Code Location:** Lines 250–259  
**Protection Level:** ⭐⭐⭐ (Backend validation cannot be bypassed from frontend)

### 3. Dependent Backend Functions

All functions called by the lab have their own admin-only checks:

- `generateComparativePaper` — requires admin role
- `createSecureShare` — validates authorization
- `registerAuthorship` — restricted usage
- Direct entity access (`base44.asServiceRole.entities.PaperDraft`) — service-role scoped

---

## Data & Function Isolation

### What Is Locked Down

✅ **generateAcademicPaper** — 403 if non-admin  
✅ **generateComparativePaper** — 403 if non-admin  
✅ **PaperDraft entity** — created only by admin functions, no public API  
✅ **createSecureShare** — validates admin context before creating one-time view links  
✅ **registerAuthorship** — admin-only SHA-256 authorship registration  

### What Cannot Leak

❌ AI-generated paper content cannot be viewed by non-admins  
❌ Draft history is not accessible via list/filter operations for non-admins  
❌ Share links created in lab are one-time view only, not persistent  
❌ Authorship registration is private and verifiable only by creator  

---

## Route Security

### App.jsx Route Configuration

```jsx
{/* SECURITY: Academic Paper Lab — admin-only, never linked from public nav */}
<Route path="/AcademicPaperLab" element={<LayoutWrapper currentPageName="AcademicPaperLab"><AcademicPaperLab /></LayoutWrapper>} />
```

**Key Points:**
- Route exists but is not registered in `pages.config.js` (prevents auto-navigation)
- Not included in main nav menu or any public navigation
- No link from any public-facing page
- URL is the ONLY way to access the route
- Accessing the route without admin privileges displays "Access Denied" UI

---

## Audit Trail & Logging

### Function Invocation Logging

Every call to `generateAcademicPaper` logs:

```javascript
console.log(`generateAcademicPaper invoked by admin: ${user.email} at ${new Date().toISOString()}`);
```

**Logged Information:**
- Admin email (who called the function)
- Timestamp (when the call was made)
- Taxon and rank (what was generated)
- Success/failure status
- Error details if applicable

### Unauthorized Access Logging

```javascript
console.error(`Unauthorized access attempt to generateAcademicPaper. User role: ${user?.role || 'none'}`);
console.warn(`Unauthorized access attempt to AcademicPaperLab. User role: ${user?.role || 'none'}`);
```

---

## Testing & Verification

### Test Cases (All Should Pass)

#### ✅ Test 1: Admin Can Access
```
User Role: admin
Access AcademicPaperLab page: SUCCESS (UI renders)
Invoke generateAcademicPaper: SUCCESS (200 response)
```

#### ✅ Test 2: Non-Admin Cannot Access UI
```
User Role: user
Access AcademicPaperLab page: ACCESS DENIED UI (no component rendering)
Console: Warning logged
```

#### ✅ Test 3: Non-Admin Cannot Invoke Backend
```
User Role: user
Invoke generateAcademicPaper: 403 Forbidden
Response: { error: "Forbidden: Admin-only access required" }
Console: Error logged with user role
```

#### ✅ Test 4: Unauthenticated Cannot Access
```
User: null (not logged in)
Access AcademicPaperLab page: ACCESS DENIED UI
Invoke generateAcademicPaper: 403 Forbidden
```

---

## Incident Response

### If Unauthorized Access Is Detected

1. **Check logs** for unauthorized invocation attempts
2. **Review user roles** — verify no non-admin users were promoted accidentally
3. **Audit PaperDraft records** — list all drafts created and verify creator email matches admin
4. **Purge compromised data** — delete any drafts created by non-admin invocations

### Command: Check for Unauthorized Drafts

```javascript
// In database audit:
SELECT * FROM PaperDraft WHERE created_by NOT IN (SELECT email FROM User WHERE role = 'admin');
```

---

## Future Maintenance

### Code Review Checklist

Before any changes to Academic Paper Lab:

- [ ] Confirm `user.role !== 'admin'` check exists on BOTH frontend AND backend
- [ ] Verify no direct API routes expose PaperDraft data
- [ ] Ensure dependent functions (`createSecureShare`, `registerAuthorship`) have their own admin checks
- [ ] Check that logging captures admin email and timestamp
- [ ] Confirm route is NOT in pages.config.js
- [ ] Verify nav menu does NOT link to the lab
- [ ] Test 403 response when non-admin attempts function invocation

### Recommended Upgrades (Future)

1. **Two-factor authentication** for admin functions (optional)
2. **IP whitelisting** for developer access (optional)
3. **Separate vault** for PaperDraft — stored separately from public data (optional)
4. **Rate limiting** on function invocation (optional)

---

## Summary

| Layer | Mechanism | Status |
|-------|-----------|--------|
| **Frontend** | Role-based access gate | ✅ LOCKED |
| **Backend** | Admin-only validation on all functions | ✅ LOCKED |
| **Routing** | Not in public nav, no discoverable links | ✅ LOCKED |
| **Data** | PaperDraft isolated, service-role scoped | ✅ LOCKED |
| **Logging** | Full audit trail on invocations | ✅ ACTIVE |
| **Dependent Functions** | All have individual admin checks | ✅ LOCKED |

**Overall Security Status: HARDENED ✅**

No known vulnerabilities or bleed between admin tool and public app.