'use strict';

/* eslint no-use-before-define: 0 */

const chalk = require('chalk');
const BbPromise = require('bluebird');
const _ = require('lodash');

module.exports = {
  displayServiceInfo() {
    return BbPromise.bind(this).then(this.getResources).then(this.gatherData).then(this.printInfo);
  },

  getResources() {
    const project = this.serverless.service.provider.project;

    return this.provider.request('deploymentmanager', 'resources', 'list', {
      project,
      deployment: `sls-${this.serverless.service.service}-${this.options.stage}`,
    });
  },

  gatherData(resources) {
    const data = {};

    // general data
    data.service = this.serverless.service.service;
    data.project = this.serverless.service.provider.project;
    data.stage = this.options.stage;
    data.region = this.options.region;

    data.resources = {
      functions: [],
    };

    _.forEach(resources.resources, (resource) => {
      if (resource.type === 'gcp-types/cloudfunctions-v1:projects.locations.functions') {
        const serviceFuncName = getFunctionNameInService(
          resource.name,
          this.serverless.service.service,
          this.options.stage
        );
        const serviceFunc = this.serverless.service.getFunction(serviceFuncName);
        const eventType = Object.keys(serviceFunc.events[0])[0];
        const funcEventConfig = serviceFunc.events[0][eventType];

        let funcResource = funcEventConfig.resource || null;

        if (eventType === 'http') {
          const region = this.options.region;
          const project = this.serverless.service.provider.project;
          const baseUrl = `https://${region}-${project}.cloudfunctions.net`;
          const path = serviceFunc.name; // NOTE this might change
          funcResource = `${baseUrl}/${path}`;
        }

        const func = {
          name: serviceFuncName,
          resource: funcResource, // how the function can be triggered (e.g. url, pubSub, etc.)
        };
        data.resources.functions.push(func);
      }
    });

    return BbPromise.resolve(data);
  },

  printInfo(data) {
    let message = '';

    // get all the service related information
    message += `${chalk.yellow.underline('Service Information')}\n`;
    message += `${chalk.yellow('service:')} ${data.service}\n`;
    message += `${chalk.yellow('project:')} ${data.project}\n`;
    message += `${chalk.yellow('stage:')} ${data.stage}\n`;
    message += `${chalk.yellow('region:')} ${data.region}\n`;

    message += '\n';

    // get all the functions
    message += `${chalk.yellow.underline('Deployed functions')}\n`;
    if (data.resources.functions.length) {
      data.resources.functions.forEach((func) => {
        message += `${chalk.yellow(func.name)}\n`;
        message += `  ${func.resource}\n`;
      });
    } else {
      message += 'There are no functions deployed yet\n';
    }

    this.serverless.cli.consoleLog(message);

    return BbPromise.resolve();
  },
};

const getFunctionNameInService = (funcName, service, stage) => {
  let funcNameInService = funcName;
  funcNameInService = funcNameInService.replace(`${service}-`, '');
  funcNameInService = funcNameInService.replace(`${stage}-`, '');
  return funcNameInService;
};
