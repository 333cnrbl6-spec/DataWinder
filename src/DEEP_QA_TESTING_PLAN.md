# DataWinder Deep QA & Code Review Testing Plan
## Comprehensive Pre-Release Testing Guide

This is a complete testing blueprint to identify bugs, UX issues, code weaknesses, and areas for refactoring before launch.

---

## Phase 1: Authentication & Account Setup (15 minutes)

### 1.1 User Signup Journey
- [ ] Sign up with Bangor email (@bangor.ac.uk)
  - Verify: Auto-assigned to Free Academic tier
  - Verify: No trial countdown shown
  - Verify: "Free forever" badge displays on dashboard
- [ ] Sign up with non-Bangor email
  - Verify: Trial countdown appears (14 days)
  - Verify: Email verification sent
  - Verify: Can access all Pro features during trial
- [ ] Test invalid email formats
  - Test: Spaces in email (should fail)
  - Test: Missing @ symbol (should fail)
  - Test: Already registered email (should show error, not allow re-signup)
- [ ] Password strength validation
  - Test: Very short password (<6 chars)
  - Test: Common passwords (123456, password)
  - Verify: UX feedback on password strength

### 1.2 Login & Session Management
- [ ] Login with correct credentials
  - Verify: Redirects to dashboard
  - Verify: Session persists on page refresh
- [ ] Login with incorrect password
  - Verify: Clear error message (no "user not found" leakage)
  - Test: Multiple failed attempts (should throttle/lock after N attempts)
- [ ] Logout
  - Verify: Session cleared
  - Verify: Redirects to login or landing page
  - Verify: No cached data accessible after logout
- [ ] Session timeout
  - Test: Leave logged in for extended period
  - Verify: Session expires after timeout (check timeout duration is reasonable, e.g., 24 hours)

### 1.3 Account Settings
- [ ] Profile editing
  - Test: Edit name, avatar
  - Verify: Changes persist on page reload
- [ ] Password reset
  - Test: Request password reset
  - Verify: Email sent with reset link
  - Test: Reset link validity (should expire after time)
- [ ] Team member invitation
  - Test: Invite valid email
  - Verify: Invitation email sent
  - Test: Invite invalid email format
  - Test: Invite already-registered user
  - Test: Invite with Viewer vs Editor role
- [ ] Delete account
  - Verify: Warning dialog shown
  - Verify: Data deletion confirmed
  - Verify: Account permanently inaccessible after deletion

---

## Phase 2: Data Import & Management (20 minutes)

### 2.1 Multi-Source Search (GBIF/IUCN/iNaturalist/SpeciesLink)
- [ ] Search with common name
  - Test: "Lion", "Cheetah", "Frog"
  - Verify: Results from all 4 sources
  - Verify: No timeout (should complete in <10 seconds)
- [ ] Search with scientific name
  - Test: "Panthera leo", "Acinonyx jubatus"
  - Verify: Exact matches returned
- [ ] Search with typos
  - Test: "Pnthera leo" (missing letter)
  - Verify: Graceful handling (no crash, shows "No results" or suggestions)
- [ ] Bulk import
  - Test: Import 100+ records
  - Verify: Progress indicator works
  - Verify: No data loss or corruption
- [ ] Cancel import mid-way
  - Test: Initiate import, cancel during processing
  - Verify: Partial import rolled back or clearly marked

### 2.2 File Upload
- [ ] CSV upload
  - Test: Valid CSV with species, latitude, longitude
  - Verify: Auto-detects columns
  - Test: CSV with extra columns (should ignore or warn)
  - Test: CSV with missing coordinates
  - Verify: Validation shows missing data, prevents import until fixed
- [ ] Excel upload
  - Test: .xlsx file
  - Verify: Detects correct sheet (first or named sheet)
  - Test: Multi-sheet Excel
  - Verify: User can select which sheet to import
- [ ] GeoJSON upload
  - Test: Valid GeoJSON FeatureCollection
  - Verify: Parses correctly
  - Test: Invalid GeoJSON
  - Verify: Clear error message
- [ ] Shapefile upload
  - Test: .zip with .shp, .shx, .dbf
  - Verify: Decompresses and imports
  - Test: Missing required files
  - Verify: Error message indicates missing .shx or .dbf
- [ ] File size limits
  - Test: Large file (>100MB)
  - Verify: Either imports successfully or shows clear size limit error
