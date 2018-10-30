'use strict';

const _ = require('lodash');
const BbPromise = require('bluebird');

module.exports = {
  setDefaults() {
    this.options.stage = _.get(this, 'options.stage')
      || 'dev';
    this.options.runtime = _.get(this, 'options.runtime')
      || 'nodejs8';

    // serverless framework is hard-coding us-east-1 region from aws
    // this is temporary fix for multiple regions
    const region = _.get(this, 'options.region')
      || _.get(this, 'serverless.service.provider.region');

    this.options.region = (!region || region === 'us-east-1')
      ? 'us-central1' : region;

    return BbPromise.resolve();
  },
};
