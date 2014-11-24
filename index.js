/*global module require process */

module.exports = (function(){
    
    var fs = require('fs');
    var path = require('path');
    
    var PSEP = process && process.plattform === 'windows' ? '\\' : '/';

    // some useful file matchers
    var matchers = {
	dot: 	 '^\\.[\\w\\s-]+',
	tilde: 	 '~$',
	hash:  	 '^#*#$',
	log: 	 '\\.log$'
    };
    
    // traverse files (synchronously)
    // examples:
    //   traverse('.',{ignore: /\.log$/ });
    //   traverse('../..',{match: /\.data$/ });
    //   traverse('../..',{match: /\.js$/ , ignore: /^#*#$|~$/ });
    // todo: needs to be refactored
    function Traverser(fspec,options) {

	if(!(this instanceof Traverser))
	    return new Traverser(fspec,options);
	
	this.struct = {};

	if(typeof fspec === 'object'){

	    options = fspec;

	    fspec = undefined;
	}
	
	if(options){

	    if(options.match) this.match = (options.match instanceof RegExp) ? options.match : new RegExp(options.match);

	    if(options.ignore) this.ignore = (options.match instanceof RegExp) ? options.ignore : new RegExp(options.ignore);

	    this.follow = !!options.follow;
	    
	}

	this.size = 0;

	this.items = 0;

	this.base = "";

	if(fspec){

	    if(Array.isArray(fspec)){
		    this.traverse(fspec);		
	    } else {
		
		this.base = path.resolve(fspec);

		this.traverse(fspec);
		
	    }
	    
	}
    }

    Traverser.prototype.traverse = function(file,base){
	var files;
	var absolute;
	var stat;
	var link;
	var self = this;
	
	if(Array.isArray(file)){
	    file.forEach(function(f){
		self.traverse(f,path.resolve(f));
	    });
	    
	    return this;
	};
    
	base = base || "";

	absolute = path.resolve(file);
	
	file = absolute.substr(base.length+1,absolute.length);

	if(this.match){

	    if(!file.match(this.match)) return this;

	}

	if(this.ignore){

	    if(file.match(this.ignore)) return this;

	}
	
	// already visited, ignore
	if(this.struct[absolute]) return this;

	try {

	    stat = fs.lstatSync(absolute);

	} catch(err){

	    // just ignore broken fishy stuff
	    // since that could be hw failure
	    // ,bugs in filesystem etc ...
	    
	    return this;
	}
	
	if(this.follow && stat.isSymbolicLink()){

	    link = fs.readlinkSync(absolute);

	    base = path.dirname(absolute);

	    file = base+PSEP+link;

	    link = path.resolve(file);

	    this.struct[absolute] = link;
	    
	    this.traverse(link,base);
	    
	} else if(stat.isDirectory()) {

	    base = absolute;

	    files = fs.readdirSync(absolute);
	    
	    for(var i = 0, l = files.length; i < l; i++) {
		file = path.resolve(absolute+PSEP+files[i]);
		
		this.traverse(file,base);
	    }
	    
	} else if(stat.isFile()){

	    this.struct[absolute] = stat.size;

	    this.size += stat.size;
	    
	    this.items++;
	}
	
	return this;
    };

    Traverser.prototype.files = function(){
	return Object.keys(this.struct);
    };
    
    // helper for building a matcher
    // examples:
    //   traverse.match(['dot','log']);
    //   traverse.match(['dot','log','^blipfile']);
    //   traverse.match({dot:true, log:false, blip:'^blipfile'})
    //   traverse.match('^myfile');
    //   traverse.match('*');
    Traverser.match = function(options){
	var regexp = [], k;

	if(typeof options === 'object') {

	    if(Array.isArray(options)){

		for(k in options){

		    if(matchers[options[k]]) regexp.push(matchers[options[k]]);
		    else regexp.push(options[k]);
		}
	    }
	    else {

		for(k in options){

		    if(options[k] && matchers[k]) regexp.push(matchers[k]);
		    else regexp.push(options[k]);
		}
		
	    }
	} else {
	    
	    if(options === '*'){

		regexp = Object.keys(matchers).map(function(m){
		    return matchers[m];
		});
		
	    } else {

		regexp.push(matchers[options]);

	    }
	}

	return regexp.join('|');
    };

    // export matchers so they can be modified
    // examples:
    //   traverse.matchers.mymatcher = '^myfile';
    //   delete traverse.matchers.log
    //   var myMatchers = traverse.match('*')
    Traverser.matchers = matchers;

    Traverser.prototype.rebase = function(toBase){
	var self = this;
	
	var result = {};

	var symlinks = [];
	
	var keys, base = "", symlinked, keyval;

	toBase = toBase || "";
	
	keys = Object.keys(this.struct);

	symlinks = keys
	    .filter(function(f){ return typeof self.struct[f] === 'string';})
	    .map(function(m){ return [m,self.struct[m]]; });

	for(var key in this.struct){

	    symlinked = false;

	    for(var link in symlinks){		

		if(key.indexOf(symlinks[link][1]) === 0){

		    keyval = this.struct[key];
		    
		    // is a link path, rebase link path
		    if(typeof keyval ==='string'){

			keyval = symlinks[link][0] + keyval.substr(symlinks[link][1].length,keyval.length);
			
			keyval = toBase + keyval.substr(this.base.length,keyval.length);

		    }

		    // rebase path
		    base = symlinks[link][0] + key.substr(symlinks[link][1].length,key.length);	

		    base = toBase + base.substr(this.base.length,base.length);

		    // store result
		    result[base] = keyval;
		    
		    symlinked = true;

		}

		if(symlinked) break;
	    }
	    if(!symlinked){

		if(typeof this.struct[key] === 'string'){

		    // unresolved symlink
		    // should not happen so needs fixing

		} else {

		    base = toBase + key.substr(this.base.length,key.length);

		    // store result
		    result[base] = this.struct[key];

		}
	    }
	}

	this.struct = result;

	this.base = toBase;
	
	return this;
    };

    // transforms dictionary to a linked list
    Traverser.prototype.transform = function(){
	var list = {}, o, k, i, v;
	var ll; // left side (path)
	var rl; // right side (value)
	var sl = []; // symlinks
	
	for(var key in this.struct){

	    ll = key.split(PSEP);

	    o = list;
  
	    for(k in ll){

		i = ll[k];

		if(!i) continue;

		v = o;

		o[i] = o[i] || {};

		o = o[i];
	    }

	    rl = this.struct[key];
	    
	    if(typeof rl === 'string'){

		sl.push([v[i],rl]);

	    } else {

		v[i] = rl;

	    }
	}

	// connect symlinks
	for(var s in sl){

	    rl = sl[s][1].split(PSEP);

	    o = list;

	    for(k in rl){

		i = rl[k];

		if(!i) continue;

		v = o;

		o = o[i]; // throws error on broken link

	    }
	    
	    sl[s][0] = v[i];
	}
	
	return list;
    };
    
    return Traverser;
}());
