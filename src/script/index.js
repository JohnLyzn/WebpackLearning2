
import _ from 'lodash';

export default class ScriptMachine {

    constructor(scriptType, args) {
        this._module = require('./' + _.snakeCase(scriptType));
        if(! this._module) {
            throw new Error(`无类型为${scriptType}的脚本实现`);
        }
        const outputType = this._getOuputType(scriptType);
        if(! outputType) {
            throw new Error(`无法处理类型为${scriptType}的脚本`);
        }
        const executionTypes = this._getExecutionTypes(scriptType);
        if(! executionTypes || ! executionTypes.length) {
            throw new Error(`类型为${scriptType}的脚本没有可用方法`);
        }
        this._context = new ScriptContext(executionTypes, outputType, args);
        const envObj = this._generateEnvKeyVals(args);
        this._envKeys = envObj.keys;
        this._envVals = envObj.values;
        this._globalArgs = args;
        this._idCounter = 0;
    };

    async execute(script) {
        if(! _.trim(script)) {
            return;
        }
        const fn = new Function(...this._envKeys, this._formatScript(script));
        fn.call(this._context, ...this._envVals);
        const output = this._context.outputNow();
        if(! output) {
            return;
        }
        return await output.run();
    };

    _getExecutionTypes(scriptType) {
        const paths = this._module['EXECUTIONS_PATHS'];
        if(! paths) {
            return [];
        }
        const types = [];
        for(let path of paths) {
            const executionModule = require('./' + _.snakeCase(scriptType) + '/' + path)
            _.forEach(executionModule, (value, key) => {
                if(_.startsWith(key, '_')
                    || ! _.endsWith(key, 'Execution')) {
                    return;
                }
                types.push(value);
            });
        }
        return types;
    };

    _getOuputType(scriptType) {
        // 将脚本类型作为类名称在当前模块下找
        return this._module[_.upperFirst(_.camelCase(scriptType)) + 'Output']
    };

    _generateEnvKeyVals(args) {
        const result = {
            keys: [],
            values: [],
        };
        // 全局变量
        _.forEach(args, (value, key) => {
            if(_.startsWith(key, '_')) {
                return;
            }
            result.keys.push(key);
            result.values.push(value);
        });
        // 支持的函数
        const executions = this._context.executions();
        for(let execution of executions) {
            result.keys.push(execution.name());
            result.values.push(this._generateExecutionFn(execution));
        }
        return result;
    };

    _generateExecutionFn(execution) {
        const that = this;
        return function() {
            const args = that._formatArgs(arguments);
            const scope = that._context.scopeFor(execution, args);
            const output = that._context.outputFor(execution, scope);
            const returnVal = execution.execute(scope, output);
            if(returnVal) {
                output.write(returnVal);
            }
            if(output.isDeferred()) {
                return output;
            }
            return returnVal;
        };
    };

