-- SQL used to create the initial db table in Supabase
CREATE TABLE sensor_data (
  id SERIAL PRIMARY KEY,
  topic TEXT,
  sensor_data TEXT,
  value FLOAT,
  timestamp TIMESTAMP DEFAULT NOW()
);