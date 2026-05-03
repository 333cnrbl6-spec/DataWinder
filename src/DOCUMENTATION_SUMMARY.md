# DataWinder Documentation Suite — May 2026
## Complete Reference Index

This document indexes all DataWinder user and product documentation, updated to reflect the current build stage (May 2026).

---

## Documentation Files Overview

### 1. **DATAWINDER_USER_ONBOARDING_GUIDE.md** ⭐ START HERE
**Audience**: New users (researchers, academics, professionals)  
**Length**: ~15 pages  
**Contents**:
- Account setup & tier detection
- First project creation
- Data import (4 methods)
- Data quality checks
- Running SDM models
- Interpreting results
- Report generation
- Team collaboration
- Upgrade/downgrade guides
- Best practices & tips
- Troubleshooting

**When to Read**: Within first 5 minutes of signup

---

### 2. **FEATURES_COMPREHENSIVE_GUIDE.md** 📚 REFERENCE
**Audience**: Users wanting detailed feature documentation  
**Length**: ~20 pages  
**Contents**:
- Complete feature breakdown (Module 1–8)
- Step-by-step how-to for each feature
- Availability by tier (Free/Trial/Pro)
- Feature matrices and tables
- Metric interpretations
- Advanced options
- API documentation (Pro)

**When to Read**: When learning a specific feature or module

---

### 3. **COMMERCIAL_LAUNCH_README.md** 💼 BUSINESS
**Audience**: Product managers, support staff, operations  
**Length**: ~8 pages  
**Contents**:
- What's live (Free Academic, Trial, Pro tiers)
- Pricing and features per tier
- Technical implementation (user entity fields, functions)
- Stripe integration setup
- Email automation schedule
- Support SLA by tier
- Troubleshooting guide
- Monitoring & operations

**When to Read**: Before launch, for onboarding support staff

---

### 4. **FEATURES_COMPREHENSIVE_GUIDE.md** (this file)
**Complete inventory of all features with tier availability**

---

## Product Summary

### What DataWinder Does
DataWinder is a cloud-based platform for species distribution modeling (SDM), biodiversity data integration, and conservation analysis. Users search IUCN/GBIF/iNaturalist/SpeciesLink, validate occurrence data, run MaxEnt models, and generate publication-ready reports—all without software installation or technical expertise.

### Core Differentiators
1. **Unified Workflow**: Integrated search, validation, modeling, reporting (no tool-switching)
2. **AI-Powered QA**: Auto-detects duplicates, outliers, taxonomy mismatches
3. **Multi-Source Integration**: IUCN, GBIF, iNaturalist, SpeciesLink in one search
4. **Cloud-Native**: No local setup, runs on any device with a browser
5. **Publication-Ready**: Generates reports suitable for peer-reviewed journals
6. **Collaborative**: Real-time team workspaces, version history, audit trails

---

## Tier Comparison

| Feature | Free Academic | Trial (14d) | Pro |
|---------|---------------|------------|-----|
| Cost | £0 forever | £0 trial | £99/mo |
| Projects | 5 | Unlimited | Unlimited |
| Occurrences | 1,000/mo | Unlimited | Unlimited |
| MaxEnt | ✅ | ✅ | ✅ |
| Ensemble | ❌ | ✅ | ✅ |
| Climate Scenarios | Current only | 4 futures | 4 futures |
| Photo AI ID | Manual | ✅ | ✅ |
| Reports | Simple | Full | Full + CSV |
| Team | 5 | Unlimited | Unlimited |
| API | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ 24h |

---

## User Journeys

### Academic Researcher (Free Tier, @bangor.ac.uk)
1. Sign up → Auto-assigned Free tier
2. Create project (conservation ecology research)
3. Search GBIF for species occurrence data
4. Run MaxEnt model (no charge)
5. Generate report for thesis/publication
6. Invite 2 collaborators (5-person limit)
7. Export results to CSV

**Cost**: £0 forever  
**Time to First Model**: ~30 minutes

---

### Professional Consultant (Trial → Pro)
1. Sign up → 14-day trial begins
2. Create project (client impact assessment)
3. Import client CSV + IUCN range data
4. Run ensemble model (to compare methods)
5. Project to 3 climate futures (RCP 2.6/4.5/8.5)
6. Generate publication-quality report
7. Day 12: Receives "3 days left" email
8. Day 14: Upgrades to Pro (£99/mo)
9. Continues with unlimited projects

**Cost**: £99/month after trial  
**ROI**: Saves 2–3 weeks vs. manual QGIS/MaxEnt workflow

---

### Government Agency (Pro Enterprise)
1. Bulk signup: 10 researchers on Pro tier
2. Create shared projects
3. Assign roles (editors, viewers)
4. Import national species database (CSV)
5. Run 50+ models for threat assessment
6. Generate reports for Natural England
7. Use API to integrate with internal dashboards

**Cost**: £990/year per person (or custom enterprise pricing)  
**Time Savings**: 60%+ vs. traditional GIS workflow

---

## Customer Support

### Tier-Based SLA
| Tier | Email Response | Channel |
|------|----------------|---------|
| Free Academic | 48–72h | support@datawinder.app |
| Trial | 24h | support@datawinder.app |
| Pro | 24h | support@datawinder.app (priority) |

### Support Resources
1. **FAQ Bot** (in-app): AI answers common questions
2. **Community Forum** (in-app): Peer-to-peer support
3. **Email**: support@datawinder.app
4. **Documentation**: This suite of guides

---

## Key Messaging by Audience

