<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FMIS — Financial Management & Intelligence System</title>
    <meta name="description" content="Production-grade Financial Management and Intelligence System. Manage transactions, approvals, invoices, budgets and analytics in one unified platform.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --primary: #3B82F6;
            --primary-dark: #1D4ED8;
            --accent: #10B981;
            --accent-dark: #059669;
            --bg: #030712;
            --surface: #0F172A;
            --surface2: #1E293B;
            --border: rgba(255,255,255,0.07);
            --text: #F1F5F9;
            --muted: #94A3B8;
            --radius: 16px;
        }

        html { scroll-behavior: smooth; }
        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg);
            color: var(--text);
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
        }

        /* ── BACKGROUND MESH ── */
        .bg-mesh {
            position: fixed; inset: 0; z-index: 0; pointer-events: none;
            background:
                radial-gradient(ellipse 80% 50% at 20% 10%, rgba(59,130,246,0.12) 0%, transparent 60%),
                radial-gradient(ellipse 60% 40% at 80% 80%, rgba(16,185,129,0.10) 0%, transparent 60%),
                radial-gradient(ellipse 50% 50% at 50% 50%, rgba(99,102,241,0.06) 0%, transparent 70%);
        }

        /* ── GRID LINES ── */
        .bg-grid {
            position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.25;
            background-image: linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px);
            background-size: 64px 64px;
        }

        /* ── NAV ── */
        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 16px 40px;
            display: flex; align-items: center; justify-content: space-between;
            background: rgba(3,7,18,0.7);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border);
        }
        .nav-brand { display: flex; align-items: center; gap: 12px; text-decoration: none; }
        .nav-logo {
            width: 36px; height: 36px; border-radius: 10px;
            background: linear-gradient(135deg, var(--primary), var(--accent));
            display: flex; align-items: center; justify-content: center;
            font-weight: 800; font-size: 16px; color: #fff;
        }
        .nav-title { font-size: 18px; font-weight: 700; color: var(--text); }
        .nav-links { display: flex; align-items: center; gap: 8px; }
        .nav-link {
            padding: 8px 16px; border-radius: 8px; text-decoration: none;
            font-size: 14px; font-weight: 500; color: var(--muted);
            transition: color .2s, background .2s;
        }
        .nav-link:hover { color: var(--text); background: rgba(255,255,255,0.06); }
        .nav-cta {
            padding: 9px 20px; border-radius: 8px; text-decoration: none;
            font-size: 14px; font-weight: 600; color: #fff;
            background: linear-gradient(135deg, var(--primary), #6366F1);
            transition: opacity .2s, transform .2s;
        }
        .nav-cta:hover { opacity: .9; transform: translateY(-1px); }

        /* ── HERO ── */
        .hero {
            position: relative; z-index: 1;
            min-height: 100vh;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            padding: 120px 24px 80px;
            text-align: center;
        }
        .hero-badge {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 6px 16px; border-radius: 9999px;
            background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.3);
            font-size: 13px; font-weight: 500; color: #93C5FD;
            margin-bottom: 32px; cursor: default;
        }
        .hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.3)} }

        .hero h1 {
            font-size: clamp(2.8rem, 7vw, 5.5rem);
            font-weight: 900; line-height: 1.05; letter-spacing: -0.03em;
            margin-bottom: 24px;
        }
        .hero h1 .gradient-text {
            background: linear-gradient(135deg, #60A5FA, #34D399, #818CF8);
            background-clip: text; -webkit-background-clip: text; color: transparent;
            background-size: 200% 200%; animation: gradientShift 4s ease infinite;
        }
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }

        .hero p {
            max-width: 640px; margin: 0 auto 40px;
            font-size: clamp(1rem, 2vw, 1.2rem);
            line-height: 1.7; color: var(--muted);
        }
        .hero-actions { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }
        .btn-hero {
            padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 600;
            text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
            transition: all .25s;
        }
        .btn-primary-hero {
            background: linear-gradient(135deg, var(--primary), #6366F1);
            color: #fff; box-shadow: 0 4px 30px rgba(59,130,246,0.35);
        }
        .btn-primary-hero:hover { transform: translateY(-2px); box-shadow: 0 8px 40px rgba(59,130,246,0.5); }
        .btn-ghost-hero {
            background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text);
        }
        .btn-ghost-hero:hover { background: rgba(255,255,255,0.10); transform: translateY(-1px); }

        /* ── STATS ── */
        .stats {
            position: relative; z-index: 1;
            display: flex; justify-content: center; flex-wrap: wrap; gap: 1px;
            background: var(--border); border-radius: 20px; overflow: hidden;
            max-width: 900px; margin: 0 auto 100px;
            border: 1px solid var(--border);
        }
        .stat-item {
            flex: 1; min-width: 180px;
            padding: 32px 24px; text-align: center;
            background: var(--surface);
        }
        .stat-value { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 6px; }
        .stat-label { font-size: 13px; color: var(--muted); font-weight: 500; }

        /* ── SECTION ── */
        section { position: relative; z-index: 1; padding: 100px 24px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .section-badge {
            display: inline-block; padding: 4px 14px; border-radius: 9999px;
            font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
            background: rgba(16,185,129,0.1); color: #34D399; border: 1px solid rgba(16,185,129,0.2);
            margin-bottom: 16px;
        }
        .section-title {
            font-size: clamp(1.8rem, 4vw, 3rem); font-weight: 800; line-height: 1.1;
            letter-spacing: -0.02em; margin-bottom: 16px;
        }
        .section-sub { font-size: 1.1rem; color: var(--muted); line-height: 1.7; max-width: 560px; }

        /* ── FEATURE GRID ── */
        .features-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px; margin-top: 64px;
        }
        .feature-card {
            padding: 32px; border-radius: var(--radius);
            background: var(--surface);
            border: 1px solid var(--border);
            transition: border-color .25s, transform .25s, box-shadow .25s;
        }
        .feature-card:hover {
            border-color: rgba(59,130,246,0.35);
            transform: translateY(-4px);
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        .feature-icon {
            width: 48px; height: 48px; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            font-size: 22px; margin-bottom: 20px;
        }
        .feature-card h3 { font-size: 18px; font-weight: 700; margin-bottom: 10px; }
        .feature-card p { font-size: 14px; color: var(--muted); line-height: 1.7; }

        /* ── MODULES ── */
        .modules-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; margin-top: 64px; }
        @media(max-width:768px) { .modules-layout { grid-template-columns: 1fr; gap: 40px; } }
        .module-list { display: flex; flex-direction: column; gap: 12px; }
        .module-item {
            display: flex; align-items: center; gap: 16px; padding: 20px;
            background: var(--surface); border-radius: 12px; border: 1px solid var(--border);
            cursor: default; transition: border-color .2s;
        }
        .module-item:hover { border-color: rgba(59,130,246,0.3); }
        .module-icon { font-size: 24px; }
        .module-item h4 { font-size: 15px; font-weight: 600; margin-bottom: 3px; }
        .module-item p { font-size: 13px; color: var(--muted); }
        .module-visual {
            background: var(--surface); border-radius: 20px; border: 1px solid var(--border);
            padding: 28px; position: relative; overflow: hidden;
        }
        .module-visual-header {
            display: flex; align-items: center; gap: 8px; margin-bottom: 24px;
        }
        .dot { width: 10px; height: 10px; border-radius: 50%; }
        .chart-bars { display: flex; gap: 8px; align-items: flex-end; height: 140px; }
        .bar {
            flex: 1; border-radius: 8px 8px 0 0;
            animation: growBar 1.2s ease forwards;
            transform-origin: bottom;
        }
        @keyframes growBar { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .kpi-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
        .kpi-mini {
            padding: 14px; border-radius: 10px; background: var(--surface2);
        }
        .kpi-mini .val { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
        .kpi-mini .lbl { font-size: 11px; color: var(--muted); margin-top: 2px; }

        /* ── TECH STACK ── */
        .tech-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 40px; justify-content: center; }
        .tech-badge {
            display: flex; align-items: center; gap: 8px; padding: 10px 18px;
            background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
            font-size: 14px; font-weight: 500; color: var(--text);
            transition: border-color .2s;
        }
        .tech-badge:hover { border-color: rgba(59,130,246,0.4); }
        .tech-badge .icon { font-size: 18px; }

        /* ── CTA SECTION ── */
        .cta-section {
            text-align: center; padding: 100px 24px;
            position: relative; z-index: 1;
        }
        .cta-card {
            max-width: 750px; margin: 0 auto; padding: 64px 48px;
            background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.1));
            border: 1px solid rgba(59,130,246,0.2); border-radius: 24px;
            position: relative; overflow: hidden;
        }
        .cta-card::before {
            content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
            background: radial-gradient(ellipse, rgba(59,130,246,0.07) 0%, transparent 60%);
            pointer-events: none;
        }
        .cta-card h2 { font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 800; margin-bottom: 16px; }
        .cta-card p { color: var(--muted); font-size: 1.1rem; margin-bottom: 36px; line-height: 1.7; }

        /* ── FOOTER ── */
        footer {
            position: relative; z-index: 1; padding: 40px 40px;
            border-top: 1px solid var(--border);
            display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
        }
        footer p { font-size: 13px; color: var(--muted); }
        .footer-brand { display: flex; align-items: center; gap: 10px; }

        /* ── ANIMATED ORBS ── */
        .orb {
            position: fixed; border-radius: 50%; pointer-events: none; z-index: 0;
            filter: blur(80px); opacity: 0.5;
            animation: floatOrb 8s ease-in-out infinite;
        }
        .orb-1 { width: 500px; height: 500px; top: -150px; left: -150px; background: rgba(59,130,246,0.15); }
        .orb-2 { width: 400px; height: 400px; bottom: -100px; right: -100px; background: rgba(16,185,129,0.12); animation-delay: -4s; }
        @keyframes floatOrb { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-40px)} }

        /* Scroll fade-in */
        .fade-in { opacity: 0; transform: translateY(30px); transition: opacity .7s ease, transform .7s ease; }
        .fade-in.visible { opacity: 1; transform: translateY(0); }

        @media(max-width: 640px) {
            nav { padding: 16px 20px; }
            .nav-links { display: none; }
            section { padding: 60px 20px; }
            .cta-card { padding: 40px 24px; }
        }
    </style>
