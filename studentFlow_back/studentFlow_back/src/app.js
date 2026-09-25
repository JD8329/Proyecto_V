import express from "express";
import healthRoutes from "./routes/health.routes.js";
import materiasRouter from "./routes/materias.routes.js";
import { attachTemporaryUser } from "./middlewares/request-context.middleware.js";

import { notFoundHandler, errorHandler } from "./middlewares/error.middleware.js";

const app = express();
app.use(attachTemporaryUser);

app.use(express.json());


app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/materias", materiasRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;