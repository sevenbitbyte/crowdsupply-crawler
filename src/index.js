/*const debug = require('debug')('crawler')
const verbose = require('debug')('crawler.verbose')

const Wreck = require('@hapi/wreck')
const DOMParser = require('dom-parser')
//const DOMParser = require('xmldom').DOMParser


const BASE_URL = 'https://www.crowdsupply.com'


const crawlList = ['/browse?page=1']

function nodeListToArray(list){
  let arr = []

  for(let i=0; i<list.length; i++){
    arr[i] = list.item(i)
  }

  return arr
}

async function indexNextUrl(document){
  const nextLI = document.getElementsByClassName('next')[0]
  const nextA = nextLI.getElementsByTagName('a')[0]
  const nextHrefAttr = nextA.attributes.filter(attr=> attr.name == 'href')[0]
  const next = nextHrefAttr.value

  debug('next',next)

  crawlList.unshift(next)

  debug(crawlList)
}


async function crawlPage(){
  const url = crawlList.shift()
  debug('crawling -', url)
  let {res, payload} =  await Wreck.get(BASE_URL + url)

  

  if(payload instanceof Buffer){
    payload = payload.toString()
  }

  const document = (new DOMParser()).parseFromString(payload)

  const isBrowse = new RegExp('browse')
  if(isBrowse.test(url)){
    try{
      await indexNextUrl(document)
      await indexProjectList(document)
    } catch(err){
      // ignoring parse errors
      verbose('ign - failed to index @ ', url)
    }
  }
}
*/

const Config = require('./config')
const CSCrawler = require('./crawler')

async function main(){
  const config = new Config()
  const crawler = new CSCrawler(config)
  await crawler.start()
}


main().catch((error) => {
  console.log(error)
  console.error(error.message)
  process.exit()
})

