const Loki = require('lokijs')
const LokiFS = Loki.LokiFsAdapter

const _ = require('lodash')
const debug = require('debug')('crawler')

const Config = require('./config')


async function main(){
  const config = new Config()
  let db = null
  let domcache = null
  let projects = null

  const loadDb = new Promise((resolve,reject)=>{
    db = new Loki(config.filePath('dom-cache.db'), {
      autosave: false
    })

    db.loadDatabase({}, ()=>{
      debug('db ready')
      domcache = db.getCollection('domcache')
      projects = db.getCollection('projects')

      //db.removeCollection('projects')
      //db.save()
      resolve()
    })
  })

  await loadDb

  let projectDocs = projects.find()

  let fields = ['name', 'creator', 'goal', 'pledged', 'fundedOn', 'pledges', 'backerCount', 'updateCount']

  /*projectDocs.map(doc=>{
    fields = _.union(fields, Object.keys(doc))
  })*/

  let csv = fields.join(',')
    + '\n' 
    + projectDocs.map(doc=>{
      let values = fields.map(field=>{

        if(field == 'pledges'){
          return doc.pledges.length
        }

        return doc[field]
      })

      return values.join(',')
    }).join('\n')

  debug(projectDocs.length)
  console.log(csv)

  
}


main().catch((error) => {
  console.log(error)
  console.error(error.message)
  process.exit()
})

