const database = {
  users: [
    { id: 1, name: 'Nguyen Van A', email: 'a@example.com', country: 'VN', role: 'customer' },
    { id: 2, name: 'Tran Thi B', email: 'b@example.com', country: 'VN', role: 'admin' },
    { id: 3, name: 'John Doe', email: 'john@example.com', country: 'US', role: 'customer' }
  ],
  orders: [
    { id: 101, userId: 1, product: 'Laptop', amount: 2000, currency: 'USD', status: 'paid' },
    { id: 102, userId: 2, product: 'Phone', amount: 800, currency: 'USD', status: 'pending' },
    { id: 103, userId: 1, product: 'Headphones', amount: 120, currency: 'USD', status: 'paid' }
  ]
};

const databaseSchemaResource = {
  name: 'databaseSchema',
  description: 'Dynamic database schema for MCP tools, exposed through @mcp.resource().',
  collections: [
    {
      name: 'users',
      description: 'Registered users with profile and role metadata.',
      fields: [
        { name: 'id', type: 'integer' },
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'country', type: 'string' },
        { name: 'role', type: 'string' }
      ]
    },
    {
      name: 'orders',
      description: 'Customer orders with product, amount, and status information.',
      fields: [
        { name: 'id', type: 'integer' },
        { name: 'userId', type: 'integer' },
        { name: 'product', type: 'string' },
        { name: 'amount', type: 'integer' },
        { name: 'currency', type: 'string' },
        { name: 'status', type: 'string' }
      ]
    }
  ]
};

module.exports = { database, databaseSchemaResource };
