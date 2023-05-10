// This file is responsible for handling the communication between the extension and the website
// It sends a message to the background script to retrieve the professor's info from RMP
// The background script then sends the info back to this script, which inserts it into the page
// The background script is necessary because the website is not allowed to make requests to RMP
// due to CORS restrictions.

/*
    id: 'U2Nob29sLTE1MzA=',
    name: 'University of Washington Seattle',
    id: 'U2Nob29sLTQ0NjY=',
    name: 'University of Washington Bothell',
    id: 'U2Nob29sLTQ3NDQ=',
    name: 'University of Washington Tacoma',
    */

// page and prof I am testing with https://myplan.uw.edu/course/#/courses/INFO%20340?id=87022718-a92e-4ac7-b774-2a6289c77ff4&states=N4Ig7gDgziBcLADrgJYDsAmB7MAJApigOYAWALsrAGwDsADADTJjrZgAKWUKZKWalACwBOAL4hRQA

console.log('background script running');

const AUTH_TOKEN = 'dGVzdDp0ZXN0';
const SCHOOL_ID = 'U2Nob29sLTE1MzA=';

const PROXY_URL = 'https://api.allorigins.win/raw?url=';

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
		} catch (error) {
			console.error('Error parsing JSON:', error);
			throw new Error('Error parsing JSON: ' + text);
		}
		console.log('json response:', json);
		if (json.data.newSearch.teachers === null) {
			console.log('No results found for professor:', name);
			return [];
		}

		console.log(
			'Professors found:',
			json.data.newSearch.teachers.edges.map((edge) => edge.node)
		);
		return json.data.newSearch.teachers.edges.map((edge) => edge.node);
	} catch (error) {
		console.error('Error searching for professor:', error);
		throw error;
	}
};

const getProfessor = async (id) => {
	console.log('Fetching professor data for ID:', id);
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
		console.log('Professor data:', json.data.node);
		return json.data.node;
	} catch (error) {
		console.error('Error fetching professor data:', error);
		throw error;
	}
};

async function sendProfessorInfo(professorName) {
	const normalizedName = professorName.normalize('NFKD');
	try {
		const professors = await searchProfessor(normalizedName, SCHOOL_ID);

		if (professors.length === 0) {
			return { error: 'Professor not found' };
		}

		const professorID = professors[0].id;
		const professor = await getProfessor(professorID);
		console.log(professor);
		return professor;
	} catch (error) {
		console.error('Error sending professor info:', error);
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
