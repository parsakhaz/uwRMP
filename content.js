console.log('content script running');

const style = document.createElement('style');
style.innerHTML = `
  .rating {
    margin-top: 7px;
  }
`;
document.head.appendChild(style);

let professorLinks;
const profInterval = setInterval(() => {
  professorLinks = document.querySelectorAll('div.mb-1');
  if (professorLinks.length > 0) {
    clearInterval(profInterval);
    console.log('Prof names found:', professorLinks);
    professorLinks.forEach(async (link) => {
      const professorName = link.textContent;
      try {
        const port = chrome.runtime.connect({ name: 'professor-rating' });
        port.postMessage({ professorName });
        port.onMessage.addListener((teacher) => {
          console.log('Received response for professor:', teacher);
          if (teacher.error) {
            console.error('Error:', teacher.error);
            insertNoProfError(link);
          } else {
            const avgRating = teacher.avgRating;
            const numRatings = teacher.numRatings;
            const avgDifficulty = teacher.avgDifficulty;
            const wouldTakeAgainPercent = parseInt(teacher.wouldTakeAgainPercent);
            const legacyId = teacher.legacyId;

            if (wouldTakeAgainPercent === -1) {
              console.error('Error: No ratings found for professor.');
              insertNoRatingsError(link, legacyId);
              return;
            }

            insertNumRatings(link, numRatings, legacyId);
            insertWouldTakeAgainPercent(link, wouldTakeAgainPercent);
            insertAvgDifficulty(link, avgDifficulty);
            insertRating(link, avgRating);
          }
        });
      } catch (error) {
        console.error('Error:', error);
        insertNoProfError(link);
      }
    });
  } else {
    console.log('Retrying every 500ms until prof names are found...');
  }
}, 500);

function insertRating(link, avgRating) {
  link.insertAdjacentHTML('afterend', `<div class="rating"><b>Rating:</b> ${avgRating}/5</div>`);
}

function insertAvgDifficulty(link, avgDifficulty) {
  link.insertAdjacentHTML('afterend', `<div><b>Difficulty:</b> ${avgDifficulty}/5</div>`);
}

function insertWouldTakeAgainPercent(link, wouldTakeAgainPercent) {
  link.insertAdjacentHTML('afterend', `<div class="rating"><b>${wouldTakeAgainPercent}%</b> of students would take this professor again.</div>`);
}

function insertNumRatings(link, numRatings, legacyId) {
  const profLink = `<a href='https://www.ratemyprofessors.com/professor?tid=${legacyId}'>${numRatings} ratings</a>`;
  link.insertAdjacentHTML('afterend', `<div>${profLink}</div>`);
}

function insertNoRatingsError(link, legacyId) {
  link.insertAdjacentHTML(
    'afterend',
    `<div class="rating"><b>Error:</b> this professor has <a href='https://www.ratemyprofessors.com/professor?tid=${legacyId}'>no ratings on RateMyProfessors.</a></div>`
  );
}

function insertNoProfError(link) {
  link.insertAdjacentHTML('afterend', `<div class="rating"><b>Error:</b> this professor is not registered on RateMyProfessors.</div>`);
}
