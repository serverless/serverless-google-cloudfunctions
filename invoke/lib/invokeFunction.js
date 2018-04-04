'use strict';

/* eslint no-use-before-define: 0 */

const BbPromise = require('bluebird');
const chalk = require('chalk');

module.exports = {
  invokeFunction() {
    return BbPromise.bind(this)
      .then(this.invoke)
      .then(this.printResult);
  },

  invoke() {
    const project = this.serverless.service.provider.project;
    const region = this.options.region;
    const stage = this.options.stage ? this.options.stage : 'dev';
    let func = this.options.function;
    const data = this.options.data || '';

    func = getGoogleCloudFunctionName(
      this.serverless.service.functions,
      func,
      stage,
      this.serverless.service.service,
    );

    const params = {
      name: `projects/${project}/locations/${region}/functions/${func}`,
      resource: {
        data,
      },
    };

    return this.provider.request(
      'cloudfunctions',
      'projects',
      'locations',
      'functions',
      'call',
      params);
  },

  printResult(result) {
    let res = result;

    if (!result || !result.result) {
      res = {
        executionId: 'error',
        result: 'An error occurred while executing your function...',
      };
    }

    const log = `${chalk.grey(res.executionId)} ${res.result}`;

    this.serverless.cli.log(log);

    return BbPromise.resolve();
  },
};

// retrieve the functions name (Google uses our handler property as the function name)
const getGoogleCloudFunctionName = (serviceFunctions, func, stage, service) => {
  if (!serviceFunctions[func]) {
    const errorMessage = [
      `Function "${func}" not found. `,
      'Please check your "serverless.yml" file for the correct function name.',
    ].join('');
    throw new Error(errorMessage);
  }

  let funcName = serviceFunctions[func].handler;

  if (serviceFunctions[func].prependStage) {
    funcName = `${stage}-${funcName}`;
  }

  if (serviceFunctions[func].prependService) {
    funcName = `${service}-${funcName}`;
  }

  return funcName;
};
