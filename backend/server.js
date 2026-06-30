require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { loadDb } = require('./db');

// Route modules
const graphRouter        = require('./routes/graph');
const entitiesRouter     = require('./routes/entities');
const dataflowTypesRouter = require('./routes/dataflowTypes');
const connectionsRouter  = require('./routes/connections');
const dataflowsRouter    = require('./routes/dataflows');
const valueStreamsRouter  = require('./routes/valueStreams');
const azureRouter        = require('./routes/azure');
const platformRouter     = require('./routes/platform');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  const db = loadDb();
  res.json({ ok: true, bootstrapped: db.bootstrapped });
});

// Routes
app.use('/api',               graphRouter);          // GET /api/graph, POST /api/bootstrap
app.use('/api/entities',      entitiesRouter);       // CRUD for all nodes
app.use('/api/dataflow-types', dataflowTypesRouter); // DataflowType + flow CRUD with Logic App auto-check
app.use('/api/connections',   connectionsRouter);    // POST /api/connections (create triangle + edges)
app.use('/api/dataflows',     dataflowsRouter);      // Edge CRUD
app.use('/api/valuestreams',  valueStreamsRouter);   // Value stream CRUD
app.use('/api/azure',         azureRouter);          // Azure Logic Apps sync
app.use('/api/platform',      platformRouter);       // Platform up/down checks (Azure, Sales Hub)

app.listen(PORT, () => {
  console.log(`GenDigitalTwin backend  →  http://localhost:${PORT}`);
  console.log('  Routes:');
  console.log('    GET  /api/graph');
  console.log('    POST /api/bootstrap');
  console.log('    CRUD /api/entities');
  console.log('    CRUD /api/dataflow-types/:id/flows  (auto Logic App check)');
  console.log('    POST /api/connections');
  console.log('    CRUD /api/dataflows');
  console.log('    CRUD /api/valuestreams');
  console.log('    POST /api/azure/logicapps/sync-graph');
  console.log('    POST /api/platform/health-graph');
});
