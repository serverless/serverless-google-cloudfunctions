'use strict';

const validate = require('../shared/validate');
const setDefaults = require('../shared/utils');
const getDataAndContext = require('./lib/getDataAndContext');
const nodeJs = require('./lib/nodeJs');

class GoogleInvokeLocal {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.provider = this.serverless.getProvider('google');

    Object.assign(this, validate, setDefaults, getDataAndContext, nodeJs);

    this.hooks = {
      'initialize': () => {
        this.options = this.serverless.processedInput.options;
      },
      'before:invoke:local:invoke': async () => {
        await this.validate();
        await this.setDefaults();
        await this.getDataAndContext();
      },
      'invoke:local:invoke': async () => this.invokeLocal(),
    };
  }

  async invokeLocal() {
    const functionObj = this.serverless.service.getFunction(this.options.function);
    this.validateEventsProperty(functionObj, this.options.function);

    const runtime = this.provider.getRuntime(functionObj);
    if (!runtime.startsWith('nodejs')) {
      throw new Error(`Local invocation with runtime ${runtime} is not supported`);
    }
    return this.invokeLocalNodeJs(functionObj, this.options.data, this.options.context);
  }
}

module.exports = GoogleInvokeLocal;
