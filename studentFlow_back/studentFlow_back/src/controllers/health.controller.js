import { checkDatabaseConnection } from "../config/database.js";
import { sendSuccess } from "../utils/api-response.js";

export async function getHealth(_request, response, next) {
  try {
    await checkDatabaseConnection();

    return sendSuccess(response, {
      status: "ok",
      database: "connected"
    });
  } catch (error) {
    return next(error);
  }
}