### For Academics/Researchers
> **"All your biodiversity data in one place. Run publication-ready models in hours, not weeks. Free forever for university researchers."**

Features to highlight:
- Multi-source search (IUCN, GBIF, iNaturalist)
- Data quality automation
- Climate scenario projections
- Publication-ready reports
- Free tier for universities

---

### For Conservation NGOs
> **"Unified workflow from field data to conservation planning. Collaborate with your team in real-time. No software installation. No IT overhead."**

Features to highlight:
- Team collaboration
- Custom file import
- Threat assessment module
- Report generation
- Email support (priority for Pro)

---

### For Government Agencies
> **"Enterprise-grade species distribution modeling. API integration with your systems. Unlimited team and projects. Dedicated support."**

Features to highlight:
- REST API for integrations
- Unlimited users
- Custom enterprise pricing
- Compliance & audit trails
- Priority support

---

### For Environmental Consultancies
> **"Faster project delivery. Better science. Lower overhead. SDM results in days, not months."**

Features to highlight:
- Climate scenario projections
- Ensemble methods
- Advanced analytics
- Report templates
- API for automation

---

## Pricing Strategy

### Free Academic (Bangor University)
- **Goal**: Build academic user base, generate word-of-mouth
- **Conversion Path**: Academics who expand work → Pro trial → Pro subscription

### Trial (14 days, all features)
- **Goal**: Let users experience full Pro functionality, reduce conversion friction
- **Conversion Rate Target**: 10–20% of trial users → Pro subscription

### Pro (£99/month or £990/year)
- **Target Customers**: Professional researchers, NGOs, government agencies
- **Annual Savings**: 17% (£990/year = 2 months free vs. £1,188 monthly)

---

## Launch Checklist

### Pre-Launch ✅
- [x] Features coded and tested
- [x] Free Academic tier active
- [x] Trial detection (14-day countdown) working
- [x] Stripe integration ready
- [x] Documentation complete
- [x] Support email configured

### Launch Day
- [ ] Announce availability on Landing page
- [ ] Enable Pricing page
- [ ] Notify beta testers
- [ ] Monitor support email for issues
- [ ] Track signup rate

### Week 1
- [ ] Monitor trial conversion rate
- [ ] Gather user feedback
- [ ] Fix any critical bugs
- [ ] Respond to support tickets

### Month 1
- [ ] Analyze user behavior (which features used most?)
- [ ] Track MRR (monthly recurring revenue)
- [ ] Identify churn reasons (if any)
- [ ] Plan next features based on feedback

---

## Roadmap Status

### Q2 2026 (Live Now) ✅
- [x] Version 1.0 release
- [x] Free Academic + Pro tiers
- [x] MaxEnt SDM modeling
- [x] Multi-source data integration
- [x] Climate scenario projections
- [x] AI data quality checks
- [x] Publication-ready reports
- [x] Team collaboration

### Q3 2026 (Planned)
- [ ] Ensemble modeling
- [ ] Advanced threat assessment module
- [ ] Occupancy-habitat modeling
- [ ] Phylogenetic filtering tools

### Q4 2026 (Planned)
- [ ] Full REST API & webhooks
- [ ] Zapier/IFTTT integrations
- [ ] White-label enterprise edition

### Q1 2027+ (Planned)
- [ ] Mobile app (iOS/Android)
- [ ] Real-time field survey sync
- [ ] Journal manuscript integration

---

## Frequently Updated Content

### Documentation That Changes Often
- **Landing page**: As new features release
- **Pricing page**: If tier costs/features change
- **ProductOverview**: Update roadmap quarterly
- **COMMERCIAL_LAUNCH_README.md**: Track monthly revenue/metrics
- **FEATURES_COMPREHENSIVE_GUIDE.md**: When new features launch

### Documentation That Rarely Changes
- **Terms of Service**: Only if legal/policy changes
- **Privacy Policy**: Only if data handling changes
- **User Onboarding Guide**: Stable core content, update for new features

---

## How to Use This Documentation Suite

### For Product Team
1. Read **COMMERCIAL_LAUNCH_README.md** (business operations)
2. Reference **FEATURES_COMPREHENSIVE_GUIDE.md** (inventory for marketing/sales)
3. Monitor roadmap against actual feature releases

### For Support Team
1. Start with **DATAWINDER_USER_ONBOARDING_GUIDE.md** (learn the product)
2. Keep **FEATURES_COMPREHENSIVE_GUIDE.md** handy (reference during support tickets)
3. Use FAQ Bot and Community Forum to crowdsource answers

### For Sales/Marketing
1. **FEATURES_COMPREHENSIVE_GUIDE.md** (what to pitch)
2. **Pricing Page** (tier benefits)
3. **Landing Page** (messaging and CTAs)
4. **ProductOverview PDF** (shareable one-pager for prospects)

### For New Users
1. **DATAWINDER_USER_ONBOARDING_GUIDE.md** (start here)
2. **FEATURES_COMPREHENSIVE_GUIDE.md** (when ready for advanced topics)
3. **FAQ Bot** (quick answers)
4. **Email support** (stuck? contact us)

---

## Contact & Updates

### Questions About Documentation?
- Email: documentation@datawinder.app

### Report Bugs or Suggest Updates?
- Use Feedback button in app
- Email: support@datawinder.app

### Last Updated
- **Date**: May 2026
- **Version**: 1.0 Launch
- **Next Review**: June 2026 (post-launch feedback)

---

**DataWinder Documentation Suite — Comprehensive, Current, and Ready to Go.**

*Built for conservation. Designed for researchers. Documented for success.*