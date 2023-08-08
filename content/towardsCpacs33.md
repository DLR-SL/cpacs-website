Title: Towards CPACS 3.3
Date: 2020-10-10 17:30
Category: Releases
Author: Marko


As we are approaching the next CPACS release, I would like to present the major enhancements and adjustments we have been discussing over the last months. It should be emphasized that these are **not yet final decisions and everyone is invited to participate** in the current topics.

The initiators and main contributors to a proposal are identified by a label (e.g., ![DLR SL]({static}/images/standardIcons/dlr_sl.png)). If you would like to contribute to a specific topic you may just [contact us](mailto:cpacs@dlr.de) and we will arrange an exchange to the responsible persons.

The [![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/89b6a288-0944-bd56-a1ef-8d3c8e48ad95.htm) label forwards you to the online documentation. The corresponding GitHub issues are linked as [#123](https://github.com/DLR-SL/CPACS/issues) and contain all details of the previous and ongoing discussions. A comprehensive overview of the corresponding GitHub activities is given in the [Kanban board](https://github.com/DLR-SL/CPACS/projects/5):

[![GitHub Kanban board]({static}/images/towardsCpacs33/kanban.png)](https://github.com/DLR-SL/CPACS/projects/5)

## Release schedule

The typical CPACS release candidate should not contain too many changes. Since we are still working on some details (e.g., linking the mission definition and aircraft configurations or possibly the consideration of modified engine maps), but most of the suggestions are ready for practical use, a **beta version will be released towards the end of October**. This release will summarize all proposals in one schema file, provide all example files and of course the documentation. On the basis of this beta version, **topic-specific community meetings** will be scheduled for November. A detailed planning and invitation will be issued in the next days. Here we will jointly discuss the scheduling of the release candidate (depending on how many modifications are still necessary) and the final release, which is **roughly scheduled at the end of this year**. 

In parallel to these developments, we continue the work on **system architectures in CPACS** which are scheduled for the next [release V3.4](https://github.com/DLR-SL/CPACS/projects/7).

---------------------------------------

# Landing gears

![Airbus Defence and Space]({static}/images/standardIcons/airbus_ds.png) ![Bauhaus Luftfahrt]({static}/images/standardIcons/bhl.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/246d158f-247b-1df7-7c6b-cb58a93f420d.htm)
[#632](https://github.com/DLR-SL/CPACS/issues/632) [#657](https://github.com/DLR-SL/CPACS/issues/657)

With the previous definition of the landing gear no detailed geometrical assembly could be defined. This proposal replaces the old definition, which now offers the choice between a set of preliminary design parameters and a more detailed assembly.
The latter was developed as part of a student research project at Airbus DS and finalized in close cooperation with Bauhaus Luftfahrt. 

* [Example file](https://github.com/DLR-SL/CPACS/blob/develop/examples/landingGears.xml)

![landingGear]({static}/images/towardsCpacs33/landingGears_xsd.png)

---------------------------------------

# Geometry and Mass

## New profile based structural elements
![Airbus Defence and Space]({static}/images/standardIcons/airbus_ds.png) ![DLR SL]({static}/images/standardIcons/dlr_sl.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/fe642ebd-7be0-9d25-8d6e-046fbfb6f0ba.htm)
[#627](https://github.com/DLR-SL/CPACS/issues/627)

Following a proposal from Airbus DS, new profile-based structural elements were added. In this context the illustrations were revised. Feedback from DLR-SL was that the profiles *T1* and *T2* were not really necessary as an addition to the *T*-profile, because they can still be transformed at a later point, for example when placing the stringers. So far, however, no real counter-argument has been received. If this topic concerns you, please let me know.

* [Example file](https://github.com/DLR-SL/CPACS/blob/develop/examples/profileBasedStructuralElement.xml)

![standard profiles]({static}/images/towardsCpacs33/standard_profiles.png)

## New symmetry flags
![DLR SC]({static}/images/standardIcons/dlr_sc.png) ![Airbus Defence and Space]({static}/images/standardIcons/airbus_ds.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/c36b451c-a6be-744a-3258-acf8d83aa034.htm)
[#643](https://github.com/DLR-SL/CPACS/issues/643)

With the current CPACS version it is not possible to remove symmetry of a component having a parent component with symmetry being set. Corresponding TiGL functions do exist, but cannot be explicitly addressed via CPACS (see [DLR-SC/tigl#703](https://github.com/DLR-SC/tigl/pull/703)).
Therefore as an interim solution it is proposed to add *none* and *inherit* to the list of possible symmetry types.

## Kinks in profiles
![DLR SC]({static}/images/standardIcons/dlr_sc.png) ![Airbus Defence and Space]({static}/images/standardIcons/airbus_ds.png) 

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/fa52fdcd-76f2-9f37-06a7-6ac060e8a0aa.htm)
[#630](https://github.com/DLR-SL/CPACS/issues/630)

TiGL 3.1 provides a new feature that allows kinks in profiles. To support this the [*pointListXYZVectorType*](https://www.cpacs.de/documentation/CPACS_development/html/fa52fdcd-76f2-9f37-06a7-6ac060e8a0aa.htm) had to be extended by the elements the vectors *kinks* and *parameterMap*. Further information about the TiGL implementation can be found at [the TiGL homepage](https://dlr-sc.github.io/tigl/towards-tigl-31.html).

![kinks in profiles schema]({static}/images/towardsCpacs33/kinks.png)

## Rib posts in wing structures
![Airbus Defence and Space]({static}/images/standardIcons/airbus_ds.png) ![DLR FA]({static}/images/standardIcons/dlr_fa.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/0791b421-cc6f-2854-47c6-01546bcbb9ac.htm)
[#628](https://github.com/DLR-SL/CPACS/issues/628)

The [ribCrossSection](https://www.cpacs.de/documentation/CPACS_development/html/6af2ca50-7215-1b1b-3f10-4ae77b5a1482.htm) element is extended by a [ribPost](https://www.cpacs.de/documentation/CPACS_development/html/0791b421-cc6f-2854-47c6-01546bcbb9ac.htm) element to represent the connection between wing rib and wing spar. 

* [Example file](https://github.com/DLR-SL/CPACS/blob/develop/examples/wingRib.xml)

![rib posts]({static}/images/towardsCpacs33/ribPosts.png)

## Parametric fuselage profiles
![Airbus Defence and Space]({static}/images/standardIcons/airbus_ds.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/3d9a2aa3-f4c6-be22-2fc6-359f3ecc25e6.htm)
[#624](https://github.com/DLR-SL/CPACS/issues/624)

The definition of fuselage profiles is extended by [parametric standard profiles](https://www.cpacs.de/documentation/CPACS_development/html/3d9a2aa3-f4c6-be22-2fc6-359f3ecc25e6.htm) including [super ellipses](https://www.cpacs.de/documentation/CPACS_development/html/9c88da58-2c0e-5faf-03b7-5ec41ca0b1bf.htm) and [rectangles with rounded corners](https://www.cpacs.de/documentation/CPACS_development/html/80914d5c-4e8d-0f58-191e-d7aa32b9720d.htm).

* [Example file](https://github.com/DLR-SL/CPACS/blob/develop/examples/fuselageProfiles.xml)

![fuselage profiles]({static}/images/towardsCpacs33/fuselageProfiles.png)

## Additional mass break down elements
![DLR SL]({static}/images/standardIcons/dlr_sl.png) ![Airbus Defence and Space]({static}/images/standardIcons/airbus_ds.png)
 
[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/ac064609-72d6-5fd3-5b75-9eca22e7adb7.htm)
[#633](https://github.com/DLR-SL/CPACS/issues/633) [#646](https://github.com/DLR-SL/CPACS/issues/646) 

The *massBreakdown* is extended by the *mWalls* element to account for the mass of the new internal walls as introduced in [CPACS 3.1](https://github.com/DLR-SL/CPACS/issues/571). Furthermore the *mMiscellaneous* element, which did only exist under *mWingStructure*, has been added *mFuselageStructure*, *mPowerUnits*, *mSystems* and *mFurnishing*.

![mass breakdown]({static}/images/towardsCpacs33/massBreakdown.png)


## Moments of inertia products becoming optional
![DLR SL]({static}/images/standardIcons/dlr_sl.png) ![DLR BT]({static}/images/standardIcons/dlr_bt.png) ![DLR FA]({static}/images/standardIcons/dlr_fa.png) ![Airbus Defence and Space]({static}/images/standardIcons/airbus_ds.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/3750a387-96b7-43a6-ddc3-86aa7b0541ac.htm)
[#621](https://github.com/DLR-SL/CPACS/issues/621)

In conceptual and pre-design the moments of inertia [*Jxy*, *Jxz* and *Jyz*](https://www.cpacs.de/documentation/CPACS_development/html/3750a387-96b7-43a6-ddc3-86aa7b0541ac.htm) are often not known. Thus, they are set to optional.

![mass inertia]({static}/images/towardsCpacs33/massInertia.png)


---------------------------------------

# Load case analysis

## New ground and flight load case definitions

![DLR FT]({static}/images/standardIcons/dlr_ft.png) ![DLR SR]({static}/images/standardIcons/dlr_sr.png) ![DLR AS]({static}/images/standardIcons/dlr_as.png) ![DLR FA]({static}/images/standardIcons/dlr_fa.png) ![DLR AE]({static}/images/standardIcons/dlr_ae.png) ![DLR BT]({static}/images/standardIcons/dlr_bt.png) ![DLR SL]({static}/images/standardIcons/dlr_sl.png) ![Airbus Defence and Space]({static}/images/standardIcons/airbus_ds.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/2e6b516c-c2be-a097-e026-646744459c00.htm)
[#637](https://github.com/DLR-SL/CPACS/issues/637)

The loadCase definition has been revised. One requirement was that the load distributions could be specified not only for wings and fuselages but also for control surfaces. Therefore the [*dynamicAircraftModel*](https://www.cpacs.de/documentation/CPACS_3_2_0_Docs/html/221eb132-11ff-45bf-dba2-5c8bafd56619.htm) node is replaced by ../model/analysis/global/[*loadApplicationPointSets*](https://www.cpacs.de/documentation/CPACS_development/html/8322bd7d-83e0-0706-a436-31edb803b918.htm). Each set references a specific component, such as wings, fuselage or control surfaces, via its uID.

* [Example file](https://github.com/DLR-SL/CPACS/blob/develop/examples/flightLoadCases.xml)

![Load cases]({static}/images/towardsCpacs33/loadCases.png)

## New aeroCases
![DLR AS]({static}/images/standardIcons/dlr_as.png) ![DLR SL]({static}/images/standardIcons/dlr_sl.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/e9925501-20e4-1b6f-eb65-87f4c0cb5db0.htm)
[#637](https://github.com/DLR-SL/CPACS/issues/637)

As part of the load case definition ([#637](https://github.com/DLR-SL/CPACS/issues/637)) the [aeroCase](https://www.cpacs.de/documentation/CPACS_development/html/e9925501-20e4-1b6f-eb65-87f4c0cb5db0.htm) type has been updated as well in order to provide a consistent aerodynamik breakdown with respect to the various aircraft components.

![Aero cases]({static}/images/towardsCpacs33/aeroCases.png)

## Simplified load envelopes
![DLR AE]({static}/images/standardIcons/dlr_ae.png) ![DLR SL]({static}/images/standardIcons/dlr_sl.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/afb458bf-6696-5516-9b99-9a63a086e459.htm)
[#659](https://github.com/DLR-SL/CPACS/issues/659)

In the course of the revision of the load case definition ([#637](https://github.com/DLR-SL/CPACS/issues/637)), we propose to simplify the load envelope definition. In order to implement it to the final release **feedback is required from the stakeholders who need to further process the data**.
![Load envelopes]({static}/images/towardsCpacs33/loadEnvelopes.png)

## Addition of flight envelopes
![DLR SR]({static}/images/standardIcons/dlr_sr.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/c1f0d6de-8cf5-b0d9-e8a6-629185100ed4.htm)
[#640](https://github.com/DLR-SL/CPACS/issues/640)

As needed for the new load case definition ([#637](https://github.com/DLR-SL/CPACS/issues/637)), a new flightEnvelopes element was added to *../aircraft/model/*[*global*](https://www.cpacs.de/documentation/CPACS_development/html/8959bbfe-5450-6f5f-2017-766cb5d1d5ac.htm)

* [Example file](https://github.com/DLR-SL/CPACS/blob/develop/examples/flightEnvelope.xml)

![Flight envelopes]({static}/images/towardsCpacs33/flightEnvelopes.png)


---------------------------------------

# Flight control

## Update of mission definition
![DLR SR]({static}/images/standardIcons/dlr_sr.png) ![DLR FT]({static}/images/standardIcons/dlr_ft.png) ![DLR SL]({static}/images/standardIcons/dlr_sl.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_missionDefinition/html/7d98b2c8-8287-f2b6-c4a5-70c5dce22214.htm)
[#634](https://www.cpacs.de/documentation/CPACS_development/html/870cfae9-5f47-2e17-c13d-c6cc13b8f06f.htm)

For the upcoming release there are some minor adjustments/extensions in the definition of missions and point performances. Please note that the proposal includes a re-location of *missionDefinition* to allow for a clear destinction between *missionDefinitions* and *pointPerformances*:

* */[cpacs](https://www.cpacs.de/documentation/CPACS_missionDefinition/html/89b6a288-0944-bd56-a1ef-8d3c8e48ad95.htm)/[performanceCases](https://www.cpacs.de/documentation/CPACS_missionDefinition/html/8721655e-0a4e-1030-9c8f-50b65a466d8e.htm)/[missionDefinitions](https://www.cpacs.de/documentation/CPACS_missionDefinition/html/7d98b2c8-8287-f2b6-c4a5-70c5dce22214.htm)*
* */[cpacs](https://www.cpacs.de/documentation/CPACS_missionDefinition/html/89b6a288-0944-bd56-a1ef-8d3c8e48ad95.htm)/[performanceCases](https://www.cpacs.de/documentation/CPACS_missionDefinition/html/8721655e-0a4e-1030-9c8f-50b65a466d8e.htm)/[pointPerformanceDefinitions](https://www.cpacs.de/documentation/CPACS_missionDefinition/html/b3c1b05f-ce84-47a8-75b3-60289bc6b2b5.htm)*

![Performance cases]({static}/images/towardsCpacs33/performanceCases.png)

## Parameter lapses in mission segments
![DLR SR]({static}/images/standardIcons/dlr_sr.png) ![DLR SL]({static}/images/standardIcons/dlr_sl.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_missionDefinition/html/d4402062-174e-73bb-a27c-0f2d314888b7.htm)
[#635](https://github.com/DLR-SL/CPACS/issues/635)

The proposal includes parameter lapses over the mission segments in order to better control mission simulations. **Please have a look at the [pro's and con's](https://github.com/DLR-SL/CPACS/issues/635#issuecomment-653537487) of this proposal and share your opinion with us.**

![Parameter Lapses in mission segments]({static}/images/towardsCpacs33/parameterLapses.png)

## New elements for controllability requirement analysis
![DLR FT]({static}/images/standardIcons/dlr_ft.png) ![DLR SL]({static}/images/standardIcons/dlr_sl.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_missionDefinition/html/df4bc306-71b3-007d-12b9-37bac8ff58a8.htm)
[#638](https://github.com/DLR-SL/CPACS/issues/638)

The *../aircraft/model/*[*performanceRequirements*](https://www.cpacs.de/documentation/CPACS_3_2_0_Docs/html/fa94390a-9148-2851-aeea-1f7251271675.htm) (--> new version *../aircraft/model/*[*requirements*](https://www.cpacs.de/documentation/CPACS_missionDefinition/html/df4bc306-71b3-007d-12b9-37bac8ff58a8.htm)) as well as the *../analysis/*[*flightDynamics*](https://www.cpacs.de/documentation/CPACS_3_2_0_Docs/html/dac92967-c3d4-b6b2-4f94-e3655c83466d.htm) (--> new version: [flightDynamics](https://www.cpacs.de/documentation/CPACS_missionDefinition/html/dac92967-c3d4-b6b2-4f94-e3655c83466d.htm)) element have been modified. 

![Requirements]({static}/images/towardsCpacs33/requirements.png)

![Flight dynamics analysis element]({static}/images/towardsCpacs33/flightDynamics.png)


---------------------------------------

# Kinematic description of control surface tracks
![DLR VPH]({static}/images/standardIcons/vph.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/81453efe-6e85-cf78-6827-7ff72df19f64.htm)
[#605](https://github.com/DLR-SL/CPACS/issues/605)

A revision of the [*track*](https://www.cpacs.de/documentation/CPACS_development/html/ff8d9029-592f-4837-64b5-f65b97d19aa5.htm) element serves to describe detailed flap kinematics in CPACS. From the intiative of the [Virtual Product House](https://www.dlr.de/content/en/articles/aeronautics/aeronautics-research/virtual-product-house.html) in Bremen especially the description of the joint positions and the illustration of the track types were revised and successfully applied in first control surface FEM analysis.

![tracks]({static}/images/towardsCpacs33/tracks.png)

---------------------------------------

# General CPACS features and bug fixes

## New base types
![DLR SL]({static}/images/standardIcons/dlr_sl.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/0cc242e8-b94b-38ee-e725-df80e9e26441.htm)
[#641](https://github.com/DLR-SL/CPACS/issues/641)

CPACS just provides a *stringVectorBaseType*. New string restriction patterns allow for a more precise defintion of vector datatypes such as:

  * *doubleVectorBaseType*
  * *doubleArrayBaseType*
  * *intVectorBaseType*
  * *posIntVectorBaseType*
  * *uIDReferenceVectorBaseType*

![doubleVectorBaseType]({static}/images/towardsCpacs33/doubleVectorBaseType.png)

## Introduction of a configuration node
![DLR SL]({static}/images/standardIcons/dlr_sl.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/e13b65a0-4c46-c708-67e7-de02089f3be6.htm)
[#636](https://github.com/DLR-SL/CPACS/issues/636)

A new node was added to the vehicle description in CPACS: */cpacs/vehicles/../model/global/configurations/configuration*, where the configuration settings are provided and linked to through uID's. Required for: weightAndBalance analysis, loadCase definitions, mission and point performance analysis.

![configurations]({static}/images/towardsCpacs33/configurations.png)

## Multiple increment maps in aeroLimitsMap
![DLR SL]({static}/images/standardIcons/dlr_sl.png) ![DLR AS]({static}/images/standardIcons/dlr_as.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/95f6839c-fb89-fb64-0e13-f92c89a51f95.htm)
[#662](https://github.com/DLR-SL/CPACS/issues/662)

In the current CPACS Version 3.2 the *incrementMap* element was missing under *incrementMaps*. This bug is now fixed.

![incrementMaps]({static}/images/towardsCpacs33/incrementMaps.png)

## Superfluous attribute *mapType* set to optional
![DLR SL]({static}/images/standardIcons/dlr_sl.png) ![DLR AS]({static}/images/standardIcons/dlr_as.png)

[![Online Documentation]({static}/images/standardIcons/chm.png)](https://www.cpacs.de/documentation/CPACS_development/html/0cc242e8-b94b-38ee-e725-df80e9e26441.htm)
[#642](https://github.com/DLR-SL/CPACS/issues/642)

CPACS users know it well: the vectors and arrays contain the *mapType="vector"* attribute. This is set to optional and will be removed in future releases, because the schema (and so the documentation) explicitly provide the correct data type (see [this tutorial](https://github.com/DLR-SL/CPACS_Seminar/blob/master/HowTos/Schema_visualization_II.pdf)). Tixi was already adopted to read vetors without the *mapType* attribute (see [Tixi#143](https://github.com/DLR-SC/tixi/issues/143)). 

![mapType is being removed]({static}/images/towardsCpacs33/mapType.png)

