require('chai').should();

const Model = require('../lib/model');

describe('Model', () => {
    it('Model default actions', () => {
        Model.find.should.to.be.a('function');
        Model.save.should.to.be.a('function');
        Model.update.should.to.be.a('function');
        Model.list.should.to.be.a('function');
    });

    it('Model instance default actions', () => {
        const model = new Model();

        model.$find.should.to.be.a('function');
        model.$save.should.to.be.a('function');
        model.$update.should.to.be.a('function');
        model.$list.should.to.be.a('function');
    });
});
