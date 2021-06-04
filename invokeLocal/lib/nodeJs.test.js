'use strict';

const path = require('path');
const GoogleProvider = require('../../provider/googleProvider');
const GoogleInvokeLocal = require('../googleInvokeLocal');
const Serverless = require('../../test/serverless');

jest.spyOn(console, 'log');
describe('invokeLocalNodeJs', () => {
  const eventName = 'eventName';
  const contextName = 'contextName';
  const event = {
    name: eventName,
  };
  const context = {
    name: contextName,
  };
  const myVarValue = 'MY_VAR_VALUE';
  let serverless;
  let googleInvokeLocal;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.setProvider('google', new GoogleProvider(serverless));
    serverless.service.provider.environment = {
      MY_VAR: myVarValue,
    };
    serverless.serviceDir = path.join(process.cwd(), 'invokeLocal', 'lib', 'testMocks'); // To load the index.js of the mock folder
    serverless.cli.consoleLog = jest.fn();
    googleInvokeLocal = new GoogleInvokeLocal(serverless, {});
  });

  it('should invoke a sync handler', async () => {
    const functionConfig = {
      handler: 'syncHandler',
    };
    await googleInvokeLocal.invokeLocalNodeJs(functionConfig, event, context);
    // eslint-disable-next-line no-console
    expect(console.log).toHaveBeenCalledWith('SYNC_HANDLER');
    expect(serverless.cli.consoleLog).toHaveBeenCalledWith(`{\n    "result": "${eventName}"\n}`);
  });

  it('should handle errors in a sync handler', async () => {
    const functionConfig = {
      handler: 'syncHandlerWithError',
    };
    await googleInvokeLocal.invokeLocalNodeJs(functionConfig, event, context);
    // eslint-disable-next-line no-console
    expect(console.log).toHaveBeenCalledWith('SYNC_HANDLER');
    expect(serverless.cli.consoleLog).toHaveBeenCalledWith(
      expect.stringContaining('"errorMessage": "SYNC_ERROR"')
    );
  });

  it('should invoke an async handler', async () => {
    const functionConfig = {
      handler: 'asyncHandler',
    };
    await googleInvokeLocal.invokeLocalNodeJs(functionConfig, event, context);
    // eslint-disable-next-line no-console
    expect(console.log).toHaveBeenCalledWith('ASYNC_HANDLER');
    expect(serverless.cli.consoleLog).toHaveBeenCalledWith(`{\n    "result": "${contextName}"\n}`);
  });

  it('should handle errors in an async handler', async () => {
    const functionConfig = {
      handler: 'asyncHandlerWithError',
    };
    await googleInvokeLocal.invokeLocalNodeJs(functionConfig, event, context);
    // eslint-disable-next-line no-console
    expect(console.log).toHaveBeenCalledWith('ASYNC_HANDLER');
    expect(serverless.cli.consoleLog).toHaveBeenCalledWith(
      expect.stringContaining('"errorMessage": "ASYNC_ERROR"')
    );
  });

  it('should give the environment variables to the handler', async () => {
    const functionConfig = {
      handler: 'envHandler',
    };
    await googleInvokeLocal.invokeLocalNodeJs(functionConfig, event, context);
    // eslint-disable-next-line no-console
    expect(console.log).toHaveBeenCalledWith(myVarValue);
  });
});