    _formatScript(script) {
        if(! _.startsWith(script, 'return ')) {
            script = 'return ' + script;
        }
        if(! _.endsWith(script, ';')) {
            script += ';';
        }
        if(script.match(/(?<!['"].*?)(eval|Function|function|\=\>|document|window)/g)) {
            throw new Error('无效的执行脚本', script);
        }
        // 将全部全局变量替换为实际的值
        _.template(script, {
            interpolate: /\$\{\.*?\}/g,
        })(this._globalArgs);
        return script;
    };

    _formatArgs(args) {
        const result = {
            _id: ++ this._idCounter,
        };
        _.forEach(args, (arg, key) => {
            result[key] = arg;
        });
        return result;
    };
}

export class ScriptContext {

    constructor(executionTypes, outputType, globalArgs) {
        this._availableExecutions = this._buildExecutionInstances(executionTypes);
        this._availableExecutionMap = this._buildExecutionInstanceMap(this._availableExecutions);
        this._outputType = outputType;
        this._executions = [];
        this._executionScopes = [];
        this._outputMap = {};
        this._globalScope = this._createNewScope(null, globalArgs);
        this._scopeNow = null;
        this._outputNow = null;
    };

    executions() {
        return this._availableExecutions;
    };
    
    execution(name) {
        return this._availableExecutionMap[name];
    };

    arg(name, type, defaultOrMockVal) {
        return this._globalScope.arg(name, type, defaultOrMockVal);
    };

    scopeFor(execution, args) {
        const index = this._executions.indexOf(execution);
        const existed = this._executionScopes[index];
        if(existed && _.isEqual(existed.args(), args)) {
            return this._scopeNow = existed;
        }
        const scope = this._createNewScope(execution, args);
        this._executions.push(execution);
        this._executionScopes.push(scope);
        return this._scopeNow = scope;
    };

    scopeNow() {
        return this._scopeNow;
    };

    _createNewScope(execution, args) {
        return new ScriptScope(this, execution, args);
    };

    outputFor(execution, scope) {
        const index = this._executions.indexOf(execution);
        const existed = this._executionScopes[index];
        if(existed === scope 
            && this._outputMap[scope.id()]) {
            return this._outputNow = this._mergeLastOutputToNow(
                this._outputNow,
                this._outputMap[scope.id()]);
        }
        return this._outputNow = this._mergeLastOutputToNow(
            this._outputNow,
            this._outputMap[scope.id()] = this._createNewOuput(execution, scope)
        );
    };

    _mergeLastOutputToNow(last, now) {
        if(! last || ! now) {
            return now;
        }
        if(last.isDeferred()) {
            return;
        }
        last.mergeTo(now);
        return now;
    };

    outputNow() {
        return this._outputNow;
    };

    _createNewOuput(execution, scope) {
        return new this._outputType(this, execution, scope);
    };

    _buildExecutionInstances(executionTypes) {
        const result = [];
        for(let executionType of executionTypes) {
            result.push(new executionType());
        }
        return result;
    };

    _buildExecutionInstanceMap(executions) {
        const result = {};
        for(let execution of executions) {
            const name = execution.name();
            if(! name) {
                throw new Error(`${execution.prototype}未定义名称`);
            }
            result[name] = execution;
        }
    };
};

export class ScriptScope {

    constructor(context, execution, args) {
        this._context = context;
        this._execution = execution;
        this._args = args;
        this._id = args._id;
    };

    id() {
        return this._id;
    };

    context() {
        return this._context;
    };

    execution() {
        return this._execution;
    };

    args() {
        return this._args;
    };

    arg(name, type, defaultOrMockVal) {
        const arg = this._args[name];
        if(! arg) {
            return valueToType(defaultOrMockVal, type);
        }
        const outputs = this._findOutputsInArg(arg);
        if(outputs && outputs.length) {
            const outputNow = this.context().outputNow();
            _.forEach(outputs, (output) => {
                outputNow.markDependOn(output);
            });
            outputNow.markDeferred();
            return valueToType(defaultOrMockVal, type);
        }
        return valueToType(arg, type);
    };

    _findOutputsInArg(arg) {
        if(arg instanceof ScriptOutput) {
            return [arg];
        }
        if(! _.isObject(arg)) {
            return;
        }
        const result = [];
        this._findRecursive(arg, (val) => {
            if(val instanceof ScriptOutput) {
                result.push(val);
            }
        });
        return result;
    };

    _resolveArgs() {
        this._findRecursive(this._args, (val, key, parent) => {
            if(val instanceof ScriptOutput) {
                parent[key] = val.result();
            }
        });
    };

    _findRecursive(obj, callback) {
        _.forEach(obj, (val, key) => {
            if(_.isPlainObject(val)
                || _.isArray(val)) {
                this._findRecursive(val, callback);
                return; 
            }
            callback(val, key, obj);
        });
    };
}

export class ScriptOutput {

    constructor(context, execution, scope) {
        this._context = context;
        this._scope = scope;
        this._id = scope.id();
        this._execution = execution;
        this._keys = []; // 记录顺序
        this._values = {}; // 记录值
        this._isDeferred = false;
        this._dependencies = [];
    };

    id() {
        return this._id;
    };

    context() {
        return this._context;
    };

    execution() {
        return this._execution;
    };

    scope() {
        return this._scope;
    };

    isDeferred() {
        return this._isDeferred;
    };

    markDependOn(output) {
        if(! output || ! (output instanceof ScriptOutput)) {
            return;
        }
        this._dependencies.push(output);
    };

    markDeferred() {
        this._isDeferred = true;
    };
    
    set(name, value) {
       // 非内部值记录加入的顺序
       if(! _.startsWith(name, '$')) {
            this._keys.push(name);
            this._isDeferred = true;
        }
        // 多次设置值, 统一设置为数组
        const existed = this._values[name];
        if(! existed) {
            this._values[name] = [value];
            return;
        }
        this._values[name].push(value);
    };

    remove(name) {
        delete this._values[name];
    };

    write(result) {
        for(let depentOutput of this._dependencies) {
            if(depentOutput.isDeferred()) {
                return;
            }
        }
        if(result instanceof Promise) {
            if(this._isDeferred) {
                throw new Error('不允许在真正执行output时返回延迟结果');
            }
            this._isDeferred = true;
            return;
        }
        this._isDeferred = false;
        this.set('$result', result);
    };

    result() {
        return this.get('$result');
    };
    
    contains(name) {
        return this._keys.indexOf(name) != -1;
    };

    get(name) {
        const value = this._values[name];
        if(value && value.length == 1) {
            return value[0];
        }
        return value;
    };

    mergeTo(output) {
        for(let key of this._keys) {
            const value = this._values[key];
            output.set(key, value);
        }
    };

    async resolve(parentOutput) {
        if(! this._isDeferred) {
            return;
        }
        this._scope._resolveArgs();
        this._keys = []; // 重置生成的内容
        this._values = {};
        await this._execution.execute(this._scope, this);
        this.mergeTo(parentOutput);
        this._isDeferred = false;
    };

    run() {
        return new Promise(async (resolve) => {
            for(let dependentOutput of this._dependencies) {
                await dependentOutput.run();
                await dependentOutput.resolve(this);
            }
            for(let key of this._keys) {
                const value = this._values[key];
                if(! value) {
                    continue;
                }
                const handleFn = this[key];
                if(! handleFn) {
                    return;
                }
                await handleFn.call(this);
            }
            resolve(this.result());
        });
    };
};

export class ScriptExecution {

    name() {
        throw new Error('未实现name');
    };

    execute(scope) {
        throw new Error('未实现execute', scope);
    };
};

const valueToType = (value, type) => {
    if(! type) {
        return value;
    }
    switch(type) {
        case 'Any':
        default:
            return value;
        case 'String':
            return value ? _.toString(value) : '';
        case 'Object':
            return value ? _.toPlainObject(value) : {};
        case 'Array':
            return value ? _.toArray(value) : [];
        case 'Number':
            return value ? _.toNumber(value) : 0;
    }
};