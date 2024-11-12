const mongoose = require('mongoose')

const withdraw = new mongoose.Schema(
  {
    message: { type: String, required: true },
  }
)
const Withdraw = mongoose.models.Withdraw || mongoose.model('Withdraw', withdraw)
module.exports = Withdraw