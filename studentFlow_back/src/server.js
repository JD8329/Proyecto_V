import dotenv from "dotenv";
import app from "./app.js";

dotenv.config();

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`StudentFlow backend listening on port ${port}`);
});