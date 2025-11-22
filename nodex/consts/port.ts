export const RESERVED_PORTS: Record<number, string> = {
  // Databases
  3306: 'MySQL',
  5432: 'PostgreSQL',
  6379: 'Redis',
  27_017: 'MongoDB',
  27_018: 'MongoDB shard/replica',
  9200: 'Elasticsearch',
  5601: 'Kibana',
  // Dev tools
  5173: 'Vite default port',
  8888: 'Jupyter Notebook',
  // AI / ML servers
  6006: 'TensorBoard',
  5000: 'MLflow (also common for Flask)',
  8265: 'Ray Dashboard',
  8787: 'Dask Dashboard',
  11_434: 'Ollama API',
};
export const DEFAULT_PORT = 4000;
export const MIN_PORT = 1024;
export const MAX_PORT = 65_535;
export const ALLOWED_PORTS = new Set([DEFAULT_PORT, 8000, 8080]);