- [ ] Duplicate detection during import
  - Test: Import same species twice
  - Verify: Duplicates flagged, user prompted

### 2.3 Photo Upload & AI ID (Pro feature)
- [ ] Upload photo
  - Test: JPG, PNG, HEIC formats
  - Verify: EXIF extraction works (GPS, timestamp)
  - Test: Photo without EXIF data
  - Verify: Graceful handling (no crash)
- [ ] AI species identification
  - Test: Clear photo of known species
  - Verify: AI suggests correct species
  - Test: Blurry/ambiguous photo
  - Verify: Low confidence score shown, user can override
- [ ] EXIF GPS accuracy
  - Test: Photo with precise GPS
  - Verify: Coordinates extracted correctly
  - Test: Photo with coarse GPS (grid cell)
  - Verify: Flagged as low precision

### 2.4 Data Quality Audit
- [ ] Quick audit (duplicates only)
  - Test: Run on dataset with duplicates
  - Verify: Detects and flags duplicates
- [ ] Comprehensive audit (all checks)
  - Test: Dataset with mixed issues (duplicates, outliers, typos)
  - Verify: All issues detected
  - Verify: Quality score calculated correctly
- [ ] Auto-correct
  - Test: Click "Auto-correct obvious errors"
  - Verify: Duplicates removed
  - Verify: Coordinates validated
  - Verify: Changes logged in version history
- [ ] Manual review of flags
  - Test: Click flagged record
  - Verify: Can edit inline (species name, coords, date)
  - Verify: Can delete record
- [ ] Large dataset audit
  - Test: Audit 10,000+ records
  - Verify: Completes in reasonable time (<2 minutes)
  - Verify: No memory issues or crashes

---

## Phase 3: Species Distribution Modeling (SDM) (25 minutes)

### 3.1 SDM Pipeline Configuration
- [ ] Run name
  - Test: Empty name
  - Verify: Error shown, launch disabled
  - Test: Very long name (>200 chars)
  - Verify: Truncated or shows warning
- [ ] Species selection
  - Test: Select 1 species
  - Verify: Launch enabled
  - Test: Select 0 species
  - Verify: Launch disabled, error message
  - Test: Select 10+ species
  - Verify: Launches (may take longer)
- [ ] Bioclimatic variables
  - Test: Select 2 variables (minimum)
  - Verify: Launch enabled
  - Test: Select 1 variable
  - Verify: Launch disabled, error message
  - Test: Select all 19 variables
  - Verify: Launch works (may slow down model)
- [ ] Cleaning settings
  - Test: Outlier handling dropdown
  - Verify: 3 options available (None, High-confidence, Aggressive)
  - Test: Spatial thinning slider (0–50 km)
  - Verify: Smooth slider movement, value updates
  - Test: Regularization slider (0.01–2)
  - Verify: Changes affect model behavior

### 3.2 Pipeline Execution
- [ ] Pipeline launch
  - Test: Launch with valid config
  - Verify: Status changes to "Queued"
  - Verify: Progress bar appears
  - Verify: User gets success toast notification
- [ ] Pipeline stages
  - Test: Monitor pipeline through all stages
  - Verify: Cleaning → Thinning → Climate → Modeling → Completed
  - Verify: Progress percentage updates
  - Verify: Each stage label is accurate
- [ ] Real-time updates
  - Test: Leave tab open during modeling
  - Verify: Status updates without manual refresh
  - Test: Close tab, reopen after 5 minutes
  - Verify: Status fetched correctly (not stuck on old status)
- [ ] Pipeline failure handling
  - Test: Pipeline that fails (low data, bad parameters)
  - Verify: Error status shown
  - Verify: Error message is helpful (not generic "Failed")
  - Verify: User can delete failed run and try again
- [ ] Multiple simultaneous runs
  - Test: Launch 2–3 pipelines at once
  - Verify: All proceed without blocking each other
  - Verify: Each has independent progress tracking

### 3.3 Model Results Viewing
- [ ] Results panel opens
  - Test: Click "View Results" on completed run
  - Verify: Results panel expands
  - Verify: All tabs present (Prediction Map, Variable Importance, Response Curves)
- [ ] Metrics display
  - Test: View AUC, TSS, Sensitivity, Specificity, etc.
  - Verify: All values shown and correctly formatted
  - Verify: Color coding (green for good AUC, etc.)
