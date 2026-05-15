const express = require('express');
const { database, databaseSchemaResource } = require('./data');

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

const toolSchemas = {
  search: {
    name: 'search',
    description: 'Search documents in a collection using a filter, select fields, and limit results.',
    input_schema: {
      type: 'object',
      properties: {
        collection: { type: 'string', enum: ['users', 'orders'] },
        filter: { type: 'object' },
        fields: { type: 'array', items: { type: 'string' } },
        limit: { type: 'integer', minimum: 1, maximum: 100 }
      },
      required: ['collection'],
      additionalProperties: false
    },
    output_schema: {
      type: 'object',
      properties: {
        results: { type: 'array', items: { type: 'object' } }
      },
      required: ['results']
    }
  },
  insert: {
    name: 'insert',
    description: 'Insert a document into a collection and return the created record.',
    input_schema: {
      type: 'object',
      properties: {
        collection: { type: 'string', enum: ['users', 'orders'] },
        document: { type: 'object' }
      },
      required: ['collection', 'document'],
      additionalProperties: false
    },
    output_schema: {
      type: 'object',
      properties: {
        inserted: { type: 'object' }
      },
      required: ['inserted']
    }
  },
  aggregate: {
    name: 'aggregate',
    description: 'Run a simple aggregation pipeline on a collection.',
    input_schema: {
      type: 'object',
      properties: {
        collection: { type: 'string', enum: ['users', 'orders'] },
        pipeline: { type: 'array', items: { type: 'object' } }
      },
      required: ['collection', 'pipeline'],
      additionalProperties: false
    },
    output_schema: {
      type: 'object',
      properties: {
        result: { type: 'array', items: { type: 'object' } }
      },
      required: ['result']
    }
  }
};

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function applyFilter(doc, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;
  return Object.entries(filter).every(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      if ('$in' in value && Array.isArray(value.$in)) {
        return value.$in.includes(doc[key]);
      }
      if ('$gt' in value) {
        return doc[key] > value.$gt;
      }
      if ('$lt' in value) {
        return doc[key] < value.$lt;
      }
    }
    return doc[key] === value;
  });
}

function projectDocument(doc, fields) {
  if (!fields || fields.length === 0) return doc;
  const projected = {};
  for (const field of fields) {
    if (field in doc) {
      projected[field] = doc[field];
    }
  }
  return projected;
}

function runPipeline(collectionData, pipeline) {
  let current = [...collectionData];

  for (const stage of pipeline) {
    const stageKey = Object.keys(stage)[0];
    const stageValue = stage[stageKey];

    switch (stageKey) {
      case '$match':
        current = current.filter((item) => applyFilter(item, stageValue));
        break;
      case '$group': {
        const groupBy = stageValue.by;
        const accumulator = stageValue.count;
        if (!groupBy || typeof accumulator !== 'object' || !accumulator.$sum) {
          throw new Error('Unsupported $group stage. Use { "$group": { "by": "field", "count": { "$sum": 1 } } }');
        }
        const grouped = {};
        current.forEach((item) => {
          const key = item[groupBy];
          if (!grouped[key]) grouped[key] = { _id: key, count: 0 };
          grouped[key].count += accumulator.$sum;
        });
        current = Object.values(grouped);
        break;
      }
      case '$sort': {
        const [sortField, direction] = Object.entries(stageValue)[0];
        current.sort((a, b) => {
          if (a[sortField] === b[sortField]) return 0;
          return (a[sortField] > b[sortField] ? 1 : -1) * (direction === -1 ? -1 : 1);
        });
        break;
      }
      case '$limit': {
        if (typeof stageValue !== 'number') {
          throw new Error('$limit stage requires a numeric value.');
        }
        current = current.slice(0, stageValue);
        break;
      }
      default:
        throw new Error(`Unsupported pipeline stage: ${stageKey}`);
    }
  }

  return current;
}

app.get('/mcp/schema', (req, res) => {
  res.json({ tools: Object.values(toolSchemas), resources: [databaseSchemaResource] });
});

app.get('/mcp/resource/db-schema', (req, res) => {
  res.json(databaseSchemaResource);
});

function parseSearchQuery(query) {
  const collection = query.collection;
  const limit = query.limit ? parseInt(query.limit, 10) : 10;
  const fields = query.fields ? query.fields.split(',').map((f) => f.trim()).filter(Boolean) : [];
  const filter = {};

  Object.entries(query).forEach(([key, value]) => {
    if (['collection', 'fields', 'limit'].includes(key)) return;
    filter[key] = value;
  });

  return { collection, filter, fields, limit };
}

app.get('/mcp/tool/search', (req, res) => {
  const { collection, filter, fields, limit } = parseSearchQuery(req.query);
  if (!collection || !database[collection]) {
    return badRequest(res, 'collection is required and must be one of: users, orders');
  }
  if (!Array.isArray(fields)) {
    return badRequest(res, 'fields must be an array of strings');
  }

  const results = database[collection]
    .filter((item) => applyFilter(item, filter))
    .slice(0, limit)
    .map((item) => projectDocument(item, fields));

  res.json({ results });
});

app.post('/mcp/tool/search', (req, res) => {
  const { collection, filter = {}, fields = [], limit = 10 } = req.body;
  if (!collection || !database[collection]) {
    return badRequest(res, 'collection is required and must be one of: users, orders');
  }
  if (!Array.isArray(fields)) {
    return badRequest(res, 'fields must be an array of strings');
  }
  const results = database[collection]
    .filter((item) => applyFilter(item, filter))
    .slice(0, limit)
    .map((item) => projectDocument(item, fields));

  res.json({ results });
});

app.post('/mcp/tool/insert', (req, res) => {
  const { collection, document } = req.body;
  if (!collection || !database[collection]) {
    return badRequest(res, 'collection is required and must be one of: users, orders');
  }
  if (!document || typeof document !== 'object') {
    return badRequest(res, 'document is required and must be an object');
  }
  const target = database[collection];
  const nextId = Math.max(...target.map((item) => item.id)) + 1;
  const inserted = { ...document, id: nextId };
  target.push(inserted);
  res.json({ inserted });
});

app.post('/mcp/tool/aggregate', (req, res) => {
  const { collection, pipeline } = req.body;
  if (!collection || !database[collection]) {
    return badRequest(res, 'collection is required and must be one of: users, orders');
  }
  if (!Array.isArray(pipeline)) {
    return badRequest(res, 'pipeline is required and must be an array of stages');
  }
  try {
    const result = runPipeline(database[collection], pipeline);
    res.json({ result });
  } catch (err) {
    return badRequest(res, err.message);
  }
});

app.get('/', (req, res) => {
  res.send('Lab26 MCP server is running. Use /mcp/schema, /mcp/resource/db-schema, /mcp/tool/*');
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, () => {
  console.log(`MCP server listening on http://localhost:${port}`);
});
