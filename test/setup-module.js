/* eslint-disable no-undef */
var chai = require('chai');
var assert = require('assert');
var expect = chai.expect;
var deps = require('../src/injection');

// Configure chai
chai.should();

describe('Setup modules test', function() {
    describe('Setup modules validation', function() {
        const injection = deps();

        it('The module does not have static setup function.', function() {
            class Class {
                constructor() {
                    this.foo = 'bar';
                }
            }
            expect(() => { injection.setup(() => { }, { modules: [ Class ] }); }).to.throw('The module does not have static setup function.');
        });

        it('The module configuration object does not have setup function.', function() {
            expect(() => { injection.setup(() => { }, { modules: [ { ctor: null, constructor: null } ] }); }).to.throw('The module configuration object does not have setup function.');
        });

        it('Invalid module.', function() {
            expect(() => { injection.setup(() => { }, { modules: [ function() { } ] }); }).to.throw('The module does not have static setup function.');
            expect(() => { injection.setup(() => { }, { modules: [ 'text' ] }); }).to.throw('The module does not have static setup function.');
            expect(() => { injection.setup(() => { }, { modules: [ 1 ] }); }).to.throw('The module does not have static setup function.');
        });

        it('ctor or constructor option value is not a function', function() {
            const moduleConfig = { setup: 'setup' };
            class ModuleClass {
                constructor() {
                }
            }
            ModuleClass.setup = 'setup';
            expect(() => { injection.setup(() => { }, { modules: [ moduleConfig ] }); }).to.throw('The setup option value is not a function');
            expect(() => { injection.setup(() => { }, { modules: [ ModuleClass ] }); }).to.throw('The setup option value is not a function');
        });
    });

    describe('Setup modules test', function() {
        it('Remove modules from options test', function() {
            const injection = deps();
            const options = { modules: [ ] };
            injection.setup(() => { }, options);
            expect(options.modules).is.undefined;
        });

        it('Setup method of module execute', function() {
            const injection = deps();
            class Class {
                constructor() {
                    this.foo = 'bar';
                }
                static setup(container, options) {
                    expect(container).to.have.own.property('_dependencies');
                    expect(options).to.be.an('object');
                }
            }
            const ClassConstructor = function() { this.foo = 'bar'; };
            ClassConstructor.setup = function(container, options) {
                expect(container).to.have.own.property('_dependencies');
                expect(options).to.be.an('object');
            };
            injection.setup(() => { }, { modules: [ ClassConstructor, Class ] });
        });

        it('Setup method of module execute (the module configuration object used)', function() {
            const injection = deps();
            const moduleConfig = {
                options: { option1: 1 },
                setup: function(container, options) {
                    assert.strictEqual(this, container);
                    expect(container).to.have.own.property('_dependencies');
                    expect(options).to.be.an('object');
                    expect(options).to.include({ option1: 1 });
                }
            };
            class ClassForStaticTest {
                constructor() {
                    this.used = 'constructor';
                }
                static get options() {
                    return {
                        option2: 2
                    }
                }
                static setup(container, options) {
                    assert.strictEqual(this, container);
                    expect(container).to.have.own.property('_dependencies');
                    expect(options).to.be.an('object');
                    /* ATTENTION! 
                    All options are summed up and passed to the next module. 
                    it`s no bug. For example, first module read configuration and receive additional options, where should be used in second module setup.
                    */
                    expect(options).to.include({ option2: 2 });
                    expect(options).to.include({ option1: 1 }); 
                }
            }
            injection.setup(() => { }, { modules: [ moduleConfig, ClassForStaticTest ] });
        })

        it ('The modulesOptions value test', function() {
            const injection = deps();
            const ClassConstructor = function() { this.foo = 'bar'; };
            ClassConstructor.setup = function(container, options) {
                assert.strictEqual(this, container);
                expect(container).to.have.own.property('_dependencies');
                expect(options).to.be.an('object');
                expect(options).to.include({ option2: 2 });
                expect(options).to.include({ option1: 1 });
            };
            injection.setup(() => { }, { option1: 1, modulesOptions: { option2: 2 }, modules: [ ClassConstructor ] });
        });
    });
});