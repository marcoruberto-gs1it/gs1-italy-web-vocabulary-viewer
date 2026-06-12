# GS1 Italy Web Vocabulary Viewer

A dynamic and interactive web application developed in **Angular** designed for inspecting, searching, and navigating semantic web vocabularies and data model extensions based on the **GS1 Web Vocabulary** (JSON-LD) standard.

Developed to support developers, information architects, and business partners of **GS1 Italy**, this semantic engine offers a fluid and responsive interface to analyze relationship graphs, domain/range validation constraints, and controlled code lists.

---

## 🚀 Key Features

- **Unified View & Global Exploration:** An always-visible sidebar that dynamically indexes all entities loaded from the JSON-LD file, offering an immediate structural overview of the data model.
- **Instant Search & Real-Time Filtering:** A predictive text search bar operating in real time across human-readable labels, absolute URI paths, and descriptive comments.
- **Structured Category Filtering:** Ability to instantly isolate information flows via a dedicated sidebar dropdown menu:
  - *Home Page (All Items):* Cumulative global view of the entire vocabulary graph.
  - *All Classes:* Targeted isolation of ontological classes.
  - *All Properties:* Focused view of model attributes (handling both *DatatypeProperty* and *ObjectProperty* types).
  - *All Code Lists:* Fast navigation of controlled vocabularies and enumerations.
- **Term Lifecycle Management (Status Filtering):** Native support for filtering metadata based on deployment stability (`stable`, `testing`, `draft`), with the built-in capability to display or toggle legacy terms (`deprecated`), which are styled with a clear strikethrough visual effect.
- **Bidirectional Relationship Inspection (Central Panel):** Selecting any node from the sidebar list dynamically populates deep structural cards:
  - **Properties defined within:** Displays attributes associated with that specific class (Domain scope).
  - **Properties expecting a value of:** Traces back properties that expect that specific class as an object value (Range scope).
  - **Metadata and relationships:** A comprehensive technical table containing absolute URIs, annotations, definitions, and taxonomic hierarchies (`subClassOf`).
- **Cohesive Institutional Layout:** Clean, modern enterprise UI strictly aligned with the GS1 Italy brand identity guidelines.

---

## 🛠️ Tech Stack

- **Angular (v17+)** – Standalone component architecture leveraging advanced reactive states through **Angular Signals** (`signal`, `computed`) for instantaneous filtering performance with zero rendering overhead.
- **TypeScript** – Strong typing definitions for robust schema parsing and node graph modeling (`VocNode`).
- **HTML5 & CSS3 Custom Properties** – Fluid multi-column layout with highly scannable UI components matching institutional corporate design specifications (GS1 Blue, GS1 Orange, and calibrated grayscale tokens).
- **Angular NgModel & CommonModule** – Two-way data binding for input reactivity and optimized structural directives.
