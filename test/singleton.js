/* eslint-disable no-undef */
var chai = require('chai');
var chaiHttp = require('chai-http');
var expect = chai.expect;
var app = require('./service/server');

// Configure chai
chai.use(chaiHttp);
chai.should();

describe('Test object registered as a singleton.', function() {
    describe('Main test', function() {
        it('Two requests',
            function() {
                var agent = chai.request.agent(app);
                var created, reg = undefined;

                agent
                    .get('/singleton/component/single')
                    .then(function(res) {
                        const instance = res.body;
                        res.should.have.status(200);
                        expect(instance).to.be.an('object');
                        
                        expect(instance).to.include({ single: 'single' });
                        expect(instance).to.have.own.property('sample');
                        expect(instance.sample).to.include({ foo: 'bar' });

                        // Dynamic arguments
                        expect(instance).to.include({ darg: 'single' }); // Added in current request

                        created = instance.created;
                        reg = instance.reg;

                        expect(instance.reg).to.be.a('Number');
                        expect(instance.reg).to.below(created);

                        return agent
                            .get('/singleton/component/second')
                            .then(function(res) {
                                const instance = res.body;
                                res.should.have.status(200);
                                expect(instance).to.be.an('object');
                                
                                expect(instance).to.include({ single: 'single' }); // Saved after previous request
                                expect(instance).to.include({ second: 'second' }); // Added in current request
                                expect(instance).to.have.own.property('sample');
                                expect(instance.sample).to.include({ foo: 'bar' });

                                // Dynamic arguments
                                expect(instance).to.include({ darg: 'single' });
                                expect(instance).to.not.include({ darg: 'second' });

                                expect(instance.created).to.eq(created);
                                expect(instance.reg).to.be.a('Number');
                                expect(instance.reg).to.below(instance.created);

                                expect(instance.reg).to.eq(reg);
        
                                agent.close(() => console.log('agent closed.'));
                            });
                    });
            });
    });
});