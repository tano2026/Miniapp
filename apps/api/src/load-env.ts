import { existsSync } from 'fs';
import { join } from 'path';

// Nạp apps/api/.env khi chạy local; môi trường thật truyền biến qua hệ thống.
const file = join(__dirname, '..', '.env');
if (existsSync(file)) process.loadEnvFile(file);
