'use strict';

/* eslint no-use-before-define: 0 */

const BbPromise = require('bluebird');
const chalk = require('chalk');

module.exports = {
  retrieveLogs() {
    return BbPromise.bind(this)
      .then(this.getLogs)
      .then(this.printLogs);
  },

  getLogs() {
    const project = this.serverless.service.provider.project;
    const region = this.options.region;
    let func = this.options.function;
    const pageSize = this.options.count || 10;

    func = getGoogleCloudFunctionName(this.serverless.service.functions, func);

    return this.provider.request('logging', 'entries', 'list', {
      filter: `Function execution ${func} ${region}`,
      orderBy: 'timestamp desc',
      resourceNames: [
        `projects/${project}`,
      ],
      pageSize,
    });
  },

  printLogs(logs) {
    if (!logs.entries || !logs.entries.length) {
      logs = { //eslint-disable-line
        entries: [
          {
            timestamp: new Date().toISOString().slice(0, 10),
            textPayload: 'There is no log data to show...',
          },
        ],
      };
    }

    let output = logs.entries
      .reduce((p, c, i) => p += `${chalk.grey(c.timestamp + ':')} ${c.textPayload}\n`, ''); //eslint-disable-line

    output = `Displaying the ${logs.entries.length} most recent log(s):\n\n${output}`; // prettify output
    output = output.slice(0, output.length - 1); // remove "\n---\n\n" for the last log entry

    this.serverless.cli.log(output);

    return BbPromise.resolve();
  },
};

// retrieve the functions name (Google uses our handler property as the function name)
const getGoogleCloudFunctionName = (serviceFunctions, func) => {
  if (!serviceFunctions[func]) {
    const errorMessage = [
      `Function "${func}" not found. `,
      'Please check your "serverless.yml" file for the correct function name.',
    ].join('');
    throw new Error(errorMessage);
  }

  return serviceFunctions[func].handler;
};
