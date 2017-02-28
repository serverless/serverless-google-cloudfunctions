const BbPromise = require('bluebird');

module.exports = {
  validate() {
    return BbPromise.bind(this)
      .then(this.validateServicePath)
      .then(this.validateServiceName);
  },

  validateServicePath() {
    if (!this.serverless.config.servicePath) {
      throw new Error('This command can only be run inside a service directory');
    }

    return BbPromise.resolve();
  },

  validateServiceName() {
    const name = this.serverless.service.service;

    // should not contain 'goog'
    if (name.match(/goog/)) {
      throw Error('Your service should not contain the string "goog"');
    }

    return BbPromise.resolve();
  },
};
