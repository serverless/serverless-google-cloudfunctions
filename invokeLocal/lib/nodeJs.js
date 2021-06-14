'use strict';

const chalk = require('chalk');
const path = require('path');
const _ = require('lodash');
const { getReqRes } = require('./httpReqRes');

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

const jsonContentType = 'application/json';

module.exports = {
  async invokeLocalNodeJs(functionObj, event, customContext) {
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

    const eventType = Object.keys(functionObj.events[0])[0];

    switch (eventType) {
      case 'event':
        return this.handleEvent(cloudFunction, event, customContext);
      case 'http':
        return this.handleHttp(cloudFunction, event, customContext);
      default:
        throw new Error(`${eventType} is not supported`);
    }
  },
  handleError(err, resolve) {
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
    resolve();
    process.exitCode = 1;
  },
  handleEvent(cloudFunction, event, customContext) {
    let hasResponded = false;

    function handleResult(result) {
      if (result instanceof Error) {
        this.handleError.call(this, result);
        return;
      }
      this.serverless.cli.consoleLog(JSON.stringify(result, null, 4));
    }

    return new Promise((resolve) => {
      const callback = (err, result) => {
        if (!hasResponded) {
          hasResponded = true;
          if (err) {
            this.handleError(err, resolve);
          } else if (result) {
            handleResult.call(this, result);
          }
          resolve();
        }
      };

      let context = {};

      if (customContext) {
        context = customContext;
      }
      try {
        const maybeThennable = cloudFunction(event, context, callback);
        if (maybeThennable) {
          Promise.resolve(maybeThennable).then(callback.bind(this, null), callback.bind(this));
        }
      } catch (error) {
        this.handleError(error, resolve);
      }
    });
  },
  handleHttp(cloudFunction, event) {
    const { expressRequest, expressResponse: response } = getReqRes();
    const request = Object.assign(expressRequest, event);

    return new Promise((resolve) => {
      const endCallback = (data) => {
        if (data && Buffer.isBuffer(data)) {
          data = data.toString();
        }
        const headers = response.getHeaders();
        const bodyIsJson =
          headers['content-type'] && headers['content-type'].includes(jsonContentType);
        if (data && bodyIsJson) {
          data = JSON.parse(data);
        }
        this.serverless.cli.consoleLog(
          JSON.stringify(
            {
              status: response.statusCode,
              headers,
              body: data,
            },
            null,
            4
          )
        );
        resolve();
      };

      Object.assign(response, { end: endCallback }); // Override of the end method which is always called to send the response of the http request

      try {
        const maybeThennable = cloudFunction(request, response);
        if (maybeThennable) {
          Promise.resolve(maybeThennable).catch((error) => this.handleError(error, resolve));
        }
      } catch (error) {
        this.handleError(error, resolve);
      }
    });
  },

  addEnvironmentVariablesToProcessEnv(functionObj) {
    const environmentVariables = this.provider.getConfiguredEnvironment(functionObj);
    _.merge(process.env, environmentVariables);
  },
};