- [ ] Prediction map
  - Test: Map renders without errors
  - Verify: Color gradient (blue–yellow–red) is visible
  - Test: Click on map areas
  - Verify: Interactive (if tooltips implemented)
- [ ] Variable importance chart
  - Test: Bar chart renders correctly
  - Verify: Bars sorted by importance (descending)
  - Verify: Labels readable (not overlapping)
- [ ] Response curves
  - Test: LineChart renders for each variable
  - Verify: Curves show realistic shapes (not flat/noisy)
  - Verify: All selected variables shown
- [ ] Occurrence stats
  - Test: Raw → After outlier removal → After thinning
  - Verify: Each step shows reasonable reduction
  - Verify: Final count matches model input

### 3.4 Results Export to Map Editor
- [ ] Open in Map Editor
  - Test: Click "Open in Map Editor"
  - Verify: Navigates to `/SDMMapEditor/{runId}`
  - Verify: Prediction grid loaded
  - Verify: Occurrences overlaid on map

---

## Phase 4: Report Generation (10 minutes)

### 4.1 PDF Report Generation
- [ ] Generate basic report
  - Test: Click "Generate & Download PDF Report"
  - Verify: PDF downloads with correct filename
  - Verify: File size reasonable (1–10 MB)
- [ ] Custom title
  - Test: Enter custom report title
  - Verify: Title appears on PDF title page
  - Test: Leave title blank
  - Verify: Default title used
- [ ] Toggle options
  - Test: Toggle "Include Suitability Maps" on/off
  - Verify: PDF size changes appropriately
  - Test: Toggle "Include Variable Importance Charts"
  - Test: Toggle "Include Bibliography"
  - Verify: Each affects final PDF correctly
- [ ] PDF content validation
  - Test: Generate report and open PDF
  - Verify: Title page formatted correctly
  - Verify: Model metrics present and accurate
  - Verify: Bibliography includes IUCN, GBIF, iNaturalist, SpeciesLink, WorldClim
  - Verify: All pages printable
- [ ] Multiple species reports
  - Test: Run model with 2+ species
  - Verify: All species listed on title page
  - Verify: PDF generates without error
- [ ] Error handling
  - Test: Generate report for incomplete run
  - Verify: Clear error message (not blank screen)
  - Test: Network interruption during generation
  - Verify: Graceful failure with retry option

---

## Phase 5: Team Collaboration (10 minutes)

### 5.1 Project Sharing
- [ ] Create project
  - Test: Enter project name, description
  - Verify: Project created and accessible
- [ ] Invite team member
  - Test: Invite with Viewer role
  - Verify: Invitation email sent
  - Test: Invite with Editor role
  - Verify: Invitation sent
- [ ] Accept/Reject invitation
  - Test: Accept invitation via link
  - Verify: Access granted immediately
  - Test: Reject invitation
  - Verify: Access denied (or removed if already accepted)
- [ ] View as Viewer
  - Test: Login as invited Viewer user
  - Verify: Can view project
  - Verify: Cannot edit data or run models
  - Verify: Cannot delete project
- [ ] View as Editor
  - Test: Login as invited Editor user
  - Verify: Can edit data
  - Verify: Can run models
  - Verify: Cannot delete project (only owner can)

### 5.2 Workspace Comments
- [ ] Add comment to project
  - Test: Type comment and post
  - Verify: Comment appears immediately
  - Verify: Timestamp and author shown
- [ ] Mention colleague
  - Test: Type @email in comment
  - Verify: Email user mentioned
  - Verify: Notification email sent
- [ ] Edit comment
  - Test: Edit own comment
  - Verify: "Edited" label shown
  - Test: Try to edit others' comment
  - Verify: Prevented (error or disabled)
- [ ] Delete comment
  - Test: Delete own comment
  - Verify: Comment removed

---

## Phase 6: Subscription & Billing (Trial → Pro) (10 minutes)

### 6.1 Trial Tier
- [ ] Trial countdown
  - Test: Signup with non-Bangor email
  - Verify: "14 days left" shown on dashboard
  - Test: Wait (or manually adjust system date to test)
  - Verify: Countdown decrements daily
- [ ] Trial-end emails
  - Test: Day 12 email
  - Verify: "3 days left" email received
  - Test: Day 13 email
  - Verify: "1 day left" email received
  - Test: Day 14 email
  - Verify: "Trial expired" email received
