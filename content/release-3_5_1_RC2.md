Title: CPACS v3.5.1-RC2 available for review
Date: 2026-07-04 10:00
Category: Releases
Author: Marko

<div style="padding: 1.1rem 1.3rem; border-left: 4px solid #1f77b4; background: #f5f9fc; margin-bottom: 1.5rem;">
<strong>CPACS v3.5.1-RC2 is now available for community review.</strong><br>
This second release candidate provides an updated review state for CPACS v3.5.1, with a particular focus on the refined structure of predefined <code>systemElements</code>.
</div>

CPACS v3.5.1-RC2 continues the refinement work on top of CPACS v3.5 and follows the first release candidate published in May. While the overall release scope remains unchanged, the definition of predefined `systemElements` has been significantly elaborated based on the ongoing review and implementation work.

The updated `systemElements` structure is now organized in a clearer function-oriented hierarchy. Predefined system elements are grouped according to their primary functional role, for example into electrical, mechanical, pneumatic, hydraulic, and thermo-fluid elements.

Within these domains, elements are further organized into functional categories where applicable:

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin: 1.5rem 0;">

<div style="padding: 1rem; border: 1px solid #ddd; border-radius: 8px; background: #fff;">
<strong>Storage</strong><br>
Elements that store energy, mass, pressure, or other physical quantities.
</div>

<div style="padding: 1rem; border: 1px solid #ddd; border-radius: 8px; background: #fff;">
<strong>Conversion</strong><br>
Elements that convert energy, power, flow, or signals from one form into another.
</div>

<div style="padding: 1rem; border: 1px solid #ddd; border-radius: 8px; background: #fff;">
<strong>Distribution</strong><br>
Elements that transport or distribute electrical, mechanical, pneumatic, hydraulic, or thermo-fluid quantities.
</div>

<div style="padding: 1rem; border: 1px solid #ddd; border-radius: 8px; background: #fff;">
<strong>Control</strong><br>
Elements that switch, regulate, protect, or monitor system behavior.
</div>

</div>

The goal of this additional review step is to make the predefined system element library easier to understand, easier to extend, and more consistent for CPACS users and tool developers.

## Relevant links

- [CPACS v3.5.1-RC2 release](https://github.com/DLR-SL/CPACS/releases/tag/v3.5.1-RC2)
- [CPACS v3.5.1-RC2 documentation](https://dlr-sl.github.io/CPACS/html/88830dfb-9468-15e9-2772-2eb249b0a0ac.htm)
- [Discussion and feedback thread](https://github.com/DLR-SL/CPACS/discussions/862)

<div style="padding: 1.1rem 1.3rem; border-radius: 8px; background: #f7f7f7; margin: 1.5rem 0;">
<strong>Review deadline: 28 July 2026</strong><br>
We kindly invite the CPACS community to review the updated <code>systemElements</code> definition and provide feedback by this date.
</div>

In particular, we would appreciate feedback on the following points:

- Is the new functional grouping of predefined system elements clear and intuitive?
- Are the names of the hierarchy levels and element classes understandable and consistent?
- Is the distinction between generic and specialized system elements useful for your applications?
- Are any relevant predefined system element classes missing or misplaced?
- Does the updated structure introduce migration or implementation concerns for existing tools and data sets?

Unless major concerns are raised during this review period, the feedback received by 28 July will be used to finalize CPACS v3.5.1.

Many thanks to everyone who contributed to the current schema refinements and extensions!