# Visual System Layout And Motion Spec

## Visual Direction
- Theme: Decision observatory / legal-control cockpit
- Direction: Restrained dark, typography-led, quiet surfaces, one accent family, explicit status colors only.
- Structural rule: quiet dark surfaces, high-legibility typography, one accent family, and explicit success / notice / danger states only.

## Core Color Tokens
| Token | Value |
| --- | --- |
| `background` | `#0B0D12` |
| `surface_1` | `#121721` |
| `surface_2` | `#181E29` |
| `surface_3` | `#202735` |
| `hairline_border` | `rgba(255,255,255,0.08)` |
| `text_strong` | `#F5F7FA` |
| `text_mid` | `#B8C2CF` |
| `text_weak` | `#7F8A99` |
| `accent_primary` | `#5AA9FF` |
| `accent_soft` | `rgba(90,169,255,0.14)` |
| `success` | `#52C18C` |
| `notice` | `#E7B04B` |
| `danger` | `#E96B6B` |

## Typography
- Primary stack: `Inter, SF Pro Text, SF Pro Display, system-ui, sans-serif`
- Monospace stack: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

| Scale | Value |
| --- | --- |
| display | `40/48` |
| page title | `32/40` |
| section heading | `20/28` |
| card title | `16/24` |
| body | `14/22` |
| meta | `12/18` |

## Layout Constants
- Desktop grid: `12` columns, max width `1440`, gutter `32`
- Tablet grid: `8` columns, gutter `24`
- Mobile grid: `4` columns, gutter `16`
- Shell header height: `64`
- Context bar minimum height: `72`
- Card radius: `16`
- Inspector width: `360`

## Family-Level Density Tokens
| Shell | Density Token | Responsive Compaction Token |
| --- | --- | --- |
| `CALM_SHELL` | `CALM_FOUR_SURFACE_DENSITY_V1` | `CALM_SUPPORT_REDOCK_V1` |
| `CLIENT_PORTAL_SHELL` | `PORTAL_COMFORTABLE_TASK_DENSITY_V1` | `PORTAL_STACK_BELOW_PRIMARY_V1` |
| `GOVERNANCE_DENSITY_SHELL` | `GOVERNANCE_WORKSPACE_DENSITY_V1` | `GOVERNANCE_AUXILIARY_REDOCK_V1` |

## Breakpoint Contracts
### CALM_SHELL
- `desktop >= 1280px`: Four-surface composition may show a vertical module picker and full detail drawer. Primary calm hierarchy remains `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER`.
- `tablet 768px - 1279px`: Module picker may collapse to segmented control. The drawer stays promoted but may redock into a shallower panel.
- `mobile < 768px`: Active drawer module takes full width. Customer and internal activity threads never sit side by side.

### CLIENT_PORTAL_SHELL
- `desktop`: Keep one primary task column with subordinate help/history. Portal tabs remain the only top-level navigation surface.
- `tablet`: Stack support below the primary task before removing important task context. Keep the same tab, same primary action, and same return path.
- `mobile`: Resume upload, request, or approval sessions in the same route context. No mobile-only alternate route family is allowed.

### GOVERNANCE_DENSITY_SHELL
- `wide >= 1440px`: May show all five structural regions at once. One promoted auxiliary surface still governs user attention.
- `standard 1024px - 1439px`: Keep `WORKSPACE_CANVAS` primary and redock the audit sidecar into a drawer or tabbed inspector. Preserve active filters, selected object, and focus anchor.
- `narrow < 1024px`: Move `SECTION_NAV` into compact tabs or menus. Collapse `INVENTORY_RAIL` into a filter-and-selection tray and keep one promoted support region at a time.

## Motion Contract
- Standard duration: `160ms`
- Emphasis duration: `220ms`
- Maximum duration: `280ms`
- Allowed motion: Opacity changes and vertical translation up to 8px.
- Reduced-motion policy: Replace displacement with opacity, highlight, or color-state changes while preserving semantic meaning.