- [ ] Feature access during trial
  - Test: Ensemble method available
  - Test: Climate scenarios available
  - Test: Photo AI ID available
  - Verify: All Pro features accessible

### 6.2 Trial Expiration
- [ ] Auto-expiration on day 15
  - Test: Access app on day 15
  - Verify: Trial banner shows "Upgrade or access limited"
  - Verify: Pro features show upgrade prompt
- [ ] Upgrade prompt
  - Test: Click "Upgrade to Pro"
  - Verify: Navigates to Pricing page
- [ ] Feature lockout
  - Test: Try to run Ensemble model post-trial
  - Verify: Error or overlay: "Upgrade to Pro"
  - Test: Try to access climate scenarios
  - Verify: Locked with upgrade prompt

### 6.3 Stripe Checkout (Test Card: 4242 4242 4242 4242)
- [ ] Pricing page options
  - Test: Select Monthly (£99/month)
  - Verify: Price and billing info correct
  - Test: Select Annual (£990/year)
  - Verify: "Save 17%" message shown
- [ ] Checkout flow
  - Test: Click "Proceed to Checkout"
  - Verify: Stripe checkout modal opens
  - Test: Try to open checkout from iframe
  - Verify: Blocked with message "Checkout works only from published app"
- [ ] Payment processing
  - Test: Enter test card 4242 4242 4242 4242
  - Verify: Payment succeeds
  - Verify: Success page shows
  - Verify: Confirmation email sent
- [ ] Payment failure
  - Test: Use test card 4000 0000 0000 0002 (decline)
  - Verify: Clear error message
  - Verify: User can retry
- [ ] Post-upgrade
  - Test: Reload page after successful payment
  - Verify: Upgrade confirmed (no trial banner)
  - Verify: All Pro features unlocked
  - Verify: Billing portal accessible in Settings

### 6.4 Free Academic (Bangor) Tier
- [ ] Tier detection
  - Test: Signup with @bangor.ac.uk email
  - Verify: Free tier auto-assigned
  - Verify: No trial countdown
  - Verify: "Free forever" badge shown
- [ ] Feature limits
  - Test: Attempt to create 6th project
  - Verify: Error: "Limit: 5 projects"
  - Test: Run model and check occurrence limit
  - Verify: 1,000 occurrences/month limit enforced
- [ ] No upgrade path
  - Test: Look for upgrade option
  - Verify: None available (user is locked to Free forever)

---

## Phase 7: Navigation & Routing (10 minutes)

### 7.1 Page Navigation
- [ ] Landing page
  - Test: Visit / (root)
  - Verify: Landing page renders
  - Test: Click "Login" or "Start Trial"
  - Verify: Navigates correctly
- [ ] Dashboard
  - Test: Login and verify dashboard
  - Verify: Correct page rendered
  - Test: Click "Projects"
  - Verify: Projects page renders
- [ ] Sidebar navigation
  - Test: Click each nav item
  - Verify: Correct pages load
  - Test: Mobile sidebar toggle
  - Verify: Sidebar opens/closes
- [ ] Back button
  - Test: Navigate through pages, use back button
  - Verify: History preserved correctly
  - Test: Deep link to page
  - Verify: Page loads correctly (not 404)
- [ ] 404 handling
  - Test: Navigate to `/nonexistent`
  - Verify: 404 page shown (not blank or error)

### 7.2 URL Parameters
- [ ] Project ID in URL
  - Test: Navigate to `/ProjectWorkspace/123`
  - Verify: Correct project loaded
  - Test: With invalid ID
  - Verify: Error or "not found" message
- [ ] Species ID filters
  - Test: Filter by species in URL param
  - Verify: Correctly filters results

---

## Phase 8: Performance & Optimization (15 minutes)

### 8.1 Load Times
- [ ] Dashboard load
  - Test: Measure load time
  - Verify: Loads in <3 seconds
  - Test: With slow 3G network
  - Verify: Still usable (shows skeleton loaders, not blank)
- [ ] Large dataset handling
  - Test: Load project with 10,000 species
  - Verify: Dashboard doesn't hang
  - Verify: Search/filter works (not sluggish)
- [ ] Map rendering
  - Test: Load prediction map with 100k+ grid cells
  - Verify: Renders in <2 seconds
  - Verify: Zoom/pan is smooth

