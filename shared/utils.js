'use strict';

const BbPromise = require('bluebird');

module.exports = {
  setDefaults() {
    this.options.stage = this.options.stage
      || 'dev';
    this.options.region = this.options.region
      || 'us-central1';

    return BbPromise.resolve();
  },
};
