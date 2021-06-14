'use strict';

const path = require('path');
const GoogleProvider = require('../../provider/googleProvider');
const GoogleInvokeLocal = require('../googleInvokeLocal');
const Serverless = require('../../test/serverless');

jest.spyOn(console, 'log');
describe('invokeLocalNodeJs', () => {
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
  describe('event', () => {
    const eventName = 'eventName';
    const contextName = 'contextName';
    const event = {
      name: eventName,
    };
    const context = {
      name: contextName,
    };
    const baseConfig = {
      events: [{ event: {} }],
    };
    it('should invoke a sync handler', async () => {
      const functionConfig = {
        ...baseConfig,
        handler: 'eventSyncHandler',
      };
      await googleInvokeLocal.invokeLocalNodeJs(functionConfig, event, context);
      // eslint-disable-next-line no-console
      expect(console.log).toHaveBeenCalledWith('EVENT_SYNC_HANDLER');
      expect(serverless.cli.consoleLog).toHaveBeenCalledWith(`{\n    "result": "${eventName}"\n}`);
    });

    it('should handle errors in a sync handler', async () => {
      const functionConfig = {
        ...baseConfig,
        handler: 'eventSyncHandlerWithError',
      };
      await googleInvokeLocal.invokeLocalNodeJs(functionConfig, event, context);
      // eslint-disable-next-line no-console
      expect(console.log).toHaveBeenCalledWith('EVENT_SYNC_HANDLER');
      expect(serverless.cli.consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"errorMessage": "SYNC_ERROR"')
      );
    });

    it('should invoke an async handler', async () => {
      const functionConfig = {
        ...baseConfig,
        handler: 'eventAsyncHandler',
      };
      await googleInvokeLocal.invokeLocalNodeJs(functionConfig, event, context);
      // eslint-disable-next-line no-console
      expect(console.log).toHaveBeenCalledWith('EVENT_ASYNC_HANDLER');
      expect(serverless.cli.consoleLog).toHaveBeenCalledWith(
        `{\n    "result": "${contextName}"\n}`
      );
    });

    it('should handle errors in an async handler', async () => {
      const functionConfig = {
        ...baseConfig,
        handler: 'eventAsyncHandlerWithError',
      };
      await googleInvokeLocal.invokeLocalNodeJs(functionConfig, event, context);
      // eslint-disable-next-line no-console
      expect(console.log).toHaveBeenCalledWith('EVENT_ASYNC_HANDLER');
      expect(serverless.cli.consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"errorMessage": "ASYNC_ERROR"')
      );
    });

    it('should give the environment variables to the handler', async () => {
      const functionConfig = {
        ...baseConfig,
        handler: 'eventEnvHandler',
      };
      await googleInvokeLocal.invokeLocalNodeJs(functionConfig, event, context);
      // eslint-disable-next-line no-console
      expect(console.log).toHaveBeenCalledWith(myVarValue);
    });
  });
  describe('http', () => {
    const message = 'httpBodyMessage';
    const req = {
      body: { message },
    };
    const context = {};
    const baseConfig = {
      events: [{ http: '' }],
    };
    it('should invoke a sync handler', async () => {
      const functionConfig = {
        ...baseConfig,
        handler: 'httpSyncHandler',
      };
      await googleInvokeLocal.invokeLocalNodeJs(functionConfig, req, context);
      // eslint-disable-next-line no-console
      expect(console.log).toHaveBeenCalledWith('HTTP_SYNC_HANDLER');
      expect(serverless.cli.consoleLog).toHaveBeenCalledWith(
        JSON.stringify(
          {
            status: 200,
            headers: {
              'x-test': 'headerValue',
              'content-type': 'application/json; charset=utf-8',
              'content-length': '37',
              'etag': 'W/"25-F1uWAIMs2TbWZIN1zJauHXahSdU"',
            },
            body: { responseMessage: message },
          },
          null,
          4
        )
      );
    });

    it('should handle errors in a sync handler', async () => {
      const functionConfig = {
        ...baseConfig,
        handler: 'httpSyncHandlerWithError',
      };
      await googleInvokeLocal.invokeLocalNodeJs(functionConfig, req, context);
      // eslint-disable-next-line no-console
      expect(console.log).toHaveBeenCalledWith('HTTP_SYNC_HANDLER');
      expect(serverless.cli.consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"errorMessage": "SYNC_ERROR"')
      );
    });

    it('should invoke an async handler', async () => {
      const functionConfig = {
        ...baseConfig,
        handler: 'httpAsyncHandler',
      };
      await googleInvokeLocal.invokeLocalNodeJs(functionConfig, req, context);
      // eslint-disable-next-line no-console
      expect(console.log).toHaveBeenCalledWith('HTTP_ASYNC_HANDLER');
      expect(serverless.cli.consoleLog).toHaveBeenCalledWith(
        JSON.stringify({ status: 404, headers: {} }, null, 4)
      );
    });

    it('should handle errors in an async handler', async () => {
      const functionConfig = {
        ...baseConfig,
        handler: 'httpAsyncHandlerWithError',
      };
      await googleInvokeLocal.invokeLocalNodeJs(functionConfig, req, context);
      // eslint-disable-next-line no-console
      expect(console.log).toHaveBeenCalledWith('HTTP_ASYNC_HANDLER');
      expect(serverless.cli.consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"errorMessage": "ASYNC_ERROR"')
      );
    });

    it('should give the environment variables to the handler', async () => {
      const functionConfig = {
        ...baseConfig,
        handler: 'httpEnvHandler',
      };
      await googleInvokeLocal.invokeLocalNodeJs(functionConfig, req, context);
      // eslint-disable-next-line no-console
      expect(console.log).toHaveBeenCalledWith(myVarValue);
    });
  });
});
