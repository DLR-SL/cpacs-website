Title: CPACS v3.5.1-RC available for review
Date: 2026-05-29 10:00
Category: Releases
Author: Marko

<div style="padding: 1.1rem 1.3rem; border-left: 4px solid #1f77b4; background: #f5f9fc; margin-bottom: 1.5rem;">
<strong>CPACS v3.5.1-RC is now available for community review.</strong><br>
This release candidate refines CPACS v3.5 based on first implementation experience and stakeholder feedback, with a focus on systems, decks, and fuel tanks.
</div>

CPACS v3.5.1 is a refinement release on top of CPACS v3.5. It focuses on stabilizing and clarifying recently introduced schema concepts before the final CPACS v3.5.1 release.

The main updates affect three areas that were discussed with the CPACS community during the stakeholder review phase:

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1rem; margin: 1.5rem 0;">

<div style="padding: 1rem; border: 1px solid #ddd; border-radius: 8px; background: #fff;">
<strong>Systems</strong><br>
Refinement of the systems definition introduced in CPACS v3.5, including predefined <code>systemElements</code>, support for <code>multiSegmentShapes</code>, external CAD references, combined shapes with individual transformations, and removal of aircraft-level scaling during instantiation.
</div>

<div style="padding: 1rem; border: 1px solid #ddd; border-radius: 8px; background: #fff;">
<strong>Decks</strong><br>
Alignment of deck elements with the systems concept, including harmonized geometry handling, replacement of the former bounding-box-based approach, consistent 3D transformations, and treatment of cargo containers as regular deck elements.
</div>

<div style="padding: 1rem; border: 1px solid #ddd; border-radius: 8px; background: #fff;">
<strong>Fuel tanks</strong><br>
Refinement of the fuel tank definition introduced in CPACS v3.5, including model-level placement below <code>vehicles/aircraft/model/fuelTanks</code>, use of <code>parentUID</code>, vessel-based restructuring, and improved support for structural definitions on vessel level.
</div>

</div>

In addition, the example files have been updated and consolidated, and the documentation and build setup have been improved.

## Relevant links

- [CPACS v3.5.1-RC release](https://github.com/DLR-SL/CPACS/releases/tag/v3.5.1-RC)
- [CPACS documentation](https://dlr-sl.github.io/CPACS/html/c0ba9e4f-907d-6cd2-42c4-d4ed9179a9dd.htm)
- [CPACS discussion forum](https://github.com/DLR-SL/CPACS/discussions)

<div style="padding: 1.1rem 1.3rem; border-radius: 8px; background: #f7f7f7; margin: 1.5rem 0;">
<strong>Review request</strong><br>
In line with the CPACS release process, this release candidate is intended as the final review stage before the official CPACS v3.5.1 release. We kindly invite the CPACS community to review the proposed changes and provide feedback during the review phase.
</div>

Unless major concerns are raised, the feedback received on this release candidate will be used to prepare the final CPACS v3.5.1 release.

Many thanks to everyone who contributed to the current schema refinements and extensions!