# uwRMP
Rate My Professors extension for the UW course portal

Pulls data from the Rate My Professors GraphQL API (https://www.ratemyprofessors.com/graphql)

## Modifying to use with other university course portals

Adapting this extension for use with other universities should be easy-- just change SCHOOL_ID to match your school's unique ID, and then modify the document.querySelectorAll() method to work with your course portal (find the element in which professor names are stored on your universities course portal, and modify querySelectorAll to look for this element). You might need to change the way professor info is displayed on the course portal. Remember to update permissions in manifest.json to match your course portals URL. 

###### Forked from [mahfoozm's YorkURMP](https://github.com/mahfoozm/YorkURMP/tree/mv3)
