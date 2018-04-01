'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _modelBase = require('./model-base');

var _modelBase2 = _interopRequireDefault(_modelBase);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Model
var Model = _modelBase2.default.extend('', {
    find: { method: 'GET' },
    save: { method: 'POST' },
    update: { method: 'PUT' },
    delete: { method: 'DELETE' },
    list: { method: 'GET', isArray: true }
}); /**
     * Model
     *
     * @author xiaomi
     */

exports.default = Model;
module.exports = exports['default'];