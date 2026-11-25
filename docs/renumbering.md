# Version renumbering (2026-11-25)

The dashboard now numbers versions the same way as SirisOS: **Section.Feature.Fix**. A whole-number change is a
significant new section, the middle number a new feature or bigger upgrade, and the last number a fix or minor
change. Until now versions were decimals (X.YY: +0.01 for a fix, +0.1 for an update), which mixed fixes and features
and would roll over (1.9 + 0.1 = 2.0). Every release was judged a section, a feature or a fix and the history was
counted again from 1.0.0, in the order the releases shipped. Each release's notes in [`releases/`](releases/) say
its old number.

The one new section so far is **Monthly Reporting** (2.0.0): the workbook-matching monthly report, .xlsm import and
write-back, and SharePoint sync.

| Was | Now | Kind | Merge commit |
|---|---|---|---|
| 1.0 | 1.0.0 | first | `492e3c5` |
| 1.1 | 1.1.0 | feature | `659cbb8` |
| 1.11 | 1.1.1 | fix | `8b4fc0c` |
| 1.2 | 1.2.0 | feature | `9e478b8` |
| 1.3 | 2.0.0 | section | `37b44e3` |
| 1.4 | 2.1.0 | feature | `6a5c499` |
| 1.41 | 2.2.0 | feature | `3098b08` |
| 1.42 | 2.3.0 | feature | `e6d1b15` |
| 1.43 | 2.4.0 | feature | `914270a` |
| 1.5 | 2.5.0 | feature | `2964010` |
| 1.6 | 2.6.0 | feature | `671aaff` |

The old tags `v1.0` and `v1.3` are left where they are. To tag and release every version above under its new number,
on the same merge commit, run the Release workflow once by hand (GitHub → Actions → Release → Run workflow). It skips
versions already released, so running it again does no harm.
