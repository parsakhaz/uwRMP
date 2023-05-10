// This file is responsible for handling the communication between the extension and the website
// It sends a message to the background script to retrieve the professor's info from RMP
// The background script then sends the info back to this script, which inserts it into the page
// The background script is necessary because the website is not allowed to make requests to RMP
// due to CORS restrictions.

// console.log('background script running');

const AUTH_TOKEN = 'dGVzdDp0ZXN0';
// UWS, UWB, UWT
const SCHOOL_ID = ['U2Nob29sLTE1MzA=', 'U2Nob29sLTQ0NjY=', 'U2Nob29sLTQ3NDQ='];
// Not needed for MV2
const PROXY_URL = 'http://140.238.154.147:8088/';

const searchProfessor = async (name, schoolID) => {
	console.log('Searching for professor:', name);
	try {
		const response = await fetch(`${PROXY_URL}https://www.ratemyprofessors.com/graphql`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Basic ${AUTH_TOKEN}`,
			},
			body: JSON.stringify({
				query: `query NewSearchTeachersQuery($text: String!, $schoolID: ID!) {
              newSearch {
                teachers(query: {text: $text, schoolID: $schoolID}) {
                  edges {
                    cursor
                    node {
                      id
                      firstName
                      lastName
                      school {
                        name
                        id
                      }
                    }
                  }
                }
              }
            }`,
				variables: {
					text: name,
					schoolID,
				},
			}),
		});
		const text = await response.text();
		let json;
		try {
			json = JSON.parse(text);
			// console.log('json response for ' + name + ' at ' + schoolID, json);
		} catch (error) {
			console.error('Error parsing JSON:', error);
			throw new Error('Error parsing JSON: ' + text);
		}
		if (json.data.newSearch.teachers === null) {
			// console.log('No results found for professor:', name);
			return [];
		}

		return json.data.newSearch.teachers.edges.map((edge) => edge.node);
	} catch (error) {
		console.error('Error searching for professor:', error);
		throw error;
	}
};

const getProfessor = async (id) => {
	// console.log('Fetching professor data for ID:', id);
	try {
		const response = await fetch(`${PROXY_URL}https://www.ratemyprofessors.com/graphql`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Basic ${AUTH_TOKEN}`,
			},
			body: JSON.stringify({
				query: `query TeacherRatingsPageQuery($id: ID!) {
              node(id: $id) {
                ... on Teacher {
                  id
                  firstName
                  lastName
                  school {
                    name
                    id
                    city
                    state
                  }
                  avgDifficulty
                  avgRating
                  department
                  numRatings
                  legacyId
                  wouldTakeAgainPercent
                }
                id
              }
            }`,
				variables: {
					id,
				},
			}),
		});
		const json = await response.json();
		// console.log('Professor data by ID: ' + id, json.data.node);
		return json.data.node;
	} catch (error) {
		console.error('Error fetching professor data:', error);
		throw error;
	}
};

async function sendProfessorInfo(professorName) {
	const normalizedName = professorName.normalize('NFKD');
	try {
		// for each in SCHOOL_ID, search for professor
		// if found, get professor info, if not found, continue
		let professorID;
		for (let i = 0; i < SCHOOL_ID.length; i++) {
			const professors = await searchProfessor(normalizedName, SCHOOL_ID[i]);
			if (professors.length === 0) {
				// console.log('No ' + professorName + ' found at RMP for schoolID:', SCHOOL_ID[i] + ', continuing to next SchoolID');
				continue;
			}
			professorID = professors[0].id;
			console.log('SUCCESS! ' + professorName + ' professorID: ' + professorID + ' found at schoolID: ' + SCHOOL_ID[i]);
			break;
		}
		if (professorID === undefined) {
			console.log('No ' + professorName + ' found for any schoolID:', SCHOOL_ID);
			return { error: professorName + ' not found on RMP for any given SCHOOL_ID' };
		}
		const professor = await getProfessor(professorID);
		console.log(professor);
		return professor;
	} catch (error) {
		console.error('Error sending professor info for ' + professorName, error);
		throw error;
	}
}

chrome.runtime.onConnect.addListener((port) => {
	port.onMessage.addListener((request) => {
		sendProfessorInfo(request.professorName)
			.then((professor) => {
				port.postMessage(professor);
			})
			.catch((error) => {
				console.error('Error:', error);
				port.postMessage({ error });
			});
	});
});
