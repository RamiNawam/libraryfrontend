// Reset the database to its initial empty state.
const { saveDb } = require('./db');

saveDb({
  bootstrapped: false,
  entities: [],
  dataflows: [],
  valueStreams: [],
});

console.log('[reset] Database has been reset.');
