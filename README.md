# PrintCraft Studio 🖨️

A precision print layout and PDF publishing workstation built with React, Vite, Tailwind CSS, and `jsPDF`.

## 🚀 Quick Start

```bash
# Navigate to project
cd print-craft

# Start the dev server
npm run dev

# Open in browser
http://localhost:5173
```

---

## 🛠️ Modes

### 1. Structured Grid Mode
- **Adaptive Auto-Grid**: Detects image proportions (3:2, 4:3, 16:9, 1:1) and automatically calculates the optimal `rows × cols` and orientation to eliminate wasted paper margins.
- **Physical Size Auto-Packer**: 1-click presets for Passport (35×45mm), US Visa (51×51mm), ID Badge (85.6×54mm), Trading Card (63.5×88.9mm), and 4×6" Photos automatically compute maximum card density per sheet.
- **Interactive Cells**: Drag to swap cells, cell hover menu (rotate 90°, fit/fill cover, replicate across sheet, clear).

### 2. Freeform Canvas Mode
- **Arbitrary Placement & Drag**: Place and move elements anywhere on the printable paper sheet.
- **8-Point Resize Handles**: Corner and edge handles with real-time millimeter dimensions HUD.
- **Rotation Handle**: Circular handle protruding from the top for arbitrary rotation with Shift snap (15° increments).
- **Smart Alignment Snapping**: Dynamic cyan guide lines when snapping to sheet center, margins, and sibling boundaries.
- **Precision Numeric Inputs**: Direct typing for `X (mm)`, `Y (mm)`, `Width (mm)`, `Height (mm)`.
- **Sheet Alignment Tools**: Align Left, Center H, Right, Top, Center V, Bottom, Center on Sheet.
- **Layering & Z-Index**: Bring to Front, Send to Back, Forward, Backward.
- **Convert Grid to Freeform**: 1-click converts any structured grid page into freeform canvas objects.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+V` | Paste screenshot or copied image directly into sheet |
| `Arrow Keys` | Nudge selected element by 0.5 mm |
| `Shift + Arrow` | Nudge selected element by 2.5 mm |
| `Delete` / `Backspace` | Delete selected element |
| `Ctrl+D` | Duplicate selected element |
| `Ctrl+P` | Open native browser print dialog |
| `Esc` | Deselect element |

---

## 🖨️ Production Print Engine

- **High-Resolution Vector / 300 DPI Export**: Rendered directly via `jsPDF` at exact millimeter physical scale.
- **Scissor & Trimmer Guides**: Dashed cut lines, 3mm corner crop marks, and 1px cell stroke outlines.
- **Color & Ink Modes**: Full color gamut, smooth monochrome grayscale, and 1-bit crisp high-contrast B&W thresholding for saving ink.
- **Iron-On Transfer Mirror**: Horizontal flip for T-shirts, tote bags, and heat transfer printing.
- **Multi-Sheet Support**: Sequential pagination, sheet duplicating, and reordering.
