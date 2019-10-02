'use strict';


const fs = require('fs')
const os = require('os')
const Hoek = require('hoek')
const Path = require('path')
const nconf = require('nconf')
const touch = require('touch')
const mkdirp = require('mkdirp')
const sanitize = require('sanitize-filename')

const logger = require('debug')('config');


var BASE_PATH = process.env.SNAP_COMMON || ((process.env.HOME) ? (process.env.HOME + '/.crowdsupply-crawler') : '.' )



class Config {

  constructor(defaults){
    this.defaults = defaults || {}
    this.basePath = this.defaults.basePath || BASE_PATH
    //this.defaults.logicalSeparator = '.'
  }

  async open () {
    await this.touchDir('')

    nconf.argv().env({logicalSeparator: '_'}).file({
      file: 'config.json',
      dir: this.basePath,
      search: true,
      logicalSeparator: '.'
    }).defaults(this.defaults)

    logger(`config ready: ${this.basePath}/config.json`)
    return this
  }

  static async config(defaults){
      let c = new Config(defaults)
      await c.open()

      return c
  }

  // Read config file as json
  read(key){
    logger('reading path: ' + key)

    let allData = nconf.get()

    let val = Hoek.reach(allData, key)

    return val
  }

  write(key, data){

    logger('setting key: ' + key)
    if(!nconf.set(key, data)){
      return Promise.reject()
    }

    nconf.save()
    return Promise.resolve()
  }

  save(){
    logger('saving')
    nconf.save()
    return Promise.resolve()
  }


  exists(key){
    return (this.read(key) !== undefined)
  }

  /*
  * cb - (err, data)
  */
  readFile(path, cb){
    var realPath = this.basePath+"/" + Path.dirname(path) + "/" + sanitize(Path.basename(path))

    logger("Reading from file: " + realPath)
    fs.readFile(realPath, 'utf8', cb)
  }

  /*
  * cb - (err)
  */
  writeFile(path, data, cb){
    if(!this.fileExists(path)){
      this.touchFile(path, (p)=>{
        var realPath = this.basePath+"/" + Path.dirname(path) + "/" + sanitize(Path.basename(path))
        logger("Writing to file: " + realPath)
        fs.writeFile(realPath, data, null, cb)
      })
    }
    else{
      var realPath = this.basePath+"/" + Path.dirname(path) + "/" + sanitize(Path.basename(path))
      logger("Writing to file: " + realPath)
      fs.writeFile(realPath, data, null, cb)
    }
  }

  fileExists(path){
    var realPath = this.basePath+"/" + Path.dirname(path) + "/" + sanitize(Path.basename(path))

    return fs.existsSync(realPath)
  }

  /*
    cb - (path)
  */
  touchFile(path, cb){
    mkdirp(this.basePath+"/" + Path.dirname(path), (err)=>{
      if(err){
        logger("mkdirp failed:" + err);
      }

      touch(this.basePath+"/" + Path.dirname(path) + '/'+ sanitize(Path.basename(path)), null, ()=>{
        cb(Path.dirname(path) + '/' + sanitize(Path.basename(path)))
      });
    })
  }

  touchDir (path) {
    return new Promise((resolve, reject) => {
      const basedPath = Path.join(this.basePath, path)
      mkdirp(basedPath, (error) => {
        if (error) {
          logger(`failed to mkdirp '${basedPath}':`, error)
          return reject(error)
        }

        // resolve to adjusted path on success
        resolve(basedPath)
      })
    })
  }

  rmDir(path){
    return new Promise((resolve, reject)=>{
      let resolvedPath = this.basePath +'/'+ sanitize(Path.basename(path))
      logger('rmDir ' + resolvedPath)
      rimraf(resolvedPath, (err)=>{
        if(err){
          logger("rmdir failed:" + err);
          return reject(err)
        }

        resolve()
      })
    })
  }

  rmFile(path){
    return new Promise((resolve, reject)=>{
      let resolvedPath = this.basePath +'/'+ Path.dirname(path) + '/'+ sanitize(Path.basename(path))
      logger('rmFile ' + resolvedPath)
      fs.unlink(resolvedPath, (err)=>{
        if(err){
          logger("unlink failed:" + err);
          return reject(err)
        }

        resolve()
      })
    })
  }

  filePath(path){
    return this.basePath+"/" + Path.dirname(path) + '/'+ sanitize(Path.basename(path))
  }
}

module.exports = Config
