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

