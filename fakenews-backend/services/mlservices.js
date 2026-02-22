const axios = require("axios");

const getPrediction = async (text) => {
  try {
    const response = await axios.post("http://localhost:5000/predict", {
      text,
    });
    return response.data;
  } catch (error) {
    console.error("ML Service Error:", error.message);
    throw new Error("Prediction service failed");
  }
};

module.exports = { getPrediction };