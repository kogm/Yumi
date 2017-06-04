(function( global ){

	// https://github.com/amdjs/amdjs-api/wiki/AMD
	// https://github.com/amdjs/amdjs-api/blob/master/AMD.md
	
	var hasRequire = typeof global.require === 'function';
	var hasDefine = typeof global.define === 'function';

	if( hasRequire && hasDefine )	return ;

	var _document = global.document,
		baseElement = _document.getElementsByTagName("base")[0],
		headElement = baseElement ? baseElement.parentElement : _document.getElementsByTagName("head")[0];


	var noop = function(){},
		oProto = Object.prototype,
		oString = oProto.toString,
		oHasOwn = oProto.hasOwnProperty,
		
		aProto = array.prototype,
		aSlice = aProto.slice,
		aSplice = aProto.aSplice;

	/**
	 * 模块的状态
	 * @type {Object}
	 */
	var ModuleState = {
		INITIALIZE : 'initialize',
		LOADING : 'loading',
		COMPLETE : 'complete'
	};

	var Commons = {
		isArray : Array.isArray || function( _arr ){
			return oString.call( _arr ) === '[object Array]';
		},
		isFunction : function( _fn ){
			return typeof _fn === 'function';
		},
		isUndefined : function( obj ){
			return typeof obj === 'undefined' || oString.call( obj ) === '[object Undefined]';
		},
		getPath : function( id ){

		}
	};	

	/**
	 * 模块定义，在定义时构造出来
	 * @Author 草莓
	 * @Date   2017-06-04
	 * @param  {string}  name    模块名称
	 * @param  {array}   deps    依赖项
	 * @param  {function}   factory 构造函数
	 */
	function NativeModule(name, deps, factory){
		this.name = name;
		this.deps = Commons.isArray( deps ) ? deps : [];
		this.factory = Commons.isFunction( factory ) ? factory : noop;

		this.result = null;		// 模块执行的结果
		this.state = ModuleState.INITIALIZE;	// 设置初始化状态
		
		this.requireCount = this.deps.length;
		this.alreadyCount = 0;
		
		this.exports = {};
		this.loaded = false;

		this.url = "";
	}

	NativeModule._cache = {};
	NativeModule._source = {};
	NativeModule.getCache = function( id ){
		return NativeModule._cache[ id ];
	};



	/**
	 * 模块定义
	 * @Author 草莓
	 * @Date   2017-06-04
	 * @param  {string|Object|function}   id      一般情况下为模块的标识
	 * @param  {array}   deps    依赖项
	 * @param  {function}   factory 模块的构造函数
	 * @return {void}           [description]
	 */
	var define = global.define = function(id, deps, factory){

		var cached = NativeModule.getCache( id );
		if( cached ){
			return cached.exports;
		}

		/*
			define('name', function(){})
			表示函数的返回值就是当前模块的运行后的结果
		 */
		// 需要进行函数体 require的扫描
		if( Commons.isFunction( deps ) ){
			factory = deps;
			deps = [ "require", "exports", "module" ];
		}

		/*
			define("const"|{}|function)
			直接定义一个模块的值, 作为一个匿名模块
			模块的名字应该默认为模块加载器请求的指定脚本的名字
		 */
		if( Commons.isUndefined( deps ) ){
			if( !Commons.isFunction( id ) ){	// 第一个参数是非函数的匿名模块
				deps = [];
				factory = function(){
					return id;
				}

			} else {	// 函数匿名模块
				deps = [ "require", "exports", "module" ];
			}
		}

		var moduleInstance = new NativeModule( id, deps, factory );

		if( deps.length == 0 ){
			moduleInstance.state = ModuleState.COMPLETE;
			moduleInstance.result = moudle.factory();
			moduleInstance.exports = moduleInstance.result;
			moduleInstance.url = Commons.getPath( id );
			return ;
		}

	};




	define.yAmd = {
		muiltversion : false
	};

// 浏览器端，使用amd，可以不做兼容，直接用window
})( typeof window !== 'undefined' ? window : this );