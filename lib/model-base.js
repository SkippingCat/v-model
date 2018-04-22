'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * ModelBase
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * @author xiaomi
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      */

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _pathToRegexp = require('path-to-regexp');

var _pathToRegexp2 = _interopRequireDefault(_pathToRegexp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var isArray = Array.isArray;
var rUpdateMethod = /^(POST|PUT|PATCH)$/i;

var defaultGetPagination = function defaultGetPagination(response) {
    var key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'x-pagination';

    var pagination = null;

    try {
        var headers = response.headers;

        pagination = JSON.parse(headers[key]);
    } catch (ex) {}

    if (!pagination) {
        pagination = {
            total: 0,
            size: 20,
            num: 1
        };
    }

    return pagination;
};

var urlGenerator = function urlGenerator(url) {
    var urlTokens = _pathToRegexp2.default.parse(url);

    // // optional last token
    // const urlLastToken = urlTokens[urlTokens.length - 1];
    // if(typeof urlLastToken === 'object') {
    //     urlLastToken.optional = true;
    // }

    return _pathToRegexp2.default.tokensToFunction(urlTokens);
};

var ModelBase = function () {
    function ModelBase(data) {
        _classCallCheck(this, ModelBase);

        this.$defineResult();

        this.$reset(data);
    }

    _createClass(ModelBase, [{
        key: '$defineResult',
        value: function $defineResult() {
            var _this = this;

            var innerProps = {
                promise: _bluebird2.default.resolve(this),
                resolved: true,
                response: null
            };

            _lodash2.default.forEach(innerProps, function (val, k) {
                Object.defineProperty(_this, '$' + k, {
                    configurable: true,
                    enumerable: false,
                    writable: true,
                    value: val
                });
            });
        }
    }, {
        key: '$reset',
        value: function $reset(data) {
            var _this2 = this;

            _lodash2.default.forEach(this, function (val, k) {
                if (k !== '$resolved') {
                    delete _this2[k];
                }
            });

            if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) === 'object') {
                _lodash2.default.forEach(data, function (val, k) {
                    _this2.$set(k, val);
                });
            }

            return this;
        }
    }, {
        key: '$set',
        value: function $set(key, val) {
            this[key] = val;
        }
    }, {
        key: '$request',
        value: function $request(options) {
            var Model = this.constructor;

            options = _lodash2.default.clone(options);

            // mixin params, data
            options.params = _lodash2.default.assign({}, Model.params, options.params);

            // all data for url
            var allData = _lodash2.default.assign({}, options.params, options.data);

            // wrap by bluebird
            // support Cancellation
            return new _bluebird2.default(function (resolve, reject, onCancel) {
                options = _lodash2.default.assign({}, Model.options, options, {
                    url: options.url(allData) + '.json'
                });

                // clean
                if (!rUpdateMethod.test(options.method)) {
                    delete options.data;
                }

                // cancellation
                if (typeof onCancel === 'function') {
                    var source = _axios2.default.CancelToken.source();

                    onCancel(function () {
                        source.cancel('Request canceled');
                    });

                    options.cancelToken = source.token;
                }

                return Model.http.request(options).then(resolve, reject);
            });
        }

        // Mode.extend

    }], [{
        key: 'extend',
        value: function extend(baseUrl, actions, staticProps, options) {
            var Model = function (_ref) {
                _inherits(Model, _ref);

                function Model() {
                    _classCallCheck(this, Model);

                    return _possibleConstructorReturn(this, (Model.__proto__ || Object.getPrototypeOf(Model)).apply(this, arguments));
                }

                return Model;
            }(this);
            Model.options = options;
            Model.baseUrl = baseUrl;

            // static props
            _lodash2.default.assign(Model, staticProps);

            // actions
            _lodash2.default.forEach(actions, function (actionInfo, name) {
                actionInfo.url = urlGenerator(Model.baseUrl + (actionInfo.url || ''));
                Model.addAction(name, actionInfo);
            });

            return Model;
        }
    }, {
        key: 'addAction',
        value: function addAction(name, actionInfo) {
            var method = actionInfo.method;
            var hasPagination = actionInfo.hasPagination;
            var isArrayResult = !!(actionInfo.isArray || hasPagination);
            var isUpdateMethod = rUpdateMethod.test(method);

            this.prototype['$' + name] = function (params) {
                var _this4 = this;

                var Model = this.constructor;

                // update
                if (isUpdateMethod) {
                    _lodash2.default.forEach(params, function (val, k) {
                        _this4.$set(k, val);
                    });

                    return Model[name](this).$promise;
                }

                return Model[name](params, this).$promise;
            };

            this[name] = function (params) {
                var Model = this;
                var ModelOptions = Model.options || {};

                var queryParams = null;
                var dataParams = null;
                isUpdateMethod ? dataParams = params : queryParams = params;

                // mixin queryParams
                queryParams = _lodash2.default.assign({}, actionInfo.params, queryParams);

                // getPagination
                var getPagination = ModelOptions.getPagination ? ModelOptions.getPagination : defaultGetPagination;

                var model = dataParams instanceof Model ? dataParams : new Model(dataParams);
                var result = isArrayResult ? hasPagination ? {
                    pagination: getPagination(),
                    items: []
                } : [] : model;

                // Define result ext props
                if (result !== model) {
                    model.$defineResult.call(result);
                }

                // cacher, only support non update method
                var cacher = actionInfo.cacher || Model.cacher;
                var allowCacher = actionInfo.allowCacher;
                var fetchCache = function fetchCache() {
                    if (!isUpdateMethod && allowCacher && cacher) {
                        var cache = cacher.get(queryParams, Model, result);

                        _lodash2.default.merge(result, cache);
                    }
                };
                var updateCache = function updateCache() {
                    if (!isUpdateMethod && allowCacher && cacher) {
                        cacher.set(result, queryParams, Model);
                    }
                };

                fetchCache();

                // options
                var options = _lodash2.default.assign({
                    params: queryParams,
                    data: model
                }, actionInfo);

                // set $resolved
                model.$set.call(result, '$resolved', false);

                result.$promise = model.$request(options).then(function (response) {
                    var data = response.data;

                    result.$response = response;

                    if (isArray(data) !== isArrayResult) {
                        throw new Error('Model.' + name + ' expected an ' + (isArrayResult ? 'array' : 'object') + ' but got an ' + (isArray(data) ? 'array' : 'object'));
                    }

                    if (!isArrayResult) {
                        model.$set('api', data);
                        if (name === 'find') {
                            model.$reset(data['data'][0]);
                        } else {
                            // what the jb eslint rule?
                            model.$set('data', data['data']);
                        }
                    } else {
                        var items = hasPagination ? result.items : result;

                        // fill items
                        items.length = 0;
                        data.forEach(function (item) {
                            items.push(new Model(item));
                        });

                        if (hasPagination) {
                            var pagination = getPagination(response);
                            _lodash2.default.assign(result.pagination, pagination);
                        }
                    }

                    // update cache
                    updateCache();

                    return result;
                }).finally(function () {
                    model.$set.call(result, '$resolved', true);
                });

                return result;
            };
        }
    }]);

    return ModelBase;
}();

ModelBase.cacher = null;
ModelBase.http = _axios2.default.create();
exports.default = ModelBase;
module.exports = exports['default'];