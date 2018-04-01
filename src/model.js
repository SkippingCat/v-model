/**
 * Model
 *
 * @author xiaomi
 */

import ModelBase from './model-base';

// Model
const Model = ModelBase.extend('', {
    find: { method: 'GET' },
    save: { method: 'POST' },
    update: { method: 'PUT' },
    delete: { method: 'DELETE' },
    list: { method: 'GET', isArray: true }
});

export default Model;
