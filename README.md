travesty
========

traverse directories in nodejs

usage
-----
```
var travesty = require('travesty')
> travesty
{ [Function: Traverser]
  match: [Function],
  matchers: 
   { dot: '^\\.[\\w\\s-]+',
     tilde: '~$',
     hash: '^#*#$',
     log: '\\.log$' } }


files = travesty('.',{ignore:travesty.match('*')})
{ struct: 
   { '/Users/kaerus/code/nodejs/travesty/LICENSE': 11325,
     '/Users/kaerus/code/nodejs/travesty/README.md': 50,
     '/Users/kaerus/code/nodejs/travesty/index.js': 6304,
     '/Users/kaerus/code/nodejs/travesty/package.json': 535 },
  ignore: /^\.[\w\s-]+|~$|^#*#$|\.log$/,
  follow: false,
  size: 18214,
  items: 4,
  base: '/Users/kaerus/code/nodejs/travesty' }

> files = files.transform()
{ Users: { kaerus: { code: [Object] } } }
> files.Users.kaerus.code
{ nodejs: 
   { travesty: 
      { LICENSE: 11325,
        'README.md': 50,
        'index.js': 6304,
        'package.json': 535 } } }
```


