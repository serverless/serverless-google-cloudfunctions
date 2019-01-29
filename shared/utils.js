'use strict';

const _ = require('lodash');
const BbPromise = require('bluebird');

module.exports = {
  setDefaults() {
    this.options.stage = _.get(this, 'options.stage') || _.get(this, 'serverless.service.provider.stage') || 'dev';
    // Support aws defined runtimes and map to gcp definitions
    const AWSRuntimes = {
      "nodejs8.10": "nodejs8",
      // Can't tell if this is right, it's just documented as the "default"
      //"nodejs6.10": "nodejs6",
      "python3.7":  "python37",
      "go1.x":      "go111",
    }
    const userDefinedRuntime = _.get(this, 'options.runtime');
    this.options.runtime = AWSRuntimes[userDefinedRuntime] || userDefinedRuntime || 'nodejs8';

    // serverless framework is hard-coding us-east-1 region from aws
    // this is temporary fix for multiple regions
    let region = _.get(this, 'options.region') || _.get(this, 'serverless.service.provider.region');

    if (region === 'us-east-1') {
      region = 'us-central1';
    }

    this.options.region = region;
    this.serverless.service.provider.region = region;

    return BbPromise.resolve();
  },
};
