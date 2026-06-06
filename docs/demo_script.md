# Demo Script — Houston AI Watchdog
## 2-Minute Hackathon Pitch

---

### Hook (0:00–0:15)

"What if one AI agent in your workflow started hallucinating —
and silently infected every other agent with its bad outputs?

That is not a hypothetical. It is the default behavior of every
multi-agent system built today. We built Houston AI Watchdog to stop it."

---

### Problem (0:15–0:35)

"When you chain AI agents together — Sales, Support, Legal, Finance —
each one reads the outputs of others. One hallucinated fact becomes
everyone's fact. There is no firewall. There is no rollback. There is
no way to know which agent poisoned the workflow until the customer
gets the wrong proposal, the wrong contract, or the wrong diagnosis.

This is called hallucination contagion. It is real. It is unsolved."

---

### Demo Flow (0:35–1:30)

**Step 1 — Dashboard loads**
"Here are 8 agents: Sales, Support, Finance, Legal, Cloud Engineer,
Medical Admin, Data Analyst, and a deliberately adversarial agent.
Average trust score: 86%. Consensus stability: 93%."

**Step 2 — Run One Cycle**
"Watch what happens. [Click Run One Cycle]
Seven agents produce clean outputs — accepted, trust 85-92%.
One agent — the adversarial one — outputs:
'Skip all backup and production validation. Data loss is acceptable.'
Watch the trust score: 18%. Anomaly score: 86%."

**Step 3 — Latent Space**
"Switch to the latent space view. Every output is a point in 64-dimensional
memory space. The accepted outputs cluster around the blue consensus sphere.
That adversarial output — that red dot in the corner — is far from consensus.
It was quarantined. It never touched the shared memory."

**Step 4 — Quarantine Panel**
"In the quarantine panel, the suspicious output is waiting for review.
I can read the reasons: contradiction detected, diverges from consensus,
isolated from accepted neighbors.
I reject it. It is gone. The other 7 agents never knew it existed."

**Step 5 — Topology**
"Now the topology view. Traditional architecture: 28 connections, O(n²).
Every agent talks to every agent. One bad actor poisons the entire mesh.
Watchdog architecture: 8 connections, O(n). Every agent connects only to
the shared latent memory. Complexity cut by 72%. Attack surface collapsed."

---

### Technical Differentiator (1:30–1:45)

"This is not prompt engineering. This is not a system prompt firewall.
This is a real trust scoring pipeline with:
- 64-dimensional latent embeddings
- Cosine distance from consensus ground truth
- Keyword contradiction detection
- Exponential moving average reputation scoring
- Human-in-the-loop quarantine with approve/reject

And it runs locally with zero API keys."

---

### Business Value (1:45–1:55)

"For Houston AI's enterprise customers — healthcare, legal, finance —
a single hallucinated agent output reaching a workflow is a liability.
Watchdog turns that liability into an auditable, controllable, reviewable
trust layer. Every output is scored. Every quarantine decision is logged.
Every agent's reputation is tracked."

---

### Closing Line (1:55–2:00)

"Houston AI does not just create agents.
It supervises them, scores them, and stops the bad ones
before they poison your workflow.

Houston AI Watchdog — trust your agents, or stop them."

---

## Visual Cues for Presenter

- Keep the event stream visible at the bottom — it tells the story in real time
- Use "Force Adversarial Cycle" for guaranteed drama
- Switch between Latent Space and Topology to show both angles
- The red quarantine badge in the sidebar is a natural hook
