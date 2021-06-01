'use strict';

const chalk = require('chalk');
const path = require('path');
const _ = require('lodash');

const tryToRequirePaths = (paths) => {
  let loaded;
  paths.forEach((pathToLoad) => {
    if (loaded) {
      return;
    }
    try {
      loaded = require(pathToLoad);
    } catch (e) {
      // pass
    }
  });
  return loaded;
};

module.exports = {
  async invokeLocalNodeJs(functionObj, event, customContext) {
    let hasResponded = false;

    // index.js and function.js are the two files supported by default by a cloud-function
    // TODO add the file pointed by the main key of the package.json
    const paths = ['index.js', 'function.js'].map((fileName) =>
      path.join(this.serverless.serviceDir, fileName)
    );

    const handlerContainer = tryToRequirePaths(paths);
    if (!handlerContainer) {
      throw new Error(`Failed to require one of the files ${paths.join(', ')}`);
    }

    const cloudFunction = handlerContainer[functionObj.handler];
    if (!cloudFunction) {
      throw new Error(`Failed to load function "${functionObj.handler}" from the loaded file`);
    }

    this.addEnvironmentVariablesToProcessEnv(functionObj);

    function handleError(err) {
      let errorResult;
      if (err instanceof Error) {
        errorResult = {
          errorMessage: err.message,
          errorType: err.constructor.name,
          stackTrace: err.stack && err.stack.split('\n'),
        };
      } else {
        errorResult = {
          errorMessage: err,
        };
      }

      this.serverless.cli.consoleLog(chalk.red(JSON.stringify(errorResult, null, 4)));
      process.exitCode = 1;
    }

    function handleResult(result) {
      if (result instanceof Error) {
        handleError.call(this, result);
        return;
      }
      this.serverless.cli.consoleLog(JSON.stringify(result, null, 4));
    }

    return new Promise((resolve) => {
      const callback = (err, result) => {
        if (!hasResponded) {
          hasResponded = true;
          if (err) {
            handleError.call(this, err);
          } else if (result) {
            handleResult.call(this, result);
          }
        }
        resolve();
      };

      let context = {};

      if (customContext) {
        context = customContext;
      }

      const maybeThennable = cloudFunction(event, context, callback);
      if (maybeThennable) {
        return Promise.resolve(maybeThennable).then(callback.bind(this, null), callback.bind(this));
      }

      return maybeThennable;
    });
  },

  addEnvironmentVariablesToProcessEnv(functionObj) {
    const environmentVariables = this.provider.getConfiguredEnvironment(functionObj);
    _.merge(process.env, environmentVariables);
  },
};
