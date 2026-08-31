# At Attin demo script — under three minutes

## 0:00–0:20 — The problem

“Banking makes people translate a simple intention into many screens, filters, dates, account choices, and safety decisions. That burden is highest for older adults, young users, and people new to banking. At Attin is a complete fictional bank where the browser agent can prepare the complex work—but the person remains in control.”

Show the login screen. Point out the visible prototype credentials, fictional-money statement, and WebMCP status. Sign in with `john.attin` / `attin2026`.

## 0:20–0:40 — A real bank, not a tool demo

Show Home, then briefly visit Accounts and Payments.

“This is 42,860 fictional ATC across three accounts. The bank includes transactions, cards, scheduled and recurring payments, budgets, goals, subscriptions, statements, disputes, alerts, accessibility, support, and an audit trail. Manual banking continues to work even if WebMCP is unavailable.”

## 0:40–1:10 — Understand finances safely

Open Safety & Agent and unlock Agent Access with a direct human click. Ask the browser agent:

> Summarize my August spending and show the biggest categories.

Pause on the At Attin confirmation.

“Even a read cannot disclose protected banking data yet. At Attin says exactly what will be shared. The agent has no approval tool.”

Select **Yes, confirm**. Show the compact result and agent-audit entry.

## 1:10–1:50 — Complete a complex payment

Ask:

> Create a monthly 1,250 ATC payment to Orbit Works starting September 1, but keep at least 5,000 ATC in Daily Account.

Show the itemized preview: payee, source, first date, monthly cadence, and 5,000 ATC floor.

“The browser passes structured inputs to the native WebMCP tool. The same domain operation powers the manual payment screen. The floor is stored and rechecked when the payment later runs.”

Cancel once to prove nothing changes. Ask again, approve, and show the new recurring payment in Payments. Do not repeat this flow after a successful commit unless the demo data was reset.

## 1:50–2:30 — Secure a suspicious charge

Ask:

> Secure the suspicious card charge: freeze the linked card and open a dispute.

At the critical confirmation, type lowercase `yes` and show that it is rejected. Then type uppercase `YES` and confirm.

“This is one atomic safeguard: the card freezes and the dispute opens together, or neither happens. The authorization is trusted, version-bound, expiring, and single-use.”

Show Cards and Support to prove both results.

## 2:30–2:50 — Why WebMCP

“At Attin has no chatbot, natural-language parser, deterministic assistant engine, or hosted model. It exposes 56 native imperative tools and four visible declarative forms through `document.modelContext`. WebMCP lets the bank present precise capabilities and schemas while the application owns authorization.”

Show Safety & Agent: four safeguards, 60-tool status, and recent agent activity.

## 2:50–3:00 — Close

“The future of banking is not an agent acting invisibly. It is an agent doing the difficult translation while every disclosure and consequence stays simple, visible, and human-approved. This is At Attin.”

End on the Home confirmation surface or Safety & Agent screen. Keep the deployed URL and credentials visible in the video description.
