## CrowdSupply Crawler

This is a crawler designed for personal use to help creators select the crowd funding platforms that work the best for reaching their markets.

I frequently see awesome products being launched on crowd funding platforms that do not fit the user base. The purpose of this project is to encourage creators make products targetting OpenSource hardware enthuasits to consider using CrowdSupply. I hope this project provides the empirical that might convince some to become part of the CrowdSupply community.

### Usage

```
yarn
yarn start
yarn projects-summary > output.csv
```

## Data Collection

The crawler makes heavy use of caching to reduce traffic to CrowdSupply. All data is placed into a LokiJS database in stored to the location `~/.crowdsupply-crawler/dom-cache.db`

Crawling occurs in three steps,

1. Crawl and cache `/browse` page HTML
2. Parse cached browse pages for project page links
3. Crawl and cache project page HTML
4. Parse cached project pages


### Caching

All content that will parsed is first placed in cache. This enables re-parsing at a later time without requiring additional crawler traffic.

### Rate Limits

 * Pages are visited at most once per second
 * Browse page visits are rate limited to at most one visit per 2-hour period
 * Project page visits are rate limited to at most one visit per 24-hour period

## Data Schema

The lokijs database contains two tables:

1. `domcache` - Cache of crawled HTML
2. `projects` - Parsed project data

### Table `domcache`

```
{
  uri: String,        // Path of URL
  base: String,       // Base URL
  timestamp: Date,    // Time of last crawl
  body: String        // Returned raw HTML
}
```


### Table - `projects`



Project pages 

```
{
  uri: String,        // Path of URL
  base: String,       // Base URL
  name: String,       // Project Name
  creator: String,    // Creator Name
  timestamp: Date,    // Time of last parse
  updateCount: Number,// Number of creator updates
  fundedOn: Date,     // Date of successful funding
  daysLeft: Number,   // Days remaining
  backerCount: Number,// Number of backers
  pledged: Number,    // Funding pledged
  goal: Number,       // Stated funding goal
  pledges: [{         // Pledge rewards
    name: String,
    price: Number,
    delivery: String,
    shipping: String
  }]
}
```
