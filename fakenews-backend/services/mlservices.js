const axios = require("axios");

const getPrediction = async (text) => {
  try {
    const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";
    const response = await axios.post(`${ML_URL}/predict`, {
      text,
    });
    return response.data;
  } catch (error) {
    console.error("ML Service Error:", error.message);
    throw new Error("Prediction service failed");
  }
};

module.exports = { getPrediction };