</head>
<body>

<div class="bg-mesh"></div>
<div class="bg-grid"></div>
<div class="orb orb-1"></div>
<div class="orb orb-2"></div>

<!-- NAV -->
<nav>
    <a href="/" class="nav-brand">
        <div class="nav-logo">F</div>
        <span class="nav-title">FMIS</span>
    </a>
    <div class="nav-links">
        <a href="#features" class="nav-link">Features</a>
        <a href="#modules" class="nav-link">Modules</a>
        <a href="#stack" class="nav-link">Tech Stack</a>
    </div>
    <a href="{{ env('FRONTEND_URL', 'http://localhost:5173') }}" class="nav-cta">Launch App →</a>
</nav>

<!-- HERO -->
<section class="hero">
    <div class="hero-badge">
        <span class="hero-badge-dot"></span>
        Production-Grade · Multi-Tenant · PWA-Ready
    </div>
    <h1>
        Financial Intelligence<br>
        <span class="gradient-text">Built for the Future</span>
    </h1>
    <p>
        A complete Financial Management & Intelligence System — transactions, approvals, invoices,
        budgets, fraud detection, and real-time analytics in a single unified platform.
    </p>
    <div class="hero-actions">
        <a href="{{ env('FRONTEND_URL', 'http://localhost:5173') }}" class="btn-hero btn-primary-hero">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Launch Dashboard
        </a>
        <a href="/api/v1" class="btn-hero btn-ghost-hero">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
            API Reference
        </a>
    </div>
