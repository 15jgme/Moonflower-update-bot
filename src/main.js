const arxiv = require("arxiv-api");
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://149.248.62.135:15007');
let freshArticleDb = true;

// Do an initial check on how many articles we have
const resultList = await pb.collection('articles').getList(1, 50, {
  sort: '-created',
});

if(resultList){
  
}



async function fetchPaper() {
  const papers = await arxiv.search({
    searchQueryParams: [
      {
        include: [{ name:"cs.lg", prefix:"cat"}, { name:"cs.lg", prefix:"cat"}],
      },
    ],
    start: 0,
    maxResults: 10,
    sortBy: "submittedDate",
    sortOrder: "descending"
  });
  console.log(papers);
  // console.log(papers.length());
  console.log(papers[0]);
  console.log("Finished");
}

fetchPaper();

// setTimeout(() => {  console.log("World!"); }, 15000);