### 8.2 API Call Optimization
- [ ] Unnecessary requests
  - Test: Open DevTools Network tab
  - Navigate between pages
  - Verify: No duplicate API calls
  - Verify: No requests for data that's already cached
- [ ] Request size
  - Test: Check API response sizes
  - Verify: Responses reasonably sized (gzip compression)
- [ ] Polling efficiency
  - Test: Run SDM model
  - Check Network tab for polling requests
  - Verify: Polling interval is reasonable (e.g., 3 seconds, not 0.5 seconds)

### 8.3 Database Query Efficiency
- [ ] List endpoints
  - Test: Fetch list of 1,000+ records
  - Verify: Pagination used or limit applied
  - Verify: Query completes in <2 seconds
- [ ] Complex queries
  - Test: Filter and sort with multiple criteria
  - Verify: Efficient (indexes used, not full scans)

---

## Phase 9: Data Validation & Security (15 minutes)

### 9.1 Input Validation
- [ ] Text fields
  - Test: XSS injection: `<script>alert('XSS')</script>`
  - Verify: Escaped or sanitized (not executed)
  - Test: SQL injection: `'; DROP TABLE species; --`
  - Verify: Treated as string literal (no SQL execution)
- [ ] Number fields
  - Test: Enter negative coordinates
  - Verify: Validation error
  - Test: Enter non-numeric values
  - Verify: Error or type coercion
- [ ] Date fields
  - Test: Future date (e.g., year 2099)
  - Verify: Warning or error
  - Test: Invalid date format
  - Verify: Clear error message
- [ ] File uploads
  - Test: Upload .exe or .js file
  - Verify: Rejected or sanitized (not executed)
  - Test: Upload oversized file
  - Verify: Size limit enforced

### 9.2 Authorization
- [ ] Viewer/Editor permissions
  - Test: Viewer tries to edit data
  - Verify: Prevented (API returns 403)
  - Test: Viewer tries to delete project
  - Verify: Prevented
- [ ] Cross-user access
  - Test: User A tries to access User B's project (via URL)
  - Verify: Prevented (403 Forbidden)
  - Test: Via API directly
  - Verify: Still prevented (server-side check, not just frontend)
- [ ] Token security
  - Test: Inspect auth token in localStorage
  - Verify: No sensitive data in token (only JWT payload)
  - Verify: HTTPS enforced (no http)

### 9.3 Session Security
- [ ] CORS
  - Test: Request from different domain
  - Verify: Blocked (CORS headers correct)
- [ ] CSRF protection
  - Test: Form submissions (if applicable)
  - Verify: CSRF token present or SameSite cookie used

---

## Phase 10: Error Handling & Edge Cases (15 minutes)

### 10.1 Network Errors
- [ ] Network timeout
  - Test: Disable network, try to load page
  - Verify: Timeout message (not infinite spinner)
  - Verify: Retry button available
- [ ] Partial network failure
  - Test: Slow API endpoint
  - Verify: Timeout after reasonable delay
  - Verify: User can retry
- [ ] API errors (500, 503)
  - Test: Mock server error
  - Verify: User-friendly error message (not raw JSON)
  - Verify: No sensitive error details leaked

### 10.2 Edge Cases
- [ ] Empty states
  - Test: Project with 0 species
  - Verify: Message shown (not blank or error)
  - Test: SDM run with 0 results
  - Verify: Handled gracefully
- [ ] Boundary values
  - Test: 0 coordinates
  - Test: Latitude 90.0, Longitude 180.0
  - Test: Occurrence count = 1
  - Verify: All handled without crash
- [ ] Concurrent operations
  - Test: Rapidly edit same record from 2 tabs
  - Verify: Last write wins (or conflict handling)
  - Test: Delete record while viewing it
  - Verify: Graceful handling (error or auto-redirect)
- [ ] Special characters
  - Test: Species name with accents: "Jaguar (Panthera onça)"
  - Test: Emoji in comments
  - Verify: Displayed correctly (not corrupted)

### 10.3 Race Conditions
- [ ] Create then immediately view
  - Test: Create record, navigate to it before sync completes
  - Verify: Record visible (real-time updates or handled gracefully)
- [ ] Delete then access
  - Test: Delete record from tab A, try to access from tab B
  - Verify: Tab B shows "not found" (not stale data)

---

## Phase 11: Accessibility (10 minutes)

