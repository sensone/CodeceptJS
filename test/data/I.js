'use strict';

module.exports = {

  _init: () => {
    global.I_initialized = true;
  },

  doSomething: () => {
    return 'done';
  }

};
