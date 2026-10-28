import { imageRouter } from "./imageRouter.js";
export default imageRouter(
  "disease",
  "DISEASE_API_URL",
  "https://disease-api-405376924767.us-central1.run.app",
  "/predict",
);
