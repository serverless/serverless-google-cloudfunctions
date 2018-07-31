'use strict';

const _ = require('lodash');
const BbPromise = require('bluebird');

module.exports = {
  setDefaults() {
    this.options.stage = _.get(this, 'options.stage')
      || 'dev';
    this.options.region = _.get(this, 'options.region')
      || 'us-central1';
    this.options.runtime = _.get(this, 'options.runtime')
      || 'nodejs8';

    return BbPromise.resolve();
  },
};
