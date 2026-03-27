const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',

    },
    name: {
        type: String,
        required: true,
    },
    url: {
        type: String,
        required: true,
    },
    public_id: {
        type: String,
    },
    description: {
        type: String,
        default: '',
    },
    size: {
        type: Number,
    },
    type: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Receipt = mongoose.model("Receipt", receiptSchema);

module.exports = Receipt;