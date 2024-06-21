Component Function Information:
- doMongo.js: 
    CALLERS: Express request from React, with optional desired parameters to filter on
    CALLEES: webscrape.js if & only if database hasn't been updated in last x hours
    EXPORTS: Array of user requested objects
- webscrape.js:
    CALLERS: doMongo.js
    CALLEES: None
    EXPORTS: Array of webscraped sales objects to add to MongoDB
- filter.js: parses data based on user request // FIXME: may not be required if MongoDB can do this, and will fit into doMongo.js