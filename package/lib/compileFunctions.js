'use strict';

/* eslint no-use-before-define: 0 */

const path = require('path');

const _ = require('lodash');
const BbPromise = require('bluebird');

module.exports = {
  compileFunctions() {
    const artifactFilePath = this.serverless.service.package.artifact;
    const fileName = artifactFilePath.split(path.sep).pop();

    this.serverless.service.package
      .artifactFilePath = `${this.serverless.service.package.artifactDirectoryName}/${fileName}`;

    this.serverless.service.getAllFunctions().forEach((functionName) => {
      const funcObject = this.serverless.service.getFunction(functionName);

      this.serverless.cli
        .log(`Compiling function "${functionName}"...`);

      validateHandlerProperty(funcObject, functionName);
      validateEventsProperty(funcObject, functionName);
      const funcTemplate = getFunctionTemplate(
        funcObject,
        this.options.region,
        this.options.stage,
        this.serverless.service.service,
        `gs://${
        this.serverless.service.provider.deploymentBucketName
        }/${this.serverless.service.package.artifactFilePath}`,
      );

      funcTemplate.properties.availableMemoryMb = _.get(funcObject, 'memorySize')
        || _.get(this, 'serverless.service.provider.memorySize')
        || 256;
      funcTemplate.properties.timeout = _.get(funcObject, 'timeout')
        || _.get(this, 'serverless.service.provider.timeout')
        || '60s';
      funcTemplate.properties.labels = _.assign({},
        _.get(this, 'serverless.service.provider.labels') || {},
        _.get(funcObject, 'labels') || {},
      );

      const eventType = Object.keys(funcObject.events[0])[0];

      if (eventType === 'http') {
        const url = funcObject.events[0].http;

        funcTemplate.properties.httpsTrigger = {};
        funcTemplate.properties.httpsTrigger.url = url;
      }
      if (eventType === 'event') {
        const type = funcObject.events[0].event.eventType;
        const path = funcObject.events[0].event.path; //eslint-disable-line
        const resource = funcObject.events[0].event.resource;

        funcTemplate.properties.eventTrigger = {};
        funcTemplate.properties.eventTrigger.eventType = type;
        if (path) funcTemplate.properties.eventTrigger.path = path;
        funcTemplate.properties.eventTrigger.resource = resource;
      }

      this.serverless.service.provider.compiledConfigurationTemplate.resources.push(funcTemplate);
    });

    return BbPromise.resolve();
  },
};

const validateHandlerProperty = (funcObject, functionName) => {
  if (!funcObject.handler) {
    const errorMessage = [
      `Missing "handler" property for function "${functionName}".`,
      ' Your function needs a "handler".',
      ' Please check the docs for more info.',
    ].join('');
    throw new Error(errorMessage);
  }
};

const validateEventsProperty = (funcObject, functionName) => {
  if (!funcObject.events || funcObject.events.length === 0) {
    const errorMessage = [
      `Missing "events" property for function "${functionName}".`,
      ' Your function needs at least one "event".',
      ' Please check the docs for more info.',
    ].join('');
    throw new Error(errorMessage);
  }

  if (funcObject.events.length > 1) {
    const errorMessage = [
      `The function "${functionName}" has more than one event.`,
      ' Only one event per function is supported.',
      ' Please check the docs for more info.',
    ].join('');
    throw new Error(errorMessage);
  }

  const supportedEvents = ['http', 'event'];
  const eventType = Object.keys(funcObject.events[0])[0];
  if (supportedEvents.indexOf(eventType) === -1) {
    const errorMessage = [
      `Event type "${eventType}" of function "${functionName}" not supported.`,
      ` supported event types are: ${supportedEvents.join(', ')}`,
    ].join('');
    throw new Error(errorMessage);
  }
};

const getFunctionTemplate = (funcObject, region, stage, service, sourceArchiveUrl) => { //eslint-disable-line
  let funcName = funcObject.handler;

  if (funcObject.prependStage) {
    funcName = `${stage}-${funcName}`;
  }

  if (funcObject.prependService) {
    funcName = `${service}-${funcName}`;
  }

  return {
    type: 'cloudfunctions.v1beta2.function',
    name: funcObject.name,
    properties: {
      location: region,
      availableMemoryMb: 256,
      timeout: '60s',
      entryPoint: funcObject.handler,
      function: funcName,
      sourceArchiveUrl,
    },
  };
};
