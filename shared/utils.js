'use strict';

const _ = require('lodash');
const BbPromise = require('bluebird');

module.exports = {
  setDefaults() {
    this.options.stage = _.get(this, 'options.stage')
      || 'dev';
    this.options.region = _.get(this, 'options.region')
      || 'us-central1';

    return BbPromise.resolve();
  },
};
