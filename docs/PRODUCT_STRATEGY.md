# TeamPulse — Product & SaaS Strategy

> Working notes on scope, differentiation, and the path to SaaS revenue.
> Captured to revisit later. Not a commitment — a thesis to pressure-test.

---

## Where the product is today

A genuinely differentiated **core**: anonymous, *tactile* continuous peer feedback
(the kanban board beats forms), now with:
- Priorities lane + objectives, evidence (text/links) per note
- AI cycle summaries (Groq), feedback cycles, analytics
- Team/workspace roles (admin, team lead), member management
- Moderation: AI screening on submit (block/flag) + reveal-on-report (audit-logged)
- Activity log (admin + lead see author → recipient, by date)
- Realtime board, auto-join, Google sign-in

**Reality check:** "anonymous feedback board" is a strong *wedge*, not a company.
To be a killer SaaS it must climb the value ladder:
**fun peer tool → manager decision-support → HR/People system of record.**
The buyer and the budget live higher up that ladder.

---

## The strategic fork to decide first: the anonymity model

Positioning hinges on this, and we currently have BOTH "anonymity-first" and a
"leads see everything" activity log — in tension. Make it a **configurable
workspace policy** and pick a default:

- **Candor engine** (lean anonymous) → best feedback quality + trust; harder to
  tie to formal performance.
- **Performance/360** (attributed) → bigger budgets; competes head-on with
  Lattice / 15Five / Leapsome.

**Recommendation:** anonymous-by-default with admin-configurable attribution;
**lead-level de-anonymization OFF by default** (it quietly kills upward candor).
Sell *candor* as the moat. Treat anonymity as a legal/trust surface (disclosure,
minimum-team-size guardrails).

---

## Killer differentiators to lean into (moat = AI + anonymity)

1. **AI Growth Coach (longitudinal).** Move beyond one-shot summaries: track
   themes per person across cycles, detect trends, draft concrete development
   plans. The retention hook.
2. **Manager 1:1 / review prep.** Auto-generate talking points + a draft review
   from a person's feedback. Managers are the champion buyer — save them hours.
3. **Write-time AI coaching.** Nudge vague/harsh feedback toward specific +
   constructive. Raises data quality that powers everything else.
4. **Org-level culture analytics.** Team/department sentiment, eNPS, theme
   heatmaps, attrition-risk flags. The dashboard that justifies an HR line-item.

---

## SaaS monetization must-builds (table stakes — not built yet)

- **Stripe billing + plans + seat management** (self-serve checkout, trials, per-seat).
- **Real onboarding/invites** — invite flow is currently a STUB; PLG growth is
  impossible without frictionless team invites. (Biggest current growth blocker.)
- **Slack / MS Teams app** — give/receive feedback + digests in-flow. Biggest
  adoption + stickiness lever for this category.
- **Email engine** (Resend/SendGrid): digests, reminders, cycle nudges → drives
  the engagement retention depends on.
- **SSO / SAML + SCIM** — enterprise gate; unlocks 5–10× ACV.
- **Security/compliance**: audit log (started), data export, GDPR/DPA, retention
  controls, SOC 2 path.

---

## Roadmap mapped to revenue

| Phase | Build | Why it makes money |
|---|---|---|
| **Now (be sellable)** | Stripe billing, real invites/onboarding, email digests, configurable anonymity policy | Can't charge or grow virally without these |
| **Next (differentiate + retain)** | Slack/Teams app, AI Growth Coach, Manager 1:1 prep, write-time coaching | Daily active use + manager love = low churn |
| **Later (move upmarket)** | Structured 360 review campaigns, goals/OKR linkage, org culture analytics, SSO/SCIM, audit/export | Bigger ACV, HR buyer, enterprise deals |

---

## Pricing to test

- **Free** — 1 team, limited history (growth loop).
- **Team ~$6–8/user/mo** — full board, AI summaries, cycles, analytics.
- **Business ~$12–15/user/mo** — 360 campaigns, manager tools, Slack/Teams, advanced analytics.
- **Enterprise (custom)** — SSO/SCIM, audit, DPA, SLA, retention controls.

Anchor value on **AI + manager time saved**, not "feedback notes."

---

## Hard truths

- **Crowded market** (Lattice, 15Five, Leapsome, Culture Amp, Officevibe, Matter,
  Bonusly). Win by being **sharp on an ICP** — bet: *remote/hybrid eng & product
  teams at 20–200-person startups* wanting continuous candor without heavyweight
  HR suites. Don't be a cheaper everything-tool.
- **Invite flow being a stub is the #1 growth blocker** right now.
- **AI is the only durable moat** — the board is copyable; longitudinal AI
  coaching + culture intelligence compounds with data and isn't.
- **Anonymity is a legal/trust surface** — get policy, disclosure, and
  minimum-team-size guardrails right before selling.

---

## Highest-leverage next move

**Self-serve growth + monetization loop:** real invites → Slack app → Stripe
billing. Turns a demo into a product people can adopt and we can charge for.
Differentiation (AI coach, 360s) compounds *after* teams can get in and be billed.

**Two candidate starting points when we resume:**
1. **Growth path:** fix invite/onboarding flow + email digests.
2. **Moat path:** AI Growth Coach (longitudinal per-person insights).
