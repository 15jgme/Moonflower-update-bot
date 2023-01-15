import arxiv from 'arxiv-api';
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://149.248.62.135:15007');
let lastPaperId = '';

//Do an initial check on how many articles we have
let resultList = await pb.collection('articles').getList(1, 50, {
  sort: '-created',
});

if (resultList.totalItems > 0) {
  let lastPaper = resultList.items.pop(); // Assumes we dont need result list in the future
  resultList = []; // Breaking to remember the above change
  lastPaperId = lastPaper['entry_id'];
}

async function fetchPaper() {
  console.log("starting collection")
  // Fetch all catagories
  const catagories = await pb.collection('catagories').getFullList(200 /* batch size */, {
    sort: '-created',
  });

  let searhParamList = []
  let catIdMap = {}
  catagories.forEach(catagory => {
    searhParamList.push({ include: [{ name: catagory.catagory, prefix: 'cat' }] }) // Push name to searchList
    catIdMap[catagory.catagory] = catagory.id;
  })

  // Look at new papers until the last paper is found
  let currentSearchLen = 10
  let lastPaperFound, limitReached = false;
  let papers;
  let index_of_last_paper = 0;
  while (!lastPaperFound && !limitReached
  ) {
    console.log("Checking papers at a depth of " + currentSearchLen)
    // See if our limit is too high
    if (currentSearchLen > 10) {
      limitReached = true;
    } else {
      papers = await arxiv.search({
        searchQueryParams: searhParamList,
        start: 0,
        maxResults: currentSearchLen,
        sortBy: "submittedDate",
        sortOrder: "descending"
      });
      if (lastPaperId == '') { limitReached = true; }
      else {
        papers.forEach((paper, i) => {
          if (paper['id'] == lastPaperId) {
            lastPaperId = paper['id'];
            lastPaperFound = true;
            index_of_last_paper = i;
          }
        })
      }
      // Check if we didn't find anything
      // And increase search depth by 20
      if (!lastPaperFound) { currentSearchLen += 20; }
    }
  }

  let i = 0;
  for await (const paper of papers) {
    const paper = papers[i];

    // Check if the paper we're looking at is new 
    if ((i < index_of_last_paper) || (!lastPaperFound)) {
      console.log("Uploading paper " + i + " current id " + paper['id'])

      // Get catagory ids for this paper
      let catIds = []
      paper['categories'].forEach(catagory => {
        catagory = catagory.term;
        // for each catagory in the paper, 
        // if we have it in the ID map, push it to our ID map array
        if (catIdMap.hasOwnProperty(catagory)) {
          catIds.push(catIdMap[catagory]);
        }

      });
      // Assemble data
      const data = {
        "entry_id": paper['id'],
        "title": paper['title'],
        "created": paper['published'],
        "summary": paper['summary'],
        "doi": paper['doi'],
        // "primary_catagory": "RELATION_RECORD_ID",
        "catagories": catIds,
        "pdf_url": paper['pdf_url']
      };
      try {
        await pb.collection('articles').create(data, { '$autoCancel': false }); // Push new paper data
      } catch (error) {
        console.log("The following error occured" + error);
      } finally{
        console.log("Something went wrong with the article upload");
      }
      
    }
    i = i + 1;
  }
  console.log("Finished fetch")
}
fetchPaper()
setInterval(fetchPaper, 600000);

