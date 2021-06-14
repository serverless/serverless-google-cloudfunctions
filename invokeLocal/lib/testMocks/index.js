/**
 * /!\ this file contains fake handlers used in the tests /!\
 */

'use strict';
const wait = () => new Promise((resolve) => setTimeout(resolve, 10));

module.exports = {
  eventSyncHandler: (event, context, callback) => {
    // eslint-disable-next-line no-console
    console.log('EVENT_SYNC_HANDLER');
    callback(null, { result: event.name });
  },
  eventSyncHandlerWithError: (event, context, callback) => {
    // eslint-disable-next-line no-console
    console.log('EVENT_SYNC_HANDLER');
    callback('SYNC_ERROR');
  },
  eventAsyncHandler: async (event, context) => {
    // eslint-disable-next-line no-console
    console.log('EVENT_ASYNC_HANDLER');
    await wait();
    return { result: context.name };
  },
  eventAsyncHandlerWithError: async () => {
    // eslint-disable-next-line no-console
    console.log('EVENT_ASYNC_HANDLER');
    await wait();
    throw new Error('ASYNC_ERROR');
  },
  eventEnvHandler: async () => {
    // eslint-disable-next-line no-console
    console.log(process.env.MY_VAR);
  },
  httpSyncHandler: (req, res) => {
    // eslint-disable-next-line no-console
    console.log('HTTP_SYNC_HANDLER');
    res.setHeader('x-test', 'headerValue');
    res.send({ responseMessage: req.body.message });
  },
  httpSyncHandlerWithError: () => {
    // eslint-disable-next-line no-console
    console.log('HTTP_SYNC_HANDLER');
    throw new Error('SYNC_ERROR');
  },
  httpAsyncHandler: async (req, res) => {
    // eslint-disable-next-line no-console
    console.log('HTTP_ASYNC_HANDLER');
    await wait();
    res.status(404).send();
  },
  httpAsyncHandlerWithError: async () => {
    // eslint-disable-next-line no-console
    console.log('HTTP_ASYNC_HANDLER');
    await wait();
    throw new Error('ASYNC_ERROR');
  },
  httpEnvHandler: (req, res) => {
    // eslint-disable-next-line no-console
    console.log(process.env.MY_VAR);
    res.send('HTTP_SYNC_BODY');
  },
};
