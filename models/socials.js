const mongoose = require('mongoose')

const social = new mongoose.Schema(
  {
    whatsapp: { type: String, required: true },
  }
)
const Social = mongoose.models.Social || mongoose.model('Social', social)
module.exports = Social