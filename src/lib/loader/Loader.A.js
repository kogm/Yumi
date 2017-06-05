(function( global ){

	// https://github.com/amdjs/amdjs-api/wiki/AMD
	// https://github.com/amdjs/amdjs-api/blob/master/AMD.md
	/**
	 * define(id?, dependencies?, factory)
	 */
	
	var Yumi = global.Yumi = {};	// 

	/*var hasRequire = typeof global.require === 'function';
	var hasDefine = typeof global.define === 'function';

	if( hasRequire && hasDefine )	return ;*/

	var _document = global.document,
		baseElement = _document.getElementsByTagName("base")[0],
		headElement = baseElement ? baseElement.parentElement : _document.getElementsByTagName("head")[0];


	var noop = function(){},
		oProto = Object.prototype,
		oString = oProto.toString,
		oHasOwn = oProto.hasOwnProperty,
		
		aProto = Array.prototype,
		aSlice = aProto.slice,
		aSplice = aProto.aSplice;

	var readyRegExp = /^(complete|loaded)$/,
		rmakeid = /(#.+|\W)/g; //用于处理掉href中的hash与所有特殊符号，生成长命名空间

	var globalModules = {},	//	所有加载的模块
		globalQueue = {},	// 主模块回调函数队列
		loadings = [],	// 调用的顺序
		config = {};	// 全局配置

	/**
	 * 模块的状态
	 * @type {Object}
	 */
	var ModuleState = {
		INITIALIZE : 'initialize',
		LOADING : 'loading',
		COMPLETE : 'complete'
	};

	var TypeUitl = {
		isArray : Array.isArray || function( _arr ){
			return oString.call( _arr ) === '[object Array]';
		},
		isFunction : function( _fn ){
			return typeof _fn === 'function';
		},
		isUndefined : function( obj ){
			return typeof obj === 'undefined' || oString.call( obj ) === '[object Undefined]';
		}
	};


	var Commons = {
		getPath : function( url ){
			var ret, basePath = config.basePath,
				parent = basePath.substring(0, basePath.lastIndexOf("/"));	//去掉最后/

			if( /^(\w+)(\d)?:.*/.test( url ) ){	// 完整路径
				ret = url;
			} else {
				//parent = parent.substr(0, parent.lastIndexOf("/"));
				var tmp = url.charAt(0);

				if( tmp !== "." && tmp !== "/" )	// 相对根路径 直接是模块名 define('lang')
					ret = basePath + url;

				else if( url.substring(0, 2) === "./" )	// 相对于当前路径	define("./lang")
					ret = basePath + url.substring(2);
				// file:///Users/Eleven/Desktop/main/main.js
				// base : file:///Users/Eleven/Desktop/main/
				else if( url.substring(0, 2) === "..") {	// 相对父路径	define('../app/lang')
					ret = parent + "/" + url;	// file:///Users/Eleven/Desktop/main/../app/lang
					while( /\/\w+\/\.\./.test( ret ) ){	// /main/..
						ret = url.replace( /\/\w+\/\.\./, "" ); // 
					}
				} else if( tmp === "/" )	// 如果是当前加载器的路径
					ret = parent + url;
				else
					throw new Error('can not anaylize the adress');
			}
			
			var src = ret.replace(/[#?].*/, ""), ext;
			if (/\.(css|js)$/.test(src)) { // 处理"http://113.93.55.202/mass.draggable"的情况
	            ext = RegExp.$1;
	        }
	        if (!ext) { //如果没有后缀名,加上后缀名
	            src += ".js";
	            ext = "js";
	        }

			return src;
		},
		createScriptNode : function( url ){
			var scriptEl = _document.createElement('script');
			scriptEl.src = url;
			scriptEl.type = "text/javascript";
			scriptEl.async = true;
			scriptEl.charset = "utf-8";
			return scriptEl;
		},
		scripts : function(){
			return aSlice.call( _document.getElementsByTagName('script') );
		},
		getCurrentPath : function( base ){
			var stack, i, ln, node;
			try{
				a.b.c();
			}catch( exception ){
				stack = exception.stack;
			}
			if( stack ){
				stack = stack.split(/[@ ]/g).pop();	// 取最后一行
				stack = stack[ 0 ] === "(" ? stack.slice( 1, -1 ) : stack.replace(/\s/, "");
				return stack.replace(/(:\d+)?:\d+$/i, "");
			}
		},
		forEach : function( arr, fn ){
			var i = 0, ln = arr.length;
			var result = null;

			for( ; i < ln; i ++ ){
				result = fn( arr[i], i, arr ) ;
				if( result === false )
					break;
			}
		},
		loadResource : function( name ){
			var id = name,
				ret = this.getPath( name ),
				ext;

			if (/\.(css|js)$/.test(ret)) { // 处理"http://113.93.55.202/mass.draggable"的情况
	            ext = RegExp.$1;
	        }

	        if( ext === "js" ){
	        	this.loadJS( ret, name );
	        } else {
	        	this.loadCSS( ret );
	        }
		},
		loadJS : function( src, name ){
			var node = Commons.createScriptNode( src );
			node.setAttribute("data-loadName", name );

			if( node.attachEvent ){
				node.attachEvent( "onreadystatechange", Commons.onScriptLoaded );
			} else {
				node.addEventListener( "load", Commons.onScriptLoaded, false );
			}

			if( baseElement )
				headElement.insertBefore( node, baseElement );
			else
				headElement.appendChild( node );

			return node;
		},
		loadCSS : function( url ){
			var id = url.replace(rmakeid, "");
	        if (!document.getElementById(id)) {
	            var node = document.createElement("link");
	            node.rel = "stylesheet";
	            node.href = url;
	            node.id = id;
	            headElement.appendChild( node );
	        }
		},
		removeScript : function( name ){
			Commons.forEach(Commons.script(), function( node ){
				if( node.getAttribute("data-loadName") === name ){
					node.parentNode.removeChild( node );
					return true;
				}
			});
		},
		removeListener : function( node, fn, eName, ieName ){
			if( node.detachEvent ){
				node.detachEvent( ieName, fn );
			} else {
				node.removeEventListener( eName, fn );
			}
		},
		getScriptData : function( evt ){
			var node = evt.currentTarget || evt.srcElement;
			Commons.removeListener( node, Commons.onScriptLoaded, "load", "onreadystatechange" );

			return {
				name : node.getAttribute("data-loadName"),
				node : node
			}
		},
		onScriptLoaded : function( evt ){
			//if( evt.type == "load" && ( readyRegExp.test( (evt.currentTarget || evt.srcElement).readyState ) ) ){
				var data = Commons.getScriptData( evt );
				var module = globalModules[ data.name ];
				/*if( module.alreadyCount === module.requireCount )
					module.state = 2;*/
				Commons.completeLoad();
			//}
		},
		completeLoad : function(){
			//检测此JS模块的依赖是否都已安装完毕,是则安装自身
	        loop:
		        for (var i = loadings.length, id; id = loadings[--i]; ) {
		            var module = globalQueue[ id ],	// 取模块
		                deps = module.deps;	// 取该模块的依赖项
		                depLen = deps.length,
		                j = 0;
		            
		            for ( j=0 ; j<depLen; j++ ) {	// 遍历依赖模块，并判断依赖模块的状态
		            	var dep = deps[ j ];
		                if ( !globalModules[ dep ] || globalModules[ dep ].state !== ModuleState.COMPLETE) {	//跳过没有加载完成的依赖
		                	continue loop;
		                }
		            }

		            //如果deps是空对象或者其依赖的模块的状态都是2
		            if ( module.state !== ModuleState.COMPLETE ) {	// 如果当前模块的状态不是2，而依赖完成
		                loadings.splice( i, 1 ); //必须先移除再安装，防止在IE下DOM树建完后手动刷新页面，会多次执行它
		                Commons.fireModuleCallBack( module );
		                Commons.completeLoad();//如果成功,则再执行一次,以防有些模块就差本模块没有安装好
		            }

		            /*
			            module.alreadyCount++;
			            result.push( globalModules[ dep ].result );
			            if( module.requireCount === module.alreadyCount ){
			            	Commons.fireModuleCallBack( module, result );
			            }
		            */
		        }
		}
	};	


	config.basePath = Commons.getCurrentPath( true );
	if( !config.basePath ){	// 取head中第一个script元素为基地址
		config.basePath = Commons.scripts().pop().src;
	}
	config.basePath = config.basePath.replace(/[?#].*/, ""); // hash
	// 得到当前脚本所在路径地址 当前脚本所在目录
	config.basePath = config.basePath.substring( 0, config.basePath.lastIndexOf("/")+1 );
	// console.info(config.basePath, config.basePath.substring(0, config.basePath.lastIndexOf("/")));


	/**
	 * 模块定义，在定义时构造出来
	 * @Author 草莓
	 * @Date   2017-06-04
	 * @param  {string}  		name    模块名称
	 * @param  {array}   		deps    依赖项
	 * @param  {function}   	factory 构造函数
	 * @param  {boolean} 		isDefaultDeps 是否是默认参数
	 */
	function NativeModule(id, fileName, deps, factory, isDefaultDeps){
		this.id = id;
		this.fileName = fileName;
		this.deps = TypeUitl.isArray( deps ) ? deps : [];
		this.innerDeps = null;
		this.isDefaultDeps = isDefaultDeps;
		this.factory = TypeUitl.isFunction( factory ) ? factory : noop;

		this.state = ModuleState.INITIALIZE;	// 设置初始化状态
		
		this.requireCount = this.deps.length;
		this.alreadyCount = 0;
		
		// module.exports = exports
		this.module = {
			exports : {}
		};
		this.exports = this.module.exports;
		this.result = null;		// 模块执行的结果

		this.sourceText = factory.toString();

		this.url = undefined;
		this.requireProcessor();
	}
	
	/**
	 * 当没有依赖项时，分析函数内部依赖项
	 * @Author   草莓
	 * @DateTime 2017-06-05
	 * @return   {[type]}   [description]
	 */
	NativeModule.prototype.requireProcessor = function requireProcessor(){
		// require('') | require("")
		var requireReg = /require\(['"]([^'"]+)['"]\)/g;
		var deps = [], result;
		/*while( (result = requireReg.exec( this.sourceText )) ){
			deps.push( result[ 1 ] );
		}*/
		this.sourceText.replace(requireReg,function(word, $1, index, inputStr){
			if( $1 != 'require' && $1 != 'exports' && $1 != 'module' )
				deps.push( $1 );
		});

		this.innerDeps = deps.length > 0 ? deps : null;
	};
	NativeModule.prototype.installModule = function installModule(){
		var id = this.name,
			deps = this.deps,
			i, ln = deps.length,
			dependencies = [], 
			depModule,
			result;

		for( i=0; i<ln; i++ ){
			depModule = this.dependenceProcessor( deps[ i ] );
			dependencies.push( depModule.result || depModule.exports );
		}

		result = module.factory.apply( /*module*/ undefined, dependencies );
		module.state = ModuleState.COMPLETE;

		delete globalQueue[ module.name ];
	};
	NativeModule.prototype.filterDependence = function filterDependence( dep ){
		if( dep === 'require' )	return Yumi.require;
		if( dep === 'exports' ) return this.exports;
		if( dep === 'module' ) return this.module;
		return NativeModule.getCache( dep );
	};

	NativeModule.DefaultDependencies = [ "require", "exports", "module" ];
	NativeModule.isDefaultDependence = function isDefaultDependence(dep){
		return NativeModule.DefaultDependencies.some(function(name){
			return name === dep;
		});
	};

	NativeModule._cache = {};
	NativeModule._nameToId = {};
	NativeModule.getCache = function getCache( id ){
		var instance = NativeModule._cache[ id ];
		if( !instance ){
			id = NativeModule._nameToId[ id ];
			instance = NativeModule._cache[ id ];
		}
		return instance;
	};
	NativeModule.setCache = function( id, instance ){
		NativeModule._cache[ id ] = instance;
		NativeModule._nameToId[ instance.fileName ] = id;
	};
	NativeModule.createModule = function createModule(name, deps, factory, isDefaultDeps){
		var id = new Date().getTime();
		return new NativeModule(id, name, deps, factory, isDefaultDeps);
	};


	/**
	 * [require description]
	 * @Author 草莓
	 * @Date   2017-06-04
	 * @param  {arrray}   deps    依赖项
	 * @param  {function}   factory 模块执行完的回调函数
	 * @return {void}           [description]
	 * @example
	 * 	require(string)
	 * 	require(array, function)
	 */
	Yumi.require = function( deps, factory, module){
		if( Commons.isFunction( deps ) ){		// 修正参数
			factory = deps;
			deps = [];
		}
		if( !deps.length ){	// 没有依赖项的直接调用
			return factory();
		}
		
		if( !module ){	// 处理匿名主模块
			var id = new Date().getTime(),
			module = NativeModule.createModule(id, undefined, deps, factory);
			globalQueue[ id ] = module;
		}

		Commons.forEach(module.deps, function( name, index ){	// 进行依赖模块的加载操作
			if( NativeModule.isDefaultDependence( name ) || NativeModule.getCache( name ) ){	// 如果为默认 or 曾经加载过
				module.alreadyCount ++;
				return ;
			}
			Commons.loadResource( name );	// 否则需要进行加载
		});

		module.state = ModuleState.LOADING;	// 更改主模块状态 为正在加载中

		if( module.alreadyCount === module.requireCount ){
			module.installModule();
		} else {
			loadings.unshift( module.name );	// 添加到对头
		}
	};
	Yumi.require.toUrl = function toUrl( url ){};


	/**
	 * define前置参数过滤器
	 * @Author   草莓
	 * @DateTime 2017-06-05
	 * @param    {[type]}   name     [description]
	 * @param    {[type]}   deps     [description]
	 * @param    {[type]}   factory  [description]
	 * @param    {Function} callback [description]
	 * @return   {[type]}            [description]
	 */
	var preDefineParamFilter = function preDefineParamFilter(name, deps, factory, callback){
		var isDefaultDeps = false;
		/**
		 * define('name', function(){}) 没有依赖项
		 * 表示函数的返回值就是当前模块的运行后的结果
		 */
		if( TypeUitl.isFunction( deps ) ){
			factory = deps;
			deps = NativeModule.DefaultDependencies;	// 默认值
			isDefaultDeps = true;
		}

		/**
		 * define("const"|{}|function)
		 * 直接定义一个模块的值, 作为一个匿名模块
		 * 模块的名字应该默认为模块加载器请求的指定脚本的名字
		 */
		if( TypeUitl.isUndefined( deps ) ){
			if( !TypeUitl.isFunction( name ) ){	// 第一个参数是非函数的匿名模块
				deps = [];
				factory = function(){
					return id;
				};

			} else {	// 函数匿名模块
				deps = NativeModule.DefaultDependencies;
				factory = name;
				name = undefined;	// 重置为匿名模块
				isDefaultDeps = true;
			}
		}

		return callback( NativeModule.createModule(name, deps, factory, isDefaultDeps) );
	};

	/**
	 * 模块定义
	 * @Author 草莓
	 * @Date   2017-06-04
	 * @param  {string|Object|function}   	id      一般情况下为模块的标识[可选]
	 * @param  {array}   					deps    依赖项[可选]
	 * @param  {function}   				factory 模块的构造函数
	 * @return {void}           			[description]
	 */
	Yumi.define = function(name, deps, factory){

		var cached = NativeModule.getCache[ name ];
		if( cached ){
			return cached.exports || cached.result;
		}
		/**
		 * TODO 遗留问题
		 * 匿名模块id更换和名称对应
		 * 代码抽取
		 */

		preDefineParamFilter(name, deps, factory, function(moduleInstance){
			// 没有依赖项，或者是默认的依赖项
			if( moduleInstance.deps.length == 0 || moduleInstance.isDefaultDeps){
				moduleInstance.state = ModuleState.COMPLETE;
				moduleInstance.url = Commons.getPath( moduleInstance.fileName );

				var result = moduleInstance.factory( Yumi.require, moduleInstance.exports, moduleInstance.module );
				if( !TypeUitl.isUndefined( result ) ){	// 如果有工厂函数you返回值，舍弃exports
					moduleInstance.result = moduleInstance.module.exports = moduleInstance.exports = result;
				}

				NativeModule.setCache( moduleInstance.id, moduleInstance );
				
				return ;
			}

			globalQueue[ moduleInstance.id ] = moduleInstance;	//添加到全局队列里 表示有依赖项要进行加载

			Yumi.require(moduleInstance.deps, function(){
				var ret = factory.apply( undefined, arguments );

				moduleInstance.state = ModuleState.COMPLETE;
				// moduleInstance.result = moduleInstance.exports = ret;
				if( !TypeUitl.isUndefined( ret ) ){	// 如果有工厂函数you返回值，舍弃exports
					moduleInstance.result = moduleInstance.module.exports = moduleInstance.exports = result;
				}

				if( TypeUitl.isUndefined( moduleInstance.url ) ){
					moduleInstance.url = Commons.getPath( moduleInstance.fileName );
				}

				NativeModule.setCache( moduleInstance.id, moduleInstance );

			}, moduleInstance);
		});

	};




	Yumi.define.yAmd = {
		muiltversion : false
	};

// 浏览器端，使用amd，可以不做兼容，直接用window
})( typeof window !== 'undefined' ? window : this );