### 11.1 Keyboard Navigation
- [ ] Tab through buttons
  - Test: Press Tab to navigate
  - Verify: Focus visible (outline or highlight)
  - Verify: Logical tab order (not jumps)
- [ ] Form submission
  - Test: Fill form, press Enter to submit
  - Verify: Works (not just click)
- [ ] Modal dialogs
  - Test: Open modal, Tab through fields
  - Verify: Focus doesn't escape modal
  - Test: Press Escape
  - Verify: Modal closes

### 11.2 Screen Reader
- [ ] Headings
  - Test: H1, H2, H3 hierarchy
  - Verify: Logical structure (not H1 → H3 jump)
- [ ] Alt text
  - Test: Check images for alt text
  - Verify: Descriptive (not "image" or empty)
- [ ] Labels
  - Test: Form inputs have labels
  - Verify: Associated via `for` attribute or nesting
- [ ] ARIA attributes
  - Test: Modals have role="dialog"
  - Test: Status messages have role="status" or "alert"

### 11.3 Color Contrast
- [ ] Text contrast
  - Test: Use WCAG contrast checker
  - Verify: AA standard minimum (4.5:1 for normal text)
  - Test: Light text on light background
  - Verify: Adequate contrast
- [ ] Focus indicators
  - Test: Focus is visible on buttons/links
  - Verify: Not just color-dependent (use outline)

---

## Phase 12: Mobile Responsiveness (10 minutes)

### 12.1 Layout
- [ ] Desktop view
  - Test: View at 1920x1080
  - Verify: Layout optimal (not wasted space)
- [ ] Tablet view
  - Test: View at 768x1024
  - Verify: Layout adapts (stacked or adjusted)
  - Verify: Buttons clickable (not too small)
- [ ] Mobile view
  - Test: View at 375x667 (iPhone SE)
  - Verify: Single column layout
  - Verify: Hamburger menu for navigation
  - Verify: All content accessible (no horizontal scroll)
- [ ] Landscape mobile
  - Test: Rotate to landscape
  - Verify: Layout adjusts (not just squished)

### 12.2 Touch interactions
- [ ] Buttons
  - Test: Tap buttons on touch device
  - Verify: Responsive (not laggy)
  - Verify: No accidental double-taps
- [ ] Input fields
  - Test: Tap on input fields
  - Verify: Keyboard appears
  - Verify: Field not covered by keyboard
- [ ] Maps
  - Test: Pinch to zoom
  - Test: Swipe to pan
  - Verify: Intuitive and responsive

---

## Phase 13: Code Quality Review Checklist

### 13.1 Frontend Code (React/JSX)
- [ ] Component structure
  - Are components small and focused (<200 lines)?
  - Do they have clear responsibilities?
  - Are prop types documented?
- [ ] State management
  - Is useState used for local component state?
  - Is useQuery used for server state?
  - No lifting state unnecessarily high?
- [ ] Hooks usage
  - Are hooks called at top level (not conditional)?
  - useEffect has proper dependency arrays?
  - No infinite loops in useEffect?
- [ ] Performance
  - Are React.memo or useMemo used where needed?
  - No unnecessary re-renders?
  - Images lazy-loaded?
- [ ] Error handling
  - Try/catch blocks on async operations?
  - User-friendly error messages?
  - Error boundaries for component crashes?
- [ ] Code style
  - Consistent naming conventions?
  - No console.log statements (should be removed or conditional)?
  - Proper formatting/indentation?
- [ ] Imports
  - No circular imports?
  - Unused imports removed?
  - Correct import paths (@/ vs relative)?

### 13.2 Backend Functions (Deno/JavaScript)
- [ ] Function structure
  - Clear parameter validation?
  - Proper error handling (try/catch)?
  - Logging for debugging?
- [ ] Database queries
  - Using prepared statements (no SQL injection)?
  - Indexes on frequently queried fields?
  - Efficient filters (not fetching all, then filtering)?
- [ ] External API calls
  - Timeout handling?
  - Rate limiting respected?
  - Error messages logged?
- [ ] Security
  - Checking user authentication (me())?
  - Validating authorization (role checks)?
  - No sensitive data in logs?
- [ ] Code quality
  - No hardcoded values (use env vars)?
  - Consistent error response format?
  - Comments for complex logic?

### 13.3 CSS/Tailwind
- [ ] Class usage
  - No hardcoded colors (use design tokens)?
  - Consistent spacing scale?
  - No duplicate styles?
