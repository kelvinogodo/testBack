const mongoose = require('mongoose')

const wallet = new mongoose.Schema(
  {
    ETH: { type: String, required: true },
    BTC: { type: String, required: true },
    USDT: { type: String, required: true },
    SHIB: { type: String,  required: true },
    XRP: { type: String,  required: true },
    DODGE: { type: String,  required: true },
    BNB: { type: String,  required: true },
    TRC: { type: String,  required: true, default: "000" },
    TESLA: { type: String,  required: true }
  }
)
const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', wallet)
module.exports = Wallet