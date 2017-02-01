'use strict';

const expect = require('chai').expect;
const validateMixin = require('./validate').validate;

class ServerlessMock {
  constructor() {
    this.config = { servicePath: 'something' };
  }
}

describe('ValidateMixin', () => {
  let serverless;
  let self;
  let mixin;

  beforeEach(() => {
    serverless = new ServerlessMock();
    self = {
      serverless: serverless,
      options: {}
    };
    mixin = validateMixin.bind(self);
  });

  describe('#validate()', () => {
    it('should throw if run outside a service directory', () => {
      serverless.config.servicePath = null;
      expect(mixin).to.throw();
    });

    it('should set default stage to dev', () => {
      mixin();
      expect(self.options.stage).to.equal('dev');
    });

    it('should set default region to us-central1', () => {
      mixin();
      expect(self.options.region).to.equal('us-central1');
    });
  });
});
