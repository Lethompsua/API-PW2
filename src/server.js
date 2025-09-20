import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const { PORT, MONGODB_URI } = process.env;
(async () => {
  await connectDB(MONGODB_URI);
  app.listen(PORT, () => console.log(`🚀 API en http://localhost:${PORT}`));
})();
