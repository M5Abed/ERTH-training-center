# New Mansoura University (NMU) UI Design System

This document specifies the official brand identity and design tokens for the **NMU ThinkTank** (ERTH Matching) platform. It aligns the application's user interface with NMU's institutional branding.

---

## 1. Brand Essence & Visual Language
New Mansoura University is a leading fourth-generation smart university. The visual identity reflects innovation, academia, and its coastal delta location.
- **Light Canvas**: Always light-mode-only. The system uses a clean, high-contrast white and soft blue-mint canvas to eliminate cognitive fatigue and represent a professional academic environment.
- **No Particles**: WebGL/canvas-based particles are removed to prioritize clean, accessible layouts and solid technical performance.
- **Clean Structure**: UI elements utilize thin, elegant borders, crisp drop-shadows, and micro-interactions.

---

## 2. Design Tokens

### Color Palette

| Token | Hex Code | Visual Role |
| :--- | :--- | :--- |
| **Primary Blue** (`--primary`) | `#0B3C9E` | The academic and technological anchor; used for branding, active navigation links, and primary interactive elements. |
| **Primary Light** (`--primary-l`) | `#1A56DB` | Used for hover states on primary components. |
| **Primary Dark** (`--primary-d`) | `#072561` | Ultra-high contrast blue for smaller body labels, buttons, and headers. |
| **Accent Emerald** (`--accent`) | `#00A896` | Represents growth, the Nile Delta coast, and smart innovation. Used for status indicators and success tags. |
| **Accent Light** (`--accent-l`) | `#00C4AA` | Used for accent hovers and glowing overlays. |
| **Canvas Background** (`--bg`) | `#F8FAFC` | Pure Slate-white background for pages. |
| **Elevated BG** (`--bg-elevated`) | `#F1F5F9` | Used for sections, sidebars, and nested panels. |
| **Surface Card** (`--surface`) | `#FFFFFF` | Pure white background for standard cards, lists, and form controls. |
| **Text Primary** (`--text`) | `#0B1E33` | Deep academic navy for excellent readability (WCAG AAA compliant). |
| **Text Secondary** (`--text-2`) | `#475569` | Slate blue-grey for secondary explanations and labels. |
| **Text Muted** (`--muted`) | `#64748B` | Used for dates, metadata, and placeholder text. |
| **Border Soft** (`--border`) | `#E2E8F0` | Default border for structural separation. |
| **Border Active** (`--border-hover`) | `#CBD5E1` | Dynamic hover state border. |

### Typography

- **English font**: `Inter` (Academic, legible, professional sans-serif).
- **Arabic font**: `Cairo` (Clear, geometric Arabic typeface).
- **Technical/Code**: `JetBrains Mono` (For tags, stats, and metadata).

### Spacing & Layout
- Generous, clean whitespace (`96px` sections on desktop, `64px` on mobile).
- Cards are bounded by soft, modern drop-shadows rather than dark-glow borders:
  ```css
  --shadow-sm: 0 1px 2px 0 rgba(11, 60, 158, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(11, 60, 158, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(11, 60, 158, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  ```

---

## 3. Key Layout Enhancements
- **Restricted Theme**: Theme switching is completely disabled. The application state is hard-coded to `light`.
- **Top Navigation**: Features the NMU logo and a clean, high-contrast academic blue wordmark.
- **Bento Stats**: Floating grid elements showcasing student engagement.
- **Borders & Shadowing**: Solid, premium card designs featuring soft drop-shadows and thin slate borders, avoiding dark-mode shadows.
