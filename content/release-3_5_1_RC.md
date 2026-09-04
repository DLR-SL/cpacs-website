Title: CPACS v3.5.1-RC available for review
Date: 2026-05-29 10:00
Category: Releases
Author: Marko

CPACS v3.5.1-RC is available for community review. It is a refinement release on top of CPACS v3.5, meant to stabilize and clarify the schema concepts introduced there before the final CPACS v3.5.1 release. The main updates affect three areas that were discussed with the CPACS community during the stakeholder review phase.

**Systems.** Refinement of the systems definition introduced in CPACS v3.5, including predefined `systemElements`, support for `multiSegmentShapes`, external CAD references, combined shapes with individual transformations, and removal of aircraft-level scaling during instantiation.

**Decks.** Alignment of deck elements with the systems concept, including harmonized geometry handling, replacement of the former bounding-box-based approach, consistent 3D transformations, and treatment of cargo containers as regular deck elements.

**Fuel tanks.** Refinement of the fuel tank definition introduced in CPACS v3.5, including model-level placement below `vehicles/aircraft/model/fuelTanks`, use of `parentUID`, vessel-based restructuring, and improved support for structural definitions on vessel level.

In addition, the example files have been updated and consolidated, and the documentation and build setup have been improved.

## Relevant links

- [CPACS v3.5.1-RC release](https://github.com/DLR-SL/CPACS/releases/tag/v3.5.1-RC)
- [CPACS documentation](https://dlr-sl.github.io/CPACS/html/c0ba9e4f-907d-6cd2-42c4-d4ed9179a9dd.htm)
- [CPACS discussion forum](https://github.com/DLR-SL/CPACS/discussions)

<div style="border-left: 3px solid #3d6ca4; background: #fafbfc; padding: 1rem 1.3rem; margin: 1.8rem 0;">
<strong>Review request:</strong> in line with the CPACS release process, this release candidate is the final review stage before the official CPACS v3.5.1 release. We kindly invite the CPACS community to review the proposed changes and provide feedback during the review phase.
</div>

Unless major concerns are raised, the feedback received on this release candidate will be used to prepare the final CPACS v3.5.1 release.

Many thanks to everyone who contributed to the current schema refinements and extensions!
