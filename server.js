import express from 'express';
import routes from './routes';

// Step 2: Set up middleware to parse JSON bodies
const app = express();
app.use(express.json({ limit: '200Mb' }));

// Step 3: Define the port
const PORT = process.env.PORT || 5000;

// Step 4: Register routes
routes(app);

// Step 5: Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
module.exports = app;
