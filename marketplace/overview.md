# Estimate

Play Planning Poker in Azure DevOps. Select work from an iteration, query, or your backlog, estimate the effort of those items with your team, and immediately update the work items.

## Support

See [Support](https://github.com/microsoft/azure-boards-estimate/#support) in our GitHub repository for information about how to report issues and get help.

## Updates

**TBD** - 2.4.0
- Cannot select shared query [#59](https://github.com/microsoft/azure-boards-estimate/issues/59)
- Work items which exceeds the limit of 200 [#45](https://github.com/microsoft/azure-boards-estimate/issues/45)
- Developer vote "?" counted as 0 in average calculation [#28](https://github.com/microsoft/azure-boards-estimate/issues/28)
- Only show top 1000 teams/boards in drop down for new Estimate [#18](https://github.com/microsoft/azure-boards-estimate/issues/18)

**7/30/2021** - 2.3.0
- Moved extension to new home for future development.

**8/28/2019** - 2.2.0
- Allow restricting selecting work items/commiting values to the creator of the session [#43](https://github.com/cschleiden/azure-boards-estimate/issues/43)

**7/3/2019** - 2.1.0
- Public release of **Estimate 2**

**2/1/2019** - 2.0.0
- First beta release of the new Estimate version

**11/3/2016** - 1.0.19 
- Fixes backend connection problems.

**4/5/2016** - 1.0.13
- Improved support for projects created from an [inherited process](https://msdn.microsoft.com/en-us/library/vs/alm/work/process/manage-process).

**4/2/2016** - 1.0.11
- Bugfixes for projects created from CMMI template

**3/27/2016** - 1.0.8

- Performance optimizations
- Non-numeric card selections are now indicated as a warning when being revealed:
    ![Warning](marketplace/images/updates/warning.gif)
- Improved support for Internet Explorer 11 when revealing cards


## Estimate work items from your backlog...

Select any number of items on your backlog and start a new session from the context menu.

![Backlog](marketplace/images/backlog-context.png)

## ...or in an iteration

Estimate all work items in an iteration.

![Iteration](marketplace/images/start-iteration.png)

## Work with your team in real-time

See immediately who has joined the session, who has selected a card, who has picked which estimate.

![Team Members](marketplace/images/team-members.png)

## Update your work items as you go

Each estimation is saved to your work items as soon as you have estimated

![Work Items](marketplace/images/work-items.png)

# Quick steps to get started

## Starting a new session

1.  Start a new session:  
    - From backlog by selecting workitems and opening the context menu
    -  Create a Query and start start the session from the context menu or save it to the shared queries and use the *Estimate* hub and select the query
    -  Use the *Estimate* hub and select an iteration
2.  Share the generated link with your team members, so that they are able to join
3.  Once all members have joined, everyone picks a card
4.  After everyone has picked a card, click `Reveal` to reveal everyone's estimate
5.  Select and commit the final estimate
6.  Move on to the next work item. Estimates are automatically saved to the work items.

After you are done, you can end the session.

## Joining an existing session

There are two ways to join an existing session, use a direct link, or pick an existing session from the *Estimate* hub
![Existing Sessions](marketplace/images/join-existing.png)


> Microsoft DevLabs is an outlet for experiments from Microsoft, experiments that represent some of the latest ideas around developer tools. Solutions in this category are designed for broad usage, and you are encouraged to use and provide feedback on them; however, these extensions are not supported nor are any commitments made as to their longevity.
