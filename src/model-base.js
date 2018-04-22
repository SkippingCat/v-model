/**
 * ModelBase
 *
 * @author xiaomi
 */

import axios from 'axios';
import lodash from 'lodash';
import Promise from 'bluebird';
import pathToRegexp from 'path-to-regexp';

const isArray = Array.isArray;
const rUpdateMethod = /^(POST|PUT|PATCH)$/i;

const defaultGetPagination = (response, key = 'x-pagination') => {
    let pagination = null;

    try {
        const headers = response.headers;

        pagination = JSON.parse(headers[key]);
    }
    catch(ex) { }

    if(!pagination) {
        pagination = {
            total: 0,
            size: 20,
            num: 1
        };
    }

    return pagination;
};

const urlGenerator = (url) => {
    const urlTokens = pathToRegexp.parse(url);

    // // optional last token
    // const urlLastToken = urlTokens[urlTokens.length - 1];
    // if(typeof urlLastToken === 'object') {
    //     urlLastToken.optional = true;
    // }

    return pathToRegexp.tokensToFunction(urlTokens);
};

export default class ModelBase {
    static cacher = null;
    static http = axios.create();

    constructor(data) {
        this.$defineResult();

        this.$reset(data);
    }

    $defineResult() {
        const innerProps = {
            promise: Promise.resolve(this),
            resolved: true,
            response: null
        };

        lodash.forEach(innerProps, (val, k) => {
            Object.defineProperty(this, '$' + k, {
                configurable: true,
                enumerable: false,
                writable: true,
                value: val
            });
        });
    }

    $reset(data) {
        lodash.forEach(this, (val, k) => {
            if(k !== '$resolved') {
                delete this[k];
            }
        });

        if(typeof data === 'object') {
            lodash.forEach(data, (val, k) => {
                this.$set(k, val);
            });
        }

        return this;
    }

    $set(key, val) {
        this[key] = val;
    }

    $request(options) {
        const Model = this.constructor;

        options = lodash.clone(options);

        // mixin params, data
        options.params = lodash.assign({}, Model.params, options.params);

        // all data for url
        const allData = lodash.assign({},
            options.params,
            options.data
        );

        // wrap by bluebird
        // support Cancellation
        return new Promise((resolve, reject, onCancel) => {
            options = lodash.assign({}, Model.options, options, {
                url: options.url(allData) + '.json'
            });

            // clean
            if(!rUpdateMethod.test(options.method)) {
                delete options.data;
            }

            // cancellation
            if(typeof onCancel === 'function') {
                const source = axios.CancelToken.source();

                onCancel(() => {
                    source.cancel('Request canceled');
                });

                options.cancelToken = source.token;
            }

            return Model.http.request(options).then(resolve, reject);
        });
    }

    // Mode.extend
    static extend(baseUrl, actions, staticProps, options) {
        const Model = class Model extends this {};
        Model.options = options;
        Model.baseUrl = baseUrl;

        // static props
        lodash.assign(Model, staticProps);

        // actions
        lodash.forEach(actions, (actionInfo, name) => {
            actionInfo.url = urlGenerator(Model.baseUrl + (actionInfo.url || ''));
            Model.addAction(name, actionInfo);
        });

        return Model;
    }

    static addAction(name, actionInfo) {
        const method = actionInfo.method;
        const hasPagination = actionInfo.hasPagination;
        const isArrayResult = !!(actionInfo.isArray || hasPagination);
        const isUpdateMethod = rUpdateMethod.test(method);

        this.prototype['$' + name] = function(params) {
            const Model = this.constructor;

            // update
            if(isUpdateMethod) {
                lodash.forEach(params, (val, k) => {
                    this.$set(k, val);
                });

                return Model[name](this).$promise;
            }

            return Model[name](params, this).$promise;
        };

        this[name] = function(params) {
            const Model = this;
            const ModelOptions = Model.options || {};

            let queryParams = null;
            let dataParams = null;
            isUpdateMethod ? dataParams = params : queryParams = params;

            // mixin queryParams
            queryParams = lodash.assign({}, actionInfo.params, queryParams);

            // getPagination
            const getPagination = ModelOptions.getPagination
                ? ModelOptions.getPagination
                : defaultGetPagination;

            const model = (dataParams instanceof Model) ? dataParams : new Model(dataParams);
            const result = isArrayResult
                ? hasPagination
                    ? {
                        pagination: getPagination(),
                        items: []
                    } : []
                : model;

            // Define result ext props
            if(result !== model) {
                model.$defineResult.call(result);
            }

            // cacher, only support non update method
            const cacher = actionInfo.cacher || Model.cacher;
            const allowCacher = actionInfo.allowCacher;
            const fetchCache = () => {
                if(!isUpdateMethod && allowCacher && cacher) {
                    const cache = cacher.get(queryParams, Model, result);

                    lodash.merge(result, cache);
                }
            };
            const updateCache = () => {
                if(!isUpdateMethod && allowCacher && cacher) {
                    cacher.set(result, queryParams, Model);
                }
            };

            fetchCache();

            // options
            const options = lodash.assign({
                params: queryParams,
                data: model
            }, actionInfo);

            // set $resolved
            model.$set.call(result, '$resolved', false);

            result.$promise = model.$request(options)
            .then(response => {
                const data = response.data;

                result.$response = response;

                if(isArray(data) !== isArrayResult) {
                    throw new Error(`Model.${name} expected an ${isArrayResult ? 'array' : 'object'} but got an ${isArray(data) ? 'array' : 'object'}`);
                }

                if(!isArrayResult) {
                    model.$set('api', data);
                    if(name === 'find') {
                        model.$reset(data['data'][0]);
                    }
                    else { // what the jb eslint rule?
                        model.$set('data', data['data']);
                    }
                }
                else {
                    const items = hasPagination ? result.items : result;

                    // fill items
                    items.length = 0;
                    data.forEach(item => {
                        items.push(new Model(item));
                    });

                    if(hasPagination) {
                        const pagination = getPagination(response);
                        lodash.assign(result.pagination, pagination);
                    }
                }

                // update cache
                updateCache();

                return result;
            })
            .finally(() => {
                model.$set.call(result, '$resolved', true);
            });

            return result;
        };
    }
}
