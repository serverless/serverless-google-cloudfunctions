'use strict';

const setDefaults = require('./utils');
const GoogleProvider = require('../provider/googleProvider');
const Serverless = require('../test/serverless');
const GoogleCommand = require('../test/googleCommand');

describe('Utils', () => {
  let serverless;
  let googleCommand;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.setProvider('google', new GoogleProvider(serverless));
    googleCommand = new GoogleCommand(serverless, {}, setDefaults);
  });

  describe('#setDefaults()', () => {
    it('should set default values for options if not provided', () => googleCommand
      .setDefaults().then(() => {
        expect(googleCommand.options.stage).toEqual('dev');
        expect(googleCommand.options.region).toEqual('us-central1');
      }));

    it('should set the options when they are provided', () => {
      googleCommand.options.stage = 'my-stage';
      googleCommand.options.region = 'my-region';

      return googleCommand.setDefaults().then(() => {
        expect(googleCommand.options.stage).toEqual('my-stage');
        expect(googleCommand.options.region).toEqual('my-region');
      });
    });
  });
});
