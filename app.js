const express = require('express');
const { Client } = require('pg');
const path = require('path');

const client = new Client({
  user: 'gis_admin',
  host: 'aviation.crgjzahy3whh.us-east-1.rds.amazonaws.com',
  database: 'parks',
  password: 'gispass',
  port: 5432,
});
client.connect(function (err) {
  if (err) throw err;
  console.log("Connected to PostgreSQL!");
});

const app = express();

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Root Route
app.get('/', function (req, res) {
  console.log("Root route hit...");
  res.status(200);
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to fetch park boundaries as GeoJSON
app.get('/api/parks', async (req, res) => {
  try {
    const query = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::jsonb,
            'properties', to_jsonb(row) - 'geom'
          )
        )
      ) AS geojson
      FROM (SELECT * FROM parks) row;
    `;

    const result = await client.query(query);
    res.json(result.rows[0].geojson);
  } catch (err) {
    console.error("Error fetching park boundaries:", err);
    res.status(500).send("Error fetching park boundaries");
  }
});

// Route to fetch park boundaries as GeoJSON
app.get('/api/parkassets', async (req, res) => {
  try {
    const query = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::jsonb,
            'properties', to_jsonb(row) - 'geom'
          )
        )
      ) AS geojson
      FROM (SELECT * FROM parkassets) row;
    `;

    const result = await client.query(query);
    res.json(result.rows[0].geojson);
    //console.log(result)
  } catch (err) {
    console.error("Error fetching park assets:", err);
    res.status(500).send("Error fetching park assets");
  }
});

app.post('/api/parkassets', async (req, res) => {
  try {
    const { geometry, properties } = req.body;

    // Ensure geometry and properties are provided
    if (!geometry || !properties || !properties.name) {
      return res.status(400).send('Invalid GeoJSON: Missing geometry or properties');
    }

    const query = `
      INSERT INTO parkassets (geom, name)
      VALUES (ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), $2)
      RETURNING id;
    `;
    const values = [JSON.stringify(geometry), properties.name];
    const result = await client.query(query, values);

    res.json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Error creating feature:', err);
    res.status(500).send('Error creating feature');
  }
});

// App listens on Port 8000 for requests
app.listen(8000, function (err) {
  if (err) console.log("Error starting server:", err);
  console.log('Node.js and Express app listening on port 8000!');
});