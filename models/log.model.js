const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema({
    uid: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true }, // 1 month, 3 month, 6 month, 1 year, 2 year ...  
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Log", LogSchema);