- [ ] Responsive design
  - Mobile-first approach?
  - Breakpoints used correctly (sm:, md:, lg:)?
  - No horizontal scrolling on mobile?
- [ ] Accessibility
  - Focus states visible?
  - Color not only distinguisher?

---

## Phase 14: Bug Hunting Checklist

### Things to Test Specifically
- [ ] Rapid clicking buttons (does it double-submit or create duplicates?)
- [ ] Switching tabs rapidly (does data sync correctly?)
- [ ] Offline mode (does app gracefully degrade?)
- [ ] Very long inputs (does text field overflow?)
- [ ] Special characters in inputs (Unicode, emoji, &lt;, &gt;, &amp;)
- [ ] Uploading very large files (does progress bar work?)
- [ ] Canceling operations mid-way (is cleanup done?)
- [ ] Navigating away during async operation (is memory cleaned up?)
- [ ] Timezone edge cases (users in different timezones)
- [ ] Currency/number formatting (are decimals correct?)
- [ ] Date handling (leap years, DST, Y2K-style issues?)
- [ ] Sorting/filtering (is order consistent?)
- [ ] Pagination (does page 1 → page 2 → page 1 work?)
- [ ] Search (typos, empty query, special chars?)
- [ ] Bulk operations (edit 100 records at once?)

---

## Phase 15: User Journey Testing (Real Scenarios)

### Researcher Journey
1. Sign up as non-Bangor user (14-day trial)
2. Create project: "Lemur Population Study"
3. Import species data from GBIF (500 records)
4. Run data quality audit (check for outliers)
5. Run SDM model (MaxEnt, 3 species, 8 bioclimatic vars)
6. Monitor progress through completion
7. View results (metrics, map, importance chart)
8. Generate PDF report
9. Invite colleague as Editor
10. Colleague views and comments on results
11. Upgrade to Pro (Day 12 of trial)
12. Run Ensemble model
13. View climate scenario (RCP 4.5)
14. Export results
15. Cancel subscription and drop to Free or keep subscription

### NGO Journey
1. Sign up with 5 team members (Pro tier)
2. Create conservation project
3. Import occurrence data (custom CSV + GBIF)
4. Run SDM for target species
5. Invite team members (mix of Viewers and Editors)
6. Generate threat assessment report
7. Share with stakeholders
8. Update data based on feedback
9. Run follow-up model
10. Export for publication

### Government Agency Journey
1. Setup organization with 10 users (Pro tier)
2. Bulk import species monitoring data
3. Run SDM for threatened species
4. Use API to integrate with internal GIS system
5. Schedule automated monthly report generation
6. Archive completed project
7. Start new monitoring program

---

## Reporting Issues Found

### For Each Bug, Document:
- **Title**: Clear, concise name
- **Severity**: Critical (blocks workflow) / High (major issue) / Medium (inconvenient) / Low (cosmetic)
- **Steps to Reproduce**: Exact steps I took
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happened
- **Screenshots/Video**: If visual
- **Browser/Device**: Chrome, Firefox, Safari, mobile, etc.
- **Logs**: Console errors, network errors

### Format Example:
```
TITLE: Species search times out on slow network
SEVERITY: High
STEPS:
1. Throttle network to "Slow 3G" in DevTools
2. Go to SmartImport
3. Search for "Panthera leo"
4. Wait
EXPECTED: Shows results or timeout message after 30s
ACTUAL: Spinner forever, no timeout
BROWSER: Chrome 120, Windows 10
ERROR: (screenshot of network tab showing pending request)
```

---

## Summary

This plan covers:
- ✅ Authentication & account management
- ✅ Data import from all sources
- ✅ Photo processing & AI identification
- ✅ Data quality audits
- ✅ SDM pipeline full lifecycle
- ✅ Report generation
- ✅ Team collaboration
- ✅ Subscription & billing (trial → pro)
- ✅ Navigation & routing
- ✅ Performance & optimization
- ✅ Data validation & security
- ✅ Error handling & edge cases
- ✅ Accessibility
- ✅ Mobile responsiveness
- ✅ Code quality & reviews
- ✅ Real user journey scenarios

**Estimated Total Testing Time**: 3–5 hours (depending on depth)

**Permission**: Refactor, rewrite, and improve any code you find weak or buggy. All changes approved.

---

**Ready to test? Let me know what you find!**