</section>

<!-- STATS -->
<div class="container" style="position:relative;z-index:1;">
    <div class="stats fade-in">
        <div class="stat-item">
            <div class="stat-value" style="color:#60A5FA">13+</div>
            <div class="stat-label">Database Tables</div>
        </div>
        <div class="stat-item">
            <div class="stat-value" style="color:#34D399">12</div>
            <div class="stat-label">API Modules</div>
        </div>
        <div class="stat-item">
            <div class="stat-value" style="color:#A78BFA">11</div>
            <div class="stat-label">UI Pages</div>
        </div>
        <div class="stat-item">
            <div class="stat-value" style="color:#FB923C">100%</div>
            <div class="stat-label">Offline Capable</div>
        </div>
    </div>
</div>

<!-- FEATURES -->
<section id="features">
    <div class="container">
        <div class="fade-in">
            <span class="section-badge">Core Features</span>
            <h2 class="section-title">Everything you need to<br>manage finances at scale</h2>
            <p class="section-sub">Built with enterprise patterns — modular, multi-tenant, and designed for growth from day one.</p>
        </div>
        <div class="features-grid">
            @php
            $features = [
                ['bg'=>'rgba(59,130,246,0.12)','icon'=>'💳','title'=>'Full Transaction Lifecycle','desc'=>'Draft → Submit → Review → Approve → Post. Complete multi-step workflow with configurable approval rules, fraud alerts, and audit trails.'],
                ['bg'=>'rgba(16,185,129,0.12)','icon'=>'📊','title'=>'Real-Time Analytics','desc'=>'Live KPI dashboard with cash flow charts, income vs expense trends, budget overviews, and fraud statistics powered by Redis caching.'],
                ['bg'=>'rgba(99,102,241,0.12)','icon'=>'📄','title'=>'Invoice Management','desc'=>'Auto-numbered invoices with tax calculation, multi-currency support, branded PDF generation, and one-click email delivery.'],
                ['bg'=>'rgba(239,68,68,0.12)','icon'=>'🛡️','title'=>'Fraud Detection Engine','desc'=>'Configurable rule-based fraud detection covering duplicate entries, abnormal amounts, suspicious timing, and high-velocity patterns.'],
                ['bg'=>'rgba(234,179,8,0.12)','icon'=>'📋','title'=>'Budget Tracking','desc'=>'Department-level budgets with planned vs. actual tracking, variance calculations, and configurable alert thresholds at any percentage.'],
                ['bg'=>'rgba(59,130,246,0.12)','icon'=>'✅','title'=>'Approval Workflows','desc'=>'Fully DB-driven multi-step approval engine. Configurable roles, conditions, and escalation rules — zero hardcoded business logic.'],
                ['bg'=>'rgba(16,185,129,0.12)','icon'=>'🔒','title'=>'Immutable Audit Trail','desc'=>'Every action logged immutably — append-only audit entries with user, tenant, IP, and model snapshot. Cannot be modified or deleted.'],
                ['bg'=>'rgba(168,85,247,0.12)','icon'=>'📡','title'=>'Offline-First PWA','desc'=>'Works fully offline with Dexie.js IndexedDB storage. Sync queue automatically reconciles changes when connectivity is restored.'],
                ['bg'=>'rgba(234,179,8,0.12)','icon'=>'🏢','title'=>'Multi-Tenant SaaS','desc'=>'Full tenant isolation via tenant_id scoping. Each tenant has their own budget, workflows, fraud rules, and branded experience.'],
            ];
            @endphp
            @foreach($features as $i => $f)
            <div class="feature-card fade-in" style="animation-delay:{{ $i * 0.07 }}s">
                <div class="feature-icon" style="background:{{ $f['bg'] }}">{{ $f['icon'] }}</div>
                <h3>{{ $f['title'] }}</h3>
                <p>{{ $f['desc'] }}</p>
            </div>
            @endforeach
        </div>
    </div>
</section>

<!-- MODULES VISUAL -->
<section id="modules" style="background: linear-gradient(180deg, transparent, rgba(15,23,42,0.5), transparent);">
    <div class="container">
        <div class="modules-layout">
            <div class="fade-in">
                <span class="section-badge">Platform Modules</span>
                <h2 class="section-title">All modules.<br>One platform.</h2>
                <p class="section-sub" style="margin-bottom:32px">Each module is independently toggleable from the Settings panel — enable only what your team needs.</p>
                <div class="module-list">
                    @php
                    $modules = [
                        ['icon'=>'💰','name'=>'Transactions','desc'=>'Full CRUD with lifecycle management'],
                        ['icon'=>'✅','name'=>'Approvals','desc'=>'Configurable multi-level approval flows'],
                        ['icon'=>'📄','name'=>'Invoices','desc'=>'PDF generation with tenant branding'],
                        ['icon'=>'📊','name'=>'Budgeting','desc'=>'Department budgets and variance tracking'],
                        ['icon'=>'🛡️','name'=>'Fraud Detection','desc'=>'Automated rule-based alerting'],
                        ['icon'=>'📈','name'=>'Analytics & Reports','desc'=>'Charts, KPIs, and export to PDF/Excel'],
                    ];
                    @endphp
                    @foreach($modules as $m)
                    <div class="module-item">
                        <span class="module-icon">{{ $m['icon'] }}</span>
                        <div>
                            <h4>{{ $m['name'] }}</h4>
                            <p>{{ $m['desc'] }}</p>
                        </div>
                    </div>
                    @endforeach
                </div>
            </div>

            <!-- Visual dashboard mockup -->
            <div class="module-visual fade-in">
                <div class="module-visual-header">
                    <div class="dot" style="background:#EF4444"></div>
                    <div class="dot" style="background:#F59E0B"></div>
                    <div class="dot" style="background:#10B981"></div>
                    <span style="font-size:12px;color:var(--muted);margin-left:8px">FMIS Dashboard</span>
                </div>
                <!-- Bar chart -->
                <div class="chart-bars">
                    @php
                    $bars = [
                        ['h'=>'40%','c'=>'rgba(59,130,246,0.4)','delay'=>'0s'],
                        ['h'=>'65%','c'=>'rgba(16,185,129,0.5)','delay'=>'.1s'],
                        ['h'=>'50%','c'=>'rgba(59,130,246,0.4)','delay'=>'.2s'],
                        ['h'=>'80%','c'=>'rgba(16,185,129,0.6)','delay'=>'.3s'],
                        ['h'=>'55%','c'=>'rgba(59,130,246,0.4)','delay'=>'.4s'],
                        ['h'=>'90%','c'=>'rgba(16,185,129,0.65)','delay'=>'.5s'],
                        ['h'=>'45%','c'=>'rgba(59,130,246,0.4)','delay'=>'.6s'],
                        ['h'=>'70%','c'=>'rgba(16,185,129,0.55)','delay'=>'.7s'],
                    ];
                    @endphp
                    @foreach($bars as $b)
                    <div class="bar" style="height:{{ $b['h'] }};background:{{ $b['c'] }};animation-delay:{{ $b['delay'] }}"></div>
                    @endforeach
                </div>
                <div class="kpi-row">
                    <div class="kpi-mini">
                        <div class="val" style="color:#34D399">$284K</div>
                        <div class="lbl">Total Income</div>
                    </div>
                    <div class="kpi-mini">
                        <div class="val" style="color:#F87171">$142K</div>
                        <div class="lbl">Expenses</div>
                    </div>
                    <div class="kpi-mini">
                        <div class="val" style="color:#60A5FA">12</div>
                        <div class="lbl">Pending Approvals</div>
                    </div>
                    <div class="kpi-mini">
                        <div class="val" style="color:#A78BFA">3</div>
                        <div class="lbl">Fraud Alerts</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- TECH STACK -->
<section id="stack">
    <div class="container" style="text-align:center">
        <div class="fade-in">
            <span class="section-badge">Technology Stack</span>
            <h2 class="section-title">Built on proven,<br>modern technologies</h2>
        </div>
        <div class="tech-grid fade-in">
            @php
            $stack = [
                ['icon'=>'🐘','name'=>'Laravel 11'],
                ['icon'=>'⚛️','name'=>'React + TypeScript'],
                ['icon'=>'⚡','name'=>'Vite PWA'],
                ['icon'=>'🎨','name'=>'TailwindCSS v4'],
                ['icon'=>'🗃️','name'=>'MySQL'],
                ['icon'=>'⚡','name'=>'Redis'],
                ['icon'=>'📦','name'=>'Zustand'],
                ['icon'=>'💾','name'=>'Dexie.js (IndexedDB)'],
                ['icon'=>'🔐','name'=>'Laravel Sanctum'],
                ['icon'=>'👮','name'=>'Spatie Permissions'],
                ['icon'=>'📊','name'=>'Recharts'],
                ['icon'=>'📄','name'=>'DomPDF'],
            ];
            @endphp
            @foreach($stack as $s)
            <div class="tech-badge">
                <span class="icon">{{ $s['icon'] }}</span>
                {{ $s['name'] }}
            </div>
            @endforeach
        </div>
    </div>
</section>

<!-- CTA -->
<div class="cta-section">
    <div class="cta-card fade-in">
        <h2>Ready to take control of your finances?</h2>
        <p>Launch the FMIS dashboard and start managing transactions, approvals, budgets, and analytics — all in one place.</p>
        <div class="hero-actions" style="justify-content:center">
            <a href="{{ env('FRONTEND_URL', 'http://localhost:5173') }}" class="btn-hero btn-primary-hero">
                Launch FMIS Dashboard →
            </a>
            <a href="{{ env('FRONTEND_URL', 'http://localhost:5173') }}/login" class="btn-hero btn-ghost-hero">
                Sign In
            </a>
        </div>
        <p style="margin-top:24px;font-size:13px;color:var(--muted)">
            Demo: <span style="color:#93C5FD;font-family:monospace">director@skylinksolutions.co</span> /
            <span style="color:#93C5FD;font-family:monospace">password</span>
        </p>
    </div>
</div>

<!-- FOOTER -->
<footer>
    <div class="footer-brand">
        <div class="nav-logo" style="width:28px;height:28px;font-size:13px;border-radius:8px;">F</div>
        <span style="font-size:14px;font-weight:600;color:var(--text)">FMIS</span>
    </div>
    <p>© {{ date('Y') }} Financial Management & Intelligence System. Built for Skylink Solutions Ltd.</p>
    <p>Laravel {{ app()->version() }} · API v1</p>
</footer>

<script>
// Intersection Observer for fade-in animations
const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Active nav highlight
const sections = document.querySelectorAll('section[id], div[id]');
window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) current = s.id; });
    document.querySelectorAll('.nav-link').forEach(a => {
        a.style.color = a.getAttribute('href') === `#${current}` ? '#F1F5F9' : '';
    });
});
</script>
</body>
</html>
