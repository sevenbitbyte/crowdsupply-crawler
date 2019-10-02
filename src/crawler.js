const debug = require('debug')('crawler')
const verbose = require('debug')('crawler.verbose')

const Loki = require('lokijs')
const LokiFS = Loki.LokiFsAdapter

const Cheerio = require('cheerio')
const Crawler = require("crawler")

const BROWSE_CRAWL_INTERVAL = 1000*60*60*2
const PROJECT_CRAWL_INTERVAL = 1000*60*60*24


class CrowdSupplyCrawler extends Crawler {
  constructor(config){
    super({ /*rateLimit: 750,*/ maxConnections: 5 })

    this.db = null
    this.base = 'https://www.crowdsupply.com'
    this.config = config

    this.domcache = null
  }

  async start(){
    this.config.touchDir('dom-cache')

    const loadDb = new Promise((resolve,reject)=>{
      this.db = new Loki(this.config.filePath('dom-cache.db'), {
        autosave: true,
        autosaveInterval: 10000,
      })

      this.db.loadDatabase({}, ()=>{
        debug('db ready')
        this.domcache = this.db.getCollection('domcache')
        if(!this.domcache){ this.domcache = this.db.addCollection('domcache', { indices: ['uri'] }) }

        this.projects = this.db.getCollection('projects')
        if(!this.projects){ this.projects = this.db.addCollection('projects', { indices: ['uri', 'name', 'creator'] }) }

        resolve()
      })
    })

    await loadDb
    

    this.on('drain', ()=>{debug('done'); this.save()})

    await this.push('/browse?page=1')
  }

  async save(){
    this.db.saveDatabase(()=>{
      console.log('saved db')
    })
  }

  async push(uri){
    debug('push -', uri)

    const limitMs = Date.now() - BROWSE_CRAWL_INTERVAL
    debug(limitMs)
    let cache = this.domcache.findOne({
      uri: uri,
      base: this.base,
      timestamp: {'$gt': limitMs}
    })

    if(!cache){
      debug('crawling -', uri)
      this.queue({uri: this.base + uri, callback: this.onCallback.bind(this)})
    } else {
      debug('cached -', uri)
      debug(cache.timestamp)
      const $ = Cheerio.load(cache.body)
      debug('parsed -', uri)

      await this.parseContent(uri, $)
    }
  }

  async parseContent(uri, $){
    await this.indexBrowsePage(uri, $)
    await this.indexProjectPage(uri, $)
  }

  async onCallback(error, res, done){

    if(error){
      debug(error);
    }else{
      debug('onCallback -', res.request.uri.path)

      //this.config.fileExists('dom-cache/'+)
      
      
      const uri = res.request.uri.path

      if(uri == '/login'){
        debug('bail -', uri)
        return done()
      }

      let cacheDoc = this.domcache.findOne({uri: uri, base: this.base})

      const content = {
        uri: uri,
        base: this.base,
        timestamp: Date.now(),
        body: res.body
      }

      if(!cacheDoc){
        cacheDoc = content
        this.domcache.insert(content)
      } else {
        cacheDoc = Object.assign(cacheDoc, content)
        this.domcache.update(cacheDoc)
      }

      await this.parseContent(uri, res.$)
      
    }

    done()
  }

  async indexBrowsePage(uri, $){
    const isBrowse = new RegExp('browse')
    if(isBrowse.test(uri)){
      try{
        debug('indexBrowsePage',uri)


        const nextUri = $('li.next').find('a').attr('href')

        if(nextUri){
          debug('nextUri -',  nextUri)
          this.push(nextUri)
        }

        const projects= $('a.project-tile')
        const projectUris = []

        projects.each(function(idx, val){
          projectUris.push( $(this).attr('href') )
        })

        console.log(projectUris)

        projectUris.map((projectUri)=>{
          //this.push(projectUri)
          this.push(projectUri + '/crowdfunding')
        })

        debug('projects -', projectUris.length)

        
      } catch(err){
        // ignoring parse errors
        verbose(err)
        verbose('ign - failed to index @ ', uri)
      }
    }
  }

  // div.project-block
  //    p.project-pledged
  //    p.project-goal
  //    div.status-bar
  //    div.factoids
  //      div.fact

  // div.project-block
  //    div#products
  //    p.pledge-level-price
  //    h3 - name

  // div.project-block
  //    div#details

  // div.project-block div#creator

  async indexProjectPage(uri, $){

    const path = uri.split('/')
    if(path[3] == 'crowdfunding' && path.length==4){
      debug('crowdfunding -', uri)

      let project = {
        uri: uri,
        base: this.base,
        name: uri.split('/')[2],
        creator: uri.split('/')[1],
        timestamp: Date.now(),
        pledges: []
      }


      const limitMs = Date.now() - PROJECT_CRAWL_INTERVAL
      verbose('indexProjectPage - limitMs -', limitMs)
      let projectDoc = this.projects.findOne({
        uri: uri,
        base: this.base,
        name: project.name,
        creator: project.creator,
        timestamp: {'$gt': limitMs}
      })

      if(projectDoc){
        debug('indexProjectPage - skipping -', uri)
        //return
      }

      let factoids = $('div.project-block div.factoids div.fact')
      if(factoids){
        factoids.each((idx,val)=>{
          const text = $(val).text().trim().replace('\n','')

          if(text.indexOf('updates') > 0) {

            project.updateCount = parseFloat( text.replace('updates','').trim() )

          } else if(text.indexOf('funded on') > 0) {

            project.fundedOn = new Date(text.replace('funded on','').trim() )

          } else if(text.indexOf('days left') > 0) {

            project.daysLeft = parseFloat(text.replace('days left','').trim() )

          } else if(text.indexOf('backers') > 0) {

            project.backerCount = parseInt(text.replace('backers','').trim().replace(',','').replace('\n') )

            console.log(text)
            console.log(project.backerCount)

            if(text.indexOf(',')>0){
              //process.exit()
            }

          } else {
            debug (text)
          }

        })
      }

      let pledges = $('div.project-block div.pledge-level div.clearfix')
      if(pledges){

        debug('pledges', pledges.length)

        pledges.each((idx, val)=>{
          let pledge = {}
          let price = $(val).find('p.pledge-level-price').text()
          if(price){
            pledge.price = parseFloat(price.trim()
              .replace('$','')
              .replace(',', '')
            )
          }

          let name = $(val).find('h3')
          if(name && name[0]){
            pledge.name = name.text()
          }

          let delivery = $(val).find('p.pledge-level-delivery').text()
          if(delivery){
            pledge.delivery = delivery.trim()
          }

          let shipping = $(val).find('p.pledge-level-shipping').text()
          if(shipping){
            pledge.shipping = shipping.trim()
          }

          if(pledge != {}){
            project.pledges.push(pledge)
          }
        })
      }

      // pledged //
      let pledged = $('div.project-block p.project-pledged').text()
      if( pledged ){
        project.pledged = parseFloat(
          pledged.trim()
          .replace('$','')
          .replace(',','')
          .replace('raised','')
        )
      }

      let goal = $('div.project-block p.project-goal').text()
      if( goal ){
        project.goal = parseFloat(
          goal.trim()
          .replace('$','')
          .replace(',','')
          .replace('of','')
          .replace('goal','')
        )
      }

      verbose(project)

      if(!projectDoc){
        projectDoc = this.projects.insert(project)
      } else {

        projectDoc = Object.assign(projectDoc, project)
        this.projects.update(projectDoc)

      }

      //this.save()

      //process.exit(0)
    }
  }
}

module.exports = CrowdSupplyCrawler
