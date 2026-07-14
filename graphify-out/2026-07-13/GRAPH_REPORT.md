# Graph Report - Y:\proyects\socialproofreel  (2026-07-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 319 nodes · 393 edges · 35 communities (26 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5ba78680`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SettingsClient.tsx
- supabase
- compilerOptions
- devDependencies
- dependencies
- BotDashboardClient.tsx
- CrmClient.tsx
- EditorClient.tsx
- page.tsx
- LeadDetail.tsx
- render_remotion.py
- page.tsx
- VideoTemplate.tsx
- page.tsx
- actions.ts
- DashboardNav.tsx
- search-twenty.js
- layout.tsx
- search-both.js
- upload_raw_leads.mjs
- route.ts
- actions.ts
- PlayerPreview.tsx
- page.tsx
- check-rls.js
- migrate_mitigation.js
- test-query.js
- eslint.config.mjs
- next.config.mjs
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `supabase` - 16 edges
2. `compilerOptions` - 16 edges
3. `getBotStatsAndHistory()` - 7 edges
4. `include` - 7 edges
5. `fetchCrmData()` - 7 edges
6. `getBotStatus()` - 6 edges
7. `getServiceSupabase()` - 5 edges
8. `BotDashboardClient()` - 5 edges
9. `getServiceSupabase()` - 5 edges
10. `useTemplate()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `SettingsClientProps` --references--> `Settings`  [EXTRACTED]
  app/dashboard/settings/SettingsClient.tsx → lib/types.ts
- `DescartadosPage()` --calls--> `fetchCrmData()`  [EXTRACTED]
  app/dashboard/crm/descartados/page.tsx → app/dashboard/crm/crm-loader.ts
- `CrmPage()` --calls--> `fetchCrmData()`  [EXTRACTED]
  app/dashboard/crm/page.tsx → app/dashboard/crm/crm-loader.ts
- `PipelinePage()` --calls--> `fetchCrmData()`  [EXTRACTED]
  app/dashboard/crm/pipeline/page.tsx → app/dashboard/crm/crm-loader.ts
- `LeadForm()` --calls--> `addLeadAction()`  [EXTRACTED]
  app/dashboard/leads/LeadForm.tsx → app/actions/leads.ts

## Import Cycles
- None detected.

## Communities (35 total, 9 thin omitted)

### Community 0 - "SettingsClient.tsx"
Cohesion: 0.10
Nodes (19): updateSettingsAction(), quickLinks, EditorSidebar(), SettingsClient(), SettingsClientProps, defaultConfig, TemplateConfig, TemplateContext (+11 more)

### Community 1 - "supabase"
Cohesion: 0.09
Nodes (16): fetchContactData(), POST(), ESTADOS, Lead, OutreachRecord, formatDate(), QueueClient(), QueueClientProps (+8 more)

### Community 2 - "compilerOptions"
Cohesion: 0.06
Nodes (30): ./*, dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts (+22 more)

### Community 3 - "devDependencies"
Cohesion: 0.07
Nodes (26): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+18 more)

### Community 4 - "dependencies"
Cohesion: 0.11
Nodes (19): date-fns, lightningcss-win32-x64-msvc, next, dependencies, date-fns, lightningcss-win32-x64-msvc, next, react (+11 more)

### Community 5 - "BotDashboardClient.tsx"
Cohesion: 0.32
Nodes (12): getBotStatsAndHistory(), getBotStatus(), getChileMidnight(), getServiceSupabase(), OutreachHistoryItem, requestBotRestart(), toggleScheduler(), BotDashboardClient() (+4 more)

### Community 6 - "CrmClient.tsx"
Cohesion: 0.21
Nodes (8): fetchCrmData(), CrmClientProps, RawLeadItem, Stats, WhatsAppOutreachButtonProps, DescartadosPage(), CrmPage(), PipelinePage()

### Community 7 - "EditorClient.tsx"
Cohesion: 0.14
Nodes (7): DEFAULT_BUSINESS, DEFAULT_EFFECTS, DEFAULT_ORDER, hintStyle, inputStyle, PlayerComponent, metadata

### Community 8 - "page.tsx"
Cohesion: 0.33
Nodes (9): getGeneralTemplates(), getServiceSupabase(), saveGeneralTemplates(), saveQueue(), availableLeadsFilter(), QueuePage(), LeadItem, QueueClient() (+1 more)

### Community 9 - "LeadDetail.tsx"
Cohesion: 0.24
Nodes (9): DEFAULT_TEMPLATES, ESTADOS, formatDateTime(), LeadDetail(), LeadDetailProps, MessageTemplate, OutreachRecord, replacePlaceholders() (+1 more)

### Community 10 - "render_remotion.py"
Cohesion: 0.27
Nodes (9): get_image_base64(), get_latest_config(), normalize_supabase_config(), render_remotion.py — SocialProofREEL Worker ===================================, Renders the video for the given lead directory using Remotion., Reads an image file and converts it to a base64 Data URL., Translates the Supabase settings schema into the VideoTemplateConfig schema, Fetches the latest config from the Supabase 'settings' table. (+1 more)

### Community 11 - "page.tsx"
Cohesion: 0.39
Nodes (4): addLeadAction(), generateVideoTaskAction(), LeadForm(), TriggerButton()

### Community 12 - "VideoTemplate.tsx"
Cohesion: 0.22
Nodes (7): BusinessNameConfig, ComponentItem, EffectsConfig, ReviewItem, VideoTemplateConfig, VideoTemplateMetadata, VideoTemplateProps

### Community 13 - "page.tsx"
Cohesion: 0.32
Nodes (5): generateMetadata(), getLeadBySlug(), VideoPage(), VideoPageProps, VideoLandingClientProps

### Community 14 - "actions.ts"
Cohesion: 0.60
Nodes (5): getServiceSupabase(), updateLeadContactData(), updateLeadMessageOverride(), updateLeadScore(), updateLeadStatus()

### Community 16 - "search-twenty.js"
Cohesion: 0.33
Nodes (4): crmResults, fs, path, workerResults

### Community 17 - "layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 18 - "search-both.js"
Cohesion: 0.40
Nodes (3): fs, path, results

### Community 19 - "upload_raw_leads.mjs"
Cohesion: 0.40
Nodes (3): __dirname, __filename, supabase

### Community 20 - "route.ts"
Cohesion: 0.67
Nodes (3): execAsync, POST(), supabase

### Community 21 - "actions.ts"
Cohesion: 0.83
Nodes (3): getEditorTemplates(), getServiceSupabase(), saveEditorTemplate()

## Knowledge Gaps
- **126 isolated node(s):** `BotStatus`, `BotDashboardClientProps`, `LeadItem`, `QueueClientProps`, `metadata` (+121 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase` connect `supabase` to `SettingsClient.tsx`, `page.tsx`, `page.tsx`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `BotStatus`, `BotDashboardClientProps`, `LeadItem` to the rest of the system?**
  _131 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SettingsClient.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09848484848484848 - nodes in this community are weakly interconnected._
- **Should `supabase` be split into smaller, more focused modules?**
  _Cohesion score 0.0907258064516129 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._