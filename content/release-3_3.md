Title: CPACS 3.3 published
Date: 2021-06-03 12:00
Category: Releases
Author: Marko

<img src="images/cpacs_logo_v3_3.png"
     alt="cpacs_logo_v3_3"
     width="200px">
     
Dear CPACS community,

we are happy to present CPACS 3.3 with a large feature list. Just check it out:

- [GitHub release link](https://github.com/DLR-SL/CPACS/releases/tag/v3.3)
- [Documentation](https://www.cpacs.de/documentation/CPACS_3_3_0_Docs/html/89b6a288-0944-bd56-a1ef-8d3c8e48ad95.htm) ([download .chm-file](https://www.cpacs.de/documentation/CPACS_3_3_0_Docs/CPACS_Documentation.chm))
- [CPACS 3.3 project board](https://github.com/DLR-SL/CPACS/projects/5)
- [Forum for discussions, questions and general feedback](https://github.com/DLR-SL/CPACS/discussions)

### Feature list 

- Revision of the mission definition including parameter lapses within segments (compatibility break) ([#634](https://github.com/DLR-SL/CPACS/issues/634), [#635](https://github.com/DLR-SL/CPACS/issues/635), [#716](https://github.com/DLR-SL/CPACS/issues/716))
- Revision of the point performance definition (compatibility break) ([#696](https://github.com/DLR-SL/CPACS/issues/696))
- Revision of performance requirements (compatibility break) ([#697](https://github.com/DLR-SL/CPACS/issues/697), [#698](https://github.com/DLR-SL/CPACS/issues/698), [#705](https://github.com/DLR-SL/CPACS/issues/705), [#706](https://github.com/DLR-SL/CPACS/issues/706), [#716](https://github.com/DLR-SL/CPACS/issues/716))
- Revision of landing gears (compatibility break) ([#632](https://github.com/DLR-SL/CPACS/issues/632), [#657](https://github.com/DLR-SL/CPACS/issues/657), [#691](https://github.com/DLR-SL/CPACS/issues/691), [#693](https://github.com/DLR-SL/CPACS/issues/693))
- Revision of control surface tracks definition (compatibility break) ([#605](https://github.com/DLR-SL/CPACS/issues/605))
- Load analysis: Revision of flightLoadCasesType (compatibility break) ([#637](https://github.com/DLR-SL/CPACS/issues/637), [#689](https://github.com/DLR-SL/CPACS/issues/689), [#701](https://github.com/DLR-SL/CPACS/issues/701))
- Load analysis: Revision of aeroCasesType (compatibility break) ([#685](https://github.com/DLR-SL/CPACS/issues/685), [#692](https://github.com/DLR-SL/CPACS/issues/692))
- Load analysis: loadEnvelopesType relocated and envelope simplified to a single uID-Sequence (compatibility break)  ([#659](https://github.com/DLR-SL/CPACS/issues/659))
- Load analysis: Replaced dynamicAircraftModel elements by loadApplicationPointSets (compatibility break) ([#663](https://github.com/DLR-SL/CPACS/issues/663))
- Flight dynamics: Group flightPerformance, flyingQualities and trim under flightDynamics parent node (compatibility break) ([#638](https://github.com/DLR-SL/CPACS/issues/638), [#694](https://github.com/DLR-SL/CPACS/issues/694), [#707](https://github.com/DLR-SL/CPACS/issues/707))
- Introduced a configuration node to describe aircraft and payload configurations ([#636](https://github.com/DLR-SL/CPACS/issues/636), [#700](https://github.com/DLR-SL/CPACS/issues/700))
- Fuselage profiles: Introduced rectangle and super ellipse as standard profiles ([#624](https://github.com/DLR-SL/CPACS/issues/624))
- Fuselage profiles: Added vector to specify curve parameters for profiles with kinks ([#630](https://github.com/DLR-SL/CPACS/issues/630))
- Internal structure: Added standard profiles to profile based structural elements ([#627](https://github.com/DLR-SL/CPACS/issues/627))
- Internal structure: Added ribPosts element to wingRibCrossSectionType ([#628](https://github.com/DLR-SL/CPACS/issues/628))
- Internal structure: Upper and lowerCap now optional in sparCellType ([#684](https://github.com/DLR-SL/CPACS/issues/684))
- Internal structure: Stringers and frames can reference sections ([#680](https://github.com/DLR-SL/CPACS/issues/680))
- MassBreakdown: Set mass inertia Jxy, Jxz and Jyz optional ([#621](https://github.com/DLR-SL/CPACS/issues/621))
- MassBreakdown: Added mMiscellaneous element ([#646](https://github.com/DLR-SL/CPACS/issues/646))
- MassBreakdown: Added fuselage walls ([#633](https://github.com/DLR-SL/CPACS/issues/633))
- Added flight envelope to aircraft global element ([#640](https://github.com/DLR-SL/CPACS/issues/640))
- Added new base types: doubleVectorBaseType, posIntVectorBaseType, doubleArrayBaseType ([#641](https://github.com/DLR-SL/CPACS/issues/641))
- Added 'none' and 'inherit' to list of symmetry flags ([#643](https://github.com/DLR-SL/CPACS/issues/643))
- Set mapType attribute of vector and array elements to optional (requires TiXI>=3.1) ([#642](https://github.com/DLR-SL/CPACS/issues/642))
- AeroMaps: Defined angleOfSideslip as input and added distinction between minimum and maximum angleOfAttack in aeroLimitMaps (compatibility break) ([#676](https://github.com/DLR-SL/CPACS/issues/676), [#687](https://github.com/DLR-SL/CPACS/issues/687))
- AeroMaps: Added missing singular incrementMap element to incrementMaps in aeroLimitsMap (compatibility break) ([#662](https://github.com/DLR-SL/CPACS/issues/662))
- AeroMaps: Adopted the camelCase style for damping derivatives (compatibility break) ([#686](https://github.com/DLR-SL/CPACS/issues/686))
- Introduced common nomenclature for speeds and altitudes (compatibility break) ([#695](https://github.com/DLR-SL/CPACS/issues/695))
- Control distributors are set to optional ([#709](https://github.com/DLR-SL/CPACS/issues/709))
- Added instructions for superposition of control surface deflections ([#710](https://github.com/DLR-SL/CPACS/issues/710))
- Further elaboration of development standards ([#694](https://github.com/DLR-SL/CPACS/issues/694), [#704](https://github.com/DLR-SL/CPACS/issues/704), [#711](https://github.com/DLR-SL/CPACS/issues/711))
- General improvements of the documentation

