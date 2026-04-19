# 🏛️ Portfolio Compliance & AI Processing Standards

**Date:** April 2026  
**Applies to:** All Portfolio Apps (DataWinder, Species Explorer, Premiso, CharityHub, CaseNarrative)  
**Status:** MANDATORY

---

## CRITICAL ARCHITECTURE MANDATE

Every app in this portfolio MUST:
1. ✅ Work 100% standalone — no shared services, no cross-app dependencies
2. ✅ Be independently saleable at any point (franchise model)
3. ✅ Follow identical compliance and AI processing patterns for consistency
4. ✅ Preserve all existing functionality while adding new features

---

## AI MODEL SELECTION — BEST-IN-CLASS FOR EACH USE CASE

Use the following models for InvokeLLM calls (higher quality = more credits, but worth it for compliance):

| Model | Use Case | Credit Cost |
|-------|----------|-------------|
| `claude_sonnet_4_6` | **Default** for professional document generation (legal, property, conservation, charity) | Medium |
| `claude_opus_4_6` | Complex multi-document analysis, compliance audits, risk assessments | High |
| `gemini_3_1_pro` | When web search context is needed (`add_context_from_internet: true`) | Medium |
| `automatic` | Simple tasks, internal classifications, non-critical summaries | Low |

**NEVER** use `automatic` for:
- Compliance documents
- Legal notices
- Regulatory filings
- Safety certifications

---

## UNIVERSAL AI DOCUMENT INTELLIGENCE PATTERN

Every app MUST implement this exact pattern for document processing:

```javascript
const { data } = await base44.integrations.Core.InvokeLLM({
  model: "claude_sonnet_4_6", // Always specify for compliance docs
  prompt: `You are a biodiversity conservation compliance expert. Process this species data report for DataWinder.
  Extract: species identifiers, occurrence counts, geographic coordinates, conservation status
  Validate: IUCN Red List compliance, GBIF data standards, coordinate validity
  Flag: endangered species exposure, location data sensitivity, data quality issues
  Output structured JSON with confidence scores.`,
  response_json_schema: {
    type: "object",
    properties: {
      extracted_data: { type: "object" },
      compliance_status: { type: "string", enum: ["compliant", "review_required", "non_compliant"] },
      risk_flags: { type: "array", items: { type: "string" } },
      confidence_score: { type: "number", minimum: 0, maximum: 1 },
      recommended_actions: { type: "array", items: { type: "string" } }
    },
    required: ["extracted_data", "compliance_status", "confidence_score"]
  }
});
```

---

## UNIVERSAL FILE UPLOAD & AI SORTING PATTERN

Every app MUST support ALL file types with automatic AI classification:

```javascript
// 1. Upload file (any type: pdf, docx, xlsx, csv, jpg, png, etc.)
const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadedFile });

// 2. AI Parse & Sort (single universal pattern)
const { data } = await base44.integrations.Core.InvokeLLM({
  model: "claude_opus_4_6", // Best for complex document analysis
  prompt: `Analyse this uploaded file: ${file_url}
  File Type: [auto-detect]
  Content Type: [classify: research_paper/field_survey/conservation_report/species_list/technical_data]
  Extract: species names, occurrence data, geographic information, methodology details
  Validate: data completeness, coordinate validity, taxonomic accuracy
  Risk Level: [low/medium/high/critical] - based on data sensitivity
  Action Required: [none/review/immediate/block]`,
  response_json_schema: {
    type: "object",
    properties: {
      file_type: { type: "string" },
      content_category: { type: "string" },
      extracted_fields: { type: "object" },
      compliance_check: { type: "object" },
      risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
      action_required: { type: "string", enum: ["none", "review", "immediate", "block"] },
      auto_sort_destination: { type: "string" } // Which entity/folder this belongs in
    }
  }
});

// 3. Auto-route to correct entity based on AI classification
if (data.auto_sort_destination === "literature") {
  await base44.entities.Literature.create({ 
    ...data.extracted_fields, 
    file_url, 
    risk_level: data.risk_level 
  });
}
```

---

## UNIVERSAL COMPLIANCE CHECKLIST — EVERY APP MUST HAVE

Before ANY feature is marked complete, verify:

- [ ] **Data Protection:** All personal data encrypted at rest, GDPR-compliant storage
- [ ] **Audit Trail:** Every create/update/delete logged with timestamp + user email
- [ ] **Access Control:** Role-based permissions enforced (admin/user pattern)
- [ ] **Retention Policy:** Automated archival/deletion per UK regulations
- [ ] **Export Rights:** One-click data export for users (GDPR right to portability)
- [ ] **Error Handling:** Graceful failures, no sensitive data in error messages
- [ ] **Rate Limiting:** Prevent abuse on AI endpoints
- [ ] **File Validation:** Scan uploaded files, reject malicious content
- [ ] **Backup & Recovery:** Automated daily backups, tested restore procedure

---

## DOMAIN-SPECIFIC COMPLIANCE REQUIREMENTS

### DataWinder (Conservation Research)
- [ ] Natural England survey standards compliance
- [ ] Species location data protection (endangered species security)
- [ ] BTO/BTO recording guidelines adherence
- [ ] Data sharing agreements with conservation bodies
- [ ] IUCN Red List data usage compliance
- [ ] GBIF data standards adherence

### Species Explorer (Conservation)
- [ ] Natural England survey standards compliance
- [ ] Species location data protection (endangered species security)
- [ ] BTO/BTO recording guidelines adherence
- [ ] Data sharing agreements with conservation bodies

### Premiso (Property)
- [ ] UK Housing Act 2004 compliance (Section 21, EPC, Gas Safety)
- [ ] GDPR for tenant data, deposit protection scheme rules
- [ ] Right to Rent checks, HMO licensing requirements
- [ ] Landlord registration requirements per region

### CharityHub (Third Sector)
- [ ] Charity Commission reporting compliance
- [ ] Gift Aid eligibility checks, HMRC requirements
- [ ] GDPR for donor data, safeguarding policies
- [ ] Fundraising regulator code adherence

### CaseNarrative (Legal)
- [ ] SRA Code of Conduct compliance
- [ ] Limitation date tracking (critical — negligence risk)
- [ ] Client care letter requirements, costs transparency
- [ ] Data retention per legal practice rules

---

## TESTING & ACCEPTANCE CRITERIA

Every feature MUST pass:

1. **Functional Test:** Works as specified, no errors
2. **Compliance Test:** Meets domain-specific regulations
3. **Security Test:** No data leaks, proper auth checks
4. **Edge Case Test:** Handles empty states, invalid inputs gracefully
5. **Performance Test:** Loads in <2s, AI calls <10s
6. **User Test:** Clear UI, helpful error messages, onboarding included

---

## DEPLOYMENT SEQUENCE

1. Build feature in isolation (standalone app only)
2. Test against compliance checklist
3. Test with real user data (anonymised)
4. Document in that app's handover pack
5. Mark complete in App Rollout Workbench
6. Move to next feature

---

## PACKAGES TO USE (Already Installed)

- `base44.integrations.Core.InvokeLLM` — AI generation & parsing (supports `model` parameter)
- `base44.integrations.Core.UploadFile` — File upload (any type)
- `base44.integrations.Core.ExtractDataFromUploadedFile` — Structured extraction from files
- `recharts` — Analytics dashboards
- `html2canvas` + `jspdf` — PDF export
- `@stripe/react-stripe-js` — Subscription paywalls
- `framer-motion` — Smooth animations
- `sonner` — Toast notifications
- `lucide-react` — Icons

---

## FINAL DIRECTIVE

You are building enterprise-grade, compliance-first SaaS products. Every line of code must reflect:

- **Professional quality** — No shortcuts, no technical debt
- **Regulatory compliance** — Built-in, not bolted on
- **User trust** — Transparent, secure, reliable
- **Commercial viability** — Ready to sell at any point

**Begin implementation now. Report progress after each feature. Flag any compliance concerns